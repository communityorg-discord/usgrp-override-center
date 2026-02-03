import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';

export default function BulkWipe() {
    const { fetchApi, post, loading, error } = useApi();
    const [searchQuery, setSearchQuery] = useState('');
    const [minBalance, setMinBalance] = useState('');
    const [maxBalance, setMaxBalance] = useState('');
    const [inactiveDays, setInactiveDays] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [wipeType, setWipeType] = useState('balance_only');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmCode, setConfirmCode] = useState('');
    const [confirmError, setConfirmError] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [results, setResults] = useState(null);

    async function searchUsers() {
        try {
            const data = await post('/override/economy/bulk-wipe/search', {
                query: searchQuery || undefined,
                minBalance: minBalance ? parseInt(minBalance) : undefined,
                maxBalance: maxBalance ? parseInt(maxBalance) : undefined,
                inactive_days: inactiveDays ? parseInt(inactiveDays) : undefined
            });
            if (data?.users) {
                setUsers(data.users);
                setSelectedUsers(new Set());
            }
        } catch (err) {
            console.error('Search failed:', err);
        }
    }

    function toggleUser(userId) {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    }

    function selectAll() {
        if (selectedUsers.size === users.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(users.map(u => u.discord_id)));
        }
    }

    function openConfirmModal() {
        if (selectedUsers.size === 0) {
            alert('Select at least one user');
            return;
        }
        setConfirmCode('');
        setConfirmError('');
        setShowConfirmModal(true);
    }

    async function executeWipe() {
        if (confirmCode !== '470303') {
            setConfirmError('Invalid confirmation code');
            return;
        }

        setActionLoading(true);
        setConfirmError('');

        try {
            const data = await post('/override/economy/bulk-wipe', {
                userIds: Array.from(selectedUsers),
                wipeType,
                confirmationCode: confirmCode
            });
            
            setResults(data.results);
            setShowConfirmModal(false);
            setSelectedUsers(new Set());
            searchUsers(); // Refresh list
        } catch (err) {
            setConfirmError(err.message || 'Wipe failed');
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

    const wipeOptions = [
        { value: 'wallet_only', label: 'Wallet Only', desc: 'Reset wallet balance to $0' },
        { value: 'bank_only', label: 'Bank Only', desc: 'Reset bank balance to $0' },
        { value: 'balance_only', label: 'All Money', desc: 'Reset both wallet and bank to $0' },
        { value: 'full_reset', label: 'Full Reset', desc: 'Delete all money, properties, vehicles, businesses, loans' }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="heading-xl text-white flex items-center gap-3">
                        <span className="text-2xl">🧹</span>
                        Bulk Wipe Tool
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Mass reset user economy data
                    </p>
                </div>
            </div>

            {/* Warning Banner */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <h3 className="text-red-400 font-semibold">Destructive Action</h3>
                        <p className="text-gray-300 text-sm mt-1">
                            This tool permanently deletes user data. Actions cannot be undone. 
                            Use with extreme caution and document all wipes.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Search Panel */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-white mb-4">Search Filters</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Username / Discord ID</label>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Min Balance</label>
                                <input
                                    type="number"
                                    value={minBalance}
                                    onChange={(e) => setMinBalance(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Max Balance</label>
                                <input
                                    type="number"
                                    value={maxBalance}
                                    onChange={(e) => setMaxBalance(e.target.value)}
                                    placeholder="∞"
                                    className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Inactive Days</label>
                            <input
                                type="number"
                                value={inactiveDays}
                                onChange={(e) => setInactiveDays(e.target.value)}
                                placeholder="e.g., 90"
                                className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                            />
                            <p className="text-xs text-gray-600 mt-1">Users inactive for X days or more</p>
                        </div>

                        <button
                            onClick={searchUsers}
                            className="btn btn-primary w-full"
                            disabled={loading}
                        >
                            {loading ? 'Searching...' : 'Search Users'}
                        </button>
                    </div>

                    {/* Wipe Type Selection */}
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <h3 className="text-sm font-semibold text-gray-400 mb-3">Wipe Type</h3>
                        <div className="space-y-2">
                            {wipeOptions.map(opt => (
                                <label 
                                    key={opt.value}
                                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                        wipeType === opt.value 
                                            ? 'bg-amber-500/20 border border-amber-500/50' 
                                            : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.05]'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="wipeType"
                                        value={opt.value}
                                        checked={wipeType === opt.value}
                                        onChange={(e) => setWipeType(e.target.value)}
                                        className="mt-1 accent-amber-500"
                                    />
                                    <div>
                                        <div className={`font-medium ${opt.value === 'full_reset' ? 'text-red-400' : 'text-white'}`}>
                                            {opt.label}
                                        </div>
                                        <div className="text-xs text-gray-500">{opt.desc}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Results List */}
                <div className="lg:col-span-2 card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">
                            Users Found ({users.length})
                        </h2>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">
                                {selectedUsers.size} selected
                            </span>
                            <button
                                onClick={selectAll}
                                className="btn btn-secondary text-sm py-1"
                            >
                                {selectedUsers.size === users.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                    </div>

                    {users.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            Use filters to search for users
                        </div>
                    ) : (
                        <>
                            <div className="max-h-[400px] overflow-y-auto scrollbar-dark space-y-1">
                                {users.map(user => (
                                    <div
                                        key={user.discord_id}
                                        onClick={() => toggleUser(user.discord_id)}
                                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                            selectedUsers.has(user.discord_id)
                                                ? 'bg-red-500/20 border border-red-500/50'
                                                : 'bg-white/[0.03] hover:bg-white/[0.05] border border-transparent'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.has(user.discord_id)}
                                            onChange={() => {}}
                                            className="accent-red-500"
                                        />
                                        <div className="flex-1">
                                            <div className="text-white font-medium">
                                                {user.username || 'Unknown User'}
                                            </div>
                                            <div className="text-xs text-gray-500 font-mono">
                                                {user.discord_id}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-amber-400 font-mono">
                                                {formatMoney(user.total)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                💵 {formatMoney(user.balance)} | 🏦 {formatMoney(user.bank_balance)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/10">
                                <button
                                    onClick={openConfirmModal}
                                    className="btn btn-danger w-full py-3"
                                    disabled={selectedUsers.size === 0}
                                >
                                    🧹 Wipe {selectedUsers.size} User{selectedUsers.size !== 1 ? 's' : ''}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Results Display */}
            {results && (
                <div className="card">
                    <h2 className="text-lg font-semibold text-white mb-4">Wipe Results</h2>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                            <div className="text-2xl font-bold text-green-400">{results.success}</div>
                            <div className="text-sm text-gray-400">Successful</div>
                        </div>
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                            <div className="text-2xl font-bold text-red-400">{results.failed}</div>
                            <div className="text-sm text-gray-400">Failed</div>
                        </div>
                    </div>
                    <button onClick={() => setResults(null)} className="btn btn-secondary">
                        Dismiss
                    </button>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-[#0a0a0f] border border-red-500/30 rounded-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-red-400 mb-4">⚠️ Confirm Bulk Wipe</h3>
                        
                        <div className="bg-red-500/10 rounded-lg p-4 mb-4">
                            <div className="text-white font-semibold">
                                You are about to wipe {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''}
                            </div>
                            <div className="text-gray-300 text-sm mt-1">
                                Wipe type: <span className="text-red-400 font-semibold">
                                    {wipeOptions.find(o => o.value === wipeType)?.label}
                                </span>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm text-gray-400 mb-1">
                                Enter confirmation code: <span className="text-amber-400 font-mono">470303</span>
                            </label>
                            <input
                                type="text"
                                value={confirmCode}
                                onChange={(e) => setConfirmCode(e.target.value)}
                                placeholder="Enter code..."
                                className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 font-mono text-center text-lg"
                                maxLength={6}
                            />
                        </div>

                        {confirmError && (
                            <div className="text-red-400 text-sm bg-red-500/10 p-2 rounded mb-4">
                                {confirmError}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="btn btn-secondary flex-1"
                                disabled={actionLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeWipe}
                                className="btn btn-danger flex-1"
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Wiping...' : 'Execute Wipe'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
