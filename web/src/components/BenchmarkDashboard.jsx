import React, { useState, useEffect, useRef } from 'react';
import { Play, Activity, CheckCircle, XCircle, Clock, History, Zap, TrendingUp, Timer, BarChart3, Trash2, Eye, Menu, ChevronDown, ChevronUp, X, Trophy, AlertTriangle, Target } from 'lucide-react';
import { TraceInspector } from './TraceInspector';
import { FlowInspector } from './FlowInspector';
import { InteractiveTokenChart } from './InteractiveTokenChart';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend, BarChart, LineChart } from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './BenchmarkDashboard.css';

export const BenchmarkDashboard = ({ initialTab = 'dashboard', language = 'english' }) => {
    const [status, setStatus] = useState('idle');
    const [logs, setLogs] = useState([]);
    const [results, setResults] = useState([]);
    const [config, setConfig] = useState({ models: {}, difficulties: [], categories: [], tasks: [] });
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState('Medium');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedTask, setSelectedTask] = useState('');
    const [enableTools, setEnableTools] = useState(true);
    const [selectedResult, setSelectedResult] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [historyFiles, setHistoryFiles] = useState([]);
    const [agentMessages, setAgentMessages] = useState([]);
    const wsRef = useRef(null);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [newTask, setNewTask] = useState({ name: '', prompt: '', expected_criteria: '', difficulty: 'Medium' });
    const [createStatus, setCreateStatus] = useState('');
    const [compareData, setCompareData] = useState([]);
    const [selectedBenchmarks, setSelectedBenchmarks] = useState([]);
    const [loadingCompare, setLoadingCompare] = useState(false);
    const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);
    const [selectedTaskDetailsStatus, setSelectedTaskDetailsStatus] = useState('idle');
    const [showTaskPreview, setShowTaskPreview] = useState(false);
    const [traceEvents, setTraceEvents] = useState([]);
    const [controlsCollapsed, setControlsCollapsed] = useState(false);
    const [controlsDrawerOpen, setControlsDrawerOpen] = useState(false);

    const selectedModelLabel = (() => {
        const entry = Object.entries(config.models || {}).find(([, id]) => id === selectedModel);
        return entry ? entry[0] : (selectedModel || '—');
    })();

    const isSpanish = language === 'spanish';
    const ui = {
        controls: isSpanish ? 'Controles' : 'Controls',
        close: isSpanish ? 'Cerrar' : 'Close',
        showControls: isSpanish ? 'Mostrar controles' : 'Show controls',
        hideControls: isSpanish ? 'Ocultar controles' : 'Hide controls',
        tools: isSpanish ? 'Herramientas' : 'Tools',
        allShort: isSpanish ? 'Todas' : 'All',
    };

    const allLabel = ui.allShort;
    const selectedTaskLabel = (() => {
        if (!selectedTask) return allLabel;
        const found = (config.tasks || []).find(t => t.id === selectedTask);
        return found?.name || selectedTask;
    })();

    const toolsLabel = enableTools ? 'ON' : 'OFF';
    const controlsSummary = `${selectedModelLabel} • ${selectedDifficulty} • ${selectedCategory} • ${selectedTaskLabel} • ${ui.tools}: ${toolsLabel}`;

    // Sync with parent's initialTab prop
    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    // Load selected task details for preview
    useEffect(() => {
        if (!selectedTask) {
            setSelectedTaskDetails(null);
            setSelectedTaskDetailsStatus('idle');
            return;
        }

        let cancelled = false;
        const load = async () => {
            setSelectedTaskDetailsStatus('loading');
            try {
                const res = await fetch(`http://127.0.0.1:8000/api/tasks/${encodeURIComponent(selectedTask)}`);
                if (!res.ok) throw new Error(`Failed to load task (${res.status})`);
                const data = await res.json();
                if (cancelled) return;
                setSelectedTaskDetails(data);
                setSelectedTaskDetailsStatus('loaded');
            } catch (e) {
                if (cancelled) return;
                console.error(e);
                setSelectedTaskDetails(null);
                setSelectedTaskDetailsStatus('error');
            }
        };

        load();
        return () => { cancelled = true; };
    }, [selectedTask]);

    // Load all benchmarks for comparison
    const loadAllBenchmarks = async () => {
        setLoadingCompare(true);
        try {
            const res = await fetch('http://127.0.0.1:8000/api/reports');
            const data = await res.json();

            const benchmarkPromises = data.reports.map(async (file) => {
                try {
                    const reportRes = await fetch(`http://127.0.0.1:8000/api/reports/${file.filename}`);
                    const reportData = await reportRes.json();

                    // Handle both old format (array) and new format (object with model)
                    const isOldFormat = Array.isArray(reportData);

                    // Extract model and stats
                    let totalRuns = 0;
                    let totalScore = 0;
                    let totalDuration = 0;
                    let successCount = 0;
                    let taskNames = [];
                    let modelName = 'Unknown';
                    let difficulty = 'Unknown';

                    if (isOldFormat) {
                        // Old format: array of tasks directly
                        reportData.forEach(task => {
                            taskNames.push(task.task_name);
                            if (task.runs) {
                                task.runs.forEach(run => {
                                    totalRuns++;
                                    totalScore += run.score || 0;
                                    totalDuration += run.duration || 0;
                                    if (run.success) successCount++;
                                });
                            }
                        });
                        // Try to extract model from filename
                        modelName = 'Legacy Format';
                    } else {
                        // New format: object with model, config, and results
                        modelName = reportData.model || 'Unknown';
                        difficulty = reportData.config?.difficulty || 'Unknown';

                        if (reportData.results) {
                            reportData.results.forEach(task => {
                                taskNames.push(task.task_name);
                                if (task.runs) {
                                    task.runs.forEach(run => {
                                        totalRuns++;
                                        totalScore += run.score || 0;
                                        totalDuration += run.duration || 0;
                                        if (run.success) successCount++;
                                    });
                                }
                            });
                        }
                    }

                    return {
                        filename: file.filename,
                        date: file.date,
                        model: modelName,
                        difficulty: difficulty,
                        totalRuns,
                        avgScore: totalRuns > 0 ? (totalScore / totalRuns).toFixed(1) : 0,
                        avgDuration: totalRuns > 0 ? (totalDuration / totalRuns).toFixed(2) : 0,
                        successRate: totalRuns > 0 ? ((successCount / totalRuns) * 100).toFixed(0) : 0,
                        tasks: taskNames,
                        rawData: reportData,
                        isOldFormat
                    };
                } catch (e) {
                    console.error(`Error loading ${file.filename}:`, e);
                    return null;
                }
            });

            const benchmarks = (await Promise.all(benchmarkPromises)).filter(b => b !== null);
            setCompareData(benchmarks.sort((a, b) => b.filename.localeCompare(a.filename)));
        } catch (e) {
            console.error('Error loading benchmarks:', e);
        }
        setLoadingCompare(false);
    };

    const toggleBenchmarkSelection = (filename) => {
        setSelectedBenchmarks(prev => {
            if (prev.includes(filename)) {
                return prev.filter(f => f !== filename);
            }
            return [...prev, filename];
        });
    };

    // Format model name for display
    const formatModelName = (model, maxLength = 25) => {
        if (!model || model === 'Unknown' || model === 'Legacy Format') return model;
        // Remove common prefixes like 'ollama/', 'openai/', etc.
        let name = model.replace(/^(ollama|openai|anthropic|deepseek|google)\//i, '');
        // Remove version tags like ':latest'
        name = name.replace(/:latest$/, '');
        // Truncate if needed
        if (maxLength && name.length > maxLength) {
            return name.substring(0, maxLength) + '…';
        }
        return name;
    };

    const getComparisonChartData = () => {
        const selected = compareData.filter(b => selectedBenchmarks.includes(b.filename));
        return selected.map(b => ({
            name: formatModelName(b.model, 12),
            fullName: b.model,
            date: b.date,
            avgScore: parseFloat(b.avgScore),
            avgDuration: parseFloat(b.avgDuration),
            successRate: parseFloat(b.successRate),
            runs: b.totalRuns
        }));
    };

    // Fetch History
    const fetchHistory = () => {
        fetch('http://127.0.0.1:8000/api/reports')
            .then(res => res.json())
            .then(data => setHistoryFiles(data.reports))
            .catch(console.error);
    };

    useEffect(() => {
        // Fetch Config
        fetch('http://127.0.0.1:8000/api/config')
            .then(res => res.json())
            .then(data => {
                setConfig(data);
                if (data.models) setSelectedModel(Object.values(data.models)[0]);
                if (Array.isArray(data.difficulties) && data.difficulties.length && !data.difficulties.includes(selectedDifficulty)) {
                    setSelectedDifficulty(data.difficulties.includes('Medium') ? 'Medium' : data.difficulties[0]);
                }
                if (Array.isArray(data.categories) && data.categories.length && !data.categories.includes(selectedCategory)) {
                    setSelectedCategory('All');
                }
            })
            .catch(err => {
                console.error("Config log error:", err);
                setLogs(prev => [...prev, { type: 'log', message: `❌ Config Error: ${err.message}`, level: 'ERROR', timestamp: Date.now() / 1000 }]);
            });

        fetchHistory();

        // Connect WebSocket with retry/cleanup logic
        let ws = new WebSocket('ws://127.0.0.1:8000/ws');

        const setupWs = (socket) => {
            socket.onopen = () => console.log('✅ WS Connected');
            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'log') {
                        setLogs(prev => [...prev, data]);
                        setTraceEvents(prev => {
                            const next = [...prev, {
                                type: 'trace',
                                phase: 'log',
                                text: data.message,
                                timestamp: data.timestamp
                            }];
                            return next.slice(-200);
                        });
                    } else if (data.type === 'result') {
                        setResults(prev => {
                            // Avoid duplicates
                            const exists = prev.find(r => r.iteration === data.data.iteration && r.duration === data.data.duration);
                            if (!exists) return [...prev, data.data];
                            return prev;
                        });
                    } else if (data.type === 'agent_message') {
                        setAgentMessages(prev => {
                            const next = [...prev, data.data];
                            return next.slice(-80); // keep recent
                        });
                    } else if (data.type === 'trace') {
                        setTraceEvents(prev => {
                            const next = [...prev, data];
                            return next.slice(-200);
                        });
                    } else if (data.type === 'end') {
                        setStatus('completed');
                        fetchHistory(); // Refresh history on completion
                    }
                } catch (err) {
                    console.error("Error parsing WS message:", err);
                }
            };
            socket.onerror = (err) => console.error("WS Error:", err);
            socket.onclose = () => console.log("WS Disconnected");
        };

        setupWs(ws);
        wsRef.current = ws;

        return () => {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
        };
    }, []);

    const normalizeCategory = (c) => (typeof c === 'string' && c.trim()) ? c.trim() : 'uncategorized';

    const filteredTasks = (config.tasks || []).filter(t => {
        const difficultyOk = selectedDifficulty === 'All' || t.difficulty === selectedDifficulty;
        const categoryOk = selectedCategory === 'All' || normalizeCategory(t.category) === selectedCategory;
        return difficultyOk && categoryOk;
    });

    const groupedTasks = filteredTasks.reduce((acc, t) => {
        const cat = normalizeCategory(t.category);
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(t);
        return acc;
    }, {});

    const groupedCategoryKeys = Object.keys(groupedTasks).sort((a, b) => a.localeCompare(b));

    const startBenchmark = async () => {
        console.log("🖱️ Run button clicked!");
        setStatus('running');
        setLogs(prev => [...prev, { type: 'log', message: '🚀 Starting Benchmark Request...', level: 'INFO', timestamp: Date.now() / 1000 }]);
        setTraceEvents([]); // Clear Flow Inspector for new run
        setResults([]);
        try {
            console.log("📡 Sending start request to backend...");
            const response = await fetch('http://127.0.0.1:8000/api/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model_id: selectedModel,
                    difficulty: selectedDifficulty,
                    enable_tools: enableTools,
                    task_id: selectedTask || null,
                    language: language
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const data = await response.json();
            console.log("✅ Backend response:", data);
            setLogs(prev => [...prev, { type: 'log', message: '✅ Benchmark Started Successfully', level: 'SUCCESS', timestamp: Date.now() / 1000 }]);
        } catch (e) {
            console.error("❌ Error starting benchmark:", e);
            setStatus('error');
            setLogs(prev => [...prev, { type: 'log', message: `❌ Connection Failed: ${e.message}. Check if Backend is running.`, level: 'ERROR', timestamp: Date.now() / 1000 }]);
        }
    };

    // When Compare is selected externally, load data automatically
    useEffect(() => {
        if (activeTab === 'compare') {
            loadAllBenchmarks();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // Lock body scroll while drawer is open
    useEffect(() => {
        if (!controlsDrawerOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (e) => {
            if (e.key === 'Escape') setControlsDrawerOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [controlsDrawerOpen]);

    const renderToolsToggle = (idSuffix) => (
        <div className="tools-checkbox-container">
            <input
                type="checkbox"
                checked={enableTools}
                onChange={(e) => setEnableTools(e.target.checked)}
                id={`enableTools-${idSuffix}`}
                className="tools-checkbox"
                disabled={status === 'running'}
            />
            <label htmlFor={`enableTools-${idSuffix}`} className="tools-label">{ui.tools}</label>
        </div>
    );

    const renderControlGroup = () => (
        <div className="control-group">
            <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="control-select"
                disabled={status === 'running'}
            >
                {Object.entries(config.models).map(([name, id]) => (
                    <option key={id} value={id} className="select-option">{name}</option>
                ))}
            </select>
            <div className="control-divider" />
            <select
                value={selectedDifficulty}
                onChange={(e) => { setSelectedDifficulty(e.target.value); setSelectedTask(''); setShowTaskPreview(false); }}
                className="control-select"
                disabled={status === 'running'}
            >
                {config.difficulties.map(diff => (
                    <option key={diff} value={diff} className="select-option">{diff}</option>
                ))}
            </select>
            <div className="control-divider" />
            <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setSelectedTask(''); setShowTaskPreview(false); }}
                className="control-select"
                disabled={status === 'running'}
            >
                {(config.categories && config.categories.length ? config.categories : ['All']).map(cat => (
                    <option key={cat} value={cat} className="select-option">{cat}</option>
                ))}
            </select>
            <div className="control-divider" />
            <select
                value={selectedTask}
                onChange={(e) => { setSelectedTask(e.target.value); setShowTaskPreview(false); }}
                className="control-select control-select-wide"
                disabled={status === 'running'}
            >
                <option value="" className="select-option-muted">
                    {`All in ${selectedDifficulty}${selectedCategory !== 'All' ? ` / ${selectedCategory}` : ''}`}
                </option>

                {/* If Category is All, group by category for better navigation */}
                {selectedCategory === 'All'
                    ? groupedCategoryKeys.map(cat => (
                        <optgroup key={cat} label={`${cat} (${groupedTasks[cat].length})`}>
                            {groupedTasks[cat]
                                .slice()
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map(t => (
                                    <option key={t.id} value={t.id} className="select-option">{t.id ? `${t.id} — ${t.name}` : t.name}</option>
                                ))}
                        </optgroup>
                    ))
                    : filteredTasks
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(t => (
                            <option key={t.id} value={t.id} className="select-option">{t.id ? `${t.id} — ${t.name}` : t.name}</option>
                        ))
                }
            </select>

            {selectedTask && (
                <button
                    onClick={() => setShowTaskPreview(true)}
                    title="Preview selected task"
                    className="btn-preview"
                    disabled={status === 'running'}
                >
                    <Eye size={14} /> Preview
                </button>
            )}
        </div>
    );

    const stopBenchmark = async () => {
        try {
            await fetch('http://localhost:8000/api/stop', { method: 'POST' });
        } catch (e) {
            console.error(e);
        }
    };

    const loadReport = async (filename) => {
        try {
            setLogs(prev => [...prev, { type: 'log', message: `📂 Loading report: ${filename}...`, level: 'INFO', timestamp: Date.now() / 1000 }]);
            const res = await fetch(`http://localhost:8000/api/reports/${filename}`);
            const data = await res.json();

            const flatRuns = [];
            if (data.results) {
                data.results.forEach(task => {
                    task.runs.forEach(run => {
                        flatRuns.push({
                            ...run,
                            taskName: task.task_name,
                            prompt: task.prompt || "Prompt not available in this historical record.",
                            // Add any other props expected by UI
                        });
                    });
                });
            } else if (data.aggregated_results) {
                // Handle old format if valid
                data.aggregated_results.forEach(task => {
                    task.runs.forEach(run => {
                        flatRuns.push({
                            ...run,
                            taskName: task.task_name,
                            prompt: task.prompt || "Prompt not available in this historical record.",
                        });
                    });
                });
            }

            setResults(flatRuns);
            setStatus('completed');
            setShowHistory(false);
            setLogs(prev => [...prev, { type: 'log', message: `✅ Loaded ${flatRuns.length} runs from history.`, level: 'SUCCESS', timestamp: Date.now() / 1000 }]);

        } catch (e) {
            console.error("Error loading report:", e);
            setLogs(prev => [...prev, { type: 'log', message: `❌ Error loading report: ${e.message}`, level: 'ERROR', timestamp: Date.now() / 1000 }]);
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        setCreateStatus('submitting');
        try {
            // Parse criteria
            const criteriaList = newTask.expected_criteria.split('\n').filter(line => line.trim() !== '');

            const res = await fetch('http://localhost:8000/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newTask.name,
                    prompt: newTask.prompt,
                    expected_criteria: criteriaList,
                    difficulty: newTask.difficulty
                })
            });
            const data = await res.json();
            if (data.status === 'success') {
                setCreateStatus('success');
                setNewTask({ name: '', prompt: '', expected_criteria: '', difficulty: 'Medium' });
                // Refresh config to see new task
                fetchConfig();
                setTimeout(() => setCreateStatus(''), 3000);
            } else {
                setCreateStatus('error: ' + data.message);
            }
        } catch (e) {
            setCreateStatus('error: ' + e.message);
        }
    };

    // Stats calculation
    const totalRuns = results.length;
    const avgScore = results.length ? (results.reduce((acc, r) => acc + (r.score || 0), 0) / results.length).toFixed(1) : 0;
    const avgDuration = results.length ? (results.reduce((acc, r) => acc + (r.duration || 0), 0) / results.length).toFixed(2) : 0;

    // New statistics
    const successCount = results.filter(r => r.success === true || r.score >= 8).length;
    const successRate = totalRuns > 0 ? ((successCount / totalRuns) * 100).toFixed(0) : 0;
    const bestScore = results.length ? Math.max(...results.map(r => r.score || 0)).toFixed(1) : 0;
    const errorCount = results.filter(r => r.error || r.success === false || r.score < 5).length;

    return (
        <div className="dashboard-container">

            {/* Controls toolbar (App renders the main header/nav) */}
            <header className="dashboard-header">
                <div className="dashboard-header-left">
                    <button
                        onClick={() => { setShowHistory(!showHistory); fetchHistory(); }}
                        className={`btn-icon ${showHistory ? 'btn-icon-active' : ''}`}
                        title="Toggle History"
                    >
                        <History size={18} strokeWidth={2.5} />
                    </button>

                    {/* Mobile: open controls drawer */}
                    <button
                        onClick={() => setControlsDrawerOpen(true)}
                        className="btn-icon btn-controls-drawer"
                        title={ui.controls}
                    >
                        <Menu size={18} strokeWidth={2.5} />
                    </button>
                </div>

                {controlsCollapsed && (
                    <div className="controls-summary" title={controlsSummary} aria-label={controlsSummary}>
                        {controlsSummary}
                    </div>
                )}

                <div className="flex flex-nowrap gap-md items-center header-controls">

                    {/* Desktop: collapsible controls */}
                    <div className={`controls-collapsible ${controlsCollapsed ? 'closed' : 'open'}`}>
                        {renderControlGroup()}
                    </div>

                    <div className="tools-checkbox-container tools-checkbox-container--header">
                        {renderToolsToggle('header')}
                    </div>

                    <button
                        className="btn btn-primary btn-run"
                        onClick={startBenchmark}
                        disabled={status === 'running'}
                    >
                        {status === 'running' ? <Activity className="animate-pulse" size={18} strokeWidth={2.5} /> : <Play size={18} strokeWidth={2.5} />}
                        {status === 'running' ? 'RUNNING...' : 'RUN'}
                    </button>

                    {/* Stop button always visible to maintain fixed layout */}
                    <button
                        onClick={stopBenchmark}
                        disabled={status !== 'running'}
                        title={status === 'running' ? 'Stop benchmark' : 'No benchmark running'}
                        className={`btn-stop ${status === 'running' ? 'btn-stop-active' : ''}`}
                    >
                        <XCircle size={18} strokeWidth={2.5} />
                    </button>

                    {/* Desktop: collapse/expand controls */}
                    <button
                        onClick={() => setControlsCollapsed(prev => !prev)}
                        className="btn-icon btn-controls-collapse"
                        title={controlsCollapsed ? ui.showControls : ui.hideControls}
                    >
                        {controlsCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </button>
                </div>

            </header>

            {/* Mobile controls drawer */}
            {controlsDrawerOpen && (
                <div
                    className="controls-drawer-overlay"
                    role="presentation"
                    onClick={() => setControlsDrawerOpen(false)}
                >
                    <div
                        className="controls-drawer"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Controles"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="controls-drawer-header">
                            <div className="controls-drawer-title">{ui.controls}</div>
                            <button
                                onClick={() => setControlsDrawerOpen(false)}
                                className="btn-icon"
                                title={ui.close}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="controls-drawer-body">
                            {renderControlGroup()}
                            {renderToolsToggle('drawer')}
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            <div className="main-content">

                {/* HISTORY SIDEBAR OVERLAY */}
                <div className={`history-sidebar ${showHistory ? 'history-sidebar-visible' : ''}`}>
                    <h3 className="history-title">History</h3>
                    <div className="history-list">
                        {historyFiles.map(file => (
                            <div key={file.filename} onClick={() => loadReport(file.filename)} className="history-item">
                                <div className="history-date">{file.date}</div>
                                <div className="history-filename">{file.filename.split('_')[1]}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CONTENT SWAP SWITCH */}
                {activeTab === 'dashboard' ? (
                    /* --- DASHBOARD VIEW --- */
                    <div className="dashboard-view">

                        {/* TOP STATS ROW */}
                        <div className="stats-container">
                            <div className="stats-grid">
                                <StatCard
                                    icon={<Zap />}
                                    label="Total Runs"
                                    value={totalRuns}
                                    color="var(--accent-primary)"
                                    subtitle={status === 'running' ? 'In progress...' : 'Completed'}
                                />
                                <StatCard
                                    icon={<Target />}
                                    label="Success Rate"
                                    value={successRate}
                                    unit="%"
                                    color={successRate >= 80 ? '#10B981' : successRate >= 50 ? '#F59E0B' : '#EF4444'}
                                    subtitle={successRate >= 80 ? 'Excellent' : successRate >= 50 ? 'Good' : 'Needs work'}
                                />
                                <StatCard
                                    icon={<TrendingUp />}
                                    label="Avg Score"
                                    value={avgScore}
                                    unit="/ 10"
                                    color="var(--accent-secondary)"
                                    subtitle={avgScore >= 8 ? 'Excellent' : avgScore >= 5 ? 'Good' : 'Needs work'}
                                />
                                <StatCard
                                    icon={<Trophy />}
                                    label="Best Score"
                                    value={bestScore}
                                    unit="/ 10"
                                    color="#F59E0B"
                                    subtitle="Top performance"
                                />
                                <StatCard
                                    icon={<Timer />}
                                    label="Avg Duration"
                                    value={avgDuration}
                                    unit="s"
                                    color="var(--accent-primary)"
                                    subtitle={avgDuration > 60 ? 'Slow' : 'Fast'}
                                />
                                <StatCard
                                    icon={<AlertTriangle />}
                                    label="Errors"
                                    value={errorCount}
                                    color={errorCount > 0 ? '#EF4444' : '#10B981'}
                                    subtitle={errorCount === 0 ? 'No issues' : 'Review needed'}
                                />
                            </div>
                        </div>

                        {/* MAIN 2-COLUMN SECTION: Chart and Results */}
                        <div className="charts-grid">
                            {/* Column 1: Performance Chart */}
                            {/* Column 1: Performance Chart Replaced by InteractiveTokenChart */}
                            <div className="card chart-card" style={{ padding: 0, overflow: 'hidden', background: 'transparent', border: 'none', boxShadow: 'none' }}>
                                <InteractiveTokenChart results={results} />
                            </div>

                            {/* Column 2: Recent Results */}
                            <div className="card results-card">
                                <div className="results-header">
                                    <h3 className="results-title">Recent Results</h3>
                                    {results.length > 0 && (
                                        <span className="results-badge">{results.length} runs</span>
                                    )}
                                </div>
                                <div className="results-list">
                                    {results.slice().reverse().map((r, i) => (
                                        <div key={i} onClick={() => setSelectedResult(r)} className={`result-item result-score-${r.score >= 8 ? 'high' : r.score >= 5 ? 'medium' : 'low'}`}>
                                            <div className="result-header-row">
                                                <span className="result-task-name">{r.taskName || `Task ${r.iteration}`}</span>
                                                <span className="result-score">
                                                    {r.score}<span className="result-score-max">/10</span>
                                                </span>
                                            </div>
                                            <div className="result-meta">
                                                <span className="result-duration">{r.duration}s</span>
                                                <span className="result-difficulty">{r.difficulty || 'Medium'}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {results.length === 0 && <div className="results-empty">No runs yet</div>}
                                </div>
                            </div>
                        </div>

                        {/* FOOTER: Flow Inspector */}
                        <div className="dashboard-footer">
                            <FlowInspector events={traceEvents} results={results} />
                        </div>

                    </div>

                ) : activeTab === 'creator' ? (
                    /* --- CREATOR VIEW --- */
                    <div className="creator-view">
                        <div className="card creator-card">
                            <h2 className="creator-title">Create Custom Benchmark Task</h2>

                            <form onSubmit={handleCreateTask} className="creator-form">
                                <div>
                                    <label className="form-label">Task Name</label>
                                    <input
                                        type="text"
                                        value={newTask.name}
                                        onChange={e => setNewTask({ ...newTask, name: e.target.value })}
                                        placeholder="e.g., Analyze Financial Report"
                                        required
                                        className="form-input"
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Difficulty</label>
                                    <select
                                        value={newTask.difficulty}
                                        onChange={e => setNewTask({ ...newTask, difficulty: e.target.value })}
                                        className="form-input"
                                    >
                                        <option value="Easy">Easy</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Hard">Hard</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="form-label">Prompt / Instructions</label>
                                    <textarea
                                        value={newTask.prompt}
                                        onChange={e => setNewTask({ ...newTask, prompt: e.target.value })}
                                        placeholder="Describe the task for the agent..."
                                        required
                                        rows={6}
                                        className="form-textarea"
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Expected Criteria (one per line)</label>
                                    <textarea
                                        value={newTask.expected_criteria}
                                        onChange={e => setNewTask({ ...newTask, expected_criteria: e.target.value })}
                                        placeholder="Must contain X&#10;Must not do Y&#10;Result should be Z"
                                        required
                                        rows={4}
                                        className="form-textarea"
                                    />
                                    <div className="form-hint">Used for automated evaluation score.</div>
                                </div>

                                <button type="submit" className="btn btn-primary btn-submit" disabled={createStatus === 'submitting'}>
                                    {createStatus === 'submitting' ? <Activity className="animate-pulse" /> : <CheckCircle />}
                                    {createStatus === 'submitting' ? 'Creating...' : 'Create Task'}
                                </button>

                                {createStatus && createStatus !== 'submitting' && (
                                    <div className={`form-status ${createStatus === 'success' ? 'form-status-success' : 'form-status-error'}`}>
                                        {createStatus === 'success' ? 'Task created successfully! Switch to Dashboard to run it.' : createStatus}
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                ) : activeTab === 'compare' ? (
                    /* --- COMPARE VIEW --- */
                    <div className="compare-view">

                        {/* Header with stats */}
                        <div className="compare-header">
                            <div>
                                <h2 className="compare-title">Benchmark Comparison</h2>
                                <p className="compare-subtitle">Select benchmarks to compare performance across runs</p>
                            </div>
                            <div className="compare-actions">
                                <span className="compare-stats">
                                    {compareData.length} benchmarks • {selectedBenchmarks.length} selected
                                </span>
                                {selectedBenchmarks.length > 0 && (
                                    <button
                                        onClick={() => setSelectedBenchmarks([])}
                                        className="btn btn-danger btn-sm"
                                    >
                                        <Trash2 size={14} /> Clear Selection
                                    </button>
                                )}
                                <button
                                    onClick={loadAllBenchmarks}
                                    disabled={loadingCompare}
                                    className="btn btn-secondary btn-sm"
                                >
                                    {loadingCompare ? 'Loading...' : '↻ Refresh'}
                                </button>
                            </div>
                        </div>

                        {/* Comparison Charts - Only show when benchmarks selected */}
                        {selectedBenchmarks.length >= 2 && (
                            <div className="compare-charts-grid">
                                {/* Score Comparison */}
                                <div className="card">
                                    <h3 className="card-title">Average Score Comparison</h3>
                                    <div className="compare-chart">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={getComparisonChartData()}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                                                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                                                <YAxis domain={[0, 10]} stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: 8 }}
                                                    formatter={(value, name, props) => [value, props.payload.fullName]}
                                                />
                                                <Bar dataKey="avgScore" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Duration Comparison */}
                                <div className="card">
                                    <h3 className="card-title">Average Duration Comparison</h3>
                                    <div className="compare-chart">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={getComparisonChartData()}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                                                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                                                <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: 8 }}
                                                    formatter={(value, name, props) => [`${value}s`, props.payload.fullName]}
                                                />
                                                <Bar dataKey="avgDuration" fill="var(--accent-secondary)" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Success Rate Comparison */}
                                <div className="card">
                                    <h3 className="card-title">Success Rate Comparison</h3>
                                    <div className="compare-chart">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={getComparisonChartData()}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                                                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                                                <YAxis domain={[0, 100]} stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: 8 }}
                                                    formatter={(value, name, props) => [`${value}%`, props.payload.fullName]}
                                                />
                                                <Bar dataKey="successRate" fill="var(--success, #22c55e)" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Combined Metrics */}
                                <div className="card">
                                    <h3 className="card-title">Combined Metrics</h3>
                                    <div className="compare-chart">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={getComparisonChartData()}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                                                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                                                <YAxis yAxisId="left" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                                                <YAxis yAxisId="right" orientation="right" domain={[0, 10]} stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: 8 }}
                                                />
                                                <Legend />
                                                <Bar yAxisId="left" dataKey="avgDuration" name="Duration (s)" fill="var(--accent-secondary)" radius={[4, 4, 0, 0]} />
                                                <Line
                                                    yAxisId="right"
                                                    type="monotone"
                                                    dataKey="avgScore"
                                                    name="Score"
                                                    stroke="var(--accent-primary)"
                                                    strokeWidth={2}
                                                    dot={(props) => {
                                                        const { cx, cy, payload } = props;
                                                        const score = payload.avgScore;
                                                        let color = '#f87171'; // red for low scores
                                                        if (score >= 8) {
                                                            color = '#4ade80'; // green for high scores
                                                        } else if (score >= 5) {
                                                            color = '#fbbf24'; // yellow for medium scores
                                                        }
                                                        return (
                                                            <circle
                                                                cx={cx}
                                                                cy={cy}
                                                                r={6}
                                                                fill={color}
                                                                stroke="#0d0d0d"
                                                                strokeWidth={2}
                                                                style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                                                            />
                                                        );
                                                    }}
                                                />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedBenchmarks.length === 1 && (
                            <div className="card compare-placeholder">
                                <BarChart3 size={48} className="compare-placeholder-icon" />
                                <p className="compare-placeholder-text">Select at least 2 benchmarks to compare</p>
                            </div>
                        )}

                        {/* Benchmarks Table */}
                        <div className="card compare-table-card">
                            <h3 className="card-title">All Benchmarks</h3>

                            {loadingCompare ? (
                                <div className="compare-loading">
                                    <Activity className="animate-pulse compare-loading-icon" size={32} />
                                </div>
                            ) : (
                                <div className="compare-table-container">
                                    <table className="compare-table">
                                        <thead>
                                            <tr className="compare-table-header-row">
                                                <th className="compare-table-th compare-table-th-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedBenchmarks.length === compareData.length && compareData.length > 0}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedBenchmarks(compareData.map(b => b.filename));
                                                            } else {
                                                                setSelectedBenchmarks([]);
                                                            }
                                                        }}
                                                        className="table-checkbox"
                                                    />
                                                </th>
                                                <th className="compare-table-th">Date</th>
                                                <th className="compare-table-th">Model</th>
                                                <th className="compare-table-th compare-table-th-center">Difficulty</th>
                                                <th className="compare-table-th compare-table-th-center">Runs</th>
                                                <th className="compare-table-th compare-table-th-center">Avg Score</th>
                                                <th className="compare-table-th compare-table-th-center">Avg Duration</th>
                                                <th className="compare-table-th compare-table-th-center">Success Rate</th>
                                                <th className="compare-table-th compare-table-th-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {compareData.map((benchmark, idx) => (
                                                <tr
                                                    key={benchmark.filename}
                                                    className={`compare-table-row ${selectedBenchmarks.includes(benchmark.filename) ? 'compare-table-row-selected' : ''}`}
                                                >
                                                    <td className="compare-table-td">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedBenchmarks.includes(benchmark.filename)}
                                                            onChange={() => toggleBenchmarkSelection(benchmark.filename)}
                                                            className="table-checkbox"
                                                        />
                                                    </td>
                                                    <td className="compare-table-td">
                                                        <span className="table-monospace">{benchmark.date}</span>
                                                    </td>
                                                    <td className="compare-table-td table-model-cell">
                                                        <span title={benchmark.model} className="table-model-name">{formatModelName(benchmark.model)}</span>
                                                    </td>
                                                    <td className="compare-table-td compare-table-td-center">
                                                        <span className={`difficulty-badge difficulty-${benchmark.difficulty.toLowerCase()}`}>
                                                            {benchmark.difficulty}
                                                        </span>
                                                    </td>
                                                    <td className="compare-table-td compare-table-td-center table-monospace">
                                                        {benchmark.totalRuns}
                                                    </td>
                                                    <td className="compare-table-td compare-table-td-center">
                                                        <span className={`table-score score-${benchmark.avgScore >= 8 ? 'high' : benchmark.avgScore >= 5 ? 'medium' : 'low'}`}>
                                                            {benchmark.avgScore}<span className="table-score-max">/10</span>
                                                        </span>
                                                    </td>
                                                    <td className="compare-table-td compare-table-td-center table-monospace">
                                                        {benchmark.avgDuration}s
                                                    </td>
                                                    <td className="compare-table-td compare-table-td-center">
                                                        <span className={`table-score score-${benchmark.successRate >= 80 ? 'high' : benchmark.successRate >= 50 ? 'medium' : 'low'}`}>
                                                            {benchmark.successRate}%
                                                        </span>
                                                    </td>
                                                    <td className="compare-table-td compare-table-td-center">
                                                        <button
                                                            onClick={() => { loadReport(benchmark.filename); setActiveTab('dashboard'); }}
                                                            className="btn btn-secondary btn-xs"
                                                        >
                                                            <Eye size={12} /> View
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {compareData.length === 0 && !loadingCompare && (
                                        <div className="compare-table-empty">
                                            No benchmarks found. Run some benchmarks first!
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}

            </div>

            {/* Result Detail Modal */}
            {
                selectedResult && (
                    <div className="modal-overlay" onClick={() => setSelectedResult(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 className="modal-title">Result Detail (Run #{selectedResult.iteration})</h3>
                                <button onClick={() => { console.log('selectedResult:', selectedResult); setSelectedResult(null); }} className="modal-close">
                                    <XCircle />
                                </button>
                            </div>
                            <div className="modal-body">

                                {/* Score & Reason */}
                                <div className={`result-summary ${selectedResult.success ? 'result-summary-success' : 'result-summary-failed'}`}>
                                    <div className="result-summary-status">
                                        {selectedResult.success ? 'PASSED' : 'FAILED'} (Score: {selectedResult.score}/10)
                                    </div>
                                    <div className="result-summary-reason">
                                        " {selectedResult.reason} "
                                    </div>

                                    {/* DEBUG: Show if token_metrics exists */}
                                    {!selectedResult.token_metrics && (
                                        <div className="token-warning">
                                            ⚠️ No token metrics in this result (run with updated backend)
                                        </div>
                                    )}

                                    {/* Token Metrics */}
                                    {selectedResult.token_metrics && Object.keys(selectedResult.token_metrics).length > 0 && (
                                        <div className="token-metrics">
                                            {typeof selectedResult.token_metrics.prompt_tokens === 'number' && (
                                                <span className="token-badge">
                                                    prompt: {selectedResult.token_metrics.prompt_tokens}
                                                </span>
                                            )}
                                            {typeof selectedResult.token_metrics.completion_tokens === 'number' && (
                                                <span className="token-badge">
                                                    completion: {selectedResult.token_metrics.completion_tokens}
                                                </span>
                                            )}
                                            {typeof selectedResult.token_metrics.total_tokens === 'number' && (
                                                <span className="token-badge">
                                                    total: {selectedResult.token_metrics.total_tokens}
                                                </span>
                                            )}
                                            {typeof selectedResult.token_metrics.reasoning_tokens === 'number' && (
                                                <span className="token-badge">
                                                    reasoning: {selectedResult.token_metrics.reasoning_tokens}
                                                </span>
                                            )}
                                            {typeof selectedResult.token_metrics.cached_tokens === 'number' && (
                                                <span className="token-badge">
                                                    cached: {selectedResult.token_metrics.cached_tokens}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Prompt Display */}
                                <div>
                                    <h4 className="modal-section-title">Prompt</h4>
                                    <div className="modal-code-block">
                                        {selectedResult.prompt || "Prompt not available."}
                                    </div>
                                </div>

                                {/* Full Output */}
                                <div>
                                    <h4 className="modal-section-title">Model Output</h4>
                                    <div className="modal-markdown-block">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                code({ node, inline, className, children, ...props }) {
                                                    const match = /language-(\w+)/.exec(className || '')
                                                    return !inline && match ? (
                                                        <div className="markdown-code-block">
                                                            <code className={className} {...props}>
                                                                {children}
                                                            </code>
                                                        </div>
                                                    ) : (
                                                        <code className="markdown-code-inline" {...props}>
                                                            {children}
                                                        </code>
                                                    )
                                                }
                                            }}
                                        >
                                            {selectedResult.output}
                                        </ReactMarkdown>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                )
            }

            {/* Task Preview Modal */}
            {
                showTaskPreview && (
                    <div className="modal-overlay" onClick={() => setShowTaskPreview(false)}>
                        <div className="modal-content modal-content-wide" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="modal-header-group">
                                    <h3 className="modal-title">Selected task preview</h3>
                                    <div className="modal-subtitle">
                                        {selectedTaskDetails?.id || selectedTask}
                                        {selectedTaskDetails?.difficulty ? ` • ${selectedTaskDetails.difficulty}` : ''}
                                        {selectedTaskDetails?.category ? ` • ${selectedTaskDetails.category}` : ''}
                                    </div>
                                </div>
                                <button onClick={() => setShowTaskPreview(false)} className="modal-close">
                                    <XCircle />
                                </button>
                            </div>

                            <div className="modal-body">
                                {selectedTaskDetailsStatus === 'loading' && (
                                    <div className="modal-loading">Loading task details…</div>
                                )}

                                {selectedTaskDetailsStatus === 'error' && (
                                    <div className="modal-error">
                                        Couldn't load task details. Is the backend running?
                                    </div>
                                )}

                                {selectedTaskDetailsStatus === 'loaded' && selectedTaskDetails && (
                                    <>
                                        <div className="task-preview-name">
                                            {selectedTaskDetails.name}
                                        </div>

                                        <div>
                                            <div className="task-preview-label">Prompt</div>
                                            <div className="task-preview-prompt">
                                                {selectedTaskDetails.prompt || 'Prompt not available.'}
                                            </div>
                                        </div>

                                        {Array.isArray(selectedTaskDetails.expected_criteria) && selectedTaskDetails.expected_criteria.length > 0 && (
                                            <div>
                                                <div className="task-preview-label">Expected criteria</div>
                                                <ul className="task-preview-criteria">
                                                    {selectedTaskDetails.expected_criteria.map((c, idx) => (
                                                        <li key={idx}>{c}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

const StatCard = ({ icon, label, value, unit, color, subtitle }) => (
    <div className="stat-card">
        {/* Subtle top accent bar */}
        <div className="stat-card-accent" />

        {/* Icon container */}
        <div className="stat-card-icon">
            {React.cloneElement(icon, { size: 26, color: 'var(--text-secondary)', strokeWidth: 2 })}
        </div>

        <div className="stat-card-content">
            <div className="stat-card-label">{label}</div>
            <div className="stat-card-value">
                <span>{value}</span>
                {unit && <span className="stat-card-unit">{unit}</span>}
            </div>
            {subtitle && (
                <div className="stat-card-subtitle">{subtitle}</div>
            )}
        </div>
    </div>
);
