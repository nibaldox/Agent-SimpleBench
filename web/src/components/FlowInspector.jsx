import React, { useEffect, useRef, useState } from 'react';
import { Play, CheckCircle, AlertCircle, Loader, ArrowRight, X, Clock, Target, Zap, Timer, Hash, TrendingUp } from 'lucide-react';
import './FlowInspector.css';

// Parse events into unique sequential steps with progressive colors
const parseEvents = (events, results) => {
    if (!events || events.length === 0) return [];

    const steps = [];
    let stepNumber = 0;
    let currentIteration = 0;

    events.forEach((ev, idx) => {
        const text = ev.text || ev.message || '';
        const phase = ev.phase || 'log';
        const timestamp = ev.timestamp || Date.now() / 1000;

        // Detect meaningful steps only
        let stepInfo = null;

        // Task start
        if (text.includes('CURRENT TASK:') || text.includes('Starting')) {
            const taskMatch = text.match(/CURRENT TASK:\s*(.+)/i);
            stepInfo = {
                type: 'start',
                title: 'Inicio',
                description: taskMatch ? taskMatch[1].substring(0, 30) : 'Iniciando tarea',
                fullDescription: taskMatch ? taskMatch[1] : 'Iniciando tarea',
                timestamp
            };
        }
        // Iteration/Progress
        else if (text.includes('ITERATION')) {
            const iterMatch = text.match(/ITERATION\s+(\d+)\s*\/\s*(\d+)/i);
            if (iterMatch) {
                currentIteration = parseInt(iterMatch[1]);
                stepInfo = {
                    type: 'iteration',
                    iteration: currentIteration,
                    totalIterations: parseInt(iterMatch[2]),
                    title: `Paso ${iterMatch[1]}/${iterMatch[2]}`,
                    description: 'Procesando...',
                    fullDescription: `Iteración ${iterMatch[1]} de ${iterMatch[2]} - El agente está procesando la tarea`,
                    timestamp
                };
            }
        }
        // Completion - extract metrics from results
        else if (text.includes('PASS') || text.includes('Complete') || phase === 'result') {
            const scoreMatch = text.match(/PASS\s*\(([^)]+)\)/);
            const durationMatch = text.match(/(\d+\.?\d*)s\)/);

            // Find matching result for this iteration
            const matchingResult = results?.find(r => r.iteration === currentIteration) || results?.[results.length - 1];

            stepInfo = {
                type: 'complete',
                title: 'Completado',
                description: scoreMatch ? scoreMatch[1] : '✓ Éxito',
                fullDescription: scoreMatch ? `Tarea completada exitosamente` : 'Tarea completada exitosamente',
                isComplete: true,
                timestamp,
                // Add result metrics if available
                score: matchingResult?.score,
                duration: matchingResult?.duration,
                tokenMetrics: matchingResult?.token_metrics || {},
                success: matchingResult?.success,
                taskName: matchingResult?.taskName || matchingResult?.task_name
            };
        }
        // Error
        else if (text.includes('ERROR') || text.includes('FAIL') || phase === 'error') {
            stepInfo = {
                type: 'error',
                title: 'Error',
                description: text.substring(0, 25) + '...',
                fullDescription: text,
                isError: true,
                timestamp
            };
        }

        if (stepInfo) {
            stepNumber++;
            steps.push({
                id: idx,
                number: stepNumber,
                rawText: text,
                ...stepInfo
            });
        }
    });

    // Return only unique steps (max 10)
    return steps.slice(-10);
};

// Get color based on progress (from blue -> purple -> teal -> green)
const getProgressColor = (index, total, step) => {
    if (step.isError) return { bg: 'rgba(239, 68, 68, 0.15)', border: '#EF4444', text: '#EF4444', glow: 'rgba(239, 68, 68, 0.4)' };
    if (step.isComplete) return { bg: 'rgba(16, 185, 129, 0.2)', border: '#10B981', text: '#10B981', glow: 'rgba(16, 185, 129, 0.4)' };

    const progress = total > 1 ? index / (total - 1) : 0;

    if (progress < 0.25) {
        return { bg: 'rgba(59, 130, 246, 0.15)', border: '#3B82F6', text: '#3B82F6', glow: 'rgba(59, 130, 246, 0.4)' };
    } else if (progress < 0.5) {
        return { bg: 'rgba(139, 92, 246, 0.15)', border: '#8B5CF6', text: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.4)' };
    } else if (progress < 0.75) {
        return { bg: 'rgba(20, 184, 166, 0.15)', border: '#14B8A6', text: '#14B8A6', glow: 'rgba(20, 184, 166, 0.4)' };
    } else {
        return { bg: 'rgba(34, 197, 94, 0.15)', border: '#22C55E', text: '#22C55E', glow: 'rgba(34, 197, 94, 0.4)' };
    }
};

// Popup component with detailed metrics
const StepPopup = ({ step, colors, onClose }) => {
    if (!step) return null;

    const formatTime = (ts) => {
        const date = new Date(ts * 1000);
        return date.toLocaleTimeString();
    };

    const tokenMetrics = step.tokenMetrics || {};
    const promptTokens = tokenMetrics.prompt_tokens || tokenMetrics.input_tokens || 0;
    const completionTokens = tokenMetrics.completion_tokens || tokenMetrics.output_tokens || 0;
    const totalTokens = tokenMetrics.total_tokens || (promptTokens + completionTokens);
    const duration = step.duration || 0;
    const tokensPerSecond = duration > 0 && totalTokens > 0 ? (totalTokens / duration).toFixed(1) : '—';

    return (
        <div className="step-popup-overlay" onClick={onClose}>
            <div className="step-popup" onClick={(e) => e.stopPropagation()} style={{ borderColor: colors.border }}>
                <div className="popup-header" style={{ background: colors.bg }}>
                    <div className="popup-title" style={{ color: colors.text }}>
                        {step.isComplete ? <CheckCircle size={18} /> :
                            step.isError ? <AlertCircle size={18} /> :
                                <Target size={18} />}
                        <span>{step.title}</span>
                    </div>
                    <button className="popup-close" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>
                <div className="popup-body">
                    {/* Task Name */}
                    {step.taskName && (
                        <div className="popup-section">
                            <div className="popup-label">
                                <Target size={14} /> Tarea
                            </div>
                            <div className="popup-value">{step.taskName}</div>
                        </div>
                    )}

                    {/* Description */}
                    <div className="popup-section">
                        <div className="popup-label">
                            <Hash size={14} /> Estado
                        </div>
                        <div className="popup-value">{step.fullDescription}</div>
                    </div>

                    {/* Score (for completed steps) */}
                    {step.score !== undefined && (
                        <div className="popup-section">
                            <div className="popup-label">
                                <TrendingUp size={14} /> Puntuación
                            </div>
                            <div className="popup-value popup-value-large" style={{ color: step.score >= 8 ? '#10B981' : step.score >= 5 ? '#F59E0B' : '#EF4444' }}>
                                {step.score}/10
                            </div>
                        </div>
                    )}

                    {/* Token Metrics Grid */}
                    {step.isComplete && (
                        <div className="popup-metrics-grid">
                            <div className="popup-metric">
                                <div className="popup-metric-icon" style={{ color: '#3B82F6' }}>
                                    <Zap size={16} />
                                </div>
                                <div className="popup-metric-content">
                                    <span className="popup-metric-value">{promptTokens || '—'}</span>
                                    <span className="popup-metric-label">Input Tokens</span>
                                </div>
                            </div>
                            <div className="popup-metric">
                                <div className="popup-metric-icon" style={{ color: '#8B5CF6' }}>
                                    <Zap size={16} />
                                </div>
                                <div className="popup-metric-content">
                                    <span className="popup-metric-value">{completionTokens || '—'}</span>
                                    <span className="popup-metric-label">Output Tokens</span>
                                </div>
                            </div>
                            <div className="popup-metric">
                                <div className="popup-metric-icon" style={{ color: '#10B981' }}>
                                    <Timer size={16} />
                                </div>
                                <div className="popup-metric-content">
                                    <span className="popup-metric-value">{duration ? `${duration.toFixed(1)}s` : '—'}</span>
                                    <span className="popup-metric-label">Duración</span>
                                </div>
                            </div>
                            <div className="popup-metric">
                                <div className="popup-metric-icon" style={{ color: '#F59E0B' }}>
                                    <TrendingUp size={16} />
                                </div>
                                <div className="popup-metric-content">
                                    <span className="popup-metric-value">{tokensPerSecond}</span>
                                    <span className="popup-metric-label">Tokens/s</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Timestamp */}
                    <div className="popup-section popup-section-footer">
                        <div className="popup-label">
                            <Clock size={14} /> Hora
                        </div>
                        <div className="popup-value popup-value-small">{formatTime(step.timestamp)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FlowStep = ({ step, index, total, isLast, onClick }) => {
    const colors = getProgressColor(index, total, step);
    const isComplete = step.isComplete;
    const isError = step.isError;

    return (
        <>
            <div
                className={`flow-step-box ${isComplete ? 'complete' : ''} ${isError ? 'error' : ''} ${isLast ? 'latest' : ''}`}
                style={{
                    background: colors.bg,
                    borderColor: colors.border,
                    '--glow-color': colors.glow
                }}
                onClick={() => onClick(step, colors)}
            >
                <div className="step-number" style={{ color: colors.text }}>
                    {isComplete ? <CheckCircle size={16} /> :
                        isError ? <AlertCircle size={16} /> :
                            isLast ? <Loader size={16} className="spinning" /> :
                                step.number}
                </div>
                <div className="step-info">
                    <div className="step-title" style={{ color: colors.text }}>{step.title}</div>
                    <div className="step-desc">{step.description}</div>
                </div>
            </div>
            {!isLast && (
                <div className="step-arrow animated-arrow">
                    <ArrowRight size={18} />
                </div>
            )}
        </>
    );
};

export const FlowInspector = ({ events, results = [] }) => {
    const scrollRef = useRef(null);
    const steps = parseEvents(events, results);
    const [selectedStep, setSelectedStep] = useState(null);
    const [selectedColors, setSelectedColors] = useState(null);

    // Auto-scroll to end when new steps added
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
    }, [steps.length]);

    const handleStepClick = (step, colors) => {
        setSelectedStep(step);
        setSelectedColors(colors);
    };

    const handleClosePopup = () => {
        setSelectedStep(null);
        setSelectedColors(null);
    };

    return (
        <div className="flow-inspector-container">
            <div className="flow-inspector-header">
                <h3 className="flow-inspector-title">
                    Flow Inspector
                </h3>
                <span className="flow-inspector-badge">
                    {steps.length > 0 ? `${steps.length} pasos` : 'Esperando...'}
                </span>
            </div>

            <div className="flow-inspector-body" ref={scrollRef}>
                {steps.length === 0 ? (
                    <div className="flow-empty-state">
                        <Play size={24} className="empty-icon pulse-animation" />
                        <span>Ejecuta un benchmark para ver el flujo</span>
                    </div>
                ) : (
                    <div className="flow-steps-row">
                        {steps.map((step, idx) => (
                            <FlowStep
                                key={step.id}
                                step={step}
                                index={idx}
                                total={steps.length}
                                isLast={idx === steps.length - 1}
                                onClick={handleStepClick}
                            />
                        ))}
                    </div>
                )}
            </div>

            {selectedStep && (
                <StepPopup
                    step={selectedStep}
                    colors={selectedColors}
                    onClose={handleClosePopup}
                />
            )}
        </div>
    );
};

export default FlowInspector;
