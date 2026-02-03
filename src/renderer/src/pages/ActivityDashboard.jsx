import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell } from 'recharts';

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
                        Server activity analytics and message engagement
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
                    <div className="text-gray-500 text-sm">Messages Today</div>
                    <div className="text-2xl font-bold text-white mt-1">
                        {data?.totalMessagesToday?.toLocaleString() || 0}
                    </div>
                </div>
                <div className="card">
                    <div className="text-gray-500 text-sm">Active Messagers (7d)</div>
                    <div className="text-2xl font-bold text-amber-400 mt-1">
                        {data?.topMessageUsers?.length || 0}
                    </div>
                </div>
                <div className="card">
                    <div className="text-gray-500 text-sm">Total Commands (7d)</div>
                    <div className="text-2xl font-bold text-green-400 mt-1">
                         {data?.dailyActivity?.reduce((sum, d) => sum + d.count, 0)?.toLocaleString() || 0}
                    </div>
                </div>
                <div className="card">
                    <div className="text-gray-500 text-sm">Top Command</div>
                    <div className="text-2xl font-bold text-blue-400 mt-1">
                        {data?.commandStats?.[0]?.command || 'N/A'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Top Active Users by Message Count */}
                 <div className="card">
                    <h2 className="text-lg font-semibold text-white mb-4">Top Messagers (Last 7 Days)</h2>
                    <div className="h-80">
                        {data?.topMessageUsers?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.topMessageUsers.slice(0, 10)} layout="vertical" margin={{ left: 40, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
                                    <YAxis 
                                        type="category" 
                                        dataKey="user_id" 
                                        stroke="rgba(255,255,255,0.3)"
                                        tick={{ fontSize: 10 }}
                                        width={100}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            background: 'rgba(10,10,15,0.95)', 
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Bar dataKey="count" fill="var(--gold)" radius={[0, 4, 4, 0]}>
                                        {data.topMessageUsers.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                No message data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Daily Command Activity Chart */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-white mb-4">Daily Commands (30 Days)</h2>
                    <div className="h-80">
                        {data?.dailyActivity?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={[...data.dailyActivity].reverse()}>
                                    <defs>
                                        <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--gold)" stopOpacity={0} />
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
                                        stroke="var(--gold)" 
                                        fill="url(#colorActivity)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                No command data available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Hourly Command Heatmap */}
            <div className="card">
                <h2 className="text-lg font-semibold text-white mb-4">Command Peak Hours (7 Days)</h2>
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
                    <span>Less Activity</span>
                    <div className="flex gap-1">
                        <div className="w-4 h-4 rounded bg-gray-800"></div>
                        <div className="w-4 h-4 rounded bg-amber-900"></div>
                        <div className="w-4 h-4 rounded bg-amber-800"></div>
                        <div className="w-4 h-4 rounded bg-amber-700"></div>
                        <div className="w-4 h-4 rounded bg-amber-600"></div>
                        <div className="w-4 h-4 rounded bg-amber-500"></div>
                    </div>
                    <span>More Activity</span>
                </div>
            </div>
        </div>
    );
}
