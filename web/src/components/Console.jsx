import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

export const Console = ({ logs, style, className = '' }) => {
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            // Stick to bottom as new logs arrive
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div
            className={`glass-panel ${className}`.trim()}
            style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', ...style }}
        >
            <div style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(0,0,0,0.05)'
            }}>
                <Terminal size={14} color="var(--text-secondary)" />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.5px' }}>Live Terminal</span>
            </div>
            <div
                ref={scrollRef}
                className="mono"
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1rem',
                    fontSize: '0.85rem',
                    lineHeight: '1.5'
                }}
            >
                {logs.length === 0 && <span style={{ color: 'var(--text-secondary)' }}>Waiting for benchmark start...</span>}
                {logs.map((log, i) => (
                    <div key={i} style={{ marginBottom: '4px', color: log.level === 'ERROR' ? '#ff4d4d' : 'var(--text-primary)' }}>
                        <span style={{ color: 'var(--text-secondary)', marginRight: '8px' }}>[{new Date(log.timestamp * 1000).toLocaleTimeString()}]</span>
                        {log.message}
                    </div>
                ))}
            </div>
        </div>
    );
};
