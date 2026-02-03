import React, { useState, useEffect } from 'react';

export default function HousingManager() {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [newOwner, setNewOwner] = useState('');
    const [showAssignModal, setShowAssignModal] = useState(false);
    
    useEffect(() => {
        loadProperties();
    }, []);
    
    async function loadProperties() {
        try {
            setLoading(true);
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/economy/housing`, {
                headers: { 'X-Override-Token': token }
            });
            
            if (!response.ok) throw new Error('Failed to fetch properties');
            const data = await response.json();
            setProperties(data.properties || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }
    
    async function handleEvict(property) {
        if (!confirm(`Evict owner from ${property.name || property.property_id}?`)) return;
        
        setActionLoading(true);
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/economy/housing/${property.id}/evict`, {
                method: 'POST',
                headers: { 
                    'X-Override-Token': token,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Failed to evict');
            await loadProperties();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    }
    
    async function handleAssign() {
        if (!selectedProperty || !newOwner.trim()) return;
        
        setActionLoading(true);
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/economy/housing/${selectedProperty.id}/assign`, {
                method: 'POST',
                headers: { 
                    'X-Override-Token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: newOwner.trim() })
            });
            
            if (!response.ok) throw new Error('Failed to assign');
            setShowAssignModal(false);
            setNewOwner('');
            await loadProperties();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    }
    
    async function handleCollectRent(property) {
        setActionLoading(true);
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/economy/housing/${property.id}/collect-rent`, {
                method: 'POST',
                headers: { 
                    'X-Override-Token': token,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Failed to collect rent');
            const data = await response.json();
            alert(`Collected $${data.amount?.toLocaleString() || 0} rent`);
            await loadProperties();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    }
    
    const filteredProperties = properties.filter(p => {
        const search = searchTerm.toLowerCase();
        return (
            (p.name || '').toLowerCase().includes(search) ||
            (p.property_id || '').toLowerCase().includes(search) ||
            (p.user_id || '').toLowerCase().includes(search) ||
            (p.property_type || '').toLowerCase().includes(search)
        );
    });
    
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
                        <span className="text-3xl">🏠</span>
                        Housing Manager
                    </h1>
                    <p className="text-gray-400 mt-1">Manage all properties in the economy system</p>
                </div>
                <button
                    onClick={loadProperties}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 transition-colors flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard label="Total Properties" value={properties.length} icon="🏘️" />
                <StatCard label="Occupied" value={properties.filter(p => p.user_id).length} icon="✅" />
                <StatCard label="Vacant" value={properties.filter(p => !p.user_id).length} icon="📭" />
                <StatCard 
                    label="Total Value" 
                    value={`$${properties.reduce((sum, p) => sum + (p.value || 0), 0).toLocaleString()}`} 
                    icon="💰" 
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
            
            {/* Properties Table */}
            <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/[0.02]">
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Property</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Type</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Owner</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Value</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                            <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProperties.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-gray-500">
                                    {searchTerm ? 'No properties match your search' : 'No properties found'}
                                </td>
                            </tr>
                        ) : (
                            filteredProperties.map((property) => (
                                <tr key={property.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-white">{property.name || 'Unnamed Property'}</div>
                                        <div className="text-xs text-gray-500 font-mono">{property.property_id}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs">
                                            {property.property_type || 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {property.user_id ? (
                                            <div>
                                                <span className="text-white font-mono text-sm">{property.user_id}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-500 italic">Vacant</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-green-400 font-medium">
                                        ${(property.value || 0).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        {property.user_id ? (
                                            <span className="flex items-center gap-2 text-green-400 text-sm">
                                                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                                Occupied
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2 text-gray-500 text-sm">
                                                <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                                                Vacant
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center gap-2 justify-end">
                                            <button
                                                onClick={() => { setSelectedProperty(property); setShowAssignModal(true); }}
                                                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-sm transition-colors"
                                                disabled={actionLoading}
                                            >
                                                Assign
                                            </button>
                                            {property.user_id && (
                                                <>
                                                    <button
                                                        onClick={() => handleCollectRent(property)}
                                                        className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg text-sm transition-colors"
                                                        disabled={actionLoading}
                                                    >
                                                        Collect
                                                    </button>
                                                    <button
                                                        onClick={() => handleEvict(property)}
                                                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition-colors"
                                                        disabled={actionLoading}
                                                    >
                                                        Evict
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Assign Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0d0d14] border border-white/10 rounded-2xl w-full max-w-md p-6 animate-scale-in">
                        <h3 className="text-xl font-bold text-white mb-4">Assign Property</h3>
                        <p className="text-gray-400 mb-4">
                            Assigning: <span className="text-white">{selectedProperty?.name || selectedProperty?.property_id}</span>
                        </p>
                        
                        <input
                            type="text"
                            placeholder="Enter Discord ID of new owner"
                            value={newOwner}
                            onChange={(e) => setNewOwner(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 mb-4"
                        />
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowAssignModal(false); setNewOwner(''); }}
                                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssign}
                                disabled={actionLoading || !newOwner.trim()}
                                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 rounded-xl text-black font-medium transition-colors"
                            >
                                {actionLoading ? 'Assigning...' : 'Assign'}
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
