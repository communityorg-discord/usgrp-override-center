import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

export default function BanManager() {
    const [bans, setBans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [reason, setReason] = useState('');
    const [duration, setDuration] = useState('permanent');
    const [ipBan, setIpBan] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [token, setToken] = useState(null);

    useEffect(() => {
        const getToken = async () => {
             const t = await window.electron.api.getToken();
             setToken(t);
        };
        getToken();
    }, []);
    
    useEffect(() => {
        if (token) fetchBans();
    }, [token]);

    const fetchBans = async () => {
        try {
            const apiBase = await window.electron.api.getBase();
            const res = await axios.get(`${apiBase}/override/bans/list`, {
                headers: { 'x-override-token': token }
            });
            setBans(res.data.bans || []);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch bans', error);
            setLoading(false);
        }
    };

    const searchUsers = async (q) => {
        if (q.length < 2) return;
        try {
            const apiBase = await window.electron.api.getBase();
            const res = await axios.get(`${apiBase}/override/users/search?q=${q}`, {
                headers: { 'x-override-token': token }
            });
            setSearchResults(res.data.users || []);
        } catch (error) {
            console.error('Search failed', error);
        }
    };

    const handleBan = async (e) => {
        e.preventDefault();
        if (!selectedUser || !reason) return;

        setSubmitting(true);
        try {
            const apiBase = await window.electron.api.getBase();
            await axios.post(`${apiBase}/override/bans/create`, {
                userId: selectedUser.id,
                reason,
                duration,
                ipBan
            }, {
                headers: { 'x-override-token': token }
            });
            
            setSubmitting(false);
            setReason('');
            setSelectedUser(null);
            setSearchResults([]);
            setSearchTerm('');
            fetchBans();
        } catch (error) {
            alert('Ban failed: ' + (error.response?.data?.message || error.message));
            setSubmitting(false);
        }
    };

    const handleRevoke = async (id) => {
        if (!confirm('Are you sure you want to revoke this ban?')) return;
        try {
            const apiBase = await window.electron.api.getBase();
            await axios.post(`${apiBase}/override/bans/revoke/${id}`, {}, {
                headers: { 'x-override-token': token }
            });
            fetchBans();
        } catch (error) {
            alert('Revoke failed');
        }
    };

    return (
        <div className="p-6 h-full flex flex-col gap-6 overflow-hidden">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-red-500">⚖️</span> User Ban Manager
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">
                {/* Left: Create Ban */}
                <div className="bg-surface-secondary border border-gray-800 rounded-lg p-4 flex flex-col gap-4 overflow-y-auto">
                    <h2 className="text-lg font-medium text-gray-200">Create New Ban</h2>
                    
                    {/* User Search */}
                    <div className="relative">
                        <label className="block text-xs text-gray-400 mb-1">Target User</label>
                        <input
                            type="text"
                            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:border-red-500 outline-none"
                            placeholder="Search by Name, Email, ID..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                searchUsers(e.target.value);
                            }}
                        />
                        {searchResults.length > 0 && !selectedUser && (
                            <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-700 mt-1 rounded shadow-xl z-10 max-h-48 overflow-y-auto">
                                {searchResults.map(u => (
                                    <div 
                                        key={u.id}
                                        className="p-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-300"
                                        onClick={() => {
                                            setSelectedUser(u);
                                            setSearchTerm(u.display_name);
                                            setSearchResults([]);
                                        }}
                                    >
                                        <div className="font-bold">{u.display_name}</div>
                                        <div className="text-xs text-gray-500">{u.email} • {u.discord_id}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedUser && (
                        <div className="bg-red-500/10 border border-red-500/20 p-2 rounded text-sm text-red-200">
                            Selected: <span className="font-bold">{selectedUser.display_name}</span> ({selectedUser.id})
                        </div>
                    )}

                    {/* Reason */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Reason</label>
                        <textarea
                            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white h-24 focus:border-red-500 outline-none resize-none"
                            placeholder="Why are they being banned?"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Duration</label>
                        <select 
                            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white outline-none"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                        >
                            <option value="permanent">Permanent</option>
                            <option value="24h">24 Hours</option>
                            <option value="3d">3 Days</option>
                            <option value="7d">1 Week</option>
                            <option value="30d">30 Days</option>
                            <option value="1y">1 Year</option>
                        </select>
                    </div>

                    {/* Options */}
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="ipBan"
                            checked={ipBan}
                            onChange={(e) => setIpBan(e.target.checked)}
                            className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-red-500 focus:ring-red-500"
                        />
                        <label htmlFor="ipBan" className="text-sm text-gray-300 select-none">
                            Block IP Address (Firewall)
                        </label>
                    </div>

                    <button
                        onClick={handleBan}
                        disabled={submitting || !selectedUser || !reason}
                        className="mt-auto w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Executing...' : 'Ban User'}
                    </button>
                </div>

                {/* Right: Active Bans List */}
                <div className="lg:col-span-2 bg-surface-secondary border border-gray-800 rounded-lg p-4 flex flex-col h-full overflow-hidden">
                    <h2 className="text-lg font-medium text-gray-200 mb-4">Active Bans</h2>
                    
                    <div className="flex-1 overflow-y-auto pr-2">
                        {loading ? (
                            <div className="text-gray-500 text-center py-8">Loading bans...</div>
                        ) : bans.length === 0 ? (
                            <div className="text-gray-500 text-center py-8">No active bans found.</div>
                        ) : (
                            <div className="space-y-2">
                                {bans.map(ban => (
                                    <div key={ban.id} className="bg-gray-900/50 border border-gray-800 rounded p-3 flex items-start justify-between group hover:border-gray-700 transition-colors">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white">{ban.display_name || 'Unknown User'}</span>
                                                <span className="text-xs font-mono text-gray-500">{ban.user_id}</span>
                                                {ban.ip_address && (
                                                    <span className="text-xs bg-red-900/50 text-red-300 px-1.5 rounded">IP Blocked</span>
                                                )}
                                            </div>
                                            <div className="text-sm text-red-300 mt-1">{ban.reason}</div>
                                            <div className="text-xs text-gray-500 mt-2 flex gap-3">
                                                <span>Banned by: {ban.created_by}</span>
                                                <span>•</span>
                                                <span>On: {format(new Date(ban.created_at), 'MMM d, yyyy HH:mm')}</span>
                                                <span>•</span>
                                                <span>Expires: {ban.expires_at ? format(new Date(ban.expires_at), 'MMM d, yyyy') : 'Never'}</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRevoke(ban.id)}
                                            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded border border-gray-700 transition-colors"
                                        >
                                            Revoke
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}