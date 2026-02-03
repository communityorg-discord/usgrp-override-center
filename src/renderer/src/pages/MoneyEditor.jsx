import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useSearchParams } from 'react-router-dom';

export default function MoneyEditor() {
    const { fetchApi, post, loading } = useApi();
    const [searchParams] = useSearchParams();
    const [mode, setMode] = useState('give'); // give, take, set
    const [userId, setUserId] = useState(searchParams.get('user') || '');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [toBank, setToBank] = useState(false);
    const [balance, setBalance] = useState(null);
    const [bankBalance, setBankBalance] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [result, setResult] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (userId && userId.length >= 17) {
            lookupUser();
        }
    }, [userId]);

    async function lookupUser() {
        try {
            const data = await fetchApi(`/override/economy/user/${userId}`);
            if (data?.user) {
                setUserInfo(data.user);
                setBalance(data.user.balance?.toString() || '0');
                setBankBalance(data.user.bankBalance?.toString() || '0');
            }
        } catch (err) {
            setUserInfo(null);
        }
    }

    async function executeAction() {
        if (!userId) {
            setResult({ error: 'User ID required' });
            return;
        }

        setActionLoading(true);
        setResult(null);

        try {
            let response;
            
            if (mode === 'give') {
                response = await post('/override/economy/give', {
                    userId,
                    amount: parseFloat(amount),
                    reason,
                    toBank
                });
            } else if (mode === 'take') {
                response = await post('/override/economy/take', {
                    userId,
                    amount: parseFloat(amount),
                    reason,
                    fromBank: toBank
                });
            } else if (mode === 'set') {
                response = await post('/override/economy/set', {
                    userId,
                    balance: parseFloat(balance),
                    bankBalance: parseFloat(bankBalance),
                    reason
                });
            }

            setResult(response);
            
            // Refresh user info
            await lookupUser();
            
        } catch (err) {
            setResult({ error: err.message });
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

    const quickAmounts = [100, 500, 1000, 5000, 10000, 50000, 100000, 1000000];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="heading-xl text-white flex items-center gap-3">
                    <span className="text-2xl">💸</span>
                    Money Editor
                </h1>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Give, take, or set exact balances for users
                </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Action Panel */}
                <div className="space-y-4">
                    {/* User ID Input */}
                    <div className="card">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Discord User ID
                        </label>
                        <input
                            type="text"
                            placeholder="Enter Discord User ID..."
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 font-mono"
                        />
                        
                        {userInfo && (
                            <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <p className="text-emerald-400 font-medium">{userInfo.username || 'User Found'}</p>
                                <p className="text-sm text-emerald-400/70">
                                    Cash: {formatMoney(userInfo.balance)} • Bank: {formatMoney(userInfo.bankBalance)}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Mode Selector */}
                    <div className="card">
                        <label className="block text-sm font-medium text-gray-400 mb-3">
                            Action
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'give', label: 'Give', icon: '➕', color: 'emerald' },
                                { id: 'take', label: 'Take', icon: '➖', color: 'red' },
                                { id: 'set', label: 'Set', icon: '🎯', color: 'amber' }
                            ].map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setMode(m.id)}
                                    className={`p-4 rounded-xl text-center transition-all duration-150 ${
                                        mode === m.id
                                            ? m.color === 'emerald' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' :
                                              m.color === 'red' ? 'bg-red-500/20 border-red-500/40 text-red-400' :
                                              'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                            : 'bg-white/[0.02] border-white/[0.04] text-gray-400 hover:bg-white/[0.04]'
                                    } border`}
                                >
                                    <span className="text-2xl block mb-1">{m.icon}</span>
                                    <span className="text-sm font-medium">{m.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Amount Input (for give/take) */}
                    {mode !== 'set' && (
                        <div className="card">
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Amount
                            </label>
                            <input
                                type="number"
                                placeholder="Enter amount..."
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 font-mono text-xl"
                            />
                            
                            {/* Quick Amounts */}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {quickAmounts.map((amt) => (
                                    <button
                                        key={amt}
                                        onClick={() => setAmount(amt.toString())}
                                        className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white text-sm font-mono transition-colors"
                                    >
                                        {formatMoney(amt)}
                                    </button>
                                ))}
                            </div>

                            {/* Bank Toggle */}
                            <label className="flex items-center gap-3 mt-4 cursor-pointer">
                                <div 
                                    className={`w-12 h-6 rounded-full transition-colors duration-200 ${toBank ? 'bg-blue-500' : 'bg-gray-600'}`}
                                    onClick={() => setToBank(!toBank)}
                                >
                                    <div 
                                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 mt-0.5 ${toBank ? 'translate-x-6 ml-0.5' : 'translate-x-0.5'}`}
                                    />
                                </div>
                                <span className="text-gray-300">
                                    {mode === 'give' ? 'Deposit to Bank' : 'Take from Bank'}
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Balance Inputs (for set mode) */}
                    {mode === 'set' && (
                        <div className="card">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Cash Balance
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="Cash..."
                                        value={balance}
                                        onChange={(e) => setBalance(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Bank Balance
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="Bank..."
                                        value={bankBalance}
                                        onChange={(e) => setBankBalance(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Reason */}
                    <div className="card">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Reason (for audit log)
                        </label>
                        <input
                            type="text"
                            placeholder="Enter reason for this action..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                        />
                    </div>

                    {/* Execute Button */}
                    <button
                        onClick={executeAction}
                        disabled={actionLoading || !userId}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 ${
                            mode === 'give' 
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white'
                                : mode === 'take'
                                ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white'
                                : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {actionLoading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Processing...
                            </div>
                        ) : (
                            mode === 'give' ? `Give ${amount ? formatMoney(parseFloat(amount)) : 'Money'}` :
                            mode === 'take' ? `Take ${amount ? formatMoney(parseFloat(amount)) : 'Money'}` :
                            'Set Balance'
                        )}
                    </button>

                    {/* Result */}
                    {result && (
                        <div className={`p-4 rounded-xl ${result.error ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                            {result.error ? (
                                <p className="text-red-400">❌ {result.error}</p>
                            ) : (
                                <div>
                                    <p className="text-emerald-400 font-medium">✅ {result.message}</p>
                                    {result.transactionId && (
                                        <p className="text-sm text-emerald-400/70 font-mono mt-1">
                                            TX: {result.transactionId}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Preview Panel */}
                <div className="card">
                    <h2 className="heading-md text-white mb-4">Preview</h2>
                    
                    {userInfo ? (
                        <div className="space-y-6">
                            {/* Current State */}
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Current Balance</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                        <p className="text-sm text-gray-400">Cash</p>
                                        <p className="text-2xl font-mono font-bold text-white">{formatMoney(userInfo.balance)}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                        <p className="text-sm text-gray-400">Bank</p>
                                        <p className="text-2xl font-mono font-bold text-white">{formatMoney(userInfo.bankBalance)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* After State */}
                            {(amount || mode === 'set') && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">After Action</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className={`p-4 rounded-xl border ${
                                            mode === 'set' || (!toBank && mode === 'give') || (toBank && mode === 'take')
                                                ? mode === 'give' ? 'bg-emerald-500/10 border-emerald-500/20' :
                                                  mode === 'take' ? 'bg-red-500/10 border-red-500/20' :
                                                  'bg-amber-500/10 border-amber-500/20'
                                                : 'bg-white/[0.02] border-white/[0.04]'
                                        }`}>
                                            <p className="text-sm text-gray-400">Cash</p>
                                            <p className={`text-2xl font-mono font-bold ${
                                                mode === 'set' ? 'text-amber-400' :
                                                mode === 'give' && !toBank ? 'text-emerald-400' :
                                                mode === 'take' && !toBank ? 'text-red-400' :
                                                'text-white'
                                            }`}>
                                                {mode === 'set' 
                                                    ? formatMoney(parseFloat(balance) || 0)
                                                    : mode === 'give' && !toBank
                                                    ? formatMoney((userInfo.balance || 0) + parseFloat(amount || 0))
                                                    : mode === 'take' && !toBank
                                                    ? formatMoney(Math.max(0, (userInfo.balance || 0) - parseFloat(amount || 0)))
                                                    : formatMoney(userInfo.balance)
                                                }
                                            </p>
                                        </div>
                                        <div className={`p-4 rounded-xl border ${
                                            mode === 'set' || (toBank && mode === 'give') || (toBank && mode === 'take')
                                                ? mode === 'give' ? 'bg-emerald-500/10 border-emerald-500/20' :
                                                  mode === 'take' ? 'bg-red-500/10 border-red-500/20' :
                                                  'bg-amber-500/10 border-amber-500/20'
                                                : 'bg-white/[0.02] border-white/[0.04]'
                                        }`}>
                                            <p className="text-sm text-gray-400">Bank</p>
                                            <p className={`text-2xl font-mono font-bold ${
                                                mode === 'set' ? 'text-amber-400' :
                                                mode === 'give' && toBank ? 'text-emerald-400' :
                                                mode === 'take' && toBank ? 'text-red-400' :
                                                'text-white'
                                            }`}>
                                                {mode === 'set' 
                                                    ? formatMoney(parseFloat(bankBalance) || 0)
                                                    : mode === 'give' && toBank
                                                    ? formatMoney((userInfo.bankBalance || 0) + parseFloat(amount || 0))
                                                    : mode === 'take' && toBank
                                                    ? formatMoney(Math.max(0, (userInfo.bankBalance || 0) - parseFloat(amount || 0)))
                                                    : formatMoney(userInfo.bankBalance)
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Difference Summary */}
                            {amount && mode !== 'set' && (
                                <div className={`p-4 rounded-xl ${mode === 'give' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                                    <div className="flex items-center justify-between">
                                        <span className={mode === 'give' ? 'text-emerald-400' : 'text-red-400'}>
                                            {mode === 'give' ? 'Amount to Give' : 'Amount to Take'}
                                        </span>
                                        <span className={`text-xl font-mono font-bold ${mode === 'give' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {mode === 'give' ? '+' : '-'}{formatMoney(parseFloat(amount || 0))}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-gray-500">Enter a Discord User ID to preview</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
