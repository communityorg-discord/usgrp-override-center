import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Link } from 'react-router-dom';

/**
 * ModerationWidget - Quick moderation stats for dashboard
 */
export default function ModerationWidget() {
    const { fetchApi } = useApi();
    const [stats, setStats] = useState(null);
    const [recentCases, setRecentCases] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
        const interval = setInterval(loadStats, 60000);
        return () => clearInterval(interval);
    }, []);

    async function loadStats() {
        try {
            const [modData, casesData] = await Promise.all([
                fetchApi('/override/moderation/stats'),
                fetchApi('/override/moderation/cases?limit=5')
            ]);
            
            if (modData) setStats(modData);
            if (casesData?.cases) setRecentCases(casesData.cases);
        } catch (error) {
            console.error('Moderation stats failed:', error);
        } finally {
            setLoading(false);
        }
    }

    const ACTION_ICONS = {
        warn: '⚠️',
        mute: '🔇',
        kick: '👢',
        ban: '🔨',
        softban: '🔨',
        timeout: '⏱️',
        note: '📝'
    };

    const ACTION_COLORS = {
        warn: 'text-yellow-400',
        mute: 'text-orange-400',
        kick: 'text-red-400',
        ban: 'text-red-500',
        softban: 'text-red-400',
        timeout: 'text-blue-400',
        note: 'text-gray-400'
    };

    if (loading) {
        return (
            <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-800 rounded w-1/3 mb-3"></div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                    {[1,2,3].map(i => (
                        <div key={i} className="h-16 bg-gray-800 rounded"></div>
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
                    <span className="text-red-400">⚖️</span>
                    Moderation
                </h3>
                <Link to="/moderation/cases" className="text-xs text-gray-500 hover:text-amber-400 transition-colors">
                    View Cases →
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="p-4">
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-black/20 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-yellow-400">{stats?.warnsToday || 0}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Warns Today</p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-red-400">{stats?.bansToday || 0}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Bans Today</p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-blue-400">{stats?.activeMutes || 0}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Active Mutes</p>
                    </div>
                </div>

                {/* Recent Cases */}
                <div className="border-t border-white/5 pt-3">
                    <p className="text-xs text-gray-500 mb-2">Recent Actions</p>
                    <div className="space-y-1">
                        {recentCases.slice(0, 4).map((c, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded hover:bg-white/5">
                                <span>{ACTION_ICONS[c.action] || '📋'}</span>
                                <span className={`font-medium ${ACTION_COLORS[c.action] || 'text-gray-400'}`}>
                                    {c.action?.toUpperCase()}
                                </span>
                                <span className="text-gray-500 truncate flex-1">
                                    {c.target_name || `User ${c.target_id?.slice(-4)}`}
                                </span>
                                <span className="text-gray-600 text-[10px]">
                                    {c.created_at ? new Date(c.created_at).toLocaleTimeString() : ''}
                                </span>
                            </div>
                        ))}
                        {recentCases.length === 0 && (
                            <p className="text-xs text-gray-600 text-center py-2">No recent actions</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-2 border-t border-white/5 flex gap-2">
                <Link 
                    to="/moderation/actions"
                    className="flex-1 py-1.5 text-xs text-center text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                >
                    ⚡ Quick Action
                </Link>
                <Link 
                    to="/moderation/watchlist"
                    className="flex-1 py-1.5 text-xs text-center text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                >
                    👁️ Watchlist
                </Link>
            </div>
        </div>
    );
}
