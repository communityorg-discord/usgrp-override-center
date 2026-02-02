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

    const statCards = [
        { 
            label: 'Services Online', 
            value: stats.online, 
            icon: '🟢',
            color: 'text-emerald-400',
            bgColor: 'from-emerald-500/20 to-emerald-600/10'
        },
        { 
            label: 'Services Offline', 
            value: stats.offline, 
            icon: '🔴',
            color: stats.offline > 0 ? 'text-red-400' : 'text-gray-400',
            bgColor: stats.offline > 0 ? 'from-red-500/20 to-red-600/10' : 'from-gray-500/20 to-gray-600/10'
        },
        { 
            label: 'Total Memory', 
            value: `${stats.totalMemory} MB`, 
            icon: '💾',
            color: 'text-blue-400',
            bgColor: 'from-blue-500/20 to-blue-600/10'
        },
        { 
            label: 'Total CPU', 
            value: `${stats.totalCpu}%`, 
            icon: '⚡',
            color: 'text-amber-400',
            bgColor: 'from-amber-500/20 to-amber-600/10'
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className={`flex items-center gap-1 text-sm ${
                            connectionStatus === 'connected' ? 'text-emerald-400' :
                            connectionStatus === 'error' ? 'text-red-400' :
                            'text-amber-400'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${
                                connectionStatus === 'connected' ? 'bg-emerald-400' :
                                connectionStatus === 'error' ? 'bg-red-400' :
                                'bg-amber-400 animate-pulse'
                            }`}></span>
                            {connectionStatus === 'connected' ? 'Connected to API' :
                             connectionStatus === 'error' ? 'Connection Error' :
                             'Connecting...'}
                        </span>
                        {lastUpdate && (
                            <span className="text-gray-500 text-sm">
                                Updated {lastUpdate.toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                </div>
                <button 
                    onClick={loadData}
                    disabled={loading}
                    className="btn btn-secondary"
                >
                    {loading ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    )}
                    Refresh
                </button>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400">⚠️ {error}</p>
                    <p className="text-red-400/70 text-sm mt-1">Make sure you're authenticated and the API is reachable.</p>
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <div key={i} className={`card bg-gradient-to-br ${stat.bgColor} border-0`}>
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{stat.icon}</span>
                            <div>
                                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                                <p className="text-sm text-gray-400">{stat.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="card">
                <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-5 gap-3">
                    <QuickActionButton 
                        icon="🔄" 
                        label="Restart All" 
                        loading={actionLoading === 'restart-all'}
                        onClick={() => handleQuickAction('restart-all')} 
                    />
                    <Link to="/terminal" className="contents">
                        <QuickActionButton 
                            icon="⌨️" 
                            label="Terminal" 
                            onClick={() => {}} 
                        />
                    </Link>
                    <Link to="/deploy" className="contents">
                        <QuickActionButton 
                            icon="🚀" 
                            label="Deploy" 
                            onClick={() => {}} 
                        />
                    </Link>
                    <Link to="/database" className="contents">
                        <QuickActionButton 
                            icon="🗄️" 
                            label="Database" 
                            onClick={() => {}} 
                        />
                    </Link>
                    <QuickActionButton 
                        icon="⚠️" 
                        label="Panic Stop" 
                        loading={actionLoading === 'panic-stop'}
                        onClick={() => handleQuickAction('panic-stop')} 
                        danger 
                    />
                </div>
            </div>

            {/* Services Grid */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Services ({processes.length})</h2>
                    <Link to="/systems" className="text-sm text-amber-400 hover:text-amber-300">
                        View All →
                    </Link>
                </div>
                
                {processes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        {loading ? 'Loading services...' : 'No services found'}
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-3">
                        {processes.slice(0, 16).map((proc) => (
                            <ServiceCard 
                                key={proc.id} 
                                process={proc} 
                                onAction={handleProcessAction}
                                actionLoading={actionLoading}
                            />
                        ))}
                    </div>
                )}
                
                {processes.length > 16 && (
                    <p className="text-center text-gray-500 text-sm mt-4">
                        +{processes.length - 16} more services
                    </p>
                )}
            </div>

            {/* System Info */}
            {systemInfo && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="card">
                        <h3 className="text-sm font-medium text-gray-400 mb-2">Server Uptime</h3>
                        <p className="text-xl text-white font-mono">{systemInfo.uptime}</p>
                    </div>
                    <div className="card">
                        <h3 className="text-sm font-medium text-gray-400 mb-2">Load Average</h3>
                        <p className="text-xl text-white font-mono">{systemInfo.load}</p>
                    </div>
                    <div className="card">
                        <h3 className="text-sm font-medium text-gray-400 mb-2">Memory</h3>
                        <pre className="text-xs text-gray-300 font-mono overflow-auto whitespace-pre-wrap">{systemInfo.memory}</pre>
                    </div>
                </div>
            )}
        </div>
    );
}

function QuickActionButton({ icon, label, onClick, loading, danger }) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={`p-4 rounded-lg border transition-all text-center hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 ${
                danger 
                    ? 'border-red-500/30 bg-red-500/10 hover:bg-red-500/20' 
                    : 'border-gray-700 bg-gray-800/50 hover:bg-gray-700/50'
            }`}
        >
            {loading ? (
                <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            ) : (
                <span className="text-2xl block mb-2">{icon}</span>
            )}
            <span className={`text-sm font-medium ${danger ? 'text-red-400' : 'text-gray-300'}`}>
                {label}
            </span>
        </button>
    );
}

function ServiceCard({ process, onAction, actionLoading }) {
    const isOnline = process.status === 'online';
    const isLoading = actionLoading?.startsWith(process.name);
    
    return (
        <div className={`p-3 rounded-lg border transition-all ${
            isOnline 
                ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600' 
                : 'bg-red-500/10 border-red-500/30'
        }`}>
            <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                <p className="text-sm font-medium text-white truncate flex-1">{process.name}</p>
            </div>
            
            {isOnline ? (
                <div className="text-xs text-gray-500 mb-2">
                    {process.memoryMB}MB • {process.cpu}% CPU • {process.restarts} restarts
                </div>
            ) : (
                <div className="text-xs text-red-400 mb-2">Stopped</div>
            )}
            
            <div className="flex gap-1">
                {isOnline ? (
                    <button
                        onClick={() => onAction(process.name, 'restart')}
                        disabled={isLoading}
                        className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 disabled:opacity-50"
                    >
                        {isLoading ? '...' : '🔄 Restart'}
                    </button>
                ) : (
                    <button
                        onClick={() => onAction(process.name, 'start')}
                        disabled={isLoading}
                        className="flex-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-xs text-white disabled:opacity-50"
                    >
                        {isLoading ? '...' : '▶️ Start'}
                    </button>
                )}
            </div>
        </div>
    );
}
