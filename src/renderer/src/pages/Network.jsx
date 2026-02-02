import React, { useState, useEffect, useRef } from 'react';

export default function Network() {
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const lastBandwidthRef = useRef(null);
    const pollIntervalRef = useRef(null);

    useEffect(() => {
        fetchStats();
        pollIntervalRef.current = setInterval(fetchStats, 2000);
        return () => clearInterval(pollIntervalRef.current);
    }, []);

    async function fetchStats() {
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const res = await fetch(`${apiBase}/override/network/stats`, {
                headers: { 'X-Override-Token': token }
            });

            if (!res.ok) throw new Error('Failed to fetch stats');
            
            const data = await res.json();
            
            // Calculate Speed
            const now = Date.now();
            let rxSpeed = 0;
            let txSpeed = 0;
            
            if (lastBandwidthRef.current) {
                const deltaT = (data.bandwidth.timestamp - lastBandwidthRef.current.timestamp) / 1000;
                if (deltaT > 0) {
                    rxSpeed = (data.bandwidth.rx - lastBandwidthRef.current.rx) / deltaT;
                    txSpeed = (data.bandwidth.tx - lastBandwidthRef.current.tx) / deltaT;
                }
            }
            
            lastBandwidthRef.current = data.bandwidth;

            // Update History
            setHistory(prev => {
                const newPoint = { time: now, rx: rxSpeed, tx: txSpeed };
                const newHistory = [...prev, newPoint].slice(-30); // Keep last 30 points (60s)
                return newHistory;
            });

            setStats(data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setError(err.message);
            setLoading(false);
        }
    }

    async function handleBlock(ip) {
        if (!confirm(`Are you sure you want to BLOCK ${ip} in the firewall? This will run 'ufw deny'.`)) return;
        
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const res = await fetch(`${apiBase}/override/network/block`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Override-Token': token 
                },
                body: JSON.stringify({ ip })
            });
            
            const result = await res.json();
            if (result.success) {
                alert(`Blocked ${ip}\nOutput: ${result.output}`);
            } else {
                alert(`Failed: ${result.error}`);
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 B/s';
        const k = 1024;
        const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Simple Sparkline Component
    const Sparkline = ({ data, dataKey, color, height = 100 }) => {
        if (!data || data.length < 2) return <div className="h-[100px] flex items-center justify-center text-gray-600">Waiting for data...</div>;

        const max = Math.max(...data.map(d => d[dataKey]), 1024); // Min 1KB scale
        const points = data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - ((d[dataKey] / max) * 100);
            return `${x},${y}`;
        }).join(' ');

        return (
            <div className="relative w-full overflow-hidden rounded bg-gray-900/50 border border-gray-700" style={{ height }}>
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <polyline
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        points={points}
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
                <div className="absolute top-1 right-2 text-xs font-mono" style={{ color }}>
                    Max: {formatBytes(max)}
                </div>
            </div>
        );
    };

    if (loading && !stats) return <div className="p-8 text-center text-gray-400">Loading Network Monitor...</div>;
    if (error) return <div className="p-8 text-center text-red-400">Error: {error}</div>;

    const currentRx = history.length ? history[history.length - 1].rx : 0;
    const currentTx = history.length ? history[history.length - 1].tx : 0;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-10">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Network Monitor</h1>
                    <p className="text-gray-400 text-sm">Real-time traffic, ports, and connections</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-gray-800 rounded px-4 py-2 border border-gray-700">
                        <div className="text-xs text-green-400 font-bold uppercase">Incoming (RX)</div>
                        <div className="text-xl font-mono text-white">{formatBytes(currentRx)}</div>
                    </div>
                    <div className="bg-gray-800 rounded px-4 py-2 border border-gray-700">
                        <div className="text-xs text-blue-400 font-bold uppercase">Outgoing (TX)</div>
                        <div className="text-xl font-mono text-white">{formatBytes(currentTx)}</div>
                    </div>
                </div>
            </header>

            {/* Graphs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Download Traffic</h3>
                    <Sparkline data={history} dataKey="rx" color="#4ade80" />
                </div>
                <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Upload Traffic</h3>
                    <Sparkline data={history} dataKey="tx" color="#60a5fa" />
                </div>
            </div>

            {/* Ports */}
            <div className="bg-surface-secondary rounded-lg border border-gray-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 flex justify-between items-center">
                    <h3 className="font-semibold text-white">Open Ports</h3>
                    <span className="text-xs text-gray-500">{stats.ports.length} listening</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-800/50 text-gray-400 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-2">Process</th>
                                <th className="px-4 py-2">Proto</th>
                                <th className="px-4 py-2">Port</th>
                                <th className="px-4 py-2">Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {stats.ports.map((p, i) => (
                                <tr key={i} className="hover:bg-gray-800/30">
                                    <td className="px-4 py-2 text-white font-medium">{p.process}</td>
                                    <td className="px-4 py-2 text-gray-400">{p.protocol}</td>
                                    <td className="px-4 py-2 text-amber-400 font-mono">{p.port}</td>
                                    <td className="px-4 py-2 text-gray-500">{p.address}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Connections */}
            <div className="bg-surface-secondary rounded-lg border border-gray-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 flex justify-between items-center">
                    <h3 className="font-semibold text-white">Active Connections</h3>
                    <span className="text-xs text-gray-500">Showing top {stats.connections.length}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-800/50 text-gray-400 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-2">Remote IP</th>
                                <th className="px-4 py-2">State</th>
                                <th className="px-4 py-2">Protocol</th>
                                <th className="px-4 py-2 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {stats.connections.map((c, i) => (
                                <tr key={i} className="hover:bg-gray-800/30">
                                    <td className="px-4 py-2 text-white font-mono">{c.remote}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                            c.state === 'ESTAB' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
                                        }`}>
                                            {c.state}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-gray-400">{c.protocol}</td>
                                    <td className="px-4 py-2 text-right">
                                        <button 
                                            onClick={() => handleBlock(c.remoteIp)}
                                            className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded hover:bg-red-500 hover:text-white transition-colors border border-red-500/20"
                                        >
                                            Block IP
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {stats.connections.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-4 py-4 text-center text-gray-500">
                                        No active connections found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
