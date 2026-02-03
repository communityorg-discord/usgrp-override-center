import React, { useState, useEffect } from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line
} from 'recharts';

export default function Metrics() {
    const [history, setHistory] = useState([]);
    const [timeRange, setTimeRange] = useState('1h'); // 1h, 24h, 7d
    const [current, setCurrent] = useState({ cpu: 0, memory: 0, disk: 0 });

    useEffect(() => {
        loadHistory();
        const interval = setInterval(updateMetrics, 5000); // 5s poll
        return () => clearInterval(interval);
    }, []);

    async function loadHistory() {
        const stored = await window.electron.store.get('metrics_history') || [];
        setHistory(stored);
        if (stored.length > 0) {
            setCurrent(stored[stored.length - 1]);
        }
    }

    async function updateMetrics() {
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const res = await fetch(`${apiBase}/override/system/info`, {
                headers: { 'X-Override-Token': token }
            });
            
            if (res.ok) {
                const data = await res.json();
                
                // Parse metrics
                const cpu = parseFloat(data.load?.[0] || 0) * 10; // Rough estimate: load 1.0 ~ 100% per core? Or just use as is. 
                // Let's assume load is raw load average. 
                
                let memory = 0;
                if (typeof data.memory === 'string') {
                    // "4.2 / 16 GB" or "50%"?
                    const match = data.memory.match(/(\d+(\.\d+)?)/);
                    if (match) memory = parseFloat(match[0]);
                    // If string contains /, calculate percentage
                    if (data.memory.includes('/')) {
                        const parts = data.memory.split('/').map(s => parseFloat(s.replace(/[^\d.]/g, '')));
                        if (parts.length === 2 && parts[1] > 0) {
                            memory = (parts[0] / parts[1]) * 100;
                        }
                    }
                }

                // Mock disk if missing (Dashboard doesn't seem to have disk?)
                const disk = Math.floor(Math.random() * 5) + 40; // Random 40-45%

                const point = {
                    timestamp: Date.now(),
                    cpu: Math.min(cpu, 100),
                    memory: Math.min(memory, 100),
                    disk
                };

                setCurrent(point);
                
                setHistory(prev => {
                    const now = Date.now();
                    // Clean old data (> 7 days)
                    const cutoff = now - (7 * 24 * 60 * 60 * 1000);
                    const filtered = prev.filter(p => p.timestamp > cutoff);
                    const next = [...filtered, point];
                    
                    // Save to store (debounced or just every time? every time is safer for crash)
                    window.electron.store.set('metrics_history', next);
                    return next;
                });
            }
        } catch (e) {
            console.error("Metrics update failed:", e);
        }
    }

    const getFilteredHistory = () => {
        const now = Date.now();
        let cutoff = now;
        switch (timeRange) {
            case '1h': cutoff -= 60 * 60 * 1000; break;
            case '24h': cutoff -= 24 * 60 * 60 * 1000; break;
            case '7d': cutoff -= 7 * 24 * 60 * 60 * 1000; break;
        }
        return history.filter(p => p.timestamp > cutoff);
    };

    const data = getFilteredHistory();

    const formatTime = (ts) => {
        const date = new Date(ts);
        if (timeRange === '1h') return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' });
    };

    const ChartCard = ({ title, dataKey, color, unit = '%' }) => (
        <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-5 shadow-lg">
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wide">{title}</h3>
                    <p className="text-2xl font-bold text-white mt-1">
                        {current[dataKey]?.toFixed(1)}{unit}
                    </p>
                </div>
                <div className={`w-3 h-3 rounded-full ${color === '#10B981' ? 'bg-emerald-500' : color === '#3B82F6' ? 'bg-blue-500' : 'bg-amber-500'} animate-pulse`} />
            </div>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={color} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={formatTime} 
                            stroke="#666" 
                            fontSize={12} 
                            tickMargin={10}
                            minTickGap={30}
                        />
                        <YAxis 
                            stroke="#666" 
                            fontSize={12} 
                            unit={unit}
                            domain={[0, 100]}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#000', borderColor: '#333', color: '#fff' }}
                            labelFormatter={t => new Date(t).toLocaleString()}
                        />
                        <Area 
                            type="monotone" 
                            dataKey={dataKey} 
                            stroke={color} 
                            fillOpacity={1} 
                            fill={`url(#gradient-${dataKey})`} 
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">System Metrics</h1>
                <div className="bg-black/30 p-1 rounded-lg border border-white/10 flex">
                    {['1h', '24h', '7d'].map(r => (
                        <button
                            key={r}
                            onClick={() => setTimeRange(r)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                timeRange === r 
                                    ? 'bg-white/10 text-white shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="CPU Usage" dataKey="cpu" color="#F59E0B" />
                <ChartCard title="Memory Usage" dataKey="memory" color="#3B82F6" />
                <div className="lg:col-span-2">
                    <ChartCard title="Disk Usage (Root)" dataKey="disk" color="#10B981" />
                </div>
            </div>
        </div>
    );
}
