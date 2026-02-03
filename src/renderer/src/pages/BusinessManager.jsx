import React, { useState, useEffect } from 'react';

export default function BusinessManager() {
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBusiness, setSelectedBusiness] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [newOwner, setNewOwner] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({});
    
    useEffect(() => {
        loadBusinesses();
    }, []);
    
    async function loadBusinesses() {
        try {
            setLoading(true);
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/economy/businesses`, {
                headers: { 'X-Override-Token': token }
            });
            
            if (!response.ok) throw new Error('Failed to fetch businesses');
            const data = await response.json();
            setBusinesses(data.businesses || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }
    
    async function handleTransfer() {
        if (!selectedBusiness || !newOwner.trim()) return;
        
        setActionLoading(true);
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/economy/businesses/${selectedBusiness.id}/transfer`, {
                method: 'POST',
                headers: { 
                    'X-Override-Token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ newOwnerId: newOwner.trim() })
            });
            
            if (!response.ok) throw new Error('Failed to transfer business');
            setShowTransferModal(false);
            setNewOwner('');
            await loadBusinesses();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    }
    
    async function handleEdit() {
        if (!selectedBusiness) return;
        
        setActionLoading(true);
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/economy/businesses/${selectedBusiness.id}`, {
                method: 'PATCH',
                headers: { 
                    'X-Override-Token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editForm)
            });
            
            if (!response.ok) throw new Error('Failed to update business');
            setShowEditModal(false);
            await loadBusinesses();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    }
    
    async function handleDelete(business) {
        if (!confirm(`Delete business "${business.name}"? This action cannot be undone.`)) return;
        
        setActionLoading(true);
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/economy/businesses/${business.id}`, {
                method: 'DELETE',
                headers: { 'X-Override-Token': token }
            });
            
            if (!response.ok) throw new Error('Failed to delete business');
            await loadBusinesses();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    }
    
    function openEditModal(business) {
        setSelectedBusiness(business);
        setEditForm({
            name: business.name || '',
            type: business.type || '',
            value: business.value || 0,
            revenue: business.revenue || 0,
            employees: business.employees || 0
        });
        setShowEditModal(true);
    }
    
    const filteredBusinesses = businesses.filter(b => {
        const search = searchTerm.toLowerCase();
        return (
            (b.name || '').toLowerCase().includes(search) ||
            (b.business_id || '').toLowerCase().includes(search) ||
            (b.user_id || '').toLowerCase().includes(search) ||
            (b.type || '').toLowerCase().includes(search)
        );
    });
    
    const businessTypeIcons = {
        'restaurant': '🍽️',
        'shop': '🏪',
        'garage': '🔧',
        'nightclub': '🎵',
        'bar': '🍺',
        'bank': '🏦',
        'factory': '🏭',
        'office': '🏢',
        'hotel': '🏨',
        'farm': '🌾',
        'tech': '💻',
        'default': '🏪'
    };
    
    function getBusinessIcon(type) {
        const key = (type || '').toLowerCase();
        return businessTypeIcons[key] || businessTypeIcons.default;
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
                        <span className="text-3xl">🏢</span>
                        Business Manager
                    </h1>
                    <p className="text-gray-400 mt-1">Manage all businesses in the economy</p>
                </div>
                <button
                    onClick={loadBusinesses}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 transition-colors flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-5 gap-4">
                <StatCard label="Total Businesses" value={businesses.length} icon="🏢" />
                <StatCard 
                    label="Total Value" 
                    value={`$${(businesses.reduce((sum, b) => sum + (b.value || 0), 0) / 1000000).toFixed(1)}M`} 
                    icon="💰" 
                />
                <StatCard 
                    label="Total Revenue" 
                    value={`$${(businesses.reduce((sum, b) => sum + (b.revenue || 0), 0)).toLocaleString()}`} 
                    icon="📈" 
                />
                <StatCard 
                    label="Total Employees" 
                    value={businesses.reduce((sum, b) => sum + (b.employees || 0), 0).toLocaleString()} 
                    icon="👥" 
                />
                <StatCard 
                    label="Unique Owners" 
                    value={new Set(businesses.map(b => b.user_id)).size} 
                    icon="👤" 
                />
            </div>
            
            {/* Search */}
            <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    placeholder="Search by name, ID, owner, or type..."
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
            
            {/* Businesses Table */}
            <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/[0.02]">
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Business</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Type</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Owner</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Value</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Revenue</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Staff</th>
                            <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBusinesses.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-gray-500">
                                    {searchTerm ? 'No businesses match your search' : 'No businesses found'}
                                </td>
                            </tr>
                        ) : (
                            filteredBusinesses.map((business) => (
                                <tr key={business.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{getBusinessIcon(business.type)}</span>
                                            <div>
                                                <div className="font-medium text-white">{business.name || 'Unnamed Business'}</div>
                                                <div className="text-xs text-gray-500 font-mono">{business.business_id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 text-xs capitalize">
                                            {business.type || 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-white font-mono text-sm">{business.user_id || 'None'}</span>
                                    </td>
                                    <td className="px-4 py-3 text-green-400 font-medium">
                                        ${(business.value || 0).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-blue-400">
                                        ${(business.revenue || 0).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-gray-300">
                                        {business.employees || 0}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center gap-2 justify-end">
                                            <button
                                                onClick={() => openEditModal(business)}
                                                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-sm transition-colors"
                                                disabled={actionLoading}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => { setSelectedBusiness(business); setShowTransferModal(true); }}
                                                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-sm transition-colors"
                                                disabled={actionLoading}
                                            >
                                                Transfer
                                            </button>
                                            <button
                                                onClick={() => handleDelete(business)}
                                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition-colors"
                                                disabled={actionLoading}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Transfer Modal */}
            {showTransferModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0d0d14] border border-white/10 rounded-2xl w-full max-w-md p-6 animate-scale-in">
                        <h3 className="text-xl font-bold text-white mb-4">Transfer Ownership</h3>
                        <p className="text-gray-400 mb-4">
                            Transferring: <span className="text-white font-medium">{selectedBusiness?.name}</span>
                        </p>
                        <p className="text-gray-500 text-sm mb-4">
                            Current Owner: <span className="font-mono">{selectedBusiness?.user_id}</span>
                        </p>
                        
                        <input
                            type="text"
                            placeholder="Enter Discord ID of new owner"
                            value={newOwner}
                            onChange={(e) => setNewOwner(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 mb-4 font-mono"
                        />
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowTransferModal(false); setNewOwner(''); }}
                                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleTransfer}
                                disabled={actionLoading || !newOwner.trim()}
                                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 rounded-xl text-black font-medium transition-colors"
                            >
                                {actionLoading ? 'Transferring...' : 'Transfer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0d0d14] border border-white/10 rounded-2xl w-full max-w-md p-6 animate-scale-in">
                        <h3 className="text-xl font-bold text-white mb-4">Edit Business</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Business Name</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Type</label>
                                <select
                                    value={editForm.type}
                                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                                >
                                    <option value="shop">Shop</option>
                                    <option value="restaurant">Restaurant</option>
                                    <option value="bar">Bar</option>
                                    <option value="nightclub">Nightclub</option>
                                    <option value="garage">Garage</option>
                                    <option value="factory">Factory</option>
                                    <option value="office">Office</option>
                                    <option value="hotel">Hotel</option>
                                    <option value="farm">Farm</option>
                                    <option value="tech">Tech Company</option>
                                    <option value="bank">Bank</option>
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Value ($)</label>
                                    <input
                                        type="number"
                                        value={editForm.value}
                                        onChange={(e) => setEditForm({ ...editForm, value: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Revenue ($)</label>
                                    <input
                                        type="number"
                                        value={editForm.revenue}
                                        onChange={(e) => setEditForm({ ...editForm, revenue: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Employees</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={editForm.employees}
                                    onChange={(e) => setEditForm({ ...editForm, employees: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
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
                                onClick={handleEdit}
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

function StatCard({ label, value, icon }) {
    return (
        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
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
