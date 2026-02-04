import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Link } from 'react-router-dom';

/**
 * ServiceHealthWidget - Compact service status for dashboard
 * Shows critical services with live status
 */
export default function ServiceHealthWidget() {
    const { fetchApi } = useApi();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);

    // Critical services to monitor
    const CRITICAL_SERVICES = [
        'economy-bot',
        'gov-utils',
        'api-gateway',
        'usgrp-auth',
        'citizen-portal',
        'discord-analytics'
    ];

    useEffect(() => {
        loadHealth();
        const interval = setInterval(loadHealth, 30000); // Every 30s
        return () => clearInterval(interval);
    }, []);

    async function loadHealth() {
        try {
            const data = await fetchApi('/override/pm2/list');
            if (data?.processes) {
                const filtered = data.processes
                    .filter(p => CRITICAL_SERVICES.includes(p.name))
                    .map(p => ({
                        name: p.name,
                        status: p.status,
                        uptime: p.uptime,
                        memory: p.memoryMB,
                        cpu: p.cpu,
                        restarts: p.restarts
                    }));
                setServices(filtered);
                setLastUpdate(new Date());
            }
        } catch (error) {
            console.error('Health check failed:', error);
        } finally {
            setLoading(false);
        }
    }

    const onlineCount = services.filter(s => s.status === 'online').length;
    const totalCount = services.length;
    const allHealthy = onlineCount === totalCount;

    if (loading) {
        return (
            <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-800 rounded w-1/3 mb-3"></div>
                <div className="space-y-2">
                    {[1,2,3].map(i => (
                        <div key={i} className="h-8 bg-gray-800 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#1a1a24] border border-white/5 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${allHealthy ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></span>
                    <h3 className="text-sm font-bold text-white">Service Health</h3>
                </div>
                <Link to="/health" className="text-xs text-gray-500 hover:text-amber-400 transition-colors">
                    View All →
                </Link>
            </div>

            {/* Status Bar */}
            <div className="px-4 py-2 bg-black/20 flex items-center justify-between text-xs">
                <span className={allHealthy ? 'text-green-400' : 'text-yellow-400'}>
                    {onlineCount}/{totalCount} Online
                </span>
                <span className="text-gray-600">
                    Updated {lastUpdate?.toLocaleTimeString()}
                </span>
            </div>

            {/* Services List */}
            <div className="p-2 space-y-1 max-h-48 overflow-auto">
                {services.map(svc => (
                    <div 
                        key={svc.name}
                        className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                            svc.status === 'online' 
                                ? 'bg-green-900/10 hover:bg-green-900/20' 
                                : 'bg-red-900/20 hover:bg-red-900/30'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                                svc.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                            }`}></span>
                            <span className="text-sm text-white font-medium">
                                {svc.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            {svc.restarts > 0 && (
                                <span className="text-yellow-500" title="Restarts">
                                    ↻ {svc.restarts}
                                </span>
                            )}
                            <span className="text-gray-500">
                                {svc.memory}MB
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                svc.status === 'online' 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'bg-red-500/20 text-red-400'
                            }`}>
                                {svc.status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-2 border-t border-white/5 flex gap-2">
                <button 
                    onClick={loadHealth}
                    className="flex-1 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                >
                    🔄 Refresh
                </button>
                <Link 
                    to="/systems"
                    className="flex-1 py-1.5 text-xs text-center text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                >
                    ⚙️ Manage
                </Link>
            </div>
        </div>
    );
}
