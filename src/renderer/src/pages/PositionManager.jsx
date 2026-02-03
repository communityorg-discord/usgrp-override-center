import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Link } from 'react-router-dom';

export default function PositionManager() {
    const { fetchApi, loading, error } = useApi();
    const [members, setMembers] = useState([]);
    const [positions, setPositions] = useState([]);
    const [filter, setFilter] = useState('');
    const [selectedPosition, setSelectedPosition] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const data = await fetchApi('/override/government/positions');
            if (data) {
                setMembers(data.members || []);
                setPositions(data.positions || []);
            }
        } catch (err) {
            console.error('Failed to load positions:', err);
        }
    }

    function formatMoney(amount) {
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0 
        }).format(amount || 0);
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    // Get unique positions for filter
    const uniquePositions = [...new Set(members.map(m => m.current_position).filter(Boolean))];

    // Filter members
    const filteredMembers = members.filter(m => {
        if (filter && !m.username?.toLowerCase().includes(filter.toLowerCase()) && 
            !m.user_id?.includes(filter)) return false;
        if (selectedPosition && m.current_position !== selectedPosition) return false;
        return true;
    });

    // Group by position
    const positionGroups = filteredMembers.reduce((acc, m) => {
        const pos = m.current_position || 'Unknown';
        if (!acc[pos]) acc[pos] = [];
        acc[pos].push(m);
        return acc;
    }, {});

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="heading-xl text-white flex items-center gap-3">
                        <span className="text-2xl">🏛️</span>
                        Position Manager
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        View and manage government positions
                    </p>
                </div>
                <button 
                    onClick={loadData}
                    disabled={loading}
                    className="btn btn-secondary"
                >
                    {loading ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        'Refresh'
                    )}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="card-stat" style={{ background: 'rgba(212, 175, 55, 0.08)' }}>
                    <p className="text-sm text-amber-400/70 mb-1">Total Members</p>
                    <p className="text-3xl font-mono font-bold text-amber-400">{members.length}</p>
                </div>
                <div className="card-stat" style={{ background: 'rgba(59, 130, 246, 0.08)' }}>
                    <p className="text-sm text-blue-400/70 mb-1">Unique Positions</p>
                    <p className="text-3xl font-mono font-bold text-blue-400">{uniquePositions.length}</p>
                </div>
                <div className="card-stat" style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
                    <p className="text-sm text-emerald-400/70 mb-1">Active</p>
                    <p className="text-3xl font-mono font-bold text-emerald-400">
                        {members.filter(m => m.status === 'active').length}
                    </p>
                </div>
                <div className="card-stat" style={{ background: 'rgba(139, 92, 246, 0.08)' }}>
                    <p className="text-sm text-purple-400/70 mb-1">Recent Assignments</p>
                    <p className="text-3xl font-mono font-bold text-purple-400">{positions.length}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search by name or user ID..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                        />
                    </div>
                    <select
                        value={selectedPosition}
                        onChange={(e) => setSelectedPosition(e.target.value)}
                        className="px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white focus:outline-none focus:border-amber-500/50 min-w-[200px]"
                    >
                        <option value="">All Positions</option>
                        {uniquePositions.map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {/* Position Groups */}
            <div className="space-y-6">
                {Object.entries(positionGroups).length === 0 ? (
                    <div className="card text-center py-12">
                        <p className="text-gray-500">No positions found</p>
                    </div>
                ) : (
                    Object.entries(positionGroups)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([position, holders]) => (
                            <div key={position} className="card">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="heading-md text-white flex items-center gap-2">
                                        <span className="text-amber-400">●</span>
                                        {position}
                                    </h2>
                                    <span className="text-sm text-gray-500">
                                        {holders.length} {holders.length === 1 ? 'holder' : 'holders'}
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-3">
                                    {holders.map((member, i) => (
                                        <div 
                                            key={i}
                                            className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <p className="text-white font-medium">{member.username || 'Unknown'}</p>
                                                    <p className="text-xs text-gray-500 font-mono mt-0.5">{member.user_id}</p>
                                                </div>
                                                <Link 
                                                    to={`/users/lookup?id=${member.user_id}`}
                                                    className="text-xs text-amber-400 hover:text-amber-300"
                                                >
                                                    View →
                                                </Link>
                                            </div>
                                            
                                            <div className="mt-3 pt-3 border-t border-white/[0.04]">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-500">Term Started</span>
                                                    <span className="text-gray-400">{formatDate(member.term_start)}</span>
                                                </div>
                                                {member.term_end && (
                                                    <div className="flex items-center justify-between text-xs mt-1">
                                                        <span className="text-gray-500">Term Ends</span>
                                                        <span className="text-gray-400">{formatDate(member.term_end)}</span>
                                                    </div>
                                                )}
                                                {(member.balance !== undefined || member.bank_balance !== undefined) && (
                                                    <div className="flex items-center justify-between text-xs mt-1">
                                                        <span className="text-gray-500">Wealth</span>
                                                        <span className="text-emerald-400 font-mono">
                                                            {formatMoney((member.balance || 0) + (member.bank_balance || 0))}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                )}
            </div>

            {/* Position History */}
            {positions.length > 0 && (
                <div className="card">
                    <h2 className="heading-md text-white mb-4">Recent Position Assignments</h2>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/[0.06]">
                                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">User</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Position</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Assigned By</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Assigned</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Ended</th>
                                </tr>
                            </thead>
                            <tbody>
                                {positions.slice(0, 20).map((p, i) => (
                                    <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                                        <td className="py-3 px-4 text-sm text-gray-400 font-mono">{p.user_id?.slice(0, 12)}...</td>
                                        <td className="py-3 px-4 text-sm text-white">{p.position}</td>
                                        <td className="py-3 px-4 text-sm text-gray-500">{p.assigned_by || 'N/A'}</td>
                                        <td className="py-3 px-4 text-sm text-gray-400">{formatDate(p.assigned_at)}</td>
                                        <td className="py-3 px-4 text-sm">
                                            {p.ended_at ? (
                                                <span className="text-red-400">{formatDate(p.ended_at)}</span>
                                            ) : (
                                                <span className="text-emerald-400">Active</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
