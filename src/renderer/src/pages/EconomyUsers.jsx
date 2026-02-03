import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Link } from 'react-router-dom';

export default function EconomyUsers() {
    const { fetchApi, loading, error } = useApi();
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [userDetail, setUserDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        try {
            const data = await fetchApi(`/override/economy/users/search?limit=100`);
            if (data?.users) {
                setUsers(data.users);
            }
        } catch (err) {
            console.error('Failed to load users:', err);
        }
    }

    async function searchUsers() {
        if (search.length < 2 && search.length > 0) return;
        try {
            const data = await fetchApi(`/override/economy/users/search?q=${encodeURIComponent(search)}&limit=100`);
            if (data?.users) {
                setUsers(data.users);
            }
        } catch (err) {
            console.error('Search failed:', err);
        }
    }

    async function loadUserDetail(discordId) {
        setDetailLoading(true);
        setSelectedUser(discordId);
        try {
            const data = await fetchApi(`/override/economy/user/${discordId}`);
            if (data?.user) {
                setUserDetail(data.user);
            }
        } catch (err) {
            console.error('Failed to load user detail:', err);
            setUserDetail(null);
        } finally {
            setDetailLoading(false);
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
                        <span className="text-2xl">💰</span>
                        Economy Users
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        View and manage user economy data
                    </p>
                </div>
                <Link to="/economy/money" className="btn btn-primary">
                    Edit Money →
                </Link>
            </div>

            {/* Search Bar */}
            <div className="card">
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by Discord ID or username..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                        />
                    </div>
                    <button
                        onClick={searchUsers}
                        disabled={loading}
                        className="btn btn-primary px-6"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            'Search'
                        )}
                    </button>
                    <button
                        onClick={loadUsers}
                        className="btn btn-secondary"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-6">
                {/* Users List */}
                <div className="card">
                    <h2 className="heading-md text-white mb-4 flex items-center justify-between">
                        Users
                        <span className="text-sm font-normal text-gray-500">
                            {users.length} results
                        </span>
                    </h2>
                    
                    <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-dark">
                        {users.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No users found</p>
                        ) : (
                            users.map((user) => (
                                <button
                                    key={user.discord_id}
                                    onClick={() => loadUserDetail(user.discord_id)}
                                    className={`w-full p-4 rounded-xl text-left transition-all duration-150 ${
                                        selectedUser === user.discord_id
                                            ? 'bg-amber-500/10 border border-amber-500/30'
                                            : 'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08]'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-white font-medium">
                                                {user.username || 'Unknown User'}
                                            </p>
                                            <p className="text-xs text-gray-500 font-mono mt-0.5">
                                                {user.discord_id}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-emerald-400 font-mono font-medium">
                                                {formatMoney(user.balance + user.bank_balance)}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Total Wealth
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* User Detail Panel */}
                <div className="card">
                    <h2 className="heading-md text-white mb-4">User Details</h2>
                    
                    {!selectedUser ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <p className="text-gray-500">Select a user to view details</p>
                        </div>
                    ) : detailLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4" />
                            <p className="text-gray-500">Loading user data...</p>
                        </div>
                    ) : userDetail ? (
                        <div className="space-y-6 max-h-[600px] overflow-y-auto scrollbar-dark">
                            {/* Balance Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <p className="text-xs text-emerald-400/70 uppercase tracking-wider">Cash</p>
                                    <p className="text-2xl font-mono font-bold text-emerald-400 mt-1">
                                        {formatMoney(userDetail.balance)}
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                    <p className="text-xs text-blue-400/70 uppercase tracking-wider">Bank</p>
                                    <p className="text-2xl font-mono font-bold text-blue-400 mt-1">
                                        {formatMoney(userDetail.bankBalance)}
                                    </p>
                                </div>
                            </div>

                            {/* Credit Score */}
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Credit Score</span>
                                    <span className={`font-mono font-bold ${
                                        userDetail.creditScore >= 700 ? 'text-emerald-400' :
                                        userDetail.creditScore >= 500 ? 'text-amber-400' :
                                        'text-red-400'
                                    }`}>
                                        {userDetail.creditScore}
                                    </span>
                                </div>
                            </div>

                            {/* Job */}
                            {userDetail.job && (
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Current Job</p>
                                    <p className="text-white font-medium">{userDetail.job.job_type}</p>
                                    <p className="text-sm text-gray-400">
                                        Level {userDetail.job.job_level} • {formatMoney(userDetail.job.salary)}/pay
                                    </p>
                                </div>
                            )}

                            {/* Government Position */}
                            {userDetail.governmentPosition && (
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                    <p className="text-xs text-amber-400/70 uppercase tracking-wider mb-2">Government Position</p>
                                    <p className="text-white font-medium">{userDetail.governmentPosition.current_position}</p>
                                    <p className="text-sm text-amber-400/70">
                                        Since {new Date(userDetail.governmentPosition.term_start).toLocaleDateString()}
                                    </p>
                                </div>
                            )}

                            {/* Properties */}
                            {userDetail.properties?.length > 0 && (
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Properties ({userDetail.properties.length})</p>
                                    <div className="space-y-2">
                                        {userDetail.properties.slice(0, 5).map((prop, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <span className="text-white">{prop.name || prop.property_type}</span>
                                                <span className="text-emerald-400 font-mono">{formatMoney(prop.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Investments */}
                            {userDetail.investments?.length > 0 && (
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Investments ({userDetail.investments.length})</p>
                                    <div className="space-y-2">
                                        {userDetail.investments.slice(0, 5).map((inv, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <span className="text-white font-mono">{inv.ticker}</span>
                                                <span className="text-gray-400">{inv.shares} shares @ {formatMoney(inv.avg_buy_price)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent Transactions */}
                            {userDetail.recentTransactions?.length > 0 && (
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Recent Transactions</p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-dark">
                                        {userDetail.recentTransactions.slice(0, 10).map((tx, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-white/[0.04] last:border-0">
                                                <div>
                                                    <span className="text-white">{tx.type}</span>
                                                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{tx.description}</p>
                                                </div>
                                                <span className={`font-mono ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {tx.amount >= 0 ? '+' : ''}{formatMoney(tx.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2">
                                <Link 
                                    to={`/economy/money?user=${userDetail.discordId}`}
                                    className="flex-1 btn btn-primary text-center"
                                >
                                    Edit Balance
                                </Link>
                                <Link 
                                    to={`/users/lookup?id=${userDetail.discordId}`}
                                    className="flex-1 btn btn-secondary text-center"
                                >
                                    Full Lookup
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <p className="text-red-400">Failed to load user data</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
