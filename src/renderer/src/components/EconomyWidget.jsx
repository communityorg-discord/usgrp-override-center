import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

/**
 * EconomyWidget - Quick economy stats for dashboard
 */
export default function EconomyWidget() {
    const { fetchApi } = useApi();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recentTransactions, setRecentTransactions] = useState([]);

    useEffect(() => {
        loadStats();
        const interval = setInterval(loadStats, 60000); // Every minute
        return () => clearInterval(interval);
    }, []);

    async function loadStats() {
        try {
            const [economyData, txData] = await Promise.all([
                fetchApi('/override/economy/stats'),
                fetchApi('/override/economy/transactions?limit=5')
            ]);
            
            if (economyData) {
                setStats(economyData);
            }
            if (txData?.transactions) {
                setRecentTransactions(txData.transactions);
            }
        } catch (error) {
            console.error('Economy stats failed:', error);
        } finally {
            setLoading(false);
        }
    }

    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return '$0';
        return '$' + Number(amount).toLocaleString();
    };

    const formatShort = (num) => {
        if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num?.toString() || '0';
    };

    // Pie chart data for money distribution
    const distributionData = stats ? [
        { name: 'Wallets', value: stats.totalWallet || 0, color: '#10B981' },
        { name: 'Banks', value: stats.totalBank || 0, color: '#3B82F6' },
        { name: 'Treasury', value: stats.treasury || 0, color: '#F59E0B' }
    ] : [];

    if (loading) {
        return (
            <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-800 rounded w-1/3 mb-3"></div>
                <div className="h-20 bg-gray-800 rounded mb-3"></div>
                <div className="space-y-2">
                    {[1,2,3].map(i => (
                        <div key={i} className="h-6 bg-gray-800 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#1a1a24] border border-white/5 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-green-400">💰</span>
                    Economy
                </h3>
                <Link to="/economy/users" className="text-xs text-gray-500 hover:text-amber-400 transition-colors">
                    Manage →
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="p-4">
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-black/20 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Total Circulation</p>
                        <p className="text-lg font-bold text-green-400">
                            {formatShort((stats?.totalWallet || 0) + (stats?.totalBank || 0))}
                        </p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Active Users</p>
                        <p className="text-lg font-bold text-blue-400">
                            {stats?.activeUsers || 0}
                        </p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Treasury</p>
                        <p className="text-lg font-bold text-amber-400">
                            {formatShort(stats?.treasury || 0)}
                        </p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Today's TX</p>
                        <p className="text-lg font-bold text-purple-400">
                            {stats?.todayTransactions || 0}
                        </p>
                    </div>
                </div>

                {/* Mini Distribution Chart */}
                {distributionData.length > 0 && distributionData.some(d => d.value > 0) && (
                    <div className="h-24 mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={distributionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={25}
                                    outerRadius={40}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {distributionData.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-4 text-[10px]">
                            {distributionData.map(d => (
                                <div key={d.name} className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }}></span>
                                    <span className="text-gray-400">{d.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Transactions */}
                <div className="border-t border-white/5 pt-3">
                    <p className="text-xs text-gray-500 mb-2">Recent Transactions</p>
                    <div className="space-y-1">
                        {recentTransactions.slice(0, 3).map((tx, i) => (
                            <div key={i} className="flex items-center justify-between text-xs py-1">
                                <span className="text-gray-400 truncate max-w-[120px]">
                                    {tx.description || tx.type}
                                </span>
                                <span className={tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}>
                                    {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                </span>
                            </div>
                        ))}
                        {recentTransactions.length === 0 && (
                            <p className="text-xs text-gray-600 text-center py-2">No recent transactions</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-2 border-t border-white/5 flex gap-2">
                <Link 
                    to="/economy/transactions"
                    className="flex-1 py-1.5 text-xs text-center text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                >
                    📊 Transactions
                </Link>
                <Link 
                    to="/economy/treasury"
                    className="flex-1 py-1.5 text-xs text-center text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                >
                    🏦 Treasury
                </Link>
            </div>
        </div>
    );
}
