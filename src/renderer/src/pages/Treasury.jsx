import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function Treasury() {
    const { fetchApi, loading, error } = useApi();
    const [treasury, setTreasury] = useState(null);
    const [ledger, setLedger] = useState([]);
    const [grants, setGrants] = useState([]);
    const [disbursements, setDisbursements] = useState([]);
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const data = await fetchApi('/override/economy/treasury');
            if (data) {
                setTreasury(data.treasury);
                setLedger(data.ledger || []);
                setGrants(data.grants || []);
                setDisbursements(data.disbursements || []);
                setChartData(data.chartData || []);
            }
        } catch (err) {
            console.error('Failed to load treasury:', err);
        }
    }

    function formatMoney(amount) {
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0 
        }).format(amount || 0);
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    // Calculate totals for the chart
    const totalInflow = chartData.reduce((sum, d) => sum + (d.inflow || 0), 0);
    const totalOutflow = chartData.reduce((sum, d) => sum + (d.outflow || 0), 0);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="heading-xl text-white flex items-center gap-3">
                        <span className="text-2xl">🏛️</span>
                        Treasury Dashboard
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Government treasury overview and management
                    </p>
                </div>
                <button 
                    onClick={loadData}
                    disabled={loading}
                    className="btn btn-secondary"
                >
                    {loading ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        'Refresh'
                    )}
                </button>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="card-stat relative overflow-hidden group" style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
                    <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl" style={{ background: 'rgba(16, 185, 129, 0.3)' }} />
                    <div className="relative">
                        <p className="text-sm text-emerald-400/70 mb-1">Treasury Balance</p>
                        <p className="text-3xl font-mono font-bold text-emerald-400">
                            {formatMoney(treasury?.balance)}
                        </p>
                    </div>
                </div>

                <div className="card-stat relative overflow-hidden group" style={{ background: 'rgba(59, 130, 246, 0.08)' }}>
                    <div className="relative">
                        <p className="text-sm text-blue-400/70 mb-1">Tax Income</p>
                        <p className="text-3xl font-mono font-bold text-blue-400">
                            {formatMoney(treasury?.tax_income)}
                        </p>
                    </div>
                </div>

                <div className="card-stat relative overflow-hidden group" style={{ background: 'rgba(34, 197, 94, 0.08)' }}>
                    <div className="relative">
                        <p className="text-sm text-green-400/70 mb-1">30-Day Inflow</p>
                        <p className="text-3xl font-mono font-bold text-green-400">
                            +{formatMoney(totalInflow)}
                        </p>
                    </div>
                </div>

                <div className="card-stat relative overflow-hidden group" style={{ background: 'rgba(239, 68, 68, 0.08)' }}>
                    <div className="relative">
                        <p className="text-sm text-red-400/70 mb-1">30-Day Outflow</p>
                        <p className="text-3xl font-mono font-bold text-red-400">
                            -{formatMoney(totalOutflow)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="card">
                <h2 className="heading-md text-white mb-4">Cash Flow (Last 30 Days)</h2>
                {chartData.length > 0 ? (
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="rgba(255,255,255,0.3)"
                                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                />
                                <YAxis 
                                    stroke="rgba(255,255,255,0.3)"
                                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        background: 'rgba(20,20,30,0.95)', 
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                    labelStyle={{ color: '#fff' }}
                                    formatter={(value) => formatMoney(value)}
                                />
                                <Area type="monotone" dataKey="inflow" stroke="#10b981" fillOpacity={1} fill="url(#colorInflow)" name="Inflow" />
                                <Area type="monotone" dataKey="outflow" stroke="#ef4444" fillOpacity={1} fill="url(#colorOutflow)" name="Outflow" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-64 flex items-center justify-center text-gray-500">
                        No chart data available
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Recent Ledger Entries */}
                <div className="card">
                    <h2 className="heading-md text-white mb-4 flex items-center justify-between">
                        Recent Ledger Entries
                        <span className="text-sm font-normal text-gray-500">{ledger.length} entries</span>
                    </h2>
                    
                    <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-dark">
                        {ledger.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No ledger entries</p>
                        ) : (
                            ledger.map((entry, i) => (
                                <div 
                                    key={i}
                                    className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between"
                                >
                                    <div className="flex-1">
                                        <p className="text-white text-sm">{entry.description}</p>
                                        <p className="text-xs text-gray-500">
                                            {formatDate(entry.created_at)} • {entry.created_by || 'System'}
                                        </p>
                                    </div>
                                    <span className={`font-mono font-medium ${entry.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {entry.amount >= 0 ? '+' : ''}{formatMoney(entry.amount)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Grant Programs */}
                <div className="card">
                    <h2 className="heading-md text-white mb-4 flex items-center justify-between">
                        Active Grant Programs
                        <span className="text-sm font-normal text-gray-500">{grants.length} programs</span>
                    </h2>
                    
                    <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-dark">
                        {grants.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No active grant programs</p>
                        ) : (
                            grants.map((grant, i) => (
                                <div 
                                    key={i}
                                    className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10"
                                >
                                    <p className="text-white font-medium">{grant.name}</p>
                                    <p className="text-sm text-gray-400">{grant.description}</p>
                                    <div className="flex items-center gap-3 mt-2 text-xs">
                                        <span className="text-amber-400">Budget: {formatMoney(grant.budget)}</span>
                                        <span className="text-gray-500">•</span>
                                        <span className="text-gray-400">Disbursed: {formatMoney(grant.disbursed)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Disbursements */}
            <div className="card">
                <h2 className="heading-md text-white mb-4">Recent Grant Disbursements</h2>
                
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/[0.06]">
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {disbursements.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-gray-500">
                                        No disbursements found
                                    </td>
                                </tr>
                            ) : (
                                disbursements.map((d, i) => (
                                    <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                                        <td className="py-3 px-4 text-sm text-gray-400">{formatDate(d.created_at)}</td>
                                        <td className="py-3 px-4 text-sm text-white">{d.program_name || 'N/A'}</td>
                                        <td className="py-3 px-4 text-sm text-gray-400 font-mono">{d.recipient_id}</td>
                                        <td className="py-3 px-4 text-sm text-emerald-400 font-mono text-right">{formatMoney(d.amount)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
