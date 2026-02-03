import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { Link } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell, Legend } from 'recharts';

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
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activityFeed, setActivityFeed] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [serviceChartData, setServiceChartData] = useState([]);
    
    // Tab state
    const [activeTab, setActiveTab] = useState('systems');
    
    // Community dashboard data
    const [communityData, setCommunityData] = useState({
        economy: null,
        moderation: null,
        discord: null,
        activity: null,
        loading: true,
        error: null
    });

    // Time update
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Generate mock historical data for charts
    useEffect(() => {
        const now = new Date();
        const data = [];
        for (let i = 23; i >= 0; i--) {
            const hour = new Date(now - i * 3600000);
            data.push({
                time: hour.getHours().toString().padStart(2, '0') + ':00',
                cpu: Math.floor(Math.random() * 40 + 20),
                memory: Math.floor(Math.random() * 30 + 40),
                requests: Math.floor(Math.random() * 500 + 200)
            });
        }
        setChartData(data);
    }, []);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 10000);
        return () => clearInterval(interval);
    }, []);
    
    // Load community data when tab switches
    useEffect(() => {
        if (activeTab === 'community') {
            loadCommunityData();
        }
    }, [activeTab]);

    // Generate service chart data from processes
    useEffect(() => {
        if (processes.length > 0) {
            const sorted = [...processes]
                .filter(p => p.status === 'online')
                .sort((a, b) => (b.memoryMB || 0) - (a.memoryMB || 0))
                .slice(0, 6)
                .map(p => ({
                    name: p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name,
                    memory: p.memoryMB || 0,
                    cpu: p.cpu || 0
                }));
            setServiceChartData(sorted);
        }
    }, [processes]);
    
    async function loadCommunityData() {
        setCommunityData(prev => ({ ...prev, loading: true, error: null }));
        
        try {
            const [economyRes, moderationRes, discordRes, activityRes] = await Promise.allSettled([
                fetchApi('/override/economy/stats'),
                fetchApi('/override/moderation/stats'),
                fetchApi('/override/discord/stats'),
                fetchApi('/override/activity/stats')
            ]);
            
            setCommunityData({
                economy: economyRes.status === 'fulfilled' ? economyRes.value : null,
                moderation: moderationRes.status === 'fulfilled' ? moderationRes.value : null,
                discord: discordRes.status === 'fulfilled' ? discordRes.value : null,
                activity: activityRes.status === 'fulfilled' ? activityRes.value : null,
                loading: false,
                error: null
            });
        } catch (err) {
            setCommunityData(prev => ({ 
                ...prev, 
                loading: false, 
                error: 'Failed to load community data' 
            }));
        }
    }

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
                         addActivity('error', `${p.name} went offline`, 'System detected service failure');
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

    function addActivity(type, title, description) {
        const newActivity = {
            id: Date.now(),
            type,
            title,
            description,
            timestamp: new Date()
        };
        setActivityFeed(prev => [newActivity, ...prev].slice(0, 50));
    }

    async function handleQuickAction(action) {
        setActionLoading(action);
        try {
            switch (action) {
                case 'restart-all':
                    if (confirm('Restart ALL services?')) {
                        addActivity('restart', 'Restart All Services', 'User initiated full restart');
                        for (const proc of processes.filter(p => p.status === 'online')) {
                            await post(`/override/pm2/restart/${proc.name}`);
                        }
                        await loadData();
                    }
                    break;
                case 'panic-stop':
                    const code = prompt('⚠️ EMERGENCY PANIC STOP\n\nThis will immediately stop ALL services.\n\nEnter security code to confirm:');
                    if (code === '470303') {
                        addActivity('error', 'PANIC STOP', 'Emergency shutdown initiated');
                        await post('/override/pm2/panic');
                        await loadData();
                    } else if (code !== null) {
                        alert('Invalid security code. Panic stop cancelled.');
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
            addActivity(action === 'restart' ? 'restart' : 'deploy', `${action} ${name}`, `Service ${action} initiated`);
            await post(`/override/pm2/${action}/${name}`);
            await loadData();
        } catch (error) {
            alert(`Failed to ${action} ${name}: ${error.message}`);
        } finally {
            setActionLoading(null);
        }
    }

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Hero Section */}
            <div 
                className="relative rounded-2xl overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(245, 158, 11, 0.04) 50%, rgba(212, 175, 55, 0.02) 100%)',
                }}
            >
                {/* Animated gradient orbs */}
                <div className="absolute inset-0 overflow-hidden">
                    <div 
                        className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-20 animate-float"
                        style={{ background: 'radial-gradient(circle, rgba(212, 175, 55, 0.4) 0%, transparent 70%)' }}
                    />
                    <div 
                        className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full opacity-15"
                        style={{ 
                            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.5) 0%, transparent 70%)',
                            animation: 'float 4s ease-in-out infinite reverse'
                        }}
                    />
                    {/* Grid pattern overlay */}
                    <div 
                        className="absolute inset-0 opacity-[0.02]"
                        style={{
                            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                            backgroundSize: '40px 40px'
                        }}
                    />
                </div>

                <div className="relative p-8">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-4xl font-bold text-white tracking-tight">
                                    Welcome back
                                </h1>
                                <StatusBadge status={connectionStatus} />
                            </div>
                            <p className="text-lg" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                {formatDate(currentTime)}
                            </p>
                        </div>
                        <div className="text-right">
                            <div 
                                className="text-5xl font-mono font-bold tracking-wider"
                                style={{ 
                                    background: 'linear-gradient(135deg, #D4AF37 0%, #F4D03F 50%, #D4AF37 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}
                            >
                                {formatTime(currentTime)}
                            </div>
                            {lastUpdate && (
                                <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                    Data synced {lastUpdate.toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Quick Status Row */}
                    <div className="flex items-center gap-6 mt-6 pt-6 border-t border-white/[0.06]">
                        <QuickStatusItem 
                            icon="check-circle" 
                            label="All Systems" 
                            value={alerts.length === 0 ? 'Operational' : `${alerts.length} Alert${alerts.length > 1 ? 's' : ''}`}
                            status={alerts.length === 0 ? 'success' : 'warning'}
                        />
                        <div className="w-px h-8 bg-white/[0.08]" />
                        <QuickStatusItem 
                            icon="server" 
                            label="Services" 
                            value={`${stats.online}/${stats.online + stats.offline} Online`}
                            status={stats.offline === 0 ? 'success' : 'warning'}
                        />
                        <div className="w-px h-8 bg-white/[0.08]" />
                        <QuickStatusItem 
                            icon="cpu" 
                            label="CPU Usage" 
                            value={`${stats.totalCpu}%`}
                            status={stats.totalCpu < 70 ? 'success' : stats.totalCpu < 90 ? 'warning' : 'error'}
                        />
                        <div className="w-px h-8 bg-white/[0.08]" />
                        <QuickStatusItem 
                            icon="memory" 
                            label="Memory" 
                            value={`${stats.totalMemory} MB`}
                            status="info"
                        />
                        <div className="flex-1" />
                        <button 
                            onClick={loadData}
                            disabled={loading}
                            className="btn btn-secondary group"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <svg className="w-4 h-4 transition-transform group-hover:rotate-180 duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            )}
                            Refresh
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex items-center gap-2">
                <TabButton 
                    active={activeTab === 'systems'} 
                    onClick={() => setActiveTab('systems')}
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                        </svg>
                    }
                >
                    Systems
                </TabButton>
                <TabButton 
                    active={activeTab === 'community'} 
                    onClick={() => setActiveTab('community')}
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    }
                >
                    Community
                </TabButton>
            </div>

            {/* Tab Content */}
            {activeTab === 'systems' ? (
                <SystemsDashboard 
                    alerts={alerts}
                    error={error}
                    stats={stats}
                    chartData={chartData}
                    processes={processes}
                    loading={loading}
                    systemInfo={systemInfo}
                    serviceChartData={serviceChartData}
                    activityFeed={activityFeed}
                    actionLoading={actionLoading}
                    handleQuickAction={handleQuickAction}
                    handleProcessAction={handleProcessAction}
                />
            ) : (
                <ErrorBoundary fallback={<div className="text-center p-8 text-red-400">Community Dashboard failed to load. <button onClick={loadCommunityData} className="underline">Retry</button></div>}>
                    <CommunityDashboard 
                        data={communityData}
                        onRefresh={loadCommunityData}
                    />
                </ErrorBoundary>
            )}
        </div>
    );
}

// Simple Error Boundary Component
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Community Dashboard Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

// Tab Button Component
function TabButton({ active, onClick, children, icon }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${
                active 
                    ? 'text-white' 
                    : 'text-white/50 hover:text-white/80 hover:bg-white/[0.03]'
            }`}
            style={active ? {
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                boxShadow: '0 0 20px rgba(212, 175, 55, 0.1)'
            } : {
                border: '1px solid transparent'
            }}
        >
            <span style={active ? { color: '#D4AF37' } : {}}>{icon}</span>
            {children}
        </button>
    );
}

// Systems Dashboard (original content)
function SystemsDashboard({ 
    alerts, error, stats, chartData, processes, loading, systemInfo, 
    serviceChartData, activityFeed, actionLoading, handleQuickAction, handleProcessAction 
}) {
    return (
        <>
            {/* Error Banner */}
            {alerts.length > 0 && (
                <div 
                    className="p-4 rounded-xl relative overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(185, 28, 28, 0.08) 100%)',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}
                >
                    <div className="absolute inset-0">
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-red-500/50 to-transparent animate-pulse" />
                    </div>
                    <div className="relative flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/20">
                            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-red-400 font-bold">System Alert</h3>
                            <p className="text-red-300/70 text-sm">
                                {alerts.length} service{alerts.length > 1 ? 's' : ''} offline: {alerts.slice(0, 3).join(', ')}{alerts.length > 3 ? '...' : ''}
                            </p>
                        </div>
                        <Link to="/systems" className="btn btn-sm" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            View Details
                        </Link>
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

            {/* Stats Grid - Premium Glassmorphism Cards */}
            <div className="grid grid-cols-4 gap-4">
                <AnimatedStatCard
                    icon="online"
                    label="Services Online"
                    value={stats.online}
                    color="emerald"
                    sparkData={chartData.slice(-12).map(d => ({ v: d.requests / 10 }))}
                />
                <AnimatedStatCard
                    icon="offline"
                    label="Services Offline"
                    value={stats.offline}
                    color={stats.offline > 0 ? "red" : "gray"}
                    sparkData={[]}
                />
                <AnimatedStatCard
                    icon="memory"
                    label="Total Memory"
                    value={stats.totalMemory}
                    suffix=" MB"
                    color="blue"
                    sparkData={chartData.slice(-12).map(d => ({ v: d.memory }))}
                />
                <AnimatedStatCard
                    icon="cpu"
                    label="Total CPU"
                    value={stats.totalCpu}
                    suffix="%"
                    color="amber"
                    sparkData={chartData.slice(-12).map(d => ({ v: d.cpu }))}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-3 gap-4">
                {/* Quick Actions Panel - Large Tiles */}
                <div className="col-span-2">
                    <div className="card h-full">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="heading-md text-white flex items-center gap-2">
                                <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-amber-400 to-amber-600" />
                                Quick Actions
                            </h2>
                            <span className="badge badge-gold">
                                Keyboard shortcuts
                            </span>
                        </div>
                        <div className="grid grid-cols-5 gap-3">
                            <QuickActionTile 
                                icon="restart" 
                                label="Restart All" 
                                loading={actionLoading === 'restart-all'}
                                onClick={() => handleQuickAction('restart-all')}
                                shortcut="Ctrl+R"
                            />
                            <Link to="/terminal" className="contents">
                                <QuickActionTile 
                                    icon="terminal" 
                                    label="Terminal"
                                    shortcut="Ctrl+T"
                                />
                            </Link>
                            <Link to="/deploy" className="contents">
                                <QuickActionTile 
                                    icon="deploy" 
                                    label="Deploy"
                                    shortcut="Ctrl+D"
                                />
                            </Link>
                            <Link to="/database" className="contents">
                                <QuickActionTile 
                                    icon="database" 
                                    label="Database"
                                    shortcut="Ctrl+B"
                                />
                            </Link>
                            <QuickActionTile 
                                icon="panic" 
                                label="Panic Stop" 
                                loading={actionLoading === 'panic-stop'}
                                onClick={() => handleQuickAction('panic-stop')} 
                                danger 
                            />
                        </div>
                    </div>
                </div>

                {/* System Health Overview */}
                <div className="col-span-1">
                    <div 
                        className="h-full rounded-xl p-5 relative overflow-hidden"
                        style={{
                            background: 'linear-gradient(145deg, rgba(16, 16, 28, 0.9) 0%, rgba(10, 10, 18, 0.95) 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.04)'
                        }}
                    >
                        <h2 className="heading-md text-white flex items-center gap-2 mb-5">
                            <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
                            System Health
                        </h2>
                        
                        {systemInfo ? (
                            <div className="space-y-4">
                                <HealthGauge 
                                    label="CPU" 
                                    value={stats.totalCpu} 
                                    max={100}
                                    color={stats.totalCpu < 60 ? 'emerald' : stats.totalCpu < 85 ? 'amber' : 'red'}
                                />
                                <HealthGauge 
                                    label="Memory" 
                                    value={Math.min((stats.totalMemory / 4096) * 100, 100)} 
                                    max={100}
                                    color="blue"
                                    displayValue={`${stats.totalMemory} MB`}
                                />
                                <HealthGauge 
                                    label="Services" 
                                    value={(stats.online / (stats.online + stats.offline || 1)) * 100} 
                                    max={100}
                                    color={stats.offline === 0 ? 'emerald' : 'amber'}
                                    displayValue={`${stats.online}/${stats.online + stats.offline}`}
                                />
                                
                                <div className="pt-3 border-t border-white/[0.04]">
                                    <div className="flex items-center justify-between text-sm">
                                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Uptime</span>
                                        <span className="font-mono text-emerald-400">{systemInfo.uptime}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-32">
                                <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-2 gap-4">
                {/* Activity Chart */}
                <div className="card">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="heading-md text-white flex items-center gap-2">
                            <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-blue-400 to-blue-600" />
                            Server Activity (24h)
                        </h2>
                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>CPU</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Memory</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis 
                                    dataKey="time" 
                                    stroke="rgba(255,255,255,0.2)" 
                                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis 
                                    stroke="rgba(255,255,255,0.2)" 
                                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                    domain={[0, 100]}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        background: 'rgba(10,10,20,0.95)', 
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                                    }}
                                    labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="cpu" 
                                    stroke="#D4AF37" 
                                    strokeWidth={2}
                                    fill="url(#cpuGradient)"
                                    dot={false}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="memory" 
                                    stroke="#3b82f6" 
                                    strokeWidth={2}
                                    fill="url(#memGradient)"
                                    dot={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Service Resources Chart */}
                <div className="card">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="heading-md text-white flex items-center gap-2">
                            <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-purple-400 to-purple-600" />
                            Top Services by Memory
                        </h2>
                    </div>
                    <div className="h-48">
                        {serviceChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={serviceChartData} layout="vertical" barSize={16}>
                                    <defs>
                                        <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.8}/>
                                            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.6}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis 
                                        type="number" 
                                        stroke="rgba(255,255,255,0.2)"
                                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis 
                                        type="category" 
                                        dataKey="name" 
                                        stroke="rgba(255,255,255,0.2)"
                                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={false}
                                        width={100}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            background: 'rgba(10,10,20,0.95)', 
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px'
                                        }}
                                        formatter={(value) => [`${value} MB`, 'Memory']}
                                    />
                                    <Bar dataKey="memory" fill="url(#barGradient)" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <p style={{ color: 'rgba(255,255,255,0.3)' }}>No service data available</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Services Grid + Activity Feed */}
            <div className="grid grid-cols-3 gap-4">
                {/* Services Grid */}
                <div className="col-span-2 card">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="heading-md text-white flex items-center gap-2">
                            <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-cyan-400 to-cyan-600" />
                            Services 
                            <span className="ml-1 text-sm font-normal" style={{ color: 'rgba(255,255,255,0.4)' }}>
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
                            {processes.slice(0, 12).map((proc, index) => (
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
                    
                    {processes.length > 12 && (
                        <div className="text-center mt-4 pt-4 border-t border-white/[0.04]">
                            <Link 
                                to="/systems" 
                                className="text-sm font-medium"
                                style={{ color: 'rgba(255,255,255,0.5)' }}
                            >
                                +{processes.length - 12} more services →
                            </Link>
                        </div>
                    )}
                </div>

                {/* Live Activity Feed */}
                <div className="col-span-1">
                    <div 
                        className="h-full rounded-xl p-5 relative overflow-hidden"
                        style={{
                            background: 'linear-gradient(145deg, rgba(16, 16, 28, 0.9) 0%, rgba(10, 10, 18, 0.95) 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.04)'
                        }}
                    >
                        <h2 className="heading-md text-white flex items-center gap-2 mb-4">
                            <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-rose-400 to-rose-600" />
                            Live Activity
                            <span className="relative flex h-2 w-2 ml-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </h2>
                        
                        <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
                            {activityFeed.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                        No recent activity
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                                        Actions will appear here
                                    </p>
                                </div>
                            ) : (
                                activityFeed.map((activity, index) => (
                                    <ActivityItem key={activity.id} activity={activity} index={index} />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* System Info Footer */}
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
        </>
    );
}

// Community Dashboard Component
function CommunityDashboard({ data = {}, onRefresh }) {
    // Handle undefined data gracefully
    const { 
        economy = null, 
        moderation = null, 
        discord = null, 
        activity = null, 
        loading = false, 
        error = null 
    } = data || {};
    
    // Parse API response into expected format
    const economyStats = economy?.stats || economy || {};
    const moderationStats = moderation || {};
    const discordStats = discord || {};
    const activityStats = activity || {};
    
    // Generate fallback data if API returns nothing useful
    const mockEconomy = {
        totalGDP: economyStats.gdp30d || economyStats.totalMoneySupply || 15847293,
        moneySupply: economyStats.totalMoneySupply || 8234567,
        activeUsers: economyStats.activeUsers7d || economyStats.totalUsers || 1247,
        transactionsToday: activityStats.transactionsToday || 3421,
        topEarners: (economy?.topUsers || []).slice(0, 5).map((u, i) => ({
            name: u.username || u.discord_id || 'User',
            balance: u.total || u.balance || 0,
            rank: i + 1
        })) || [
            { name: 'Loading...', balance: 0, rank: 1 }
        ],
        inflationRate: parseFloat(economyStats.inflation) || 2.4,
        averageBalance: economyStats.avgBalance || 6532
    };
    
    // Ensure topEarners has at least one entry
    if (mockEconomy.topEarners.length === 0) {
        mockEconomy.topEarners = [{ name: 'No data', balance: 0, rank: 1 }];
    }
    
    const mockModeration = {
        openCases: moderationStats.totalCases || 12,
        casesToday: moderationStats.todayCases || 3,
        casesThisWeek: moderationStats.recentCases || 18,
        warningsToday: moderationStats.casesByType?.warn || 7,
        warningsThisWeek: moderationStats.casesByType?.warn || 42,
        activeMutes: moderationStats.activeMutes || 4,
        watchlistCount: 23,
        banCount: moderationStats.activeBans || 156
    };
    
    const mockDiscord = {
        totalMembers: discordStats.memberCount || 15847,
        online: discordStats.onlineCount || 3421,
        idle: 892,
        dnd: 234,
        offline: 11300,
        newJoinsThisWeek: 287,
        leavesThisWeek: 54,
        boostCount: 28,
        boostTier: 3
    };
    
    const mockActivity = activity || {
        messagesPerHour: Array.from({ length: 24 }, (_, i) => ({
            hour: i.toString().padStart(2, '0') + ':00',
            messages: Math.floor(Math.random() * 500 + 100)
        })),
        mostActiveChannels: [
            { name: 'general', messages: 2341 },
            { name: 'economy', messages: 1876 },
            { name: 'trading', messages: 1543 },
            { name: 'politics', messages: 1298 },
            { name: 'off-topic', messages: 987 }
        ],
        totalMessagesToday: 8934,
        usersInVoice: 47,
        peakVoiceToday: 128,
        mostUsedVoiceChannels: [
            { name: 'Lounge', users: 23 },
            { name: 'Gaming', users: 15 },
            { name: 'Music', users: 9 }
        ]
    };
    
    const mockRoleDistribution = [
        { name: 'Citizen', value: 8500, color: '#60a5fa' },
        { name: 'Business Owner', value: 2340, color: '#34d399' },
        { name: 'Government', value: 156, color: '#D4AF37' },
        { name: 'Staff', value: 45, color: '#f87171' },
        { name: 'Senator', value: 23, color: '#a78bfa' },
        { name: 'Cabinet', value: 12, color: '#fbbf24' }
    ];
    
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                    <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading community data...</p>
                </div>
            </div>
        );
    }
    
    // Safety check for data
    if (!mockEconomy || !mockModeration || !mockDiscord || !mockActivity) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-white text-lg mb-2">Unable to load community data</p>
                    <button onClick={onRefresh} className="btn btn-primary">
                        Retry
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-4 animate-fade-in">
            {error && (
                <div 
                    className="p-4 rounded-xl"
                    style={{
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
                        border: '1px solid rgba(245, 158, 11, 0.2)'
                    }}
                >
                    <p className="text-amber-400 text-sm">⚠️ Some data may be using mock values. API endpoints may not be available.</p>
                </div>
            )}
            
            {/* Economy Overview */}
            <div className="grid grid-cols-4 gap-4">
                <CommunityStatCard 
                    icon="💰" 
                    label="Total GDP" 
                    value={`$${(mockEconomy.totalGDP / 1000000).toFixed(2)}M`}
                    color="amber"
                />
                <CommunityStatCard 
                    icon="👥" 
                    label="Active Users (7d)" 
                    value={mockEconomy.activeUsers.toLocaleString()}
                    color="emerald"
                />
                <CommunityStatCard 
                    icon="📊" 
                    label="Transactions Today" 
                    value={mockEconomy.transactionsToday.toLocaleString()}
                    color="blue"
                />
                <CommunityStatCard 
                    icon="📈" 
                    label="Avg Balance" 
                    value={`$${mockEconomy.averageBalance.toLocaleString()}`}
                    color="purple"
                />
            </div>
            
            {/* Economy & Moderation Row */}
            <div className="grid grid-cols-3 gap-4">
                {/* Top Earners Leaderboard */}
                <div className="card">
                    <h2 className="heading-md text-white flex items-center gap-2 mb-4">
                        <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-amber-400 to-amber-600" />
                        Top 5 Earners
                    </h2>
                    <div className="space-y-2">
                        {mockEconomy.topEarners.map((earner, i) => (
                            <div 
                                key={earner.name}
                                className="flex items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-white/[0.03]"
                                style={{
                                    background: i === 0 
                                        ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, transparent 100%)' 
                                        : 'transparent',
                                    border: i === 0 ? '1px solid rgba(212, 175, 55, 0.2)' : '1px solid transparent'
                                }}
                            >
                                <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                                    style={{
                                        background: i === 0 ? 'linear-gradient(135deg, #D4AF37 0%, #f59e0b 100%)' 
                                            : i === 1 ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                                            : i === 2 ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
                                            : 'rgba(255,255,255,0.1)',
                                        color: i < 3 ? '#000' : 'rgba(255,255,255,0.6)'
                                    }}
                                >
                                    {earner.rank}
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-medium">{earner.name}</p>
                                </div>
                                <p className="font-mono text-sm" style={{ color: '#D4AF37' }}>
                                    ${earner.balance.toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Moderation Stats */}
                <div className="card">
                    <h2 className="heading-md text-white flex items-center gap-2 mb-4">
                        <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-red-400 to-red-600" />
                        Moderation Stats
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <MiniStatCard label="Open Cases" value={mockModeration.openCases} color="red" />
                        <MiniStatCard label="Cases Today" value={mockModeration.casesToday} color="amber" />
                        <MiniStatCard label="Warnings (Week)" value={mockModeration.warningsThisWeek} color="orange" />
                        <MiniStatCard label="Active Mutes" value={mockModeration.activeMutes} color="yellow" />
                        <MiniStatCard label="Watchlist" value={mockModeration.watchlistCount} color="purple" />
                        <MiniStatCard label="Total Bans" value={mockModeration.banCount} color="red" />
                    </div>
                </div>
                
                {/* Discord Server Health */}
                <div className="card">
                    <h2 className="heading-md text-white flex items-center gap-2 mb-4">
                        <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-indigo-400 to-indigo-600" />
                        Server Health
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Total Members</span>
                            <span className="text-white font-bold text-lg">{mockDiscord.totalMembers.toLocaleString()}</span>
                        </div>
                        
                        {/* Online status breakdown */}
                        <div className="space-y-2">
                            <StatusBreakdown label="Online" value={mockDiscord.online} total={mockDiscord.totalMembers} color="#22c55e" />
                            <StatusBreakdown label="Idle" value={mockDiscord.idle} total={mockDiscord.totalMembers} color="#eab308" />
                            <StatusBreakdown label="DND" value={mockDiscord.dnd} total={mockDiscord.totalMembers} color="#ef4444" />
                            <StatusBreakdown label="Offline" value={mockDiscord.offline} total={mockDiscord.totalMembers} color="#6b7280" />
                        </div>
                        
                        <div className="pt-3 border-t border-white/[0.04] space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span style={{ color: 'rgba(255,255,255,0.4)' }}>New Joins (Week)</span>
                                <span className="text-emerald-400 font-medium">+{mockDiscord.newJoinsThisWeek}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Leaves (Week)</span>
                                <span className="text-red-400 font-medium">-{mockDiscord.leavesThisWeek}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Server Boosts</span>
                                <span className="text-pink-400 font-medium">
                                    {mockDiscord.boostCount} (Tier {mockDiscord.boostTier})
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-4">
                {/* Role Distribution Pie Chart */}
                <div className="card">
                    <h2 className="heading-md text-white flex items-center gap-2 mb-4">
                        <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-purple-400 to-purple-600" />
                        Role Distribution
                    </h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={mockRoleDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {mockRoleDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ 
                                        background: 'rgba(10,10,20,0.95)', 
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                    formatter={(value, name) => [value.toLocaleString(), name]}
                                />
                                <Legend 
                                    layout="vertical"
                                    align="right"
                                    verticalAlign="middle"
                                    iconType="circle"
                                    iconSize={8}
                                    formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                {/* Message Activity Chart */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="heading-md text-white flex items-center gap-2">
                            <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-cyan-400 to-cyan-600" />
                            Message Activity (24h)
                        </h2>
                        <span className="text-sm font-medium" style={{ color: '#D4AF37' }}>
                            {mockActivity.totalMessagesToday.toLocaleString()} today
                        </span>
                    </div>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={mockActivity.messagesPerHour}>
                                <defs>
                                    <linearGradient id="msgGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis 
                                    dataKey="hour" 
                                    stroke="rgba(255,255,255,0.2)" 
                                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={3}
                                />
                                <YAxis 
                                    stroke="rgba(255,255,255,0.2)" 
                                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        background: 'rgba(10,10,20,0.95)', 
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                    formatter={(value) => [value, 'Messages']}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="messages" 
                                    stroke="#06b6d4" 
                                    strokeWidth={2}
                                    fill="url(#msgGradient)"
                                    dot={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            
            {/* Activity Row */}
            <div className="grid grid-cols-3 gap-4">
                {/* Most Active Channels */}
                <div className="card">
                    <h2 className="heading-md text-white flex items-center gap-2 mb-4">
                        <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-blue-400 to-blue-600" />
                        Most Active Channels
                    </h2>
                    <div className="space-y-3">
                        {mockActivity.mostActiveChannels.map((channel, i) => (
                            <div key={channel.name} className="flex items-center gap-3">
                                <span className="text-white/40 text-sm w-4">{i + 1}</span>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-white text-sm">#{channel.name}</span>
                                        <span className="text-white/50 text-xs">{channel.messages.toLocaleString()}</span>
                                    </div>
                                    <div 
                                        className="h-1.5 rounded-full overflow-hidden"
                                        style={{ background: 'rgba(255,255,255,0.1)' }}
                                    >
                                        <div 
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ 
                                                width: `${(channel.messages / mockActivity.mostActiveChannels[0].messages) * 100}%`,
                                                background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Voice Activity */}
                <div className="card">
                    <h2 className="heading-md text-white flex items-center gap-2 mb-4">
                        <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-green-400 to-green-600" />
                        Voice Activity
                    </h2>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div 
                            className="p-4 rounded-xl text-center"
                            style={{ 
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, transparent 100%)',
                                border: '1px solid rgba(34, 197, 94, 0.2)'
                            }}
                        >
                            <p className="text-2xl font-bold text-emerald-400">{mockActivity.usersInVoice}</p>
                            <p className="text-xs text-white/40">In Voice Now</p>
                        </div>
                        <div 
                            className="p-4 rounded-xl text-center"
                            style={{ 
                                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, transparent 100%)',
                                border: '1px solid rgba(168, 85, 247, 0.2)'
                            }}
                        >
                            <p className="text-2xl font-bold text-purple-400">{mockActivity.peakVoiceToday}</p>
                            <p className="text-xs text-white/40">Peak Today</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs text-white/40 mb-2">Most Used Voice Channels</p>
                        {mockActivity.mostUsedVoiceChannels.map((channel) => (
                            <div 
                                key={channel.name}
                                className="flex items-center justify-between p-2 rounded-lg"
                                style={{ background: 'rgba(255,255,255,0.02)' }}
                            >
                                <span className="text-white text-sm flex items-center gap-2">
                                    <span style={{ color: '#22c55e' }}>🔊</span>
                                    {channel.name}
                                </span>
                                <span className="text-emerald-400 text-sm font-medium">{channel.users} users</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Economy Quick Stats */}
                <div className="card">
                    <h2 className="heading-md text-white flex items-center gap-2 mb-4">
                        <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-600" />
                        Economy Health
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <span className="text-white/60">Money Supply</span>
                            <span className="text-white font-mono">${(mockEconomy.moneySupply / 1000000).toFixed(2)}M</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <span className="text-white/60">Inflation Rate</span>
                            <span className={`font-mono ${mockEconomy.inflationRate > 3 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {mockEconomy.inflationRate}%
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <span className="text-white/60">Velocity (Today)</span>
                            <span className="text-amber-400 font-mono">
                                {(mockEconomy.transactionsToday / mockEconomy.activeUsers).toFixed(2)}x
                            </span>
                        </div>
                        <div className="pt-3 border-t border-white/[0.04]">
                            <button 
                                onClick={onRefresh}
                                className="w-full py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-amber-500/20"
                                style={{ 
                                    background: 'rgba(212, 175, 55, 0.1)',
                                    border: '1px solid rgba(212, 175, 55, 0.2)',
                                    color: '#D4AF37'
                                }}
                            >
                                Refresh Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Community Stat Card
function CommunityStatCard({ icon, label, value, color }) {
    const colors = {
        amber: { bg: 'rgba(212, 175, 55, 0.08)', border: 'rgba(212, 175, 55, 0.2)', text: '#D4AF37' },
        emerald: { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.2)', text: '#34d399' },
        blue: { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa' },
        purple: { bg: 'rgba(168, 85, 247, 0.08)', border: 'rgba(168, 85, 247, 0.2)', text: '#a78bfa' }
    };
    const c = colors[color] || colors.amber;
    
    return (
        <div 
            className="p-5 rounded-xl transition-all duration-300 hover:scale-[1.02]"
            style={{ 
                background: `linear-gradient(135deg, ${c.bg} 0%, transparent 100%)`,
                border: `1px solid ${c.border}`
            }}
        >
            <div className="text-2xl mb-2">{icon}</div>
            <p className="text-2xl font-bold" style={{ color: c.text }}>{value}</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
        </div>
    );
}

// Mini Stat Card for Moderation
function MiniStatCard({ label, value, color }) {
    const colors = {
        red: '#ef4444',
        amber: '#f59e0b',
        orange: '#f97316',
        yellow: '#eab308',
        purple: '#a78bfa'
    };
    
    return (
        <div 
            className="p-3 rounded-lg text-center"
            style={{ background: 'rgba(255,255,255,0.02)' }}
        >
            <p className="text-xl font-bold" style={{ color: colors[color] || '#fff' }}>{value}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
        </div>
    );
}

// Status Breakdown for Discord health
function StatusBreakdown({ label, value, total, color }) {
    const percentage = ((value / total) * 100).toFixed(1);
    
    return (
        <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-xs flex-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
            <span className="text-xs font-mono text-white">{value.toLocaleString()}</span>
            <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)', width: '40px', textAlign: 'right' }}>
                {percentage}%
            </span>
        </div>
    );
}

// Status Badge Component
function StatusBadge({ status }) {
    const styles = {
        connected: { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
        error: { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
        loading: { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
        connecting: { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' }
    };
    
    const s = styles[status] || styles.connecting;
    
    return (
        <span 
            className="text-sm font-medium px-3 py-1 rounded-full flex items-center gap-1.5"
            style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'animate-pulse' : ''}`} style={{ background: s.color }} />
            {status === 'connected' ? 'Live' : status === 'error' ? 'Error' : 'Syncing'}
        </span>
    );
}

// Quick Status Item
function QuickStatusItem({ icon, label, value, status }) {
    const colors = {
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#60a5fa'
    };
    
    return (
        <div className="flex items-center gap-3">
            <div 
                className="w-2 h-2 rounded-full"
                style={{ 
                    background: colors[status],
                    boxShadow: `0 0 8px ${colors[status]}60`
                }}
            />
            <div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
                <p className="text-sm font-medium text-white">{value}</p>
            </div>
        </div>
    );
}

// Animated Stat Card with Sparkline
function AnimatedStatCard({ icon, label, value, suffix = '', color, sparkData = [] }) {
    const [displayValue, setDisplayValue] = useState(0);
    
    useEffect(() => {
        const numValue = typeof value === 'number' ? value : parseInt(value) || 0;
        const duration = 1000;
        const steps = 30;
        const increment = numValue / steps;
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= numValue) {
                setDisplayValue(numValue);
                clearInterval(timer);
            } else {
                setDisplayValue(Math.floor(current));
            }
        }, duration / steps);
        
        return () => clearInterval(timer);
    }, [value]);
    
    const colors = {
        emerald: { 
            bg: 'rgba(16, 185, 129, 0.06)', 
            text: '#34d399', 
            glow: 'rgba(16, 185, 129, 0.4)',
            gradient: 'from-emerald-500/20 to-emerald-600/5'
        },
        red: { 
            bg: 'rgba(239, 68, 68, 0.06)', 
            text: '#f87171', 
            glow: 'rgba(239, 68, 68, 0.4)',
            gradient: 'from-red-500/20 to-red-600/5'
        },
        blue: { 
            bg: 'rgba(59, 130, 246, 0.06)', 
            text: '#60a5fa', 
            glow: 'rgba(59, 130, 246, 0.4)',
            gradient: 'from-blue-500/20 to-blue-600/5'
        },
        amber: { 
            bg: 'rgba(212, 175, 55, 0.06)', 
            text: '#D4AF37', 
            glow: 'rgba(212, 175, 55, 0.4)',
            gradient: 'from-amber-500/20 to-amber-600/5'
        },
        gray: { 
            bg: 'rgba(100, 100, 120, 0.06)', 
            text: '#888', 
            glow: 'rgba(100, 100, 120, 0.2)',
            gradient: 'from-gray-500/20 to-gray-600/5'
        },
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
            className="relative overflow-hidden rounded-xl p-5 group transition-all duration-300 hover:scale-[1.02]"
            style={{ 
                background: `linear-gradient(135deg, ${c.bg} 0%, transparent 100%)`,
                border: '1px solid rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(12px)'
            }}
        >
            {/* Glow effect on hover */}
            <div 
                className="absolute -top-16 -right-16 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl"
                style={{ background: c.glow }}
            />
            
            {/* Top shine */}
            <div 
                className="absolute top-0 left-0 right-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${c.glow}30, transparent)` }}
            />
            
            <div className="relative flex items-start justify-between">
                <div>
                    <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300"
                        style={{ 
                            background: `linear-gradient(135deg, ${c.bg} 0%, transparent 100%)`,
                            border: `1px solid ${c.glow}20`,
                            color: c.text
                        }}
                    >
                        {icons[icon]}
                    </div>
                    <p className="stat-number" style={{ color: c.text }}>
                        {displayValue}{suffix}
                    </p>
                    <p className="stat-label mt-1">{label}</p>
                </div>
                
                {/* Mini Sparkline */}
                {sparkData.length > 0 && (
                    <div className="w-20 h-10 opacity-50 group-hover:opacity-80 transition-opacity">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparkData}>
                                <defs>
                                    <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={c.text} stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor={c.text} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Area 
                                    type="monotone" 
                                    dataKey="v" 
                                    stroke={c.text} 
                                    strokeWidth={1.5}
                                    fill={`url(#spark-${color})`}
                                    dot={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}

// Quick Action Tile - Large Premium Button
function QuickActionTile({ icon, label, onClick, loading, danger, shortcut }) {
    const icons = {
        restart: (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
        ),
        terminal: (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
        deploy: (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
        ),
        database: (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
        ),
        panic: (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        ),
    };
    
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={`relative p-5 rounded-xl border transition-all duration-300 text-center group overflow-hidden ${
                danger ? 'hover:border-red-500/40' : 'hover:border-amber-500/30'
            } hover:scale-[1.03] active:scale-[0.98]`}
            style={{
                background: danger 
                    ? 'linear-gradient(145deg, rgba(239, 68, 68, 0.08) 0%, rgba(185, 28, 28, 0.02) 100%)'
                    : 'linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%)',
                border: danger
                    ? '1px solid rgba(239, 68, 68, 0.15)'
                    : '1px solid rgba(255, 255, 255, 0.04)'
            }}
        >
            {/* Animated gradient overlay */}
            <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                    background: danger 
                        ? 'linear-gradient(145deg, rgba(239, 68, 68, 0.12) 0%, transparent 100%)'
                        : 'linear-gradient(145deg, rgba(212, 175, 55, 0.08) 0%, transparent 100%)'
                }}
            />
            
            {/* Shine effect */}
            <div 
                className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: danger ? 'rgba(239, 68, 68, 0.3)' : 'rgba(212, 175, 55, 0.3)' }}
            />
            
            <div className="relative">
                {loading ? (
                    <div className="w-7 h-7 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                ) : (
                    <div 
                        className="mx-auto mb-3 transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-0.5"
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
                        className="text-[10px] mt-1.5 block font-mono px-1.5 py-0.5 rounded mx-auto w-fit"
                        style={{ 
                            color: 'rgba(255,255,255,0.3)',
                            background: 'rgba(255,255,255,0.03)'
                        }}
                    >
                        {shortcut}
                    </span>
                )}
            </div>
        </button>
    );
}

// Health Gauge Component
function HealthGauge({ label, value, max, color, displayValue }) {
    const colors = {
        emerald: { bar: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
        amber: { bar: '#D4AF37', bg: 'rgba(212, 175, 55, 0.15)' },
        red: { bar: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
        blue: { bar: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' }
    };
    
    const c = colors[color] || colors.emerald;
    const percentage = Math.min((value / max) * 100, 100);
    
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                <span className="text-sm font-mono font-medium" style={{ color: c.bar }}>
                    {displayValue || `${Math.round(value)}%`}
                </span>
            </div>
            <div 
                className="h-2 rounded-full overflow-hidden"
                style={{ background: c.bg }}
            >
                <div 
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ 
                        width: `${percentage}%`,
                        background: `linear-gradient(90deg, ${c.bar} 0%, ${c.bar}CC 100%)`,
                        boxShadow: `0 0 8px ${c.bar}50`
                    }}
                />
            </div>
        </div>
    );
}

// Activity Item Component
function ActivityItem({ activity, index }) {
    const types = {
        deploy: { color: '#34d399', icon: '🚀', bg: 'rgba(16, 185, 129, 0.1)' },
        restart: { color: '#60a5fa', icon: '🔄', bg: 'rgba(59, 130, 246, 0.1)' },
        error: { color: '#f87171', icon: '⚠️', bg: 'rgba(239, 68, 68, 0.1)' },
        start: { color: '#34d399', icon: '▶️', bg: 'rgba(16, 185, 129, 0.1)' },
        stop: { color: '#fbbf24', icon: '⏹️', bg: 'rgba(245, 158, 11, 0.1)' }
    };
    
    const t = types[activity.type] || types.deploy;
    
    const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return `${Math.floor(seconds / 3600)}h ago`;
    };
    
    return (
        <div 
            className="p-3 rounded-lg transition-all duration-300 animate-fade-in group hover:bg-white/[0.02]"
            style={{ 
                background: t.bg,
                animationDelay: `${index * 50}ms`
            }}
        >
            <div className="flex items-start gap-3">
                <span className="text-base">{t.icon}</span>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{activity.title}</p>
                    <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {activity.description}
                    </p>
                </div>
                <span className="text-[10px] font-mono shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {timeAgo(activity.timestamp)}
                </span>
            </div>
        </div>
    );
}

// Service Card Component
function ServiceCard({ process, onAction, actionLoading, index }) {
    const isOnline = process.status === 'online';
    const isLoading = actionLoading?.startsWith(process.name);
    
    return (
        <div 
            className="p-4 rounded-xl transition-all duration-300 group animate-fade-in hover:scale-[1.02]"
            style={{
                background: isOnline 
                    ? 'linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%)'
                    : 'linear-gradient(145deg, rgba(239, 68, 68, 0.1) 0%, rgba(185, 28, 28, 0.03) 100%)',
                border: isOnline 
                    ? '1px solid rgba(255, 255, 255, 0.04)' 
                    : '1px solid rgba(239, 68, 68, 0.25)',
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
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50 hover:bg-white/[0.08]"
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

// System Info Card Component
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
        <div 
            className="rounded-xl p-5 transition-all duration-300 hover:scale-[1.01]"
            style={{
                background: 'linear-gradient(145deg, rgba(16, 16, 28, 0.8) 0%, rgba(10, 10, 18, 0.9) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.04)'
            }}
        >
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
