import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

export default function EconomyStats() {
    const { fetchApi, loading, error } = useApi();
    const [stats, setStats] = useState(null);

    useEffect(() => {
        loadStats();
    }, []);

    async function loadStats() {
        try {
            const data = await fetchApi('/override/economy/stats');
            if (data) {
                setStats(data);
            }
        } catch (err) {
            console.error('Failed to load economy stats:', err);
        }
    }

    function formatMoney(amount) {
        if (amount >= 1000000000) {
            return '$' + (amount / 1000000000).toFixed(2) + 'B';
        }
        if (amount >= 1000000) {
            return '$' + (amount / 1000000).toFixed(2) + 'M';
        }
        if (amount >= 1000) {
            return '$' + (amount / 1000).toFixed(1) + 'K';
        }
        return '$' + amount.toLocaleString();
    }

    function formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(num || 0);
    }

    const inflationColor = stats?.stats?.inflationChange > 0 ? 'text-red-400' : 'text-green-400';
    const inflationArrow = stats?.stats?.inflationChange > 0 ? '↑' : '↓';

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="heading-xl text-white flex items-center gap-3">
                        <span className="text-2xl">📈</span>
                        Economy Stats Dashboard
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Economy health metrics and analytics
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

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card bg-gradient-to-br from-amber-900/20 to-transparent border-amber-500/20">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                            <span className="text-2xl">💰</span>
                        </div>
                        <div>
                            <div className="text-gray-400 text-sm">Total Money Supply</div>
                            <div className="text-2xl font-bold text-amber-400">
                                {formatMoney(stats?.stats?.totalMoneySupply || 0)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-green-900/20 to-transparent border-green-500/20">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                            <span className="text-2xl">📊</span>
                        </div>
                        <div>
                            <div className="text-gray-400 text-sm">30-Day GDP</div>
                            <div className="text-2xl font-bold text-green-400">
                                {formatMoney(stats?.stats?.gdp30d || 0)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-blue-900/20 to-transparent border-blue-500/20">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <span className="text-2xl">👥</span>
                        </div>
                        <div>
                            <div className="text-gray-400 text-sm">Active Users (7d)</div>
                            <div className="text-2xl font-bold text-blue-400">
                                {formatNumber(stats?.stats?.activeUsers7d || 0)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-purple-900/20 to-transparent border-purple-500/20">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <span className="text-2xl">🏦</span>
                        </div>
                        <div>
                            <div className="text-gray-400 text-sm">Treasury Balance</div>
                            <div className="text-2xl font-bold text-purple-400">
                                {formatMoney(stats?.stats?.treasuryBalance || 0)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card">
                    <div className="text-gray-400 text-sm">Total Users</div>
                    <div className="text-xl font-bold text-white mt-1">
                        {formatNumber(stats?.stats?.totalUsers || 0)}
                    </div>
                </div>
                <div className="card">
                    <div className="text-gray-400 text-sm">Average Balance</div>
                    <div className="text-xl font-bold text-white mt-1">
                        {formatMoney(stats?.stats?.avgBalance || 0)}
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-gray-400 text-sm">Inflation Index</div>
                            <div className="text-xl font-bold text-white mt-1">
                                {(stats?.stats?.inflation || 1).toFixed(3)}
                            </div>
                        </div>
                        <div className={`text-sm ${inflationColor}`}>
                            {inflationArrow} {Math.abs(stats?.stats?.inflationChange || 0)}%
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Transaction Volume Chart */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-white mb-4">Transaction Volume (7 Days)</h2>
                    <div className="h-64">
                        {stats?.recentTxVolume?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={[...stats.recentTxVolume].reverse()}>
                                    <defs>
                                        <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis 
                                        dataKey="date" 
                                        stroke="rgba(255,255,255,0.3)"
                                        tick={{ fontSize: 10 }}
                                        tickFormatter={(v) => v.slice(5)}
                                    />
                                    <YAxis 
                                        stroke="rgba(255,255,255,0.3)" 
                                        tick={{ fontSize: 10 }}
                                        tickFormatter={(v) => formatMoney(v)}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            background: 'rgba(10,10,15,0.95)', 
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px'
                                        }}
                                        labelStyle={{ color: '#fff' }}
                                        formatter={(value) => [formatMoney(value), 'Volume']}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="volume" 
                                        stroke="#22C55E" 
                                        fill="url(#colorVolume)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                No transaction data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Transaction Count Chart */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-white mb-4">Daily Transactions</h2>
                    <div className="h-64">
                        {stats?.recentTxVolume?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[...stats.recentTxVolume].reverse()}>
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
                                    />
                                    <Bar dataKey="tx_count" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                No transaction data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Top 10 Richest */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-white mb-4">Top 10 Richest Users</h2>
                    <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-dark">
                        {stats?.topUsers?.map((user, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                        idx === 0 ? 'bg-amber-500 text-black' :
                                        idx === 1 ? 'bg-gray-400 text-black' :
                                        idx === 2 ? 'bg-amber-700 text-white' :
                                        'bg-gray-700 text-gray-300'
                                    }`}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <div className="text-white font-medium">{user.username || 'Unknown'}</div>
                                        <div className="text-xs text-gray-500 font-mono">{user.discord_id}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-amber-400 font-mono font-bold">{formatMoney(user.total)}</div>
                                    <div className="text-xs text-gray-500">
                                        💵 {formatMoney(user.balance)} | 🏦 {formatMoney(user.bank_balance)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Economy Health Indicators */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-white mb-4">Economy Health</h2>
                    <div className="space-y-4">
                        {/* Gini Coefficient */}
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-400">Wealth Inequality (Gini)</span>
                                <span className="text-white">{(stats?.stats?.giniCoefficient || 0).toFixed(3)}</span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                                    style={{ width: `${(stats?.stats?.giniCoefficient || 0) * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-gray-600 mt-1">
                                <span>Equal</span>
                                <span>Unequal</span>
                            </div>
                        </div>

                        {/* Money Distribution */}
                        <div className="pt-4 border-t border-white/10">
                            <div className="text-gray-400 text-sm mb-3">Money Distribution</div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-lg bg-white/[0.03]">
                                    <div className="text-xs text-gray-500">In Wallets</div>
                                    <div className="text-lg font-bold text-green-400">{formatMoney(stats?.stats?.totalWallet || 0)}</div>
                                    <div className="text-xs text-gray-600">
                                        {stats?.stats?.totalMoneySupply > 0 
                                            ? ((stats.stats.totalWallet / stats.stats.totalMoneySupply) * 100).toFixed(1)
                                            : 0
                                        }% of supply
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg bg-white/[0.03]">
                                    <div className="text-xs text-gray-500">In Banks</div>
                                    <div className="text-lg font-bold text-blue-400">{formatMoney(stats?.stats?.totalBank || 0)}</div>
                                    <div className="text-xs text-gray-600">
                                        {stats?.stats?.totalMoneySupply > 0 
                                            ? ((stats.stats.totalBank / stats.stats.totalMoneySupply) * 100).toFixed(1)
                                            : 0
                                        }% of supply
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
