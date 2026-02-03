import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useSearchParams } from 'react-router-dom';

export default function UserLookup() {
    const { fetchApi, loading, error } = useApi();
    const [searchParams, setSearchParams] = useSearchParams();
    const [userId, setUserId] = useState(searchParams.get('id') || '');
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const id = searchParams.get('id');
        if (id) {
            setUserId(id);
            performLookup(id);
        }
    }, [searchParams]);

    async function performLookup(id) {
        if (!id) return;
        try {
            const data = await fetchApi(`/override/users/unified/${id}`);
            setUserData(data);
        } catch (err) {
            console.error('Lookup failed:', err);
        }
    }

    function handleSearch() {
        if (!userId) return;
        setSearchParams({ id: userId });
        performLookup(userId);
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
        return new Date(dateStr).toLocaleString();
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="heading-xl text-white flex items-center gap-3">
                    <span className="text-2xl">🔍</span>
                    Unified User Lookup
                </h1>
                <p className="text-sm mt-1 text-gray-400">
                    Complete overview of Discord, Economy, and Moderation data
                </p>
            </div>

            <div className="card">
                <div className="flex gap-3">
                    <input
                        type="text"
                        placeholder="Enter Discord User ID..."
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="flex-1 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 font-mono"
                    />
                    <button onClick={handleSearch} disabled={loading} className="btn btn-primary px-8">
                        {loading ? 'Searching...' : 'Lookup'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                    {error}
                </div>
            )}

            {userData && (
                <div className="grid grid-cols-3 gap-6">
                    {/* Left Column: Discord & Stats */}
                    <div className="space-y-6">
                        {/* Discord Profile */}
                        <div className="card">
                            <h2 className="heading-md text-white mb-4">Discord Profile</h2>
                            {userData.discord?.error ? (
                                <p className="text-gray-500">{userData.discord.error}</p>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        {userData.discord.avatar ? (
                                            <img 
                                                src={`https://cdn.discordapp.com/avatars/${userData.discordId}/${userData.discord.avatar}.png?size=128`}
                                                className="w-16 h-16 rounded-full border-2 border-white/10"
                                                alt=""
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 text-2xl font-bold">
                                                {userData.discord.username?.[0]?.toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-lg font-bold text-white">{userData.discord.displayName}</p>
                                            <p className="text-sm text-gray-500 font-mono">@{userData.discord.username}</p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-white/5 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Joined Guild</span>
                                            <span className="text-gray-300">{new Date(userData.discord.joinedAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Roles</span>
                                            <span className="text-gray-300">{userData.discord.roles?.length || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Summary Stats */}
                        <div className="card bg-gradient-to-br from-amber-500/10 to-transparent">
                            <h2 className="heading-md text-white mb-4">Financial Summary</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Total Wealth</span>
                                    <span className="text-emerald-400 font-mono font-bold">{formatMoney(userData.economy?.totalWealth)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Credit Score</span>
                                    <span className="text-white font-mono">{userData.economy?.creditScore || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Mod Points</span>
                                    <span className="text-red-400 font-mono">{userData.moderation?.cases?.reduce((s, c) => s + (c.points || 0), 0) || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle Column: Economy */}
                    <div className="space-y-6">
                        <div className="card">
                            <h2 className="heading-md text-white mb-4">Economy Assets</h2>
                            {!userData.economy || userData.economy.error ? (
                                <p className="text-gray-500">No economy data found.</p>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-3 rounded-lg bg-white/5">
                                            <p className="text-xs text-gray-500 uppercase">Cash</p>
                                            <p className="text-lg font-mono text-emerald-400">{formatMoney(userData.economy.balance)}</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-white/5">
                                            <p className="text-xs text-gray-500 uppercase">Bank</p>
                                            <p className="text-lg font-mono text-blue-400">{formatMoney(userData.economy.bankBalance)}</p>
                                        </div>
                                    </div>
                                    
                                    {userData.economy.job && (
                                        <div className="p-3 rounded-lg bg-white/5 border-l-2 border-amber-500">
                                            <p className="text-xs text-gray-500 uppercase">Current Job</p>
                                            <p className="text-white font-medium">{userData.economy.job.job_type}</p>
                                            <p className="text-xs text-gray-400">Salary: {formatMoney(userData.economy.job.salary)}</p>
                                        </div>
                                    )}

                                    <div>
                                        <p className="text-xs text-gray-500 uppercase mb-2">Properties ({userData.economy.properties?.length || 0})</p>
                                        <div className="space-y-1">
                                            {userData.economy.properties?.slice(0, 3).map((p, i) => (
                                                <div key={i} className="flex justify-between text-sm">
                                                    <span className="text-gray-300">{p.name || p.property_type}</span>
                                                    <span className="text-emerald-400 font-mono">{formatMoney(p.value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {userData.government && (
                            <div className="card bg-blue-500/5 border-blue-500/20">
                                <h2 className="heading-md text-white mb-4">Government Service</h2>
                                <div className="space-y-2">
                                    <p className="text-white font-bold">{userData.government.current_position}</p>
                                    <p className="text-sm text-gray-400">Status: <span className="text-emerald-400 uppercase">{userData.government.status}</span></p>
                                    <p className="text-xs text-gray-500">Member since {formatDate(userData.government.registered_at)}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Moderation */}
                    <div className="card">
                        <h2 className="heading-md text-white mb-4">Moderation History</h2>
                        {!userData.moderation || userData.moderation.error ? (
                            <p className="text-gray-500">No moderation data found.</p>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="text-center flex-1 py-2 bg-red-500/10 rounded-lg">
                                        <p className="text-2xl font-bold text-red-400">{userData.moderation.totalCases}</p>
                                        <p className="text-xs text-gray-500">Total Cases</p>
                                    </div>
                                    <div className="text-center flex-1 py-2 bg-emerald-500/10 rounded-lg">
                                        <p className="text-2xl font-bold text-emerald-400">{userData.moderation.activeCases}</p>
                                        <p className="text-xs text-gray-500">Active</p>
                                    </div>
                                </div>

                                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-dark">
                                    {userData.moderation.cases?.map((c, i) => (
                                        <div key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                                            <div className="flex justify-between mb-1">
                                                <span className={`text-xs font-bold uppercase ${
                                                    c.action_type === 'ban' ? 'text-red-400' : 
                                                    c.action_type === 'warn' ? 'text-amber-400' : 'text-blue-400'
                                                }`}>{c.action_type}</span>
                                                <span className="text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-sm text-gray-300 line-clamp-2">{c.reason}</p>
                                            <p className="text-[10px] text-gray-500 mt-2">ID: {c.case_id} • Mod: {c.moderator_tag || 'System'}</p>
                                        </div>
                                    ))}
                                    {userData.moderation.cases?.length === 0 && (
                                        <p className="text-center text-gray-500 py-8">Clear record. No cases found.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
