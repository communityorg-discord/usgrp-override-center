import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function AutoModConfig() {
    const { fetchApi, post, loading, error } = useApi();
    const [filters, setFilters] = useState([]);
    const [recentEvents, setRecentEvents] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newFilter, setNewFilter] = useState({ pattern: '', action: 'delete', isRegex: false });
    const [addError, setAddError] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const data = await fetchApi('/override/moderation/automod');
            if (data) {
                setFilters(data.filters || []);
                setRecentEvents(data.recentEvents || []);
            }
        } catch (err) {
            console.error('Failed to load automod config:', err);
        }
    }

    async function addFilter() {
        if (!newFilter.pattern.trim()) {
            setAddError('Pattern is required');
            return;
        }

        setActionLoading(true);
        setAddError('');

        try {
            await post('/override/moderation/automod/filter', {
                pattern: newFilter.pattern,
                action: newFilter.action,
                isRegex: newFilter.isRegex
            });
            
            setShowAddModal(false);
            setNewFilter({ pattern: '', action: 'delete', isRegex: false });
            loadData();
        } catch (err) {
            setAddError(err.message || 'Failed to add filter');
        } finally {
            setActionLoading(false);
        }
    }

    async function deleteFilter(id) {
        if (!confirm('Remove this filter?')) return;
        
        try {
            await fetchApi(`/override/moderation/automod/filter/${id}`, { method: 'DELETE' });
            loadData();
        } catch (err) {
            alert('Failed to delete filter: ' + err.message);
        }
    }

    async function updateFilterAction(id, action) {
        try {
            await fetchApi(`/override/moderation/automod/filter/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ action })
            });
            loadData();
        } catch (err) {
            alert('Failed to update filter: ' + err.message);
        }
    }

    const actionColors = {
        'delete': 'bg-red-500/20 text-red-400',
        'warn': 'bg-yellow-500/20 text-yellow-400',
        'mute': 'bg-orange-500/20 text-orange-400',
        'kick': 'bg-purple-500/20 text-purple-400',
        'ban': 'bg-red-600/20 text-red-500'
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="heading-xl text-white flex items-center gap-3">
                        <span className="text-2xl">🤖</span>
                        AutoMod Configuration
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Manage word filters and automoderation settings
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={loadData} className="btn btn-secondary" disabled={loading}>
                        {loading ? 'Loading...' : 'Refresh'}
                    </button>
                    <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
                        + Add Filter
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card">
                    <div className="text-gray-400 text-sm">Total Filters</div>
                    <div className="text-2xl font-bold text-white mt-1">{filters.length}</div>
                </div>
                <div className="card">
                    <div className="text-gray-400 text-sm">Regex Filters</div>
                    <div className="text-2xl font-bold text-purple-400 mt-1">
                        {filters.filter(f => f.is_regex).length}
                    </div>
                </div>
                <div className="card">
                    <div className="text-gray-400 text-sm">Delete Actions</div>
                    <div className="text-2xl font-bold text-red-400 mt-1">
                        {filters.filter(f => f.action === 'delete').length}
                    </div>
                </div>
                <div className="card">
                    <div className="text-gray-400 text-sm">Recent Triggers</div>
                    <div className="text-2xl font-bold text-amber-400 mt-1">
                        {recentEvents.length}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Word Filters */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-white mb-4">Word Filters</h2>
                    
                    {filters.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No word filters configured
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-dark">
                            {filters.map(filter => (
                                <div 
                                    key={filter.id} 
                                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] group"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {filter.is_regex && (
                                            <span className="px-2 py-0.5 text-xs rounded bg-purple-500/20 text-purple-400">
                                                REGEX
                                            </span>
                                        )}
                                        <code className="text-white font-mono text-sm truncate">
                                            {filter.pattern}
                                        </code>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={filter.action}
                                            onChange={(e) => updateFilterAction(filter.id, e.target.value)}
                                            className={`px-2 py-1 rounded text-xs font-medium ${actionColors[filter.action] || 'bg-gray-700 text-gray-300'} bg-opacity-100 border-none focus:outline-none cursor-pointer`}
                                        >
                                            <option value="delete">Delete</option>
                                            <option value="warn">Warn</option>
                                            <option value="mute">Mute</option>
                                            <option value="kick">Kick</option>
                                            <option value="ban">Ban</option>
                                        </select>
                                        
                                        <button
                                            onClick={() => deleteFilter(filter.id)}
                                            className="p-1.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete filter"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Events */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-white mb-4">Recent AutoMod Events</h2>
                    
                    {recentEvents.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No recent automod events
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-dark">
                            {recentEvents.map((event, idx) => (
                                <div key={idx} className="p-3 rounded-lg bg-white/[0.03]">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`px-2 py-0.5 text-xs rounded ${actionColors[event.action] || 'bg-gray-700 text-gray-300'}`}>
                                            {event.action?.toUpperCase() || 'TRIGGERED'}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(event.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        User: <span className="text-white font-mono">{event.user_id}</span>
                                    </div>
                                    {event.matched_pattern && (
                                        <div className="text-sm text-gray-400 mt-1">
                                            Matched: <code className="text-amber-400">{event.matched_pattern}</code>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Filter Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-white mb-4">Add Word Filter</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Pattern *</label>
                                <input
                                    type="text"
                                    value={newFilter.pattern}
                                    onChange={(e) => setNewFilter({...newFilter, pattern: e.target.value})}
                                    placeholder="Enter word or pattern..."
                                    className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Action</label>
                                <select
                                    value={newFilter.action}
                                    onChange={(e) => setNewFilter({...newFilter, action: e.target.value})}
                                    className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white focus:outline-none focus:border-amber-500/50"
                                >
                                    <option value="delete">Delete Message</option>
                                    <option value="warn">Warn User</option>
                                    <option value="mute">Mute User</option>
                                    <option value="kick">Kick User</option>
                                    <option value="ban">Ban User</option>
                                </select>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={newFilter.isRegex}
                                    onChange={(e) => setNewFilter({...newFilter, isRegex: e.target.checked})}
                                    className="w-5 h-5 accent-amber-500"
                                />
                                <div>
                                    <span className="text-white">Regex Pattern</span>
                                    <p className="text-xs text-gray-500">Enable regular expression matching</p>
                                </div>
                            </label>

                            {addError && (
                                <div className="text-red-400 text-sm bg-red-500/10 p-2 rounded">
                                    {addError}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="btn btn-secondary flex-1"
                                disabled={actionLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={addFilter}
                                className="btn btn-primary flex-1"
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Adding...' : 'Add Filter'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
