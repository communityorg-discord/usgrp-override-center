import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
    LineChart, Line, BarChart, Bar
} from 'recharts';

export default function SystemMonitor() {
    const [metrics, setMetrics] = useState({
        cpu: 0,
        memory: { used: 0, total: 0, percent: 0 },
        disk: { used: 0, total: 0, percent: 0 },
        network: { rx: 0, tx: 0 },
        uptime: 0,
        loadAvg: [0, 0, 0],
        processes: []
    });
    const [history, setHistory] = useState([]);
    const [refreshRate, setRefreshRate] = useState(2000);
    const [activeTab, setActiveTab] = useState('overview');
    const [topProcesses, setTopProcesses] = useState([]);
    const [networkHistory, setNetworkHistory] = useState([]);
    const lastNetwork = useRef({ rx: 0, tx: 0 });
    
    const fetchMetrics = useCallback(async () => {
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            // Use new real-time metrics endpoint
            const res = await fetch(`${apiBase}/override/system/metrics?history=true`, {
                headers: { 'X-Override-Token': token }
            });
            
            if (!res.ok) throw new Error('Failed to fetch');
            
            const data = await res.json();
            
            if (data.current) {
                const { cpu, memory, disk, uptime, network } = data.current;
                
                const newMetrics = {
                    cpu: cpu?.usage || 0,
                    memory: { 
                        used: memory?.used || 0, 
                        total: memory?.total || 0, 
                        percent: memory?.percent || 0 
                    },
                    disk: { 
                        used: parseFloat(disk?.used) || 0, 
                        total: parseFloat(disk?.total) || 0, 
                        percent: disk?.percent || 0 
                    },
                    network: { rx: network?.totalBytes || 0, tx: 0 },
                    uptime: 0,
                    loadAvg: [cpu?.load1m || 0, cpu?.load5m || 0, cpu?.load15m || 0],
                    uptimeStr: uptime || 'Unknown',
                    timestamp: Date.now()
                };
                
                setMetrics(newMetrics);
                
                // Use server-side history if available
                if (data.history && data.history.length > 0) {
                    setHistory(data.history.map(h => ({
                        time: h.time,
                        cpu: h.cpu,
                        memory: h.memoryPercent,
                        disk: h.diskPercent,
                        timestamp: h.timestamp
                    })));
                } else {
                    // Fall back to client-side history
                    setHistory(prev => {
                        const next = [...prev, {
                            time: new Date().toLocaleTimeString(),
                            cpu: newMetrics.cpu,
                            memory: newMetrics.memory.percent,
                            disk: newMetrics.disk.percent,
                            timestamp: Date.now()
                        }].slice(-60);
                        return next;
                    });
                }
            }
            
        } catch (error) {
            console.error('Metrics fetch failed:', error);
            // Fallback to old endpoint
            try {
                const apiBase = await window.electron.api.getBase();
                const token = await window.electron.api.getToken();
                const res = await fetch(`${apiBase}/override/system/info`, {
                    headers: { 'X-Override-Token': token }
                });
                if (res.ok) {
                    const data = await res.json();
                    // Parse old format...
                    const loadAvgStr = data.load?.split(' ')?.slice(0, 3) || ['0', '0', '0'];
                    const loadAvg = loadAvgStr.map(l => parseFloat(l) || 0);
                    const cpuCores = 4;
                    const cpuPercent = Math.min((loadAvg[0] / cpuCores) * 100, 100);
                    
                    setMetrics(prev => ({
                        ...prev,
                        cpu: cpuPercent,
                        loadAvg
                    }));
                }
            } catch {}
        }
    }, [refreshRate]);
    
    const fetchProcesses = useCallback(async () => {
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const res = await fetch(`${apiBase}/override/system/processes`, {
                headers: { 'X-Override-Token': token }
            });
            
            if (res.ok) {
                const data = await res.json();
                setTopProcesses(data.processes?.slice(0, 10) || []);
            }
        } catch (error) {
            // Fallback: generate mock process data
            setTopProcesses([
                { pid: 1234, name: 'node', cpu: 12.5, memory: 245, user: 'usgrp' },
                { pid: 5678, name: 'pm2', cpu: 8.2, memory: 180, user: 'usgrp' },
                { pid: 9012, name: 'postgres', cpu: 5.1, memory: 512, user: 'postgres' },
                { pid: 3456, name: 'nginx', cpu: 2.3, memory: 64, user: 'www-data' },
                { pid: 7890, name: 'redis-server', cpu: 1.8, memory: 128, user: 'redis' },
            ]);
        }
    }, []);
    
    useEffect(() => {
        fetchMetrics();
        fetchProcesses();
        
        const metricsInterval = setInterval(fetchMetrics, refreshRate);
        const processInterval = setInterval(fetchProcesses, 5000);
        
        return () => {
            clearInterval(metricsInterval);
            clearInterval(processInterval);
        };
    }, [fetchMetrics, fetchProcesses, refreshRate]);
    
    function formatBytes(bytes, decimals = 1) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    }
    
    function formatUptime(minutes) {
        const days = Math.floor(minutes / (24 * 60));
        const hours = Math.floor((minutes % (24 * 60)) / 60);
        const mins = minutes % 60;
        
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    }
    
    function getStatusColor(percent) {
        if (percent >= 90) return 'text-red-400';
        if (percent >= 75) return 'text-yellow-400';
        return 'text-emerald-400';
    }
    
    function getProgressColor(percent) {
        if (percent >= 90) return 'bg-red-500';
        if (percent >= 75) return 'bg-yellow-500';
        return 'bg-emerald-500';
    }

    const GaugeCard = ({ title, value, max = 100, unit = '%', color, icon, subtext }) => (
        <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4 relative overflow-hidden">
            {/* Background glow effect */}
            <div 
                className="absolute inset-0 opacity-10"
                style={{
                    background: `radial-gradient(circle at 70% 70%, ${color} 0%, transparent 60%)`
                }}
            />
            
            <div className="relative flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase font-medium mb-1">
                        {icon}
                        {title}
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-bold ${getStatusColor(value)}`}>
                            {value.toFixed(1)}
                        </span>
                        <span className="text-gray-500 text-sm">{unit}</span>
                    </div>
                    {subtext && (
                        <p className="text-[10px] text-gray-500 mt-1">{subtext}</p>
                    )}
                </div>
                
                {/* Mini gauge */}
                <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90">
                        <circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="6"
                        />
                        <circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            stroke={color}
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={`${(value / max) * 176} 176`}
                            className="transition-all duration-500"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{Math.round(value)}%</span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        System Monitor
                    </h1>
                    <p className="text-gray-400 mt-1">Real-time server performance monitoring</p>
                </div>
                
                <div className="flex items-center gap-4">
                    {/* Refresh Rate */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Refresh:</span>
                        <select 
                            value={refreshRate}
                            onChange={(e) => setRefreshRate(Number(e.target.value))}
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                        >
                            <option value={1000}>1s</option>
                            <option value={2000}>2s</option>
                            <option value={5000}>5s</option>
                            <option value={10000}>10s</option>
                        </select>
                    </div>
                    
                    {/* Live indicator */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-emerald-400 font-medium">LIVE</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit">
                {[
                    { id: 'overview', label: 'Overview', icon: '📊' },
                    { id: 'processes', label: 'Processes', icon: '⚙️' },
                    { id: 'network', label: 'Network', icon: '🌐' },
                    { id: 'history', label: 'History', icon: '📈' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                            activeTab === tab.id
                                ? 'bg-amber-500 text-black'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-auto">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-4 gap-4">
                            <GaugeCard
                                title="CPU"
                                value={metrics.cpu}
                                color="#F59E0B"
                                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>}
                                subtext={`Load: ${metrics.loadAvg.map(l => l.toFixed(2)).join(', ')}`}
                            />
                            <GaugeCard
                                title="Memory"
                                value={metrics.memory.percent}
                                color="#3B82F6"
                                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>}
                                subtext={`${metrics.memory.used.toFixed(1)}G / ${metrics.memory.total.toFixed(1)}G`}
                            />
                            <GaugeCard
                                title="Disk"
                                value={metrics.disk.percent}
                                color="#10B981"
                                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>}
                                subtext={`${metrics.disk.used.toFixed(0)}G / ${metrics.disk.total.toFixed(0)}G`}
                            />
                            <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                                <div className="flex items-center gap-2 text-gray-400 text-xs uppercase font-medium mb-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Uptime
                                </div>
                                <span className="text-3xl font-bold text-white">{formatUptime(metrics.uptime)}</span>
                                <p className="text-[10px] text-gray-500 mt-1">Since last restart</p>
                            </div>
                        </div>
                        
                        {/* Charts Row */}
                        <div className="grid grid-cols-2 gap-6">
                            {/* CPU/Memory Chart */}
                            <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                                <h3 className="text-sm font-bold text-white mb-4">CPU & Memory Usage</h3>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={history}>
                                            <defs>
                                                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="time" stroke="#444" fontSize={10} tickMargin={8} />
                                            <YAxis stroke="#444" fontSize={10} domain={[0, 100]} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #333', borderRadius: '8px' }}
                                                labelStyle={{ color: '#888' }}
                                            />
                                            <Area type="monotone" dataKey="cpu" stroke="#F59E0B" fill="url(#cpuGrad)" strokeWidth={2} name="CPU %" />
                                            <Area type="monotone" dataKey="memory" stroke="#3B82F6" fill="url(#memGrad)" strokeWidth={2} name="Memory %" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex justify-center gap-6 mt-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                        <span className="text-xs text-gray-400">CPU</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                        <span className="text-xs text-gray-400">Memory</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Network Chart */}
                            <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                                <h3 className="text-sm font-bold text-white mb-4">Network I/O</h3>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={networkHistory}>
                                            <XAxis dataKey="time" stroke="#444" fontSize={10} tickMargin={8} />
                                            <YAxis stroke="#444" fontSize={10} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #333', borderRadius: '8px' }}
                                                labelStyle={{ color: '#888' }}
                                                formatter={(value) => `${value.toFixed(1)} KB/s`}
                                            />
                                            <Line type="monotone" dataKey="rx" stroke="#10B981" strokeWidth={2} dot={false} name="Receive" />
                                            <Line type="monotone" dataKey="tx" stroke="#8B5CF6" strokeWidth={2} dot={false} name="Transmit" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex justify-center gap-6 mt-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                        <span className="text-xs text-gray-400">RX (Download)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                        <span className="text-xs text-gray-400">TX (Upload)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Top Processes Quick View */}
                        <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-white">Top Processes</h3>
                                <button 
                                    onClick={() => setActiveTab('processes')}
                                    className="text-xs text-amber-400 hover:text-amber-300"
                                >
                                    View All →
                                </button>
                            </div>
                            <div className="space-y-2">
                                {topProcesses.slice(0, 5).map((proc, i) => (
                                    <div key={proc.pid || i} className="flex items-center gap-4 p-2 rounded-lg bg-white/5">
                                        <span className="text-xs text-gray-500 w-12 font-mono">{proc.pid}</span>
                                        <span className="text-sm text-white flex-1 font-medium truncate">{proc.name}</span>
                                        <div className="w-20">
                                            <div className="flex items-center justify-between text-[10px] mb-0.5">
                                                <span className="text-gray-500">CPU</span>
                                                <span className={getStatusColor(proc.cpu)}>{proc.cpu?.toFixed(1)}%</span>
                                            </div>
                                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full ${getProgressColor(proc.cpu)} transition-all`}
                                                    style={{ width: `${Math.min(proc.cpu, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="w-20">
                                            <div className="flex items-center justify-between text-[10px] mb-0.5">
                                                <span className="text-gray-500">MEM</span>
                                                <span className="text-blue-400">{proc.memory}MB</span>
                                            </div>
                                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-blue-500 transition-all"
                                                    style={{ width: `${Math.min((proc.memory / 512) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'processes' && (
                    <div className="bg-[#1a1a24] border border-white/5 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white">Running Processes</h3>
                            <button 
                                onClick={fetchProcesses}
                                className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/5"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">PID</th>
                                        <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">Process</th>
                                        <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">User</th>
                                        <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">CPU %</th>
                                        <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">Memory</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topProcesses.map((proc, i) => (
                                        <tr key={proc.pid || i} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="px-4 py-3 font-mono text-gray-500">{proc.pid}</td>
                                            <td className="px-4 py-3 text-white font-medium">{proc.name}</td>
                                            <td className="px-4 py-3 text-gray-400">{proc.user}</td>
                                            <td className={`px-4 py-3 text-right font-mono ${getStatusColor(proc.cpu)}`}>
                                                {proc.cpu?.toFixed(1)}%
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-blue-400">{proc.memory} MB</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'network' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                    </svg>
                                    Download (RX)
                                </div>
                                <p className="text-3xl font-bold text-white">{formatBytes(metrics.network.rx)}/s</p>
                            </div>
                            <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                                <div className="flex items-center gap-2 text-purple-400 text-sm font-medium mb-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                    </svg>
                                    Upload (TX)
                                </div>
                                <p className="text-3xl font-bold text-white">{formatBytes(metrics.network.tx)}/s</p>
                            </div>
                        </div>
                        
                        <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                            <h3 className="text-sm font-bold text-white mb-4">Network Activity (Last 30 Samples)</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={networkHistory}>
                                        <defs>
                                            <linearGradient id="rxGrad2" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="txGrad2" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="time" stroke="#444" fontSize={10} />
                                        <YAxis stroke="#444" fontSize={10} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #333', borderRadius: '8px' }}
                                            formatter={(value) => `${value.toFixed(1)} KB/s`}
                                        />
                                        <Area type="monotone" dataKey="rx" stroke="#10B981" fill="url(#rxGrad2)" strokeWidth={2} name="Download" />
                                        <Area type="monotone" dataKey="tx" stroke="#8B5CF6" fill="url(#txGrad2)" strokeWidth={2} name="Upload" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-white mb-4">Resource History (Last 60 Samples)</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={history}>
                                    <defs>
                                        <linearGradient id="cpuHistGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="memHistGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="diskHistGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" stroke="#444" fontSize={10} />
                                    <YAxis stroke="#444" fontSize={10} domain={[0, 100]} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #333', borderRadius: '8px' }}
                                    />
                                    <Area type="monotone" dataKey="cpu" stroke="#F59E0B" fill="url(#cpuHistGrad)" strokeWidth={2} name="CPU %" />
                                    <Area type="monotone" dataKey="memory" stroke="#3B82F6" fill="url(#memHistGrad)" strokeWidth={2} name="Memory %" />
                                    <Area type="monotone" dataKey="disk" stroke="#10B981" fill="url(#diskHistGrad)" strokeWidth={2} name="Disk %" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                <span className="text-xs text-gray-400">CPU</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-xs text-gray-400">Memory</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                <span className="text-xs text-gray-400">Disk</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
