import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function RateLimits() {
    const { fetchApi } = useApi();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadStats();
        // Poll every 30s
        const interval = setInterval(loadStats, 30000);
        return () => clearInterval(interval);
    }, []);

    async function loadStats() {
        setLoading(true);
        try {
            const data = await fetchApi('/override/ratelimits/stats');
            if (data.success) {
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to load rate limits:', error);
        } finally {
            setLoading(false);
        }
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-surface-elevated border border-white/10 p-3 rounded shadow-xl">
                    <p className="font-mono text-sm text-gold">{label}</p>
                    <p className="text-sm text-white">Blocked: {payload[0].value}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="heading-xl text-gold-gradient">Rate Limits</h1>
                    <p className="text-gray-400">Monitor API abuse and blocked requests</p>
                </div>
                <button 
                    onClick={loadStats} 
                    className={`btn btn-secondary ${loading ? 'opacity-75' : ''}`}
                    disabled={loading}
                >
                    {loading ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    )}
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stats Card */}
                <div className="card lg:col-span-1 flex flex-col justify-center items-center py-10">
                    <div className="text-6xl font-bold text-red-500 mb-2">
                        {stats?.totalBlocked || 0}
                    </div>
                    <div className="text-gray-400 uppercase tracking-wider text-sm">Total Blocked Requests</div>
                    <div className="text-xs text-gray-600 mt-2">(Last 2000 log lines)</div>
                </div>

                {/* Chart */}
                <div className="card lg:col-span-2 min-h-[300px]">
                    <h3 className="heading-sm mb-4">Top Offenders</h3>
                    <div className="h-[250px] w-full">
                        {stats?.topOffenders?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.topOffenders} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="ip" stroke="#6b7280" fontSize={12} width={100} tick={{fill: '#9ca3af'}} />
                                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                                    <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]}>
                                        {stats.topOffenders.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#b91c1c'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                No data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Blocks List */}
                <div className="card lg:col-span-3">
                    <h3 className="heading-sm mb-4">Recent Blocks</h3>
                    <div className="overflow-x-auto">
                        <table className="table-dark w-full">
                            <thead>
                                <tr>
                                    <th>Timestamp (Approx)</th>
                                    <th>Log Detail</th>
                                </tr>
                            </thead>
                            <tbody className="font-mono text-sm">
                                {stats?.recentBlocks?.length > 0 ? (
                                    stats.recentBlocks.slice().reverse().map((block, i) => (
                                        <tr key={i} className="hover:bg-white/[0.02]">
                                            <td className="text-gray-500 w-48">{new Date(block.timestamp).toLocaleTimeString()}</td>
                                            <td className="text-red-400/80 truncate max-w-3xl">{block.line}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="2" className="text-center py-8 text-gray-500">
                                            No recent blocks found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
