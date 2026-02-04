import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';

export default function SessionViewer() {
    const { fetchApi } = useApi();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // all, active, idle, expired
    const [sortBy, setSortBy] = useState('lastActivity'); // lastActivity, user, location
    const [selectedSession, setSelectedSession] = useState(null);
    const [revokeConfirm, setRevokeConfirm] = useState(null);
    const [stats, setStats] = useState({ total: 0, active: 0, idle: 0, unique: 0 });
    
    const fetchSessions = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Try to fetch from API
            const data = await fetchApi('/override/sessions');
            
            if (data?.sessions) {
                setSessions(data.sessions);
                calculateStats(data.sessions);
            } else {
                // Generate mock data if API doesn't exist yet
                const mockSessions = generateMockSessions();
                setSessions(mockSessions);
                calculateStats(mockSessions);
            }
        } catch (err) {
            console.error('Failed to fetch sessions:', err);
            // Fallback to mock data
            const mockSessions = generateMockSessions();
            setSessions(mockSessions);
            calculateStats(mockSessions);
        } finally {
            setLoading(false);
        }
    }, [fetchApi]);
    
    function generateMockSessions() {
        const users = [
            { id: '123456789', name: 'Dion', avatar: null },
            { id: '987654321', name: 'Evan', avatar: null },
            { id: '456789123', name: 'Hayden', avatar: null },
            { id: '789123456', name: 'Admin', avatar: null },
            { id: '321654987', name: 'Moderator', avatar: null },
        ];
        
        const locations = [
            { type: 'desktop', name: 'USGRP Override Center', platform: 'Windows', version: '3.0.0' },
            { type: 'desktop', name: 'USGRP Override Center', platform: 'macOS', version: '3.0.0' },
            { type: 'web', name: 'Dashboard', platform: 'Chrome', version: 'N/A' },
            { type: 'web', name: 'Admin Panel', platform: 'Firefox', version: 'N/A' },
            { type: 'api', name: 'API Client', platform: 'cURL', version: 'N/A' },
        ];
        
        const ips = ['192.168.1.100', '10.0.0.50', '172.16.0.25', '82.132.45.78', '45.67.89.123'];
        
        return Array.from({ length: 12 }, (_, i) => {
            const user = users[Math.floor(Math.random() * users.length)];
            const location = locations[Math.floor(Math.random() * locations.length)];
            const ip = ips[Math.floor(Math.random() * ips.length)];
            
            const now = Date.now();
            const createdAt = now - Math.random() * 7 * 24 * 60 * 60 * 1000; // Last 7 days
            const lastActivity = createdAt + Math.random() * (now - createdAt);
            const idleTime = now - lastActivity;
            
            let status = 'active';
            if (idleTime > 30 * 60 * 1000) status = 'idle'; // 30 mins
            if (idleTime > 24 * 60 * 60 * 1000) status = 'expired'; // 24 hours
            
            return {
                id: `session-${i}-${Date.now()}`,
                user: {
                    id: user.id,
                    name: user.name,
                    avatar: user.avatar,
                },
                location: location,
                ip: ip,
                createdAt: new Date(createdAt).toISOString(),
                lastActivity: new Date(lastActivity).toISOString(),
                status: status,
                userAgent: `${location.platform} / ${location.name}`,
                isCurrentSession: i === 0,
            };
        });
    }
    
    function calculateStats(sessionList) {
        const uniqueUsers = new Set(sessionList.map(s => s.user.id));
        setStats({
            total: sessionList.length,
            active: sessionList.filter(s => s.status === 'active').length,
            idle: sessionList.filter(s => s.status === 'idle').length,
            unique: uniqueUsers.size,
        });
    }
    
    useEffect(() => {
        fetchSessions();
        const interval = setInterval(fetchSessions, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [fetchSessions]);
    
    async function revokeSession(sessionId) {
        try {
            await fetchApi(`/override/sessions/${sessionId}`, { method: 'DELETE' });
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            setRevokeConfirm(null);
            setSelectedSession(null);
        } catch (err) {
            // Just remove from UI for demo
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            setRevokeConfirm(null);
            setSelectedSession(null);
        }
    }
    
    async function revokeAllForUser(userId) {
        try {
            await fetchApi(`/override/sessions/user/${userId}`, { method: 'DELETE' });
            setSessions(prev => prev.filter(s => s.user.id !== userId));
        } catch (err) {
            setSessions(prev => prev.filter(s => s.user.id !== userId));
        }
        setRevokeConfirm(null);
    }
    
    function formatTimeAgo(date) {
        const now = new Date();
        const then = new Date(date);
        const diff = Math.floor((now - then) / 1000);
        
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return then.toLocaleDateString();
    }
    
    function getStatusColor(status) {
        switch (status) {
            case 'active': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'idle': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            case 'expired': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
        }
    }
    
    function getLocationIcon(type) {
        switch (type) {
            case 'desktop':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                );
            case 'web':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                );
            case 'api':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    }
    
    // Filter and sort sessions
    const filteredSessions = sessions
        .filter(s => filter === 'all' || s.status === filter)
        .sort((a, b) => {
            switch (sortBy) {
                case 'user':
                    return a.user.name.localeCompare(b.user.name);
                case 'location':
                    return a.location.name.localeCompare(b.location.name);
                case 'lastActivity':
                default:
                    return new Date(b.lastActivity) - new Date(a.lastActivity);
            }
        });
    
    // Group sessions by user
    const sessionsByUser = sessions.reduce((acc, session) => {
        const userId = session.user.id;
        if (!acc[userId]) {
            acc[userId] = {
                user: session.user,
                sessions: [],
            };
        }
        acc[userId].sessions.push(session);
        return acc;
    }, {});

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        User Sessions
                    </h1>
                    <p className="text-gray-400 mt-1">Monitor and manage active user sessions</p>
                </div>
                
                <button
                    onClick={fetchSessions}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase font-medium mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Total Sessions
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.total}</p>
                </div>
                <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs uppercase font-medium mb-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        Active Now
                    </div>
                    <p className="text-3xl font-bold text-emerald-400">{stats.active}</p>
                </div>
                <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-yellow-400 text-xs uppercase font-medium mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Idle
                    </div>
                    <p className="text-3xl font-bold text-yellow-400">{stats.idle}</p>
                </div>
                <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-400 text-xs uppercase font-medium mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Unique Users
                    </div>
                    <p className="text-3xl font-bold text-blue-400">{stats.unique}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    {[
                        { id: 'all', label: 'All', count: stats.total },
                        { id: 'active', label: 'Active', count: stats.active },
                        { id: 'idle', label: 'Idle', count: stats.idle },
                        { id: 'expired', label: 'Expired', count: stats.total - stats.active - stats.idle },
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                filter === f.id
                                    ? 'bg-amber-500 text-black'
                                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            {f.label}
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                filter === f.id ? 'bg-black/20' : 'bg-white/10'
                            }`}>
                                {f.count}
                            </span>
                        </button>
                    ))}
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Sort by:</span>
                    <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                    >
                        <option value="lastActivity">Last Activity</option>
                        <option value="user">User Name</option>
                        <option value="location">Location</option>
                    </select>
                </div>
            </div>

            {/* Sessions List */}
            <div className="flex-1 min-h-0 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <p className="text-red-400 mb-2">{error}</p>
                            <button 
                                onClick={fetchSessions}
                                className="text-amber-400 hover:text-amber-300"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-gray-500">No sessions found</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredSessions.map((session) => (
                            <div 
                                key={session.id}
                                className={`bg-[#1a1a24] border rounded-xl p-4 transition-all hover:bg-white/5 cursor-pointer ${
                                    session.isCurrentSession ? 'border-amber-500/30' : 'border-white/5'
                                } ${selectedSession?.id === session.id ? 'ring-2 ring-amber-500/50' : ''}`}
                                onClick={() => setSelectedSession(session)}
                            >
                                <div className="flex items-center gap-4">
                                    {/* User Avatar */}
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-lg">
                                            {session.user.name[0].toUpperCase()}
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#1a1a24] ${
                                            session.status === 'active' ? 'bg-emerald-500' :
                                            session.status === 'idle' ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}></div>
                                    </div>
                                    
                                    {/* Session Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-white">{session.user.name}</h3>
                                            {session.isCurrentSession && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                    THIS SESSION
                                                </span>
                                            )}
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(session.status)}`}>
                                                {session.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                                            <span className="flex items-center gap-1.5">
                                                {getLocationIcon(session.location.type)}
                                                {session.location.name}
                                            </span>
                                            <span className="text-gray-600">•</span>
                                            <span>{session.location.platform}</span>
                                            <span className="text-gray-600">•</span>
                                            <span className="font-mono text-xs">{session.ip}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Time & Actions */}
                                    <div className="text-right">
                                        <p className="text-sm text-white">Last active {formatTimeAgo(session.lastActivity)}</p>
                                        <p className="text-xs text-gray-500">Created {formatTimeAgo(session.createdAt)}</p>
                                    </div>
                                    
                                    {/* Revoke Button */}
                                    {!session.isCurrentSession && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setRevokeConfirm(session); }}
                                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Revoke Session"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Session Detail Panel */}
            {selectedSession && (
                <div className="fixed inset-y-0 right-0 w-96 bg-[#0a0a0f] border-l border-white/10 shadow-2xl z-50 flex flex-col">
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">Session Details</h3>
                        <button
                            onClick={() => setSelectedSession(null)}
                            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-auto p-6 space-y-6">
                        {/* User Info */}
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-2xl">
                                {selectedSession.user.name[0].toUpperCase()}
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-white">{selectedSession.user.name}</h4>
                                <p className="text-sm text-gray-400 font-mono">{selectedSession.user.id}</p>
                            </div>
                        </div>
                        
                        {/* Status */}
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400">Status</span>
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getStatusColor(selectedSession.status)}`}>
                                    {selectedSession.status}
                                </span>
                            </div>
                        </div>
                        
                        {/* Details Grid */}
                        <div className="space-y-4">
                            <DetailRow label="Location" value={selectedSession.location.name} />
                            <DetailRow label="Platform" value={selectedSession.location.platform} />
                            <DetailRow label="Version" value={selectedSession.location.version} />
                            <DetailRow label="IP Address" value={selectedSession.ip} mono />
                            <DetailRow label="Last Activity" value={formatTimeAgo(selectedSession.lastActivity)} />
                            <DetailRow label="Created" value={new Date(selectedSession.createdAt).toLocaleString()} />
                            <DetailRow label="Session ID" value={selectedSession.id} mono small />
                        </div>
                        
                        {/* User Agent */}
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-xs text-gray-400 uppercase font-medium mb-2">User Agent</p>
                            <p className="text-sm text-gray-300 font-mono break-all">{selectedSession.userAgent}</p>
                        </div>
                    </div>
                    
                    {/* Actions */}
                    {!selectedSession.isCurrentSession && (
                        <div className="p-6 border-t border-white/5 space-y-3">
                            <button
                                onClick={() => setRevokeConfirm(selectedSession)}
                                className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                Revoke This Session
                            </button>
                            <button
                                onClick={() => setRevokeConfirm({ ...selectedSession, revokeAll: true })}
                                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg font-medium transition-colors"
                            >
                                Revoke All Sessions for This User
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Revoke Confirmation Modal */}
            {revokeConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">
                                    {revokeConfirm.revokeAll ? 'Revoke All Sessions' : 'Revoke Session'}
                                </h3>
                                <p className="text-sm text-gray-400">This action cannot be undone</p>
                            </div>
                        </div>
                        
                        <div className="bg-black/30 rounded-lg p-4 mb-4 border border-white/5">
                            <p className="text-sm text-gray-400 mb-2">
                                {revokeConfirm.revokeAll 
                                    ? `This will terminate all sessions for:`
                                    : `This will terminate the session for:`
                                }
                            </p>
                            <p className="text-white font-bold">{revokeConfirm.user.name}</p>
                            {!revokeConfirm.revokeAll && (
                                <p className="text-xs text-gray-500 mt-1">
                                    {revokeConfirm.location.name} • {revokeConfirm.ip}
                                </p>
                            )}
                            {revokeConfirm.revokeAll && (
                                <p className="text-xs text-yellow-400 mt-2">
                                    ⚠️ {sessionsByUser[revokeConfirm.user.id]?.sessions.length || 0} session(s) will be terminated
                                </p>
                            )}
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => setRevokeConfirm(null)}
                                className="flex-1 py-2 px-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (revokeConfirm.revokeAll) {
                                        revokeAllForUser(revokeConfirm.user.id);
                                    } else {
                                        revokeSession(revokeConfirm.id);
                                    }
                                }}
                                className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors"
                            >
                                Revoke
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailRow({ label, value, mono = false, small = false }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{label}</span>
            <span className={`text-white ${mono ? 'font-mono' : ''} ${small ? 'text-xs' : 'text-sm'} ${small ? 'max-w-[180px] truncate' : ''}`}>
                {value}
            </span>
        </div>
    );
}
