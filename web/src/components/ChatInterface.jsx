import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader, Zap, Paperclip, X, Copy, Folder } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const ChatInterface = ({ language = 'english' }) => {
    const STORAGE_KEY = 'chat_messages_v1';
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [config, setConfig] = useState({ models: {} });
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedRole, setSelectedRole] = useState('generalist');
    const [strictMode, setStrictMode] = useState(false);
    const [enableTools, setEnableTools] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [toolConfig, setToolConfig] = useState({
        web_search: true,
        file_system: true,
        shell: false
    });
    const [status, setStatus] = useState('idle');
    const [now, setNow] = useState(new Date());
    const [attachments, setAttachments] = useState([]); // {file_id, name, size}
    const [filesPanelOpen, setFilesPanelOpen] = useState(false);
    const [sessionId, setSessionId] = useState(() => {
        const saved = localStorage.getItem('chat_session_id');
        if (saved) return saved;
        const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
        localStorage.setItem('chat_session_id', id);
        return id;
    });
    const wsRef = useRef(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = (behavior = 'smooth') => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior });
        }
    };

    const formatPayload = (obj) => {
        try {
            return JSON.stringify(obj, null, 2);
        } catch (e) {
            return String(obj);
        }
    };

    // Keep current time updated for UI context
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(id);
    }, []);

    // Fetch Config on Mount
    useEffect(() => {
        fetch('http://127.0.0.1:8000/api/config')
            .then(res => res.json())
            .then(data => {
                setConfig(data);
                if (data.models) setSelectedModel(Object.values(data.models)[0]);
                if (Array.isArray(data.roles) && data.roles.length) setSelectedRole(data.roles[0].id);
            })
            .catch(console.error);
    }, []);

    // Load persisted chat history or seed a system timestamp
    useEffect(() => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    setMessages(parsed);
                    return;
                }
            } catch (e) {
                console.error('Failed to parse stored chat history', e);
            }
        }
        const iso = now.toISOString();
        setMessages([{ role: 'system', content: `Current date/time: ${iso}` }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist chat history on change
    useEffect(() => {
        if (messages.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [messages]);

    // Connect WebSocket
    const connectWs = () => {
        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return;

        console.log("🔌 Connecting to Chat WebSocket...");
        const ws = new WebSocket('ws://127.0.0.1:8000/ws/chat');

        ws.onopen = () => {
            console.log('✅ Chat WS Connected');
            setStatus('idle');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'chat_chunk') {
                    const mode = data.mode || 'append';
                    setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === 'assistant' && last.isStreaming) {
                            const nextContent = mode === 'replace' ? data.content : (last.content + data.content);
                            return [
                                ...prev.slice(0, -1),
                                { ...last, content: nextContent }
                            ];
                        } else {
                            return [...prev, { role: 'assistant', content: data.content, isStreaming: true }];
                        }
                    });
                    scrollToBottom('smooth');
                } else if (data.type === 'tool_call') {
                    const toolName = data.tool_name || data.tool || 'tool';
                    const args = data.arguments || data.args || {};
                    setMessages(prev => [...prev, {
                        role: 'system',
                        content: `🛠️ Tool call → ${toolName}\n${formatPayload(args)}`
                    }]);
                } else if (data.type === 'tool_result') {
                    const toolName = data.tool_name || data.tool || 'tool';
                    const result = data.result || data.output || data.data || {};
                    setMessages(prev => [...prev, {
                        role: 'system',
                        content: `🧪 Tool result ← ${toolName}\n${formatPayload(result)}`
                    }]);
                } else if (data.type === 'chat_end') {
                    setStatus('idle');
                    setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === 'assistant') {
                            return [...prev.slice(0, -1), { ...last, isStreaming: false, metrics: data.metrics }];
                        }
                        return prev;
                    });
                    scrollToBottom('smooth');
                } else if (data.type === 'error') {
                    setMessages(prev => [...prev, { role: 'system', content: `❌ Error: ${data.message}` }]);
                    setStatus('idle');
                }
            } catch (err) {
                console.error("Chat WS Parse Error:", err);
            }
        };

        ws.onerror = (err) => {
            console.error("Chat WS Error:", err);
            setStatus('error');
        };

        ws.onclose = () => {
            console.log("Chat WS Disconnected");
        };

        wsRef.current = ws;
    };

    useEffect(() => {
        connectWs();
        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, []);

    // Auto-scroll when messages change
    useEffect(() => {
        scrollToBottom('smooth');
    }, [messages, status]);

    const sendMessage = () => {
        if (!input.trim() || status === 'streaming') return;

        const userMsg = input;
        setInput('');
        setStatus('streaming');

        // Current ISO timestamp to give the model temporal context
        const currentDate = new Date().toISOString();

        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }]);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                message: userMsg,
                model: selectedModel,
                enable_tools: enableTools,
                role_id: selectedRole,
                strict_mode: strictMode,
                language: language,
                current_date: currentDate,
                files: attachments.map(f => f.file_id),
                session_id: sessionId
            }));
        } else {
            console.error("WS not open, trying to reconnect...");
            setMessages(prev => [...prev, { role: 'system', content: "❌ Connection lost. Please retry." }]);
            setStatus('idle');
        }

        // Clear attachments after send
        setAttachments([]);
    };

    const stopGeneration = () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'stop', session_id: sessionId }));
        }
        setStatus('idle');
    };

    const uploadFiles = async (fileList) => {
        if (!fileList?.length) return;
        const form = new FormData();
        Array.from(fileList).forEach(f => form.append('files', f));
        try {
            const res = await fetch('http://127.0.0.1:8000/api/files', {
                method: 'POST',
                body: form
            });
            const data = await res.json();
            if (Array.isArray(data.files)) {
                setAttachments(prev => [...prev, ...data.files]);
            }
        } catch (e) {
            console.error('Upload failed', e);
            setMessages(prev => [...prev, { role: 'system', content: '❌ File upload failed.' }]);
        }
    };

    const handleFileInput = (e) => {
        const { files } = e.target;
        if (files && files.length) {
            uploadFiles(files);
            e.target.value = '';
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer?.files?.length) {
            uploadFiles(e.dataTransfer.files);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const removeAttachment = (file_id) => {
        setAttachments(prev => prev.filter(f => f.file_id !== file_id));
    };

    const formatSize = (bytes = 0) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="chat-container" onDrop={handleDrop} onDragOver={handleDragOver}>
            {/* Top Bar */}
            <div className="chat-header">
                <div className="flex items-center gap-md">
                    <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="form-select"
                        style={{ borderRadius: '999px', width: 'auto' }}
                    >
                        {Object.entries(config.models).map(([name, id]) => (
                            <option key={id} value={id}>{name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-sm">
                    <button
                        onClick={() => setFilesPanelOpen(v => !v)}
                        className="btn btn-ghost btn-sm"
                        title="Toggle files panel"
                    >
                        <Folder size={16} /> Files ({attachments.length})
                    </button>
                </div>
            </div>

            <div className="chat-body">
                <div className="chat-messages">
                    <div className="chat-messages-inner">
                        {messages.length === 0 ? (
                            <div className="chat-empty-state">
                                <div className="chat-greeting">Talk to your agent</div>
                                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Drop files or ask a question.</p>
                            </div>
                        ) : (
                            <div className="chat-message-list">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`chat-message ${msg.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}>
                                        <div className="chat-message-avatar">
                                            {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                                        </div>
                                        <div className="chat-message-content">
                                            <div className="chat-message-role">
                                                {msg.role === 'user' ? 'You' : 'Assistant'}
                                            </div>
                                            <div className="chat-message-text">
                                                {msg.content ? (
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            a: ({ node, ...props }) => (
                                                                <a {...props} target="_blank" rel="noreferrer" />
                                                            ),
                                                            img: ({ node, ...props }) => (
                                                                <img {...props} alt={props.alt || ''} className="md-image" />
                                                            ),
                                                            code({ node, inline, className, children, ...props }) {
                                                                const match = /language-(\w+)/.exec(className || '');
                                                                return !inline && match ? (
                                                                    <div className="code-block">
                                                                        <code className={className} {...props}>
                                                                            {children}
                                                                        </code>
                                                                    </div>
                                                                ) : (
                                                                    <code className="code-inline" {...props}>
                                                                        {children}
                                                                    </code>
                                                                );
                                                            },
                                                            ul: ({ node, ...props }) => <ul className="md-list" {...props} />,
                                                            ol: ({ node, ...props }) => <ol className="md-list" {...props} />,
                                                            li: ({ node, ...props }) => <li className="md-list-item" {...props} />,
                                                            blockquote: ({ node, ...props }) => <blockquote className="md-quote" {...props} />,
                                                            table: ({ node, ...props }) => <table className="md-table" {...props} />,
                                                            thead: ({ node, ...props }) => <thead className="md-thead" {...props} />,
                                                            tbody: ({ node, ...props }) => <tbody className="md-tbody" {...props} />,
                                                            tr: ({ node, ...props }) => <tr className="md-tr" {...props} />,
                                                            th: ({ node, ...props }) => <th className="md-th" {...props} />,
                                                            td: ({ node, ...props }) => <td className="md-td" {...props} />,
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                ) : (
                                                    <span style={{ color: 'var(--text-tertiary)' }}>Thinking...</span>
                                                )}
                                                {msg.metrics && (
                                                    <div className="token-metrics">
                                                        Tokens · prompt: {msg.metrics.prompt_tokens ?? '-'} · completion: {msg.metrics.completion_tokens ?? '-'} · total: {msg.metrics.total_tokens ?? '-'}
                                                        {msg.metrics.duration_seconds ? ` · tiempo: ${msg.metrics.duration_seconds.toFixed(2)}s` : ''}
                                                        {msg.metrics.tokens_per_second ? ` · t/s: ${msg.metrics.tokens_per_second.toFixed(2)}` : ''}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>
                </div>

                {filesPanelOpen && (
                    <div className="chat-files-panel">
                        <div className="files-panel-header">
                            <span>Uploads</span>
                            <span className="files-count">{attachments.length}</span>
                        </div>
                        <div className="files-panel-list">
                            {attachments.length === 0 && (
                                <div className="files-empty">No files attached</div>
                            )}
                            {attachments.map(att => (
                                <div key={att.file_id} className="files-item">
                                    <div className="files-meta">
                                        <div className="files-name" title={att.name}>{att.name}</div>
                                        <div className="files-size">{formatSize(att.size)}</div>
                                        <div className="files-id" title={att.file_id}>{att.file_id}</div>
                                    </div>
                                    <div className="files-actions">
                                        <button className="btn-icon-ghost" onClick={() => navigator.clipboard.writeText(att.file_id)} title="Copy file id">
                                            <Copy size={14} />
                                        </button>
                                        <button className="btn-icon-ghost" onClick={() => removeAttachment(att.file_id)} title="Remove">
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Input Bar */}
            {messages.length > 0 && (
                <div className="chat-input-sticky">
                    <div className="chat-input-card">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Message Agent..."
                            className="chat-textarea-compact"
                            rows={1}
                        />
                        <input
                            type="file"
                            multiple
                            style={{ display: 'none' }}
                            id="file-input"
                            onChange={handleFileInput}
                        />
                        <button
                            onClick={() => document.getElementById('file-input')?.click()}
                            className="btn btn-ghost btn-icon"
                            title="Attach files"
                        >
                            <Paperclip size={18} />
                        </button>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="btn btn-ghost btn-icon"
                            title="Tools Settings"
                        >
                            <Zap size={20} />
                        </button>
                        {status === 'streaming' && (
                            <button
                                onClick={stopGeneration}
                                className="btn btn-ghost btn-icon"
                                title="Detener"
                            >
                                <X size={18} />
                            </button>
                        )}
                        <button
                            onClick={sendMessage}
                            disabled={status === 'streaming' || !input.trim()}
                            className="btn btn-primary btn-icon"
                        >
                            {status === 'streaming' ? <Loader className="loading-spinner" size={18} /> : <Send size={18} />}
                        </button>
                    </div>
                    {attachments.length > 0 && (
                        <div className="chat-attachments">
                            {attachments.map(att => (
                                <div key={att.file_id} className="attachment-pill">
                                    <span className="attachment-name">{att.name}</span>
                                    <span className="attachment-size">{formatSize(att.size)}</span>
                                    <button onClick={() => removeAttachment(att.file_id)} className="attachment-remove" title="Remove">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="modal-overlay" onClick={() => setShowSettings(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>Agent Settings</h3>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Persona</label>
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="form-select"
                                style={{ width: '100%', borderRadius: '12px' }}
                            >
                                {(config.roles || []).map(r => (
                                    <option key={r.id} value={r.id}>{r.name}{r.tagline ? ` — ${r.tagline}` : ''}</option>
                                ))}
                            </select>
                            <div style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Changes apply on the next message.
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label className="checkbox-label" style={{ justifyContent: 'space-between' }}>
                                <span>✅ Strict mode (sources & anti-hallucination)</span>
                                <input
                                    type="checkbox"
                                    checked={strictMode}
                                    onChange={e => setStrictMode(e.target.checked)}
                                />
                            </label>
                            <div style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Forces a consistent <b>Sources:</b> section with bullet URLs when making non-obvious factual claims.
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="checkbox-label">
                                <span>🔍 Web Search</span>
                                <input
                                    type="checkbox"
                                    checked={toolConfig.web_search}
                                    onChange={e => setToolConfig({ ...toolConfig, web_search: e.target.checked })}
                                />
                            </label>
                            <label className="checkbox-label">
                                <span>📁 File System</span>
                                <input
                                    type="checkbox"
                                    checked={toolConfig.file_system}
                                    onChange={e => setToolConfig({ ...toolConfig, file_system: e.target.checked })}
                                />
                            </label>
                            <label className="checkbox-label">
                                <span>🐚 Shell (Risky)</span>
                                <input
                                    type="checkbox"
                                    checked={toolConfig.shell}
                                    onChange={e => setToolConfig({ ...toolConfig, shell: e.target.checked })}
                                />
                            </label>
                        </div>

                        <div className="flex justify-end" style={{ marginTop: '1.5rem' }}>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="btn btn-primary"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .chat-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: var(--bg-primary);
                }

                .chat-header {
                    padding: var(--spacing-md) var(--spacing-xl);
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    border-bottom: 1px solid var(--border-primary);
                }

                .chat-messages {
                        flex: 1;
                        overflow-y: auto;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        padding: 0 var(--spacing-md);
                }

                .chat-body {
                    display: flex;
                    min-height: 0;
                    flex: 1;
                    position: relative;
                }

                .chat-files-panel {
                    width: 260px;
                    border-left: 1px solid var(--border-primary);
                    background: var(--bg-secondary);
                    display: flex;
                    flex-direction: column;
                }

                .files-panel-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: var(--spacing-sm) var(--spacing-md);
                    border-bottom: 1px solid var(--border-primary);
                    color: var(--text-primary);
                    font-weight: 600;
                }

                .files-count {
                    background: var(--bg-tertiary);
                    padding: 2px 8px;
                    border-radius: 999px;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }

                .files-panel-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: var(--spacing-sm) var(--spacing-md);
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-sm);
                }

                .files-item {
                    border: 1px solid var(--border-primary);
                    border-radius: var(--radius-md);
                    padding: var(--spacing-sm);
                    background: var(--bg-primary);
                    display: flex;
                    justify-content: space-between;
                    gap: var(--spacing-sm);
                }

                .files-meta {
                    min-width: 0;
                }

                .files-name {
                    color: var(--text-primary);
                    font-weight: 600;
                    font-size: 0.9rem;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .files-size {
                    color: var(--text-secondary);
                    font-size: 0.8rem;
                }

                .files-id {
                    color: var(--text-tertiary);
                    font-size: 0.75rem;
                    overflow-wrap: anywhere;
                }

                .files-actions {
                    display: flex;
                    gap: 6px;
                    align-items: center;
                }

                .btn-icon-ghost {
                    background: transparent;
                    border: 1px solid var(--border-primary);
                    color: var(--text-secondary);
                    padding: 4px;
                    border-radius: 8px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }

                .btn-icon-ghost:hover {
                    border-color: var(--accent-primary);
                    color: var(--accent-primary);
                }

                .files-empty {
                    color: var(--text-secondary);
                    text-align: center;
                    padding: var(--spacing-md) 0;
                }

                .chat-attachments {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-top: 8px;
                    padding: 0 var(--spacing-sm);
                }

                .attachment-pill {
                    display: inline-flex;
                    gap: 6px;
                    align-items: center;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-primary);
                    border-radius: 12px;
                    padding: 6px 10px;
                    color: var(--text-primary);
                    font-size: 0.85rem;
                }

                .attachment-name {
                    font-weight: 600;
                    max-width: 180px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .attachment-size {
                    color: var(--text-secondary);
                    font-size: 0.8rem;
                }

                .attachment-remove {
                    background: transparent;
                    border: none;
                    color: var(--text-tertiary);
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }

                .attachment-remove:hover {
                    color: var(--error, #ef4444);
                }

                .chat-messages-inner {
                    width: 100%;
                    max-width: 800px;
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                }

                .chat-empty-state {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: var(--spacing-2xl);
                    min-height: 400px;
                }

                .chat-greeting {
                    font-size: 2.5rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    text-align: center;
                    margin: 0;
                }

                .chat-input-card {
                    width: 100%;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-primary);
                    border-radius: var(--radius-xl);
                    padding: var(--spacing-md);
                    box-shadow: var(--shadow-md);
                }

                .chat-textarea {
                    width: 100%;
                    background: transparent;
                    border: none;
                    outline: none;
                    color: var(--text-primary);
                    font-size: 1rem;
                    resize: none;
                    min-height: 60px;
                    margin-bottom: var(--spacing-md);
                    font-family: var(--font-sans);
                }

                .chat-textarea-compact {
                    flex: 1;
                    background: transparent;
                    border: none;
                    outline: none;
                    color: var(--text-primary);
                    font-size: 1rem;
                    resize: none;
                    max-height: 120px;
                    font-family: var(--font-sans);
                    padding: var(--spacing-sm);
                }

                .chat-input-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .chat-message-list {
                    padding: var(--spacing-xl) 0;
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-xl);
                }

                .chat-message {
                    display: flex;
                    gap: var(--spacing-lg);
                }

                .chat-message-user {
                    flex-direction: row-reverse;
                }

                .chat-message-avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .chat-message-user .chat-message-avatar {
                    background: var(--bg-tertiary);
                }

                .chat-message-assistant .chat-message-avatar {
                    background: var(--accent-gradient);
                    color: white;
                }

                .chat-message-content {
                    flex: 1;
                    max-width: 80%;
                    padding-top: 0.4rem;
                }

                .chat-message-role {
                    font-size: 0.875rem;
                    font-weight: 600;
                    margin-bottom: var(--spacing-sm);
                    color: var(--text-secondary);
                }

                .chat-message-text {
                    color: var(--text-primary);
                    font-size: 1rem;
                    line-height: 1.6;
                }

                .code-block {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--radius-md);
                    margin: var(--spacing-md) 0;
                    overflow-x: auto;
                    border: 1px solid var(--border-primary);
                }

                .code-inline {
                    background: var(--bg-tertiary);
                    padding: 0.2rem 0.4rem;
                    border-radius: var(--radius-sm);
                    font-size: 0.85em;
                    font-family: var(--font-mono);
                }

                .md-list {
                    padding-left: 1.2rem;
                    margin: 0.35rem 0;
                }

                .md-list-item {
                    margin: 0.15rem 0;
                    line-height: 1.4;
                }

                .md-quote {
                    border-left: 3px solid var(--border-primary);
                    padding-left: var(--spacing-md);
                    color: var(--text-secondary);
                    margin: var(--spacing-sm) 0;
                }

                .md-image {
                    max-width: 100%;
                    height: auto;
                    border: 1px solid var(--border-primary);
                    border-radius: var(--radius-md);
                    margin: var(--spacing-sm) 0;
                    display: block;
                }

                .md-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: var(--spacing-md) 0;
                    font-size: 0.95rem;
                }

                .md-table th,
                .md-table td {
                    border: 1px solid var(--border-primary);
                    padding: 8px 10px;
                    text-align: left;
                }

                .md-table thead {
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                }

                .md-table tbody tr:nth-child(odd) {
                    background: var(--bg-secondary);
                }

                .token-metrics {
                    margin-top: 6px;
                    font-size: 0.8rem;
                    color: var(--text-tertiary);
                }

                .chat-input-sticky {
                    padding: var(--spacing-lg);
                    display: flex;
                    justify-content: center;
                    background: linear-gradient(to top, var(--bg-primary) 80%, transparent);
                }

                .chat-input-sticky .chat-input-card {
                    width: 100%;
                    max-width: 800px;
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                    padding: var(--spacing-sm);
                }

                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .modal-content {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-primary);
                    border-radius: var(--radius-xl);
                    padding: var(--spacing-xl);
                    width: 300px;
                    max-width: 90%;
                    box-shadow: var(--shadow-xl);
                }

                .checkbox-label {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: pointer;
                    padding: var(--spacing-sm) 0;
                    color: var(--text-primary);
                }

                .checkbox-label:hover {
                    color: var(--text-primary);
                }

                .markdown-body p {
                    margin-bottom: 1em;
                }

                .markdown-body p:last-child {
                    margin-bottom: 0;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .loading-spinner {
                    animation: spin 0.8s linear infinite;
                }
            `}</style>
        </div>
    );
};
