import React, { useState, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import './InteractiveChart.css';

const CHART_CONFIG = {
    input: {
        label: "Input Tokens",
        color: "#3B82F6", // Blue
    },
    output: {
        label: "Output Tokens",
        color: "#10B981", // Emerald
    },
};

export function InteractiveTokenChart({ results = [] }) {
    const [timeRange, setTimeRange] = useState("all");

    // 1. Process data: Map results to chart format
    // Filter out invalid runs or ensures data integrity
    const chartData = useMemo(() => {
        if (!results || results.length === 0) return [];

        return results.map(r => {
            const metrics = r.token_metrics || {};
            // Fallback: try input_tokens/output_tokens directly if token_metrics obj missing
            const input = metrics.prompt_tokens || metrics.input_tokens || r.prompt_tokens || 0;
            const output = metrics.completion_tokens || metrics.output_tokens || r.completion_tokens || 0;

            // Handle timestamp (seconds vs ms)
            const date = r.timestamp
                ? new Date(r.timestamp * (r.timestamp > 1e11 ? 1 : 1000))
                : new Date();

            return {
                date: date,
                input: input,
                output: output,
                task: r.taskName || 'Unknown Task'
            };
        }).sort((a, b) => a.date - b.date); // Ensure chronological order
    }, [results]);

    // 2. Filter data based on time range
    const filteredData = useMemo(() => {
        if (timeRange === "all") return chartData;

        const now = new Date();
        const startTime = new Date(now);

        if (timeRange === "24h") {
            startTime.setHours(now.getHours() - 24);
        } else if (timeRange === "1h") {
            startTime.setMinutes(now.getMinutes() - 60);
        } else if (timeRange === "7d") {
            startTime.setDate(now.getDate() - 7);
        }

        return chartData.filter((item) => item.date >= startTime);
    }, [chartData, timeRange]);

    // 3. Format Date/Time based on range
    const formatDate = (dateValue) => {
        const date = new Date(dateValue);
        if (timeRange === "1h" || timeRange === "24h") {
            // Show time for short ranges
            return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        }
        // Show date for long ranges
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    // Custom Tooltip Component
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip">
                    <span className="tooltip-date">
                        {new Date(label).toLocaleString()}
                    </span>
                    {payload.map((entry, index) => (
                        <div key={index} className="tooltip-item">
                            <span
                                className="tooltip-dot"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span>{entry.name === 'input' ? 'Input Tokens' : 'Output Tokens'}</span>
                            <span className="tooltip-value">{entry.value}</span>
                        </div>
                    ))}
                    {payload[0] && payload[0].payload.task && (
                        <div className="tooltip-item" style={{ marginTop: 8, fontSize: '0.75rem', color: '#9ca3af' }}>
                            {payload[0].payload.task}
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="interactive-chart-card">
            <div className="chart-header">
                <div className="chart-title-group">
                    <h4 className="chart-title">Token Usage Trends</h4>
                    <p className="chart-desc">
                        Comparing Input vs Output tokens over time
                    </p>
                </div>
                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="chart-select"
                >
                    <option value="all">All Time</option>
                    <option value="1h">Last Hour</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                </select>
            </div>

            <div className="chart-content">
                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <AreaChart
                        data={filteredData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="fillInput" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_CONFIG.input.color} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={CHART_CONFIG.input.color} stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="fillOutput" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_CONFIG.output.color} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={CHART_CONFIG.output.color} stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="var(--glass-border)" strokeDasharray="3 3" />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                            tickFormatter={formatDate}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                            width={40}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--glass-border)', strokeWidth: 1 }} />
                        <Area
                            dataKey="output"
                            type="monotone"
                            fill="url(#fillOutput)"
                            stroke={CHART_CONFIG.output.color}
                            fillOpacity={1}
                            strokeWidth={2}
                            stackId="1"
                            name="output"
                            animationDuration={1000}
                        />
                        <Area
                            dataKey="input"
                            type="monotone"
                            fill="url(#fillInput)"
                            stroke={CHART_CONFIG.input.color}
                            fillOpacity={1}
                            strokeWidth={2}
                            stackId="1"
                            name="input"
                            animationDuration={1000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default InteractiveTokenChart;
