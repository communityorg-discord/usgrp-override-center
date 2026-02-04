import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function SystemMetrics() {
    const { fetchApi } = useApi();
    const [metrics, setMetrics] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [streamData, setStreamData] = useState([]);
    const eventSourceRef = useRef(null);

    useEffect(() => {
        loadMetrics();
        const interval = setInterval(loadMetrics, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    // Setup SSE stream for real-time updates
    useEffect(() => {
        setupStream();
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    async function setupStream() {
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            // Note: EventSource doesn't support custom headers, so we'll poll instead
            // For real SSE we'd need a proxy or different auth approach
        } catch (err) {
            console.error('Stream setup failed:', err);
        }
    }

    async function loadMetrics() {
        try {
            const data = await fetchApi('/override/system/metrics?history=true');
            if (data?.current) {
                setMetrics(data.current);
                if (data.history) {
                    setHistory(data.history);
                }
            }
        } catch (error) {
            console.error('Failed to load metrics:', error);
        } finally {
            setLoading(false);
        }
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900 border border-white/10 rounded-lg p-3 shadow-xl">
                    <p className="text-gray-400 text-xs mb-1">{label}</p>
                    {payload.map((entry, i) => (
                        <p key={i} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: {entry.value}{entry.name.includes('%') || entry.name === 'CPU' ? '%' : ' MB'}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            📊
                        </span>
                        System Metrics
                    </h1>
                    <p className="text-gray-400 mt-1">Real-time server performance monitoring</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-500">Uptime</p>
                    <p className="text-sm text-white font-mono">{metrics?.uptime || 'N/A'}</p>
                </div>
            </div>

            {/* Current Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                {/* CPU */}
                <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                            🔥
                        </div>
                        <span className={`text-2xl font-bold ${
                            metrics?.cpu?.usage > 80 ? 'text-red-400' : 
                            metrics?.cpu?.usage > 50 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                            {metrics?.cpu?.usage || 0}%
                        </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">CPU Usage</h3>
                    <p className="text-xs text-gray-500 mt-1">
                        Load: {metrics?.cpu?.load1m || 0} / {metrics?.cpu?.load5m || 0} / {metrics?.cpu?.load15m || 0}
                    </p>
                    <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-500 ${
                                metrics?.cpu?.usage > 80 ? 'bg-red-500' : 
                                metrics?.cpu?.usage > 50 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${metrics?.cpu?.usage || 0}%` }}
                        />
                    </div>
                </div>

                {/* Memory */}
                <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                            🧠
                        </div>
                        <span className={`text-2xl font-bold ${
                            metrics?.memory?.percent > 80 ? 'text-red-400' : 
                            metrics?.memory?.percent > 60 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                            {Math.round(metrics?.memory?.percent || 0)}%
                        </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">Memory</h3>
                    <p className="text-xs text-gray-500 mt-1">
                        {metrics?.memory?.used || 0} MB / {metrics?.memory?.total || 0} MB
                    </p>
                    <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-500 ${
                                metrics?.memory?.percent > 80 ? 'bg-red-500' : 
                                metrics?.memory?.percent > 60 ? 'bg-yellow-500' : 'bg-purple-500'
                            }`}
                            style={{ width: `${metrics?.memory?.percent || 0}%` }}
                        />
                    </div>
                </div>

                {/* Disk */}
                <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                            💾
                        </div>
                        <span className={`text-2xl font-bold ${
                            metrics?.disk?.percent > 80 ? 'text-red-400' : 
                            metrics?.disk?.percent > 60 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                            {metrics?.disk?.percent || 0}%
                        </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">Disk Space</h3>
                    <p className="text-xs text-gray-500 mt-1">
                        {metrics?.disk?.used || '0G'} / {metrics?.disk?.total || '0G'}
                    </p>
                    <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-500 ${
                                metrics?.disk?.percent > 80 ? 'bg-red-500' : 
                                metrics?.disk?.percent > 60 ? 'bg-yellow-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${metrics?.disk?.percent || 0}%` }}
                        />
                    </div>
                </div>

                {/* Network */}
                <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                            🌐
                        </div>
                        <span className="text-2xl font-bold text-cyan-400">
                            {metrics?.network?.totalBytes ? 
                                (metrics.network.totalBytes / 1024 / 1024 / 1024).toFixed(1) + ' GB' 
                                : 'N/A'
                            }
                        </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">Network I/O</h3>
                    <p className="text-xs text-gray-500 mt-1">Total transferred</p>
                    <div className="mt-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs text-gray-400">Connected</span>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-6">
                {/* CPU History */}
                <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-blue-400">📈</span> CPU Usage (Last Hour)
                    </h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="time" tick={{ fill: '#666', fontSize: 10 }} />
                                <YAxis domain={[0, 100]} tick={{ fill: '#666', fontSize: 10 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area 
                                    type="monotone" 
                                    dataKey="cpu" 
                                    name="CPU"
                                    stroke="#3b82f6" 
                                    fill="url(#cpuGradient)" 
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Memory History */}
                <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-purple-400">📈</span> Memory Usage (Last Hour)
                    </h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="time" tick={{ fill: '#666', fontSize: 10 }} />
                                <YAxis domain={[0, 100]} tick={{ fill: '#666', fontSize: 10 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area 
                                    type="monotone" 
                                    dataKey="memoryPercent" 
                                    name="Memory %"
                                    stroke="#a855f7" 
                                    fill="url(#memGradient)" 
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Combined Chart */}
            <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-cyan-400">📊</span> System Overview
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="time" tick={{ fill: '#666', fontSize: 10 }} />
                            <YAxis domain={[0, 100]} tick={{ fill: '#666', fontSize: 10 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line 
                                type="monotone" 
                                dataKey="cpu" 
                                name="CPU"
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                dot={false}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="memoryPercent" 
                                name="Memory %"
                                stroke="#a855f7" 
                                strokeWidth={2}
                                dot={false}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="diskPercent" 
                                name="Disk %"
                                stroke="#f59e0b" 
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        <span className="text-xs text-gray-400">CPU</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                        <span className="text-xs text-gray-400">Memory</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                        <span className="text-xs text-gray-400">Disk</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-gray-600">
                Data refreshes every 30 seconds • Historical data collected every minute
            </p>
        </div>
    );
}
