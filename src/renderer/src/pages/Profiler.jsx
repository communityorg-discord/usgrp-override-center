import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Profiler() {
    const { fetchApi } = useApi();
    const [history, setHistory] = useState([]);
    const [processes, setProcesses] = useState([]);
    const [paused, setPaused] = useState(false);
    const [selectedMetrics, setSelectedMetrics] = useState(new Set()); // pm_id
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (!paused) fetchData();
        }, 2000);
        return () => clearInterval(interval);
    }, [paused]);

    async function fetchData() {
        try {
            // Using existing endpoint or assuming pm2 list capability
            // If /override/pm2/list doesn't exist, I might fallback to system/processes but filtering for node?
            // Let's assume there is a generic stats endpoint or we reuse processes
            // Actually, let's try /override/system/processes and filter for likely PM2/Node processes
            // OR better, assume /override/pm2/list exists as it is standard in USGRP ecosystem
            
            const data = await fetchApi('/override/pm2/list'); 
            // Format: { success: true, processes: [ { name, id, cpu, memory, memoryMB, restarts, ... } ] }
            
            if (data?.processes && data.processes.length > 0) {
                const now = new Date().toLocaleTimeString();
                const point = { time: now };
                const currentProcs = [];

                data.processes.forEach(proc => {
                    const memMB = proc.memoryMB || Math.round((proc.memory || 0) / 1024 / 1024);
                    point[proc.name] = memMB;
                    
                    currentProcs.push({
                        id: proc.id || proc.pm_id,
                        name: proc.name,
                        mem: memMB,
                        cpu: proc.cpu || 0,
                        restarts: proc.restarts || 0
                    });

                    // CPU Spike Detection
                    if ((proc.cpu || 0) > 80) {
                        addAlert(proc.name, `High CPU usage: ${proc.cpu}%`);
                    }
                });

                setProcesses(currentProcs);
                setHistory(prev => {
                    const newHist = [...prev, point];
                    if (newHist.length > 30) newHist.shift(); // Keep last 30 points (1 min)
                    return newHist;
                });
                
                // Auto-select top 5 memory users if none selected
                if (selectedMetrics.size === 0 && currentProcs.length > 0) {
                    const top5 = [...currentProcs].sort((a,b) => b.mem - a.mem).slice(0, 5).map(p => p.name);
                    setSelectedMetrics(new Set(top5));
                }
            }
        } catch (error) {
            console.error('Profiler fetch error:', error);
            // Fallback for demo if API fails
            // mockData();
        }
    }

    function addAlert(proc, msg) {
        setAlerts(prev => {
            // Dedup
            if (prev.some(a => a.proc === proc && a.msg === msg && Date.now() - a.time < 10000)) return prev;
            return [{ proc, msg, time: Date.now() }, ...prev].slice(0, 5);
        });
    }

    function toggleMetric(name) {
        const newSet = new Set(selectedMetrics);
        if (newSet.has(name)) newSet.delete(name);
        else newSet.add(name);
        setSelectedMetrics(newSet);
    }

    // Colors for lines
    const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Performance Profiler</h1>
                    <p className="text-gray-400 mt-1">Real-time PM2 process monitoring</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setPaused(!paused)}
                        className={`px-4 py-2 rounded-lg font-bold transition-colors ${paused ? 'bg-green-500 text-black' : 'bg-yellow-500 text-black'}`}
                    >
                        {paused ? 'Resume' : 'Pause'}
                    </button>
                    <button 
                        onClick={() => setHistory([])}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                    >
                        Clear
                    </button>
                </div>
            </div>

            <div className="flex gap-6 flex-1 min-h-0">
                {/* Left: Chart */}
                <div className="flex-1 bg-[#1a1a24] border border-white/5 rounded-xl p-4 flex flex-col">
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Memory Usage (MB)</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="time" stroke="#666" fontSize={12} tick={{fill: '#666'}} />
                                <YAxis stroke="#666" fontSize={12} tick={{fill: '#666'}} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#000', borderColor: '#333', color: '#fff' }}
                                    itemStyle={{ fontSize: 12 }}
                                />
                                <Legend />
                                {Array.from(selectedMetrics).map((name, i) => (
                                    <Line 
                                        key={name}
                                        type="monotone" 
                                        dataKey={name} 
                                        stroke={colors[i % colors.length]} 
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                        isAnimationActive={false}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right: Stats */}
                <div className="w-80 flex flex-col gap-4">
                    {/* Alerts */}
                    {alerts.length > 0 && (
                        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                            <h3 className="text-xs font-bold text-red-400 uppercase mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Alerts
                            </h3>
                            <div className="space-y-2">
                                {alerts.map((a, i) => (
                                    <div key={i} className="text-xs text-red-200 bg-red-900/40 p-2 rounded border border-red-500/20">
                                        <div className="font-bold">{a.proc}</div>
                                        <div>{a.msg}</div>
                                        <div className="text-[10px] opacity-70 mt-1">{new Date(a.time).toLocaleTimeString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Process List */}
                    <div className="flex-1 bg-[#1a1a24] border border-white/5 rounded-xl flex flex-col overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/5">
                            <h3 className="text-sm font-bold text-gray-400 uppercase">Processes</h3>
                        </div>
                        <div className="flex-1 overflow-auto p-2 space-y-1">
                            {processes.map((proc, i) => (
                                <button
                                    key={proc.id}
                                    onClick={() => toggleMetric(proc.name)}
                                    className={`w-full flex items-center justify-between p-2 rounded text-xs transition-colors border ${
                                        selectedMetrics.has(proc.name) 
                                            ? 'bg-white/10 border-white/20' 
                                            : 'bg-transparent border-transparent hover:bg-white/5'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div 
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: selectedMetrics.has(proc.name) ? colors[Array.from(selectedMetrics).indexOf(proc.name) % colors.length] : '#666' }}
                                        ></div>
                                        <span className="text-white font-medium truncate max-w-[100px]">{proc.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-gray-300">{proc.mem} MB</div>
                                        <div className={`text-[10px] ${proc.cpu > 50 ? 'text-red-400' : 'text-gray-500'}`}>
                                            CPU: {proc.cpu}% | R: {proc.restarts}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
