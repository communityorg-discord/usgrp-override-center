import React, { useState, useEffect } from 'react';

export default function VehicleRegistry() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({});
    
    useEffect(() => {
        loadVehicles();
    }, []);
    
    async function loadVehicles() {
        try {
            setLoading(true);
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/economy/vehicles`, {
                headers: { 'X-Override-Token': token }
            });
            
            if (!response.ok) throw new Error('Failed to fetch vehicles');
            const data = await response.json();
            setVehicles(data.vehicles || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }
    
    async function handleDelete(vehicle) {
        if (!confirm(`Delete vehicle ${vehicle.name || vehicle.vehicle_id}?`)) return;
        
        setActionLoading(true);
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/economy/vehicles/${vehicle.id}`, {
                method: 'DELETE',
                headers: { 'X-Override-Token': token }
            });
            
            if (!response.ok) throw new Error('Failed to delete vehicle');
            await loadVehicles();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    }
    
    async function handleEdit() {
        if (!selectedVehicle) return;
        
        setActionLoading(true);
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/economy/vehicles/${selectedVehicle.id}`, {
                method: 'PATCH',
                headers: { 
                    'X-Override-Token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editForm)
            });
            
            if (!response.ok) throw new Error('Failed to update vehicle');
            setShowEditModal(false);
            await loadVehicles();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    }
    
    function openEditModal(vehicle) {
        setSelectedVehicle(vehicle);
        setEditForm({
            name: vehicle.name || '',
            vehicle_type: vehicle.vehicle_type || '',
            value: vehicle.value || 0,
            condition: vehicle.condition || 100,
            insured: vehicle.insured || 0,
            user_id: vehicle.user_id || ''
        });
        setShowEditModal(true);
    }
    
    const filteredVehicles = vehicles.filter(v => {
        const search = searchTerm.toLowerCase();
        return (
            (v.name || '').toLowerCase().includes(search) ||
            (v.vehicle_id || '').toLowerCase().includes(search) ||
            (v.user_id || '').toLowerCase().includes(search) ||
            (v.vehicle_type || '').toLowerCase().includes(search)
        );
    });
    
    const vehicleTypeIcons = {
        'car': '🚗',
        'motorcycle': '🏍️',
        'truck': '🚛',
        'boat': '⛵',
        'plane': '✈️',
        'helicopter': '🚁',
        'bicycle': '🚲',
        'suv': '🚙',
        'sports': '🏎️',
        'default': '🚗'
    };
    
    function getVehicleIcon(type) {
        const key = (type || '').toLowerCase();
        return vehicleTypeIcons[key] || vehicleTypeIcons.default;
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
                        <span className="text-3xl">🚗</span>
                        Vehicle Registry
                    </h1>
                    <p className="text-gray-400 mt-1">View and manage all registered vehicles</p>
                </div>
                <button
                    onClick={loadVehicles}
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
                <StatCard label="Total Vehicles" value={vehicles.length} icon="🚗" />
                <StatCard label="Insured" value={vehicles.filter(v => v.insured).length} icon="🛡️" />
                <StatCard label="Uninsured" value={vehicles.filter(v => !v.insured).length} icon="⚠️" />
                <StatCard 
                    label="Total Value" 
                    value={`$${vehicles.reduce((sum, v) => sum + (v.value || 0), 0).toLocaleString()}`} 
                    icon="💵" 
                />
                <StatCard 
                    label="Avg Condition" 
                    value={`${Math.round(vehicles.reduce((sum, v) => sum + (v.condition || 0), 0) / (vehicles.length || 1))}%`} 
                    icon="🔧" 
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
            
            {/* Vehicles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVehicles.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-white/[0.02] border border-white/10 rounded-xl">
                        {searchTerm ? 'No vehicles match your search' : 'No vehicles found'}
                    </div>
                ) : (
                    filteredVehicles.map((vehicle) => (
                        <div key={vehicle.id} className="bg-white/[0.02] border border-white/10 rounded-xl p-4 hover:border-amber-500/30 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{getVehicleIcon(vehicle.vehicle_type)}</span>
                                    <div>
                                        <h3 className="font-medium text-white">{vehicle.name || 'Unnamed Vehicle'}</h3>
                                        <p className="text-xs text-gray-500 font-mono">{vehicle.vehicle_id}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-xs ${vehicle.insured ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {vehicle.insured ? 'Insured' : 'Uninsured'}
                                </span>
                            </div>
                            
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Type</span>
                                    <span className="text-white capitalize">{vehicle.vehicle_type || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Owner</span>
                                    <span className="text-white font-mono text-xs">{vehicle.user_id || 'None'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Value</span>
                                    <span className="text-green-400">${(vehicle.value || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-gray-400">Condition</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all ${
                                                    vehicle.condition >= 70 ? 'bg-green-500' :
                                                    vehicle.condition >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}
                                                style={{ width: `${vehicle.condition || 0}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-white text-xs">{vehicle.condition || 0}%</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                <button
                                    onClick={() => openEditModal(vehicle)}
                                    className="flex-1 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-sm transition-colors"
                                    disabled={actionLoading}
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(vehicle)}
                                    className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition-colors"
                                    disabled={actionLoading}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0d0d14] border border-white/10 rounded-2xl w-full max-w-md p-6 animate-scale-in">
                        <h3 className="text-xl font-bold text-white mb-4">Edit Vehicle</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Vehicle Name</label>
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
                                    value={editForm.vehicle_type}
                                    onChange={(e) => setEditForm({ ...editForm, vehicle_type: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                                >
                                    <option value="car">Car</option>
                                    <option value="motorcycle">Motorcycle</option>
                                    <option value="truck">Truck</option>
                                    <option value="suv">SUV</option>
                                    <option value="sports">Sports Car</option>
                                    <option value="boat">Boat</option>
                                    <option value="plane">Plane</option>
                                    <option value="helicopter">Helicopter</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Owner (Discord ID)</label>
                                <input
                                    type="text"
                                    value={editForm.user_id}
                                    onChange={(e) => setEditForm({ ...editForm, user_id: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500/50"
                                />
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
                                    <label className="block text-sm text-gray-400 mb-1">Condition (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={editForm.condition}
                                        onChange={(e) => setEditForm({ ...editForm, condition: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="insured"
                                    checked={editForm.insured}
                                    onChange={(e) => setEditForm({ ...editForm, insured: e.target.checked ? 1 : 0 })}
                                    className="w-4 h-4 rounded bg-white/5 border border-white/20 text-amber-500 focus:ring-amber-500"
                                />
                                <label htmlFor="insured" className="text-gray-300">Vehicle is insured</label>
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
