import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

function Sparkline({ data, color = '#10B981', height = 40 }) {
    if (!data || data.length < 2) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const step = 100 / (data.length - 1);

    const points = data.map((val, i) => {
        const x = i * step;
        const y = 100 - ((val - min) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height: `${height}px`, width: '100%' }}>
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                points={points}
            />
        </svg>
    );
}

function ServiceCard({ service, onSchedule }) {
    // Determine status color
    let statusColor = 'bg-green-500';
    let statusText = 'Healthy';
    
    if (service.status !== 'online') {
        statusColor = 'bg-red-500';
        statusText = 'Down';
    } else if (service.latency > 500 || service.latency === -1 || service.errorRate > 5) {
        statusColor = 'bg-yellow-500';
        statusText = 'Degraded';
    }

    // Format Uptime
    const uptimeHours = Math.floor(service.uptime / 3600000);
    const uptimeDays = Math.floor(uptimeHours / 24);
    const uptimeStr = uptimeDays > 0 
        ? `${uptimeDays}d ${uptimeHours % 24}h` 
        : `${uptimeHours}h ${Math.floor((service.uptime % 3600000) / 60000)}m`;

    // Fake history for sparklines (since backend only returns current snapshot)
    // In a real app, we'd store this in context or backend would return history.
    // We'll just generate a random variation around current value for visual effect
    const [history, setHistory] = useState({ latency: [], memory: [] });

    useEffect(() => {
        setHistory(prev => {
            const newLat = [...prev.latency, service.latency > 0 ? service.latency : 0].slice(-20);
            const newMem = [...prev.memory, service.memory / 1024 / 1024].slice(-20);
            
            // Fill initial if empty
            if (prev.latency.length === 0) {
                return {
                    latency: Array(20).fill(service.latency > 0 ? service.latency : 0).map(v => v * (0.8 + Math.random() * 0.4)),
                    memory: Array(20).fill(service.memory / 1024 / 1024).map(v => v * (0.95 + Math.random() * 0.1))
                };
            }
            return { latency: newLat, memory: newMem };
        });
    }, [service.latency, service.memory]);

    return (
        <div className="bg-surface-secondary rounded-lg border border-gray-800 p-4 hover:border-gray-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-bold text-white text-lg">{service.name}</h3>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">{service.type}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => onSchedule(service)}
                        className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                        title="Schedule Restart"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                    <div className={`px-2 py-0.5 rounded text-xs font-bold text-white ${statusColor}`}>
                        {statusText}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p className="text-xs text-gray-400">Latency</p>
                    <p className="text-lg font-mono text-white">
                        {service.latency === -1 ? 'Timeout' : `${service.latency}ms`}
                    </p>
                    <Sparkline data={history.latency} color="#3B82F6" height={30} />
                </div>
                <div>
                    <p className="text-xs text-gray-400">Memory</p>
                    <p className="text-lg font-mono text-white">
                        {(service.memory / 1024 / 1024).toFixed(0)} MB
                    </p>
                    <Sparkline data={history.memory} color="#8B5CF6" height={30} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-800 pt-3">
                <div className="flex justify-between">
                    <span className="text-gray-500">Uptime:</span>
                    <span className="text-gray-300">{uptimeStr}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Errors (50 lines):</span>
                    <span className={`${service.errorRate > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {service.errorRate.toFixed(1)}%
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">CPU:</span>
                    <span className="text-gray-300">{service.cpu}%</span>
                </div>
            </div>
        </div>
    );
}

export default function ServiceHealth() {
    const { post } = useApi();
    const [metrics, setMetrics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [scheduleService, setScheduleService] = useState(null);
    const [cronExpression, setCronExpression] = useState('0 4 * * *'); // Default 4 AM

    const fetchMetrics = async () => {
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const res = await fetch(`${apiBase}/override/health/metrics`, {
                headers: { 'X-Override-Token': token }
            });
            const data = await res.json();
            
            if (data.success) {
                setMetrics(data.metrics);
                setLastUpdate(new Date());
            }
        } catch (error) {
            console.error('Failed to fetch metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 5000);
        return () => clearInterval(interval);
    }, []);

    async function handleScheduleSubmit(e) {
        e.preventDefault();
        if (!scheduleService) return;

        try {
            await post('/override/cron/create', {
                name: `restart-${scheduleService.name}`,
                schedule: { expr: cronExpression },
                payload: {
                    text: `pm2 restart ${scheduleService.name}` // Assuming systemEvent handles this or backend needs specific format
                },
                enabled: true
            });
            alert(`Scheduled restart for ${scheduleService.name}`);
            setScheduleService(null);
        } catch (error) {
            alert(`Failed to schedule: ${error.message}`);
        }
    }

    if (loading && metrics.length === 0) {
        return <div className="p-8 text-center text-gray-400">Loading health metrics...</div>;
    }

    const servicesByType = {
        api: metrics.filter(m => m.type === 'api'),
        auth: metrics.filter(m => m.type === 'auth'),
        bot: metrics.filter(m => m.type === 'bot'),
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">Service Health Dashboard</h1>
                {lastUpdate && (
                    <span className="text-xs text-gray-500">
                        Updated: {lastUpdate.toLocaleTimeString()}
                    </span>
                )}
            </div>

            <div className="space-y-8">
                {Object.entries(servicesByType).map(([type, services]) => (
                    services.length > 0 && (
                        <div key={type}>
                            <h2 className="text-lg font-semibold text-gray-400 mb-3 uppercase tracking-wide border-b border-gray-800 pb-2">
                                {type === 'api' ? 'API Services' : type === 'auth' ? 'Authentication' : 'Bots & Workers'}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {services.map(service => (
                                    <ServiceCard 
                                        key={service.name} 
                                        service={service} 
                                        onSchedule={setScheduleService}
                                    />
                                ))}
                            </div>
                        </div>
                    )
                ))}
            </div>

            {/* Schedule Modal */}
            {scheduleService && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#1a1a24] p-6 rounded-xl border border-white/10 w-full max-w-sm shadow-2xl">
                        <h2 className="text-lg font-bold text-white mb-4">Schedule Restart: {scheduleService.name}</h2>
                        <form onSubmit={handleScheduleSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm text-gray-400 mb-1">Cron Expression</label>
                                <input 
                                    type="text" 
                                    value={cronExpression}
                                    onChange={e => setCronExpression(e.target.value)}
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                                    placeholder="0 4 * * *"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Format: min hour day month day-of-week<br/>
                                    Example: <code>0 4 * * *</code> (Every day at 4am)
                                </p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setScheduleService(null)}
                                    className="px-4 py-2 text-gray-400 hover:text-white text-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg text-sm"
                                >
                                    Create Schedule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
