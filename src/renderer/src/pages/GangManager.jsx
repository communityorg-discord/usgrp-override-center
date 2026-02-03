import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function GangManager() {
    const { fetchApi, post, loading, error } = useApi();
    const [gangs, setGangs] = useState([]);
    const [selectedGang, setSelectedGang] = useState(null);
    const [members, setMembers] = useState([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [showDisbandModal, setShowDisbandModal] = useState(false);
    const [disbandReason, setDisbandReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadGangs();
    }, []);

    async function loadGangs() {
        try {
            const data = await fetchApi('/override/economy/gangs');
            if (data?.gangs) {
                setGangs(data.gangs);
            }
        } catch (err) {
            console.error('Failed to load gangs:', err);
        }
    }

    async function loadMembers(gangId) {
        setMembersLoading(true);
        try {
            const data = await fetchApi(`/override/economy/gangs/${gangId}/members`);
            if (data?.members) {
                setMembers(data.members);
            }
        } catch (err) {
            console.error('Failed to load members:', err);
            setMembers([]);
        } finally {
            setMembersLoading(false);
        }
    }

    function selectGang(gang) {
        setSelectedGang(gang);
        loadMembers(gang.id);
    }

    async function disbandGang() {
        if (!selectedGang) return;
        
        setActionLoading(true);
        try {
            await post(`/override/economy/gangs/${selectedGang.id}/disband`, {
                reason: disbandReason
            });
            
            setShowDisbandModal(false);
            setDisbandReason('');
            setSelectedGang(null);
            setMembers([]);
            loadGangs();
        } catch (err) {
            alert('Failed to disband gang: ' + err.message);
        } finally {
            setActionLoading(false);
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

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="heading-xl text-white flex items-center gap-3">
                        <span className="text-2xl">🔫</span>
                        Gang Manager
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        View and manage criminal organizations
                    </p>
                </div>
                <button onClick={loadGangs} className="btn btn-secondary" disabled={loading}>
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gangs List */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">All Gangs</h2>
                        <span className="text-sm text-gray-500">{gangs.length} total</span>
                    </div>

                    {gangs.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            {loading ? 'Loading gangs...' : 'No gangs found'}
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-dark">
                            {gangs.map(gang => (
                                <div
                                    key={gang.id}
                                    onClick={() => selectGang(gang)}
                                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                                        selectedGang?.id === gang.id
                                            ? 'bg-amber-500/20 border border-amber-500/50'
                                            : 'bg-white/[0.03] hover:bg-white/[0.06] border border-transparent'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-white">{gang.name}</h3>
                                            <p className="text-sm text-gray-500">{gang.type}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-amber-400 font-mono">{formatMoney(gang.balance)}</div>
                                            <div className="text-xs text-gray-500">{gang.member_count || 0} members</div>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                                        <span>Leader: {gang.leader_username || gang.leader_id}</span>
                                        <span>Revenue: {formatMoney(gang.revenue)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Gang Details */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-white mb-4">Gang Details</h2>

                    {selectedGang ? (
                        <div className="space-y-4">
                            {/* Gang Info */}
                            <div className="p-4 rounded-lg bg-white/[0.03]">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-gray-500 text-sm">Name</span>
                                        <p className="text-white font-semibold">{selectedGang.name}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 text-sm">Type</span>
                                        <p className="text-white">{selectedGang.type}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 text-sm">Balance</span>
                                        <p className="text-amber-400 font-mono">{formatMoney(selectedGang.balance)}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 text-sm">Revenue</span>
                                        <p className="text-green-400 font-mono">{formatMoney(selectedGang.revenue)}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 text-sm">Leader ID</span>
                                        <p className="text-white font-mono text-xs">{selectedGang.leader_id}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 text-sm">Created</span>
                                        <p className="text-white text-sm">{new Date(selectedGang.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Members List */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 mb-2">Members</h3>
                                {membersLoading ? (
                                    <div className="text-center py-4 text-gray-500">Loading members...</div>
                                ) : members.length === 0 ? (
                                    <div className="text-center py-4 text-gray-500">No member data available</div>
                                ) : (
                                    <div className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-dark">
                                        {members.map((member, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 rounded bg-white/[0.02]">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 text-xs rounded ${
                                                        member.role === 'Leader' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-400'
                                                    }`}>
                                                        {member.role}
                                                    </span>
                                                    <span className="text-white">{member.username || member.discord_id}</span>
                                                </div>
                                                <span className="text-sm text-gray-400 font-mono">
                                                    {formatMoney((member.balance || 0) + (member.bank_balance || 0))}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="pt-4 border-t border-white/10">
                                <button
                                    onClick={() => setShowDisbandModal(true)}
                                    className="btn btn-danger w-full"
                                >
                                    Force Disband Gang
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            Select a gang to view details
                        </div>
                    )}
                </div>
            </div>

            {/* Disband Confirmation Modal */}
            {showDisbandModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-[#0a0a0f] border border-red-500/30 rounded-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-red-400 mb-4">⚠️ Confirm Disband</h3>
                        <p className="text-gray-300 mb-4">
                            You are about to disband <strong className="text-white">{selectedGang?.name}</strong>. 
                            This action cannot be undone.
                        </p>
                        
                        <div className="mb-4">
                            <label className="block text-sm text-gray-400 mb-1">Reason (optional)</label>
                            <textarea
                                value={disbandReason}
                                onChange={(e) => setDisbandReason(e.target.value)}
                                placeholder="Enter reason for disbanding..."
                                className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 resize-none"
                                rows={3}
                            />
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDisbandModal(false)}
                                className="btn btn-secondary flex-1"
                                disabled={actionLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={disbandGang}
                                className="btn btn-danger flex-1"
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Disbanding...' : 'Disband Gang'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
