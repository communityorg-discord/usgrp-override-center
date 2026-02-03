import React, { useState, useEffect } from 'react';

export default function WatchlistViewer() {
    const [watchlist, setWatchlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [addForm, setAddForm] = useState({
        userId: '',
        reason: '',
        severity: 'low',
        notes: ''
    });
    
    useEffect(() => {
        loadWatchlist();
    }, []);
    
    async function loadWatchlist() {
        try {
            setLoading(true);
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/moderation/watchlist`, {
                headers: { 'X-Override-Token': token }
            });
            
            if (!response.ok) throw new Error('Failed to fetch watchlist');
            const data = await response.json();
            setWatchlist(data.watchlist || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }
    
    async function handleAdd() {
        if (!addForm.userId.trim() || !addForm.reason.trim()) return;
        
        setActionLoading(true);
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/moderation/watchlist`, {
                method: 'POST',
                headers: { 
                    'X-Override-Token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(addForm)
            });
            
            if (!response.ok) throw new Error('Failed to add to watchlist');
            setShowAddModal(false);
            setAddForm({ userId: '', reason: '', severity: 'low', notes: '' });
            await loadWatchlist();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    }
    
    async function handleUpdate() {
        if (!selectedEntry) return;
        
        setActionLoading(true);
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/moderation/watchlist/${selectedEntry.id}`, {
                method: 'PATCH',
                headers: { 
                    'X-Override-Token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reason: selectedEntry.reason,
                    severity: selectedEntry.severity,
                    notes: selectedEntry.notes
                })
            });
            
            if (!response.ok) throw new Error('Failed to update entry');
            setShowEditModal(false);
            await loadWatchlist();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    }
    
    async function handleRemove(entry) {
        if (!confirm(`Remove ${entry.username || entry.user_id} from the watchlist?`)) return;
        
        setActionLoading(true);
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/moderation/watchlist/${entry.id}`, {
                method: 'DELETE',
                headers: { 'X-Override-Token': token }
            });
            
            if (!response.ok) throw new Error('Failed to remove from watchlist');
            await loadWatchlist();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    }
    
    const filteredWatchlist = watchlist.filter(entry => {
        const search = searchTerm.toLowerCase();
        return (
            (entry.user_id || '').toLowerCase().includes(search) ||
            (entry.username || '').toLowerCase().includes(search) ||
            (entry.reason || '').toLowerCase().includes(search) ||
            (entry.notes || '').toLowerCase().includes(search)
        );
    });
    
    const severityColors = {
        low: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
        medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400' },
        high: { bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-400' },
        critical: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' }
    };
    
    function getSeverityStyle(severity) {
        return severityColors[severity] || severityColors.low;
    }
    
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="text-3xl">👁️</span>
                        Watchlist
                    </h1>
                    <p className="text-gray-400 mt-1">Monitor suspicious users and activity</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg text-black font-medium transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add to Watchlist
                    </button>
                    <button
                        onClick={loadWatchlist}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-5 gap-4">
                <StatCard label="Total Watched" value={watchlist.length} icon="👁️" />
                <StatCard 
                    label="Critical" 
                    value={watchlist.filter(e => e.severity === 'critical').length} 
                    icon="🔴" 
                    highlight="red"
                />
                <StatCard 
                    label="High" 
                    value={watchlist.filter(e => e.severity === 'high').length} 
                    icon="🟠" 
                    highlight="orange"
                />
                <StatCard 
                    label="Medium" 
                    value={watchlist.filter(e => e.severity === 'medium').length} 
                    icon="🟡" 
                    highlight="yellow"
                />
                <StatCard 
                    label="Low" 
                    value={watchlist.filter(e => e.severity === 'low').length} 
                    icon="🔵" 
                />
            </div>
            
            {/* Search */}
            <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    placeholder="Search by user, reason, or notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
                />
            </div>
            
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
                    {error}
                </div>
            )}
            
            {/* Watchlist */}
            <div className="space-y-3">
                {filteredWatchlist.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-white/[0.02] border border-white/10 rounded-xl">
                        {searchTerm ? 'No entries match your search' : 'Watchlist is empty'}
                    </div>
                ) : (
                    filteredWatchlist.map((entry) => {
                        const severityStyle = getSeverityStyle(entry.severity);
                        return (
                            <div 
                                key={entry.id} 
                                className={`bg-white/[0.02] border rounded-xl p-4 hover:border-amber-500/30 transition-colors ${
                                    entry.severity === 'critical' ? 'border-red-500/30' :
                                    entry.severity === 'high' ? 'border-orange-500/20' : 'border-white/10'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        {/* Severity Indicator */}
                                        <div className={`w-3 h-3 rounded-full mt-1.5 ${severityStyle.dot}`}></div>
                                        
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="font-medium text-white">
                                                    {entry.username || 'Unknown User'}
                                                </span>
                                                <span className="text-xs text-gray-500 font-mono">
                                                    {entry.user_id}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-lg text-xs capitalize ${severityStyle.bg} ${severityStyle.text}`}>
                                                    {entry.severity}
                                                </span>
                                            </div>
                                            
                                            <p className="text-gray-300 mb-2">{entry.reason}</p>
                                            
                                            {entry.notes && (
                                                <div className="bg-white/5 rounded-lg p-3 text-sm text-gray-400 mb-2">
                                                    <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Notes:</span>
                                                    {entry.notes}
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span>Added: {new Date(entry.created_at).toLocaleDateString()}</span>
                                                {entry.added_by && <span>By: {entry.added_by}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => { setSelectedEntry({ ...entry }); setShowEditModal(true); }}
                                            className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-sm transition-colors"
                                            disabled={actionLoading}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleRemove(entry)}
                                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition-colors"
                                            disabled={actionLoading}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            
            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0d0d14] border border-white/10 rounded-2xl w-full max-w-md p-6 animate-scale-in">
                        <h3 className="text-xl font-bold text-white mb-4">Add to Watchlist</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">User Discord ID</label>
                                <input
                                    type="text"
                                    placeholder="Enter Discord ID"
                                    value={addForm.userId}
                                    onChange={(e) => setAddForm({ ...addForm, userId: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500/50"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Reason</label>
                                <input
                                    type="text"
                                    placeholder="Why are they being watched?"
                                    value={addForm.reason}
                                    onChange={(e) => setAddForm({ ...addForm, reason: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Severity</label>
                                <select
                                    value={addForm.severity}
                                    onChange={(e) => setAddForm({ ...addForm, severity: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                                >
                                    <option value="low">Low - Minor concern</option>
                                    <option value="medium">Medium - Notable behavior</option>
                                    <option value="high">High - Serious concern</option>
                                    <option value="critical">Critical - Immediate attention</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
                                <textarea
                                    placeholder="Additional notes or context..."
                                    value={addForm.notes}
                                    onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 resize-none"
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setShowAddModal(false); setAddForm({ userId: '', reason: '', severity: 'low', notes: '' }); }}
                                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAdd}
                                disabled={actionLoading || !addForm.userId.trim() || !addForm.reason.trim()}
                                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 rounded-xl text-black font-medium transition-colors"
                            >
                                {actionLoading ? 'Adding...' : 'Add to Watchlist'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Edit Modal */}
            {showEditModal && selectedEntry && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0d0d14] border border-white/10 rounded-2xl w-full max-w-md p-6 animate-scale-in">
                        <h3 className="text-xl font-bold text-white mb-4">Edit Watchlist Entry</h3>
                        <p className="text-gray-500 text-sm mb-4 font-mono">{selectedEntry.user_id}</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Reason</label>
                                <input
                                    type="text"
                                    value={selectedEntry.reason}
                                    onChange={(e) => setSelectedEntry({ ...selectedEntry, reason: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Severity</label>
                                <select
                                    value={selectedEntry.severity}
                                    onChange={(e) => setSelectedEntry({ ...selectedEntry, severity: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Notes</label>
                                <textarea
                                    value={selectedEntry.notes || ''}
                                    onChange={(e) => setSelectedEntry({ ...selectedEntry, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 resize-none"
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdate}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 rounded-xl text-black font-medium transition-colors"
                            >
                                {actionLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, icon, highlight }) {
    const highlightColors = {
        red: 'border-red-500/30',
        orange: 'border-orange-500/30',
        yellow: 'border-yellow-500/30'
    };
    
    return (
        <div className={`bg-white/[0.02] border rounded-xl p-4 ${highlight ? highlightColors[highlight] : 'border-white/10'}`}>
            <div className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <div>
                    <p className="text-gray-400 text-sm">{label}</p>
                    <p className="text-xl font-bold text-white">{value}</p>
                </div>
            </div>
        </div>
    );
}
