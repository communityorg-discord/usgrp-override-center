import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function GodMode() {
    const { fetchApi, post, loading, error } = useApi();
    const [godMode, setGodMode] = useState(null);
    const [showToggleModal, setShowToggleModal] = useState(false);
    const [password, setPassword] = useState('');
    const [reason, setReason] = useState('');
    const [toggleError, setToggleError] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadStatus();
    }, []);

    async function loadStatus() {
        try {
            const data = await fetchApi('/override/economy/godmode');
            if (data?.godMode) {
                setGodMode(data.godMode);
            }
        } catch (err) {
            console.error('Failed to load god mode status:', err);
        }
    }

    function openToggleModal() {
        setPassword('');
        setReason('');
        setToggleError('');
        setShowToggleModal(true);
    }

    async function toggleGodMode() {
        if (!password) {
            setToggleError('Password is required');
            return;
        }

        setActionLoading(true);
        setToggleError('');
        
        try {
            const newState = !godMode?.enabled;
            await post('/override/economy/godmode', {
                enabled: newState,
                password,
                reason
            });
            
            setShowToggleModal(false);
            loadStatus();
        } catch (err) {
            setToggleError(err.message || 'Failed to toggle god mode');
        } finally {
            setActionLoading(false);
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="heading-xl text-white flex items-center gap-3">
                        <span className="text-2xl">⚡</span>
                        God Mode Control
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Toggle economy restrictions globally
                    </p>
                </div>
                <button onClick={loadStatus} className="btn btn-secondary" disabled={loading}>
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            {/* Status Card */}
            <div className={`card border-2 transition-all ${
                godMode?.enabled 
                    ? 'border-red-500/50 bg-gradient-to-br from-red-900/20 to-transparent' 
                    : 'border-green-500/50 bg-gradient-to-br from-green-900/20 to-transparent'
            }`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
                            godMode?.enabled ? 'bg-red-500/20' : 'bg-green-500/20'
                        }`}>
                            <span className="text-5xl">{godMode?.enabled ? '🔴' : '🟢'}</span>
                        </div>
                        <div>
                            <h2 className={`text-3xl font-bold ${godMode?.enabled ? 'text-red-400' : 'text-green-400'}`}>
                                {godMode?.enabled ? 'GOD MODE ACTIVE' : 'NORMAL MODE'}
                            </h2>
                            <p className="text-gray-400 mt-1">
                                {godMode?.enabled 
                                    ? 'All economy restrictions are disabled' 
                                    : 'Economy restrictions are enforced'
                                }
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={openToggleModal}
                        className={`btn ${godMode?.enabled ? 'btn-success' : 'btn-danger'} px-8 py-3`}
                    >
                        {godMode?.enabled ? 'Disable God Mode' : 'Enable God Mode'}
                    </button>
                </div>
            </div>

            {/* Info Grid */}
            {godMode?.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card">
                        <div className="text-gray-400 text-sm">Enabled By</div>
                        <div className="text-xl font-bold text-white mt-1">{godMode.enabledBy || 'Unknown'}</div>
                    </div>
                    <div className="card">
                        <div className="text-gray-400 text-sm">Enabled At</div>
                        <div className="text-xl font-bold text-white mt-1">
                            {godMode.enabledAt ? new Date(godMode.enabledAt).toLocaleString() : 'Unknown'}
                        </div>
                    </div>
                    <div className="card">
                        <div className="text-gray-400 text-sm">Reason</div>
                        <div className="text-xl font-bold text-white mt-1">{godMode.reason || 'No reason provided'}</div>
                    </div>
                </div>
            )}

            {/* What God Mode Does */}
            <div className="card">
                <h2 className="text-lg font-semibold text-white mb-4">What is God Mode?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-amber-400 font-semibold mb-2">When Enabled:</h3>
                        <ul className="space-y-2 text-gray-300">
                            <li className="flex items-start gap-2">
                                <span className="text-red-400">✓</span>
                                <span>No transaction limits</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-400">✓</span>
                                <span>No cooldowns on commands</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-400">✓</span>
                                <span>No balance requirements</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-400">✓</span>
                                <span>Tax bypass enabled</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-400">✓</span>
                                <span>Gambling limits removed</span>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-amber-400 font-semibold mb-2">⚠️ Warnings:</h3>
                        <ul className="space-y-2 text-gray-300">
                            <li className="flex items-start gap-2">
                                <span className="text-yellow-500">!</span>
                                <span>Can cause economy inflation</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-yellow-500">!</span>
                                <span>May enable exploits</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-yellow-500">!</span>
                                <span>Only use for maintenance</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-yellow-500">!</span>
                                <span>Always document reason</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-yellow-500">!</span>
                                <span>Disable when done</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Toggle Modal */}
            {showToggleModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
                    <div className={`bg-[#0a0a0f] border rounded-xl p-6 max-w-md w-full mx-4 ${
                        godMode?.enabled ? 'border-green-500/30' : 'border-red-500/30'
                    }`}>
                        <h3 className={`text-xl font-bold mb-4 ${godMode?.enabled ? 'text-green-400' : 'text-red-400'}`}>
                            {godMode?.enabled ? '🟢 Disable God Mode' : '🔴 Enable God Mode'}
                        </h3>
                        
                        <p className="text-gray-300 mb-4">
                            {godMode?.enabled 
                                ? 'This will restore all economy restrictions.'
                                : 'This will disable ALL economy restrictions server-wide. Use with extreme caution.'
                            }
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Confirmation Password *</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Reason</label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Why are you toggling god mode?"
                                    className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 resize-none"
                                    rows={3}
                                />
                            </div>

                            {toggleError && (
                                <div className="text-red-400 text-sm bg-red-500/10 p-2 rounded">
                                    {toggleError}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowToggleModal(false)}
                                className="btn btn-secondary flex-1"
                                disabled={actionLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={toggleGodMode}
                                className={`btn flex-1 ${godMode?.enabled ? 'btn-success' : 'btn-danger'}`}
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Processing...' : (godMode?.enabled ? 'Disable' : 'Enable')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
