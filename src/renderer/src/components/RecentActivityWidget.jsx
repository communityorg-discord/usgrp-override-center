import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

/**
 * RecentActivityWidget - Shows recent admin activity
 */
export default function RecentActivityWidget() {
    const { fetchApi } = useApi();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadActivity();
        const interval = setInterval(loadActivity, 30000);
        return () => clearInterval(interval);
    }, []);

    async function loadActivity() {
        try {
            // Try to get audit log or deploy history
            const [auditData, deployData] = await Promise.allSettled([
                fetchApi('/override/audit/recent?limit=10'),
                window.electron.store.get('deploy_history')
            ]);

            const items = [];

            // Add audit events
            if (auditData.status === 'fulfilled' && auditData.value?.events) {
                for (const event of auditData.value.events.slice(0, 5)) {
                    items.push({
                        type: 'audit',
                        action: event.action,
                        user: event.user,
                        target: event.target,
                        time: new Date(event.timestamp)
                    });
                }
            }

            // Add deploy events
            if (deployData.status === 'fulfilled' && deployData.value) {
                for (const deploy of deployData.value.slice(0, 5)) {
                    items.push({
                        type: 'deploy',
                        action: deploy.type === 'rollback' ? 'Rollback' : 'Deploy',
                        project: deploy.project,
                        status: deploy.status,
                        time: new Date(deploy.timestamp)
                    });
                }
            }

            // Sort by time and take top 8
            items.sort((a, b) => b.time - a.time);
            setActivities(items.slice(0, 8));

        } catch (error) {
            console.error('Activity load failed:', error);
        } finally {
            setLoading(false);
        }
    }

    const getIcon = (activity) => {
        if (activity.type === 'deploy') {
            return activity.status === 'success' ? '🚀' : '❌';
        }
        switch (activity.action?.toLowerCase()) {
            case 'restart': return '🔄';
            case 'login': return '🔐';
            case 'ban': return '🔨';
            case 'unban': return '✅';
            case 'edit': return '✏️';
            case 'delete': return '🗑️';
            case 'create': return '➕';
            default: return '📋';
        }
    };

    const formatTime = (date) => {
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-800 rounded w-1/3 mb-3"></div>
                <div className="space-y-2">
                    {[1,2,3,4].map(i => <div key={i} className="h-8 bg-gray-800 rounded"></div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#1a1a24] border border-white/5 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-blue-400">📋</span>
                    Recent Activity
                </h3>
            </div>

            {/* Activity List */}
            <div className="max-h-64 overflow-auto">
                {activities.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-xs">
                        No recent activity
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {activities.map((activity, i) => (
                            <div 
                                key={i}
                                className="px-4 py-2 hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">{getIcon(activity)}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-white truncate">
                                            {activity.type === 'deploy' ? (
                                                <>
                                                    <span className={activity.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                                                        {activity.action}
                                                    </span>
                                                    {' '}
                                                    <span className="text-gray-400">{activity.project}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-amber-400">{activity.action}</span>
                                                    {activity.target && (
                                                        <span className="text-gray-400"> → {activity.target}</span>
                                                    )}
                                                </>
                                            )}
                                        </p>
                                        <p className="text-[10px] text-gray-600">
                                            {activity.user || 'System'} • {formatTime(activity.time)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-white/5 text-center">
                <span className="text-[10px] text-gray-600">
                    Auto-refreshes every 30s
                </span>
            </div>
        </div>
    );
}
