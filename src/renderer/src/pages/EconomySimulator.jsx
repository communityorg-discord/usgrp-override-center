import React, { useState, useEffect } from 'react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, PieChart, Pie, Cell, Legend, BarChart, Bar 
} from 'recharts';

const COLORS = ['#D4AF37', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6'];

export default function EconomySimulator() {
    const [loading, setLoading] = useState(true);
    const [simulating, setSimulating] = useState(false);
    const [baseData, setBaseData] = useState(null);
    const [projection, setProjection] = useState(null);
    
    // Inputs
    const [taxRate, setTaxRate] = useState(5);
    const [moneyInjection, setMoneyInjection] = useState(0);

    useEffect(() => {
        loadBaseData();
    }, []);

    useEffect(() => {
        if (baseData) {
            runSimulation();
        }
    }, [taxRate, moneyInjection, baseData]);

    async function loadBaseData() {
        try {
            const data = await window.electron.economy.getSimulationData();
            setBaseData(data);
            setTaxRate(data.currentTaxRate || 5);
        } catch (err) {
            console.error('Failed to load simulation data:', err);
        } finally {
            setLoading(false);
        }
    }

    async function runSimulation() {
        setSimulating(true);
        try {
            const result = await window.electron.economy.simulate({
                taxRate,
                moneyInjection: parseFloat(moneyInjection) || 0
            });
            setProjection(result);
        } catch (err) {
            console.error('Simulation failed:', err);
        } finally {
            setSimulating(false);
        }
    }

    function formatMoney(amount) {
        if (amount >= 1000000000) return '$' + (amount / 1000000000).toFixed(2) + 'B';
        if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(2) + 'M';
        if (amount >= 1000) return '$' + (amount / 1000).toFixed(1) + 'K';
        return '$' + Math.round(amount).toLocaleString();
    }

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full spin-slow mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading Economic Baseline...</p>
                </div>
            </div>
        );
    }

    const wealthData = [
        { name: 'Top 10%', value: baseData?.wealthDistribution?.top10 || 0 },
        { name: 'Middle 50%', value: baseData?.wealthDistribution?.middle50 || 0 },
        { name: 'Bottom 40%', value: baseData?.wealthDistribution?.bottom40 || 0 },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="heading-xl text-white flex items-center gap-3">
                    <span className="text-2xl">🧪</span>
                    Economy "What-If" Simulator
                </h1>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Simulate policy changes and predict long-term economic impacts
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Controls Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="card border-gold/20 bg-gold/5">
                        <h2 className="text-lg font-bold text-gold mb-4 flex items-center gap-2">
                            <span>⚙️</span> Control Panel
                        </h2>
                        
                        <div className="space-y-6">
                            {/* Tax Rate Slider */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-300">Proposed Tax Rate</label>
                                    <span className="text-gold font-bold">{taxRate}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="50" 
                                    value={taxRate}
                                    onChange={(e) => setTaxRate(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gold"
                                />
                                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                    <span>Laissez-faire</span>
                                    <span>Balanced</span>
                                    <span>High Tax</span>
                                </div>
                            </div>

                            {/* Money Injection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Stimulus Injection ($)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input 
                                        type="number"
                                        value={moneyInjection}
                                        onChange={(e) => setMoneyInjection(e.target.value)}
                                        className="input pl-7 w-full"
                                        placeholder="Enter amount..."
                                    />
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">
                                    Injecting money increases supply but may drive inflation.
                                </p>
                            </div>

                            <div className="pt-4 border-t border-white/10">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 rounded-lg bg-black/40">
                                        <div className="text-[10px] text-gray-500 uppercase">Current GDP</div>
                                        <div className="text-sm font-bold text-white">{formatMoney(baseData?.gdp30d)}</div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-black/40">
                                        <div className="text-[10px] text-gray-500 uppercase">Total Supply</div>
                                        <div className="text-sm font-bold text-white">{formatMoney(baseData?.totalMoneySupply)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Wealth Distribution */}
                    <div className="card">
                        <h2 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Wealth Distribution</h2>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={wealthData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={60}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {wealthData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Projections Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="card bg-gradient-to-br from-green-900/20 to-transparent">
                            <div className="text-gray-400 text-xs uppercase">Est. Monthly Revenue</div>
                            <div className="text-xl font-bold text-green-400 mt-1">
                                {formatMoney(projection?.summary?.projectedMonthlyRevenue || 0)}
                            </div>
                        </div>
                        <div className="card bg-gradient-to-br from-blue-900/20 to-transparent">
                            <div className="text-gray-400 text-xs uppercase">GDP Growth (30d)</div>
                            <div className="text-xl font-bold text-blue-400 mt-1">
                                {projection?.summary?.gdpGrowthPercentage}%
                            </div>
                        </div>
                        <div className="card bg-gradient-to-br from-red-900/20 to-transparent">
                            <div className="text-gray-400 text-xs uppercase">Inflation Impact</div>
                            <div className="text-xl font-bold text-red-400 mt-1">
                                {projection?.summary?.inflationIndexChange}%
                            </div>
                        </div>
                    </div>

                    {/* GDP Projection Chart */}
                    <div className="card">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-semibold text-white">GDP Growth Projection (30 Days)</h2>
                            <div className="flex items-center gap-4 text-xs">
                                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-gold"></span> Proposed</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-gray-600"></span> Baseline</span>
                            </div>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={projection?.projections || []}>
                                    <defs>
                                        <linearGradient id="colorGdp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis 
                                        dataKey="day" 
                                        stroke="rgba(255,255,255,0.3)" 
                                        tick={{fontSize: 10}}
                                        label={{ value: 'Days', position: 'insideBottomRight', offset: -5, fontSize: 10 }}
                                    />
                                    <YAxis 
                                        stroke="rgba(255,255,255,0.3)" 
                                        tick={{fontSize: 10}}
                                        tickFormatter={(v) => formatMoney(v)}
                                    />
                                    <Tooltip 
                                        contentStyle={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)' }}
                                        formatter={(v) => [formatMoney(v), 'Projected GDP']}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="gdp" 
                                        stroke="#D4AF37" 
                                        fillOpacity={1} 
                                        fill="url(#colorGdp)" 
                                        strokeWidth={3}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Inflation vs Revenue Chart */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card">
                            <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase">Weekly Revenue Projection</h3>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={projection?.projections.filter((_, i) => i % 7 === 0)}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" tick={{fontSize: 10}} />
                                        <YAxis stroke="rgba(255,255,255,0.3)" tick={{fontSize: 10}} tickFormatter={(v) => formatMoney(v)} />
                                        <Tooltip contentStyle={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)' }} />
                                        <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase">Inflation Curve</h3>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={projection?.projections}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" tick={{fontSize: 10}} />
                                        <YAxis stroke="rgba(255,255,255,0.3)" tick={{fontSize: 10}} unit="%" />
                                        <Tooltip contentStyle={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)' }} />
                                        <Line type="monotone" dataKey="inflation" stroke="#ef4444" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
