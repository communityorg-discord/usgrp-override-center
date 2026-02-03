import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#D4AF37', '#4F9DDE', '#7DD87D', '#E67373', '#9B7DD8', '#E6A346', '#5DADE2', '#58D68D'];

export default function ActivityDashboard() {
    const { fetchApi, loading, error } = useApi();
    const [data, setData] = useState(null);

    useEffect(() => {
        loadStats();
    }, []);

    async function loadStats() {
        try {
            const result = await fetchApi('/override/activity/stats');
            if (result) {
                setData(result);
            }
        } catch (err) {
            console.error('Failed to load activity stats:', err);
        }
    }

    // Build heatmap data from hourly activity
    function buildHeatmapData() {
        if (!data?.hourlyActivity) return [];
        
        const hourMap = {};
        data.hourlyActivity.forEach(h => {
            hourMap[parseInt(h.hour)] = h.count;
        });
        
        return Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            label: `${i.toString().padStart(2, '0')}:00`,
            count: hourMap[i] || 0
        }));
    }

    function getHeatIntensity(count, max) {
        if (count === 0) return 'bg-gray-800';
        const ratio = count / max;
        if (ratio > 0.8) return 'bg-amber-500';
        if (ratio > 0.6) return 'bg-amber-600';
        if (ratio > 0.4) return 'bg-amber-700';
        if (ratio > 0.2) return 'bg-amber-800';
        return 'bg-amber-900';
    }

    const heatmapData = buildHeatmapData();
    const maxHourlyCount = Math.max(...heatmapData.map(h => h.count), 1);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="heading-xl text-white flex items-center gap-3">
                        <span className="text-2xl">📊</span>
                        Activity Dashboard
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Server activity analytics and user engagement
                    </p>
                </div>
                <button onClick={loadStats} className="btn btn-secondary" disabled={loading}>
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card">
                    <div className="text-gray-500 text-sm">Total Commands (7d)</div>
                    <div className="text-2xl font-bold text-white mt-1">
                        {data?.dailyActivity?.reduce((sum, d) => sum + d.count, 0)?.toLocaleString() || 0}
                    </div>
                </div>
                <div className="card">
                    <div className="text-gray-500 text-sm">Active Users (7d)</div>
                    <div className="text-2xl font-bold text-amber-400 mt-1">
                        {data?.topUsers?.length || 0}
                    </div>
                </div>
                <div className="card">
                    <div className="text-gray-500 text-sm">Peak Hour</div>
                    <div className="text-2xl font-bold text-green-400 mt-1">
                        {heatmapData.reduce((max, h) => h.count > max.count ? h : max, { count: 0 })?.label || 'N/A'}
                    </div>
                </div>
                <div className="card">
                    <div className="text-gray-500 text-sm">Top Command</div>
                    <div className="text-2xl font-bold text-blue-400 mt-1">
                        {data?.commandStats?.[0]?.command || 'N/A'}
                    </div>
                </div>
            </div>

            {/* Hourly Activity Heatmap */}
            <div className="card">
                <h2 className="text-lg font-semibold text-white mb-4">Hourly Activity Heatmap (Last 7 Days)</h2>
                <div className="flex flex-wrap gap-1">
                    {heatmapData.map((hour, idx) => (
                        <div
                            key={idx}
                            className={`w-10 h-10 rounded flex items-center justify-center text-xs font-mono transition-colors ${getHeatIntensity(hour.count, maxHourlyCount)}`}
                            title={`${hour.label}: ${hour.count} commands`}
                        >
                            {hour.hour}
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                    <span>Less</span>
                    <div className="flex gap-1">
                        <div className="w-4 h-4 rounded bg-gray-800"></div>
                        <div className="w-4 h-4 rounded bg-amber-900"></div>
                        <div className="w-4 h-4 rounded bg-amber-800"></div>
                        <div className="w-4 h-4 rounded bg-amber-700"></div>
                        <div className="w-4 h-4 rounded bg-amber-600"></div>
                        <div className="w-4 h-4 rounded bg-amber-500"></div>
                    </div>
                    <span>More</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Activity Chart */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-white mb-4">Daily Activity (30 Days)</h2>
                    <div className="h-64">
                        {data?.dailyActivity?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={[...data.dailyActivity].reverse()}>
                                    <defs>
                                        <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis 
                                        dataKey="date" 
                                        stroke="rgba(255,255,255,0.3)"
                                        tick={{ fontSize: 10 }}
                                        tickFormatter={(v) => v.slice(5)}
                                    />
                                    <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            background: 'rgba(10,10,15,0.95)', 
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px'
                                        }}
                                        labelStyle={{ color: '#fff' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="count" 
                                        stroke="#D4AF37" 
                                        fill="url(#colorActivity)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                No activity data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Active Users */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-white mb-4">Top Active Users (7 Days)</h2>
                    <div className="h-64">
                        {data?.topUsers?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.topUsers.slice(0, 10)} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis type="number" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
                                    <YAxis 
                                        type="category" 
                                        dataKey="user_id" 
                                        stroke="rgba(255,255,255,0.3)"
                                        tick={{ fontSize: 10 }}
                                        width={100}
                                        tickFormatter={(v) => v.slice(0, 8) + '...'}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            background: 'rgba(10,10,15,0.95)', 
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Bar dataKey="command_count" fill="#D4AF37" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                No user data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Command Usage */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-white mb-4">Top Commands (7 Days)</h2>
                    <div className="h-64">
                        {data?.commandStats?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.commandStats.slice(0, 8)}
                                        dataKey="count"
                                        nameKey="command"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ command, percent }) => `${command} (${(percent * 100).toFixed(0)}%)`}
                                        labelLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                                    >
                                        {data.commandStats.slice(0, 8).map((_, idx) => (
                                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ 
                                            background: 'rgba(10,10,15,0.95)', 
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                No command data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Command Stats Table */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-white mb-4">Command Breakdown</h2>
                    <div className="max-h-64 overflow-y-auto scrollbar-dark">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-[#0a0a0f]">
                                <tr className="text-left text-gray-500 text-sm">
                                    <th className="pb-2">Command</th>
                                    <th className="pb-2 text-right">Uses</th>
                                    <th className="pb-2 text-right">%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.commandStats?.map((cmd, idx) => {
                                    const total = data.commandStats.reduce((s, c) => s + c.count, 0);
                                    const pct = ((cmd.count / total) * 100).toFixed(1);
                                    return (
                                        <tr key={idx} className="border-t border-white/5">
                                            <td className="py-2 text-white font-mono text-sm">{cmd.command}</td>
                                            <td className="py-2 text-right text-gray-400">{cmd.count.toLocaleString()}</td>
                                            <td className="py-2 text-right text-amber-400">{pct}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
