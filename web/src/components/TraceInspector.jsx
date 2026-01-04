import React, { useEffect, useRef } from 'react';
import { Activity, Wrench, CheckCircle, AlertTriangle } from 'lucide-react';

export const TraceInspector = ({ events }) => {
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [events]);

    const renderIcon = (phase) => {
        switch (phase) {
            case 'tool':
                return <Wrench size={14} />;
            case 'result':
                return <CheckCircle size={14} />;
            case 'thought':
            default:
                return <Activity size={14} />;
        }
    };

    return (
        <div className="card inspector-card">
            <div className="inspector-header">
                <h3 className="inspector-title">Inspector</h3>
                <span className="inspector-badge">{events.length} steps</span>
            </div>
            <div ref={scrollRef} className="inspector-body">
                {events.length === 0 && (
                    <div className="inspector-empty">No trace yet. Run a task to see steps.</div>
                )}
                {events.map((ev, idx) => (
                    <div key={idx} className="inspector-item">
                        <div className={`inspector-dot phase-${ev.phase || 'thought'}`}>
                            {renderIcon(ev.phase)}
                        </div>
                        <div className="inspector-content">
                            <div className="inspector-row">
                                <span className="inspector-phase">{ev.phase || 'thought'}</span>
                                {ev.tool && <span className="inspector-tool">{ev.tool}</span>}
                                {ev.timestamp && (
                                    <span className="inspector-time">{new Date(ev.timestamp * 1000).toLocaleTimeString()}</span>
                                )}
                            </div>
                            {ev.text && <div className="inspector-text">{ev.text}</div>}
                            {ev.args && (
                                <pre className="inspector-args">{typeof ev.args === 'string' ? ev.args : JSON.stringify(ev.args, null, 2)}</pre>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
