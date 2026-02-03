import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from '../hooks/useApi';

// Activity tracking hook
export function useActivityTracker() {
    const { fetchApi } = useApi();
    const lastPage = useRef(null);
    
    // Get user info from stored auth
    const getUserInfo = useCallback(() => {
        try {
            const auth = localStorage.getItem('override-auth');
            if (auth) {
                const parsed = JSON.parse(auth);
                return {
                    userId: parsed.user?.id || parsed.discordId || 'unknown',
                    userName: parsed.user?.username || parsed.username || 'Unknown User'
                };
            }
        } catch (e) {}
        return { userId: 'unknown', userName: 'Unknown User' };
    }, []);
    
    // Report an activity
    const reportActivity = useCallback(async (action, details = null) => {
        try {
            const { userId, userName } = getUserInfo();
            const page = window.location.hash.replace('#', '') || '/';
            
            await fetchApi('/override/activity/report', {
                method: 'POST',
                body: JSON.stringify({
                    userId,
                    userName,
                    action,
                    page,
                    details
                })
            });
        } catch (e) {
            // Silent fail - don't break the app for activity tracking
        }
    }, [fetchApi, getUserInfo]);
    
    // Track navigation
    useEffect(() => {
        const handleNavigation = () => {
            const page = window.location.hash.replace('#', '') || '/';
            if (page !== lastPage.current) {
                lastPage.current = page;
                reportActivity('navigated', { to: page });
            }
        };
        
        // Initial report
        handleNavigation();
        
        // Listen for hash changes
        window.addEventListener('hashchange', handleNavigation);
        return () => window.removeEventListener('hashchange', handleNavigation);
    }, [reportActivity]);
    
    // Heartbeat every 30 seconds
    useEffect(() => {
        const sendHeartbeat = async () => {
            try {
                const { userId, userName } = getUserInfo();
                const page = window.location.hash.replace('#', '') || '/';
                
                await fetchApi('/override/activity/heartbeat', {
                    method: 'POST',
                    body: JSON.stringify({ userId, userName, page })
                });
            } catch (e) {}
        };
        
        sendHeartbeat();
        const interval = setInterval(sendHeartbeat, 30000);
        return () => clearInterval(interval);
    }, [fetchApi, getUserInfo]);
    
    return { reportActivity };
}

// Activity Monitor Panel
export default function ActivityMonitor({ isOpen, onClose }) {
    const { fetchApi } = useApi();
    const [events, setEvents] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const lastFetch = useRef(0);
    
    const fetchActivity = useCallback(async () => {
        try {
            const res = await fetchApi(`/override/activity/live?since=${lastFetch.current}&limit=50`);
            if (res.success) {
                // Merge new events
                if (lastFetch.current === 0) {
                    setEvents(res.events);
                } else {
                    setEvents(prev => {
                        const newEvents = res.events.filter(e => !prev.some(p => p.id === e.id));
                        return [...newEvents, ...prev].slice(0, 100);
                    });
                }
                setOnlineUsers(res.onlineUsers);
                lastFetch.current = res.serverTime;
            }
        } catch (e) {
            console.error('Failed to fetch activity:', e);
        } finally {
            setLoading(false);
        }
    }, [fetchApi]);
    
    useEffect(() => {
        if (!isOpen) return;
        
        fetchActivity();
        const interval = setInterval(fetchActivity, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
    }, [isOpen, fetchActivity]);
    
    if (!isOpen) return null;
    
    const formatTime = (ts) => {
        const date = new Date(ts);
        const now = new Date();
        const diffMs = now - date;
        
        if (diffMs < 60000) return 'just now';
        if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    
    const getActionIcon = (action) => {
        if (action === 'navigated') return '🧭';
        if (action === 'clicked') return '👆';
        if (action === 'searched') return '🔍';
        if (action === 'viewed') return '👁️';
        if (action === 'edited') return '✏️';
        if (action === 'online') return '🟢';
        return '📌';
    };
    
    const getPageName = (page) => {
        if (!page || page === '/') return 'Dashboard';
        const parts = page.split('/').filter(Boolean);
        return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, ' ')).join(' > ');
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <span className="text-xl">👁️</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Activity Monitor</h2>
                            <p className="text-xs text-gray-500">See what other superusers are doing</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none">&times;</button>
                </div>
                
                {/* Online Users */}
                <div className="p-4 border-b border-white/10 bg-white/5">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Online Now</h3>
                    <div className="flex flex-wrap gap-2">
                        {onlineUsers.length === 0 && (
                            <span className="text-sm text-gray-500">No other users online</span>
                        )}
                        {onlineUsers.map(user => (
                            <div 
                                key={user.userId}
                                className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5"
                            >
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                <span className="text-sm text-white font-medium">{user.name}</span>
                                <span className="text-xs text-gray-400">
                                    {getPageName(user.currentPage)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Activity Feed */}
                <div className="flex-1 overflow-y-auto p-4">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Recent Activity</h3>
                    
                    {loading && events.length === 0 && (
                        <div className="text-center py-8 text-gray-500">Loading activity...</div>
                    )}
                    
                    {!loading && events.length === 0 && (
                        <div className="text-center py-8 text-gray-500">No recent activity</div>
                    )}
                    
                    <div className="space-y-2">
                        {events.map(event => (
                            <div 
                                key={event.id}
                                className="flex items-start gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <span className="text-lg">{getActionIcon(event.action)}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-white">{event.userName}</span>
                                        <span className="text-gray-400">{event.action}</span>
                                        {event.page && (
                                            <span className="text-gold font-mono text-sm truncate">
                                                {getPageName(event.page)}
                                            </span>
                                        )}
                                    </div>
                                    {event.details && (
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {typeof event.details === 'string' 
                                                ? event.details 
                                                : JSON.stringify(event.details)}
                                        </div>
                                    )}
                                </div>
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                    {formatTime(event.timestamp)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Footer */}
                <div className="p-3 border-t border-white/10 bg-white/5 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                        Updates every 3 seconds
                    </span>
                    <span className="text-xs text-gray-500">
                        {events.length} events
                    </span>
                </div>
            </div>
        </div>
    );
}
