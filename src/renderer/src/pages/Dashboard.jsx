import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Link } from 'react-router-dom';

export default function Dashboard() {
    const { fetchApi, post, loading, error } = useApi();
    const [processes, setProcesses] = useState([]);
    const [systemInfo, setSystemInfo] = useState(null);
    const [stats, setStats] = useState({ online: 0, offline: 0, totalMemory: 0, totalCpu: 0 });
    const [lastUpdate, setLastUpdate] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [previousStatus, setPreviousStatus] = useState({});
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 10000);
        return () => clearInterval(interval);
    }, []);

    async function loadData() {
        try {
            setConnectionStatus('loading');
            const [pm2Data, sysData] = await Promise.all([
                fetchApi('/override/pm2/list'),
                fetchApi('/override/system/info')
            ]);

            if (pm2Data?.processes) {
                setProcesses(pm2Data.processes);
                
                const online = pm2Data.processes.filter(p => p.status === 'online').length;
                const offline = pm2Data.processes.filter(p => p.status !== 'online').length;
                const totalMemory = pm2Data.processes.reduce((sum, p) => sum + (p.memoryMB || 0), 0);
                const totalCpu = pm2Data.processes.reduce((sum, p) => sum + (p.cpu || 0), 0);
                
                setStats({ online, offline, totalMemory, totalCpu: Math.round(totalCpu) });

                // Alert Logic
                const currentStatus = {};
                const newAlerts = [];
                pm2Data.processes.forEach(p => {
                    currentStatus[p.name] = p.status;
                    if (p.status !== 'online') {
                        newAlerts.push(`${p.name} is ${p.status}`);
                    }
                    
                    // Check transition
                    if (previousStatus[p.name] && previousStatus[p.name] === 'online' && p.status !== 'online') {
                         new Notification('Service Alert', { body: `${p.name} has stopped!`, icon: 'build/icon.png' });
                    }
                });
                setPreviousStatus(currentStatus);
                setAlerts(newAlerts);
            }

            if (sysData) {
                setSystemInfo(sysData);
            }
            
            setLastUpdate(new Date());
            setConnectionStatus('connected');
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            setConnectionStatus('error');
        }
    }

    async function handleQuickAction(action) {
        setActionLoading(action);
        try {
            switch (action) {
                case 'restart-all':
                    if (confirm('Restart ALL services?')) {
                        for (const proc of processes.filter(p => p.status === 'online')) {
                            await post(`/override/pm2/restart/${proc.name}`);
                        }
                        await loadData();
                    }
                    break;
                case 'panic-stop':
                    if (confirm('⚠️ EMERGENCY: Stop ALL services?')) {
                        await post('/override/pm2/panic');
                        await loadData();
                    }
                    break;
            }
        } catch (error) {
            alert(`Action failed: ${error.message}`);
        } finally {
            setActionLoading(null);
        }
    }

    async function handleProcessAction(name, action) {
        setActionLoading(`${name}-${action}`);
        try {
            await post(`/override/pm2/${action}/${name}`);
            await loadData();
        } catch (error) {
            alert(`Failed to ${action} ${name}: ${error.message}`);
        } finally {
            setActionLoading(null);
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="heading-xl text-white flex items-center gap-3">
                        Dashboard
                        <span 
                            className="text-sm font-medium px-2 py-0.5 rounded-full"
                            style={{
                                background: connectionStatus === 'connected' 
                                    ? 'rgba(16, 185, 129, 0.1)' 
                                    : connectionStatus === 'error' 
                                    ? 'rgba(239, 68, 68, 0.1)' 
                                    : 'rgba(245, 158, 11, 0.1)',
                                color: connectionStatus === 'connected' 
                                    ? '#34d399' 
                                    : connectionStatus === 'error' 
                                    ? '#f87171' 
                                    : '#fbbf24',
                                border: `1px solid ${
                                    connectionStatus === 'connected' 
                                        ? 'rgba(16, 185, 129, 0.2)' 
                                        : connectionStatus === 'error' 
                                        ? 'rgba(239, 68, 68, 0.2)' 
                                        : 'rgba(245, 158, 11, 0.2)'
                                }`
                            }}
                        >
                            {connectionStatus === 'connected' ? '● Live' :
                             connectionStatus === 'error' ? '● Error' :
                             '○ Connecting'}
                        </span>
                    </h1>
                    {lastUpdate && (
                        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            Last updated {lastUpdate.toLocaleTimeString()}
                        </p>
                    )}
                </div>
                <button 
                    onClick={loadData}
                    disabled={loading}
                    className="btn btn-secondary"
                >
                    {loading ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    )}
                    Refresh
                </button>
            </div>

            {/* Error Banner */}
            {alerts.length > 0 && (
                <div 
                    className="p-4 rounded-xl animate-pulse"
                    style={{
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.1) 100%)',
                        border: '1px solid rgba(239, 68, 68, 0.4)'
                    }}
                >
                    <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <h3 className="text-red-400 font-bold">System Alert</h3>
                            <p className="text-red-300/80 text-sm">
                                {alerts.length} service{alerts.length > 1 ? 's' : ''} reported offline: {alerts.slice(0, 3).join(', ')}{alerts.length > 3 ? '...' : ''}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div 
                    className="p-4 rounded-xl animate-fade-in"
                    style={{
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(185, 28, 28, 0.05) 100%)',
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}
                >
                    <p className="text-red-400 font-medium">⚠️ {error}</p>
                    <p className="text-red-400/60 text-sm mt-1">Make sure you're authenticated and the API is reachable.</p>
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard
                    icon="online"
                    label="Services Online"
                    value={stats.online}
                    color="emerald"
                />
                <StatCard
                    icon="offline"
                    label="Services Offline"
                    value={stats.offline}
                    color={stats.offline > 0 ? "red" : "gray"}
                />
                <StatCard
                    icon="memory"
                    label="Total Memory"
                    value={`${stats.totalMemory} MB`}
                    color="blue"
                />
                <StatCard
                    icon="cpu"
                    label="Total CPU"
                    value={`${stats.totalCpu}%`}
                    color="amber"
                />
            </div>

            {/* Quick Actions */}
            <div className="card">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="heading-md text-white">Quick Actions</h2>
                    <span className="text-xs px-2 py-1 rounded-full" style={{ 
                        background: 'rgba(212, 175, 55, 0.1)', 
                        color: '#D4AF37',
                        border: '1px solid rgba(212, 175, 55, 0.2)'
                    }}>
                        Keyboard shortcuts available
                    </span>
                </div>
                <div className="grid grid-cols-5 gap-3">
                    <QuickActionButton 
                        icon="restart" 
                        label="Restart All" 
                        loading={actionLoading === 'restart-all'}
                        onClick={() => handleQuickAction('restart-all')} 
                    />
                    <Link to="/terminal" className="contents">
                        <QuickActionButton 
                            icon="terminal" 
                            label="Terminal"
                            shortcut="Ctrl+Shift+T"
                        />
                    </Link>
                    <Link to="/deploy" className="contents">
                        <QuickActionButton 
                            icon="deploy" 
                            label="Deploy"
                            shortcut="Ctrl+Shift+D"
                        />
                    </Link>
                    <Link to="/database" className="contents">
                        <QuickActionButton 
                            icon="database" 
                            label="Database" 
                        />
                    </Link>
                    <QuickActionButton 
                        icon="panic" 
                        label="Panic Stop" 
                        loading={actionLoading === 'panic-stop'}
                        onClick={() => handleQuickAction('panic-stop')} 
                        danger 
                    />
                </div>
            </div>

            {/* Services Grid */}
            <div className="card">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="heading-md text-white">
                        Services 
                        <span className="ml-2 text-sm font-normal" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            ({processes.length})
                        </span>
                    </h2>
                    <Link 
                        to="/systems" 
                        className="text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all duration-200"
                        style={{ color: '#D4AF37' }}
                    >
                        View All 
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
                
                {processes.length === 0 ? (
                    <div className="text-center py-12">
                        {loading ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                                <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading services...</p>
                            </div>
                        ) : (
                            <p style={{ color: 'rgba(255,255,255,0.4)' }}>No services found</p>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-3">
                        {processes.slice(0, 16).map((proc, index) => (
                            <ServiceCard 
                                key={proc.id} 
                                process={proc} 
                                onAction={handleProcessAction}
                                actionLoading={actionLoading}
                                index={index}
                            />
                        ))}
                    </div>
                )}
                
                {processes.length > 16 && (
                    <div className="text-center mt-4 pt-4 border-t border-white/[0.04]">
                        <Link 
                            to="/systems" 
                            className="text-sm font-medium"
                            style={{ color: 'rgba(255,255,255,0.5)' }}
                        >
                            +{processes.length - 16} more services →
                        </Link>
                    </div>
                )}
            </div>

            {/* System Info */}
            {systemInfo && (
                <div className="grid grid-cols-3 gap-4">
                    <SystemInfoCard 
                        icon="clock" 
                        label="Server Uptime" 
                        value={systemInfo.uptime} 
                    />
                    <SystemInfoCard 
                        icon="chart" 
                        label="Load Average" 
                        value={systemInfo.load} 
                    />
                    <SystemInfoCard 
                        icon="memory" 
                        label="Memory Usage" 
                        value={systemInfo.memory}
                        isCode 
                    />
                </div>
            )}
        </div>
    );
}

function StatCard({ icon, label, value, color }) {
    const colors = {
        emerald: { bg: 'rgba(16, 185, 129, 0.08)', text: '#34d399', glow: 'rgba(16, 185, 129, 0.3)' },
        red: { bg: 'rgba(239, 68, 68, 0.08)', text: '#f87171', glow: 'rgba(239, 68, 68, 0.3)' },
        blue: { bg: 'rgba(59, 130, 246, 0.08)', text: '#60a5fa', glow: 'rgba(59, 130, 246, 0.3)' },
        amber: { bg: 'rgba(212, 175, 55, 0.08)', text: '#D4AF37', glow: 'rgba(212, 175, 55, 0.3)' },
        gray: { bg: 'rgba(100, 100, 120, 0.08)', text: '#888', glow: 'rgba(100, 100, 120, 0.2)' },
    };
    
    const c = colors[color] || colors.gray;
    
    const icons = {
        online: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        offline: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        memory: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
        ),
        cpu: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        ),
    };
    
    return (
        <div 
            className="card-stat relative overflow-hidden group"
            style={{ background: c.bg }}
        >
            {/* Glow effect */}
            <div 
                className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl"
                style={{ background: c.glow }}
            />
            
            <div className="relative flex items-center gap-4">
                <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ 
                        background: `linear-gradient(135deg, ${c.bg} 0%, transparent 100%)`,
                        color: c.text
                    }}
                >
                    {icons[icon]}
                </div>
                <div>
                    <p className="stat-number" style={{ color: c.text }}>{value}</p>
                    <p className="stat-label mt-0.5">{label}</p>
                </div>
            </div>
        </div>
    );
}

function QuickActionButton({ icon, label, onClick, loading, danger, shortcut }) {
    const icons = {
        restart: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
        ),
        terminal: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
        deploy: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
        ),
        database: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
        ),
        panic: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        ),
    };
    
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={`p-5 rounded-xl border transition-all duration-200 text-center group relative overflow-hidden ${
                danger 
                    ? 'hover:border-red-500/40' 
                    : 'hover:border-amber-500/30'
            }`}
            style={{
                background: danger 
                    ? 'linear-gradient(145deg, rgba(239, 68, 68, 0.06) 0%, rgba(185, 28, 28, 0.02) 100%)'
                    : 'linear-gradient(145deg, rgba(255, 255, 255, 0.02) 0%, transparent 100%)',
                border: danger
                    ? '1px solid rgba(239, 68, 68, 0.15)'
                    : '1px solid rgba(255, 255, 255, 0.04)'
            }}
        >
            {/* Hover gradient */}
            <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                    background: danger 
                        ? 'linear-gradient(145deg, rgba(239, 68, 68, 0.1) 0%, transparent 100%)'
                        : 'linear-gradient(145deg, rgba(212, 175, 55, 0.05) 0%, transparent 100%)'
                }}
            />
            
            <div className="relative">
                {loading ? (
                    <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                ) : (
                    <div 
                        className="mx-auto mb-3 transition-transform duration-200 group-hover:scale-110"
                        style={{ color: danger ? '#f87171' : 'rgba(255,255,255,0.6)' }}
                    >
                        {icons[icon]}
                    </div>
                )}
                <span 
                    className="text-sm font-medium block"
                    style={{ color: danger ? '#f87171' : 'rgba(255,255,255,0.8)' }}
                >
                    {label}
                </span>
                {shortcut && (
                    <span 
                        className="text-xs mt-1 block"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                        {shortcut}
                    </span>
                )}
            </div>
        </button>
    );
}

function ServiceCard({ process, onAction, actionLoading, index }) {
    const isOnline = process.status === 'online';
    const isLoading = actionLoading?.startsWith(process.name);
    
    return (
        <div 
            className="p-4 rounded-xl transition-all duration-200 group animate-fade-in"
            style={{
                background: isOnline 
                    ? 'linear-gradient(145deg, rgba(255, 255, 255, 0.02) 0%, transparent 100%)'
                    : 'linear-gradient(145deg, rgba(239, 68, 68, 0.08) 0%, rgba(185, 28, 28, 0.02) 100%)',
                border: isOnline 
                    ? '1px solid rgba(255, 255, 255, 0.04)' 
                    : '1px solid rgba(239, 68, 68, 0.2)',
                animationDelay: `${index * 30}ms`
            }}
        >
            <div className="flex items-center gap-2.5 mb-3">
                <div className="relative">
                    <div 
                        className="w-2 h-2 rounded-full"
                        style={{
                            background: isOnline ? '#10b981' : '#ef4444',
                            boxShadow: isOnline 
                                ? '0 0 8px rgba(16, 185, 129, 0.6)' 
                                : '0 0 8px rgba(239, 68, 68, 0.5)'
                        }}
                    />
                    {isOnline && (
                        <div 
                            className="absolute inset-0 w-2 h-2 rounded-full animate-ping"
                            style={{ background: '#10b981', opacity: 0.4 }}
                        />
                    )}
                </div>
                <p className="text-sm font-medium text-white truncate flex-1">{process.name}</p>
            </div>
            
            {isOnline ? (
                <div className="text-xs mb-3 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <span>{process.memoryMB}MB</span>
                    <span style={{ color: 'rgba(255,255,255,0.15)' }}>•</span>
                    <span>{process.cpu}%</span>
                    <span style={{ color: 'rgba(255,255,255,0.15)' }}>•</span>
                    <span>{process.restarts}↻</span>
                </div>
            ) : (
                <div className="text-xs mb-3" style={{ color: '#f87171' }}>Stopped</div>
            )}
            
            <div className="flex gap-2">
                {isOnline ? (
                    <button
                        onClick={() => onAction(process.name, 'restart')}
                        disabled={isLoading}
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50"
                        style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            color: 'rgba(255,255,255,0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.06)'
                        }}
                    >
                        {isLoading ? '...' : '↻ Restart'}
                    </button>
                ) : (
                    <button
                        onClick={() => onAction(process.name, 'start')}
                        disabled={isLoading}
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50"
                        style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white'
                        }}
                    >
                        {isLoading ? '...' : '▶ Start'}
                    </button>
                )}
            </div>
        </div>
    );
}

function SystemInfoCard({ icon, label, value, isCode }) {
    const icons = {
        clock: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        chart: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
        memory: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
        ),
    };
    
    return (
        <div className="card">
            <div className="flex items-center gap-2 mb-3">
                <div style={{ color: 'rgba(255,255,255,0.4)' }}>{icons[icon]}</div>
                <h3 className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</h3>
            </div>
            {isCode ? (
                <pre 
                    className="text-xs font-mono overflow-auto whitespace-pre-wrap"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                    {value}
                </pre>
            ) : (
                <p className="text-xl text-white font-mono">{value}</p>
            )}
        </div>
    );
}
