import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';

export default function QuickModeration() {
    const { fetchApi, post } = useApi();
    const [userId, setUserId] = useState('');
    const [userInfo, setUserInfo] = useState(null);
    const [action, setAction] = useState('warn');
    const [reason, setReason] = useState('');
    const [duration, setDuration] = useState('1h');
    const [evidence, setEvidence] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const reasonTemplates = [
        { label: 'Rule Violation', value: 'Violation of server rules' },
        { label: 'Spam', value: 'Spamming in channels' },
        { label: 'Harassment', value: 'Harassing other members' },
        { label: 'NSFW Content', value: 'Posting inappropriate/NSFW content' },
        { label: 'Advertising', value: 'Unauthorized advertising' },
        { label: 'Trolling', value: 'Trolling and disruptive behavior' },
        { label: 'Impersonation', value: 'Impersonating staff or other users' },
        { label: 'Scam/Fraud', value: 'Attempting to scam or defraud members' },
        { label: 'Threats', value: 'Making threats against members' },
        { label: 'Custom', value: '' }
    ];

    const durationOptions = [
        { label: '5 minutes', value: '5m' },
        { label: '30 minutes', value: '30m' },
        { label: '1 hour', value: '1h' },
        { label: '6 hours', value: '6h' },
        { label: '1 day', value: '1d' },
        { label: '3 days', value: '3d' },
        { label: '1 week', value: '7d' },
        { label: '2 weeks', value: '14d' },
        { label: '1 month', value: '30d' }
    ];

    async function lookupUser() {
        if (!userId || userId.length < 17) return;
        
        try {
            const data = await fetchApi(`/override/discord/user/${userId}`);
            if (data?.user) {
                setUserInfo(data.user);
            } else {
                setUserInfo(null);
            }
        } catch (err) {
            setUserInfo(null);
        }
    }

    async function executeAction() {
        if (!userId || !reason) {
            setResult({ error: 'User ID and reason are required' });
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const response = await post('/override/moderation/action', {
                userId,
                action,
                reason,
                duration: ['mute', 'timeout'].includes(action) ? duration : undefined,
                evidence: evidence || undefined
            });
            
            setResult(response);
            
            // Clear form on success
            if (response.success) {
                setUserId('');
                setUserInfo(null);
                setReason('');
                setEvidence('');
            }
        } catch (err) {
            setResult({ error: err.message });
        } finally {
            setLoading(false);
        }
    }

    const actions = [
        { id: 'warn', label: 'Warn', icon: '⚠️', color: 'amber', desc: 'Issue a warning' },
        { id: 'mute', label: 'Mute', icon: '🔇', color: 'yellow', desc: 'Timeout the user' },
        { id: 'kick', label: 'Kick', icon: '👢', color: 'orange', desc: 'Kick from server' },
        { id: 'ban', label: 'Ban', icon: '🔨', color: 'red', desc: 'Permanently ban' }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="heading-xl text-white flex items-center gap-3">
                    <span className="text-2xl">⚡</span>
                    Quick Moderation
                </h1>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Execute moderation actions quickly
                </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Action Form */}
                <div className="space-y-4">
                    {/* User Lookup */}
                    <div className="card">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Target User
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Discord User ID..."
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                onBlur={lookupUser}
                                onKeyDown={(e) => e.key === 'Enter' && lookupUser()}
                                className="flex-1 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 font-mono"
                            />
                            <button
                                onClick={lookupUser}
                                className="btn btn-secondary"
                            >
                                Lookup
                            </button>
                        </div>
                        
                        {userInfo && (
                            <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                                {userInfo.avatar && (
                                    <img 
                                        src={`https://cdn.discordapp.com/avatars/${userId}/${userInfo.avatar}.png?size=64`}
                                        alt=""
                                        className="w-10 h-10 rounded-full"
                                    />
                                )}
                                <div>
                                    <p className="text-emerald-400 font-medium">{userInfo.nick || userInfo.username}</p>
                                    <p className="text-sm text-emerald-400/70">@{userInfo.username}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Selector */}
                    <div className="card">
                        <label className="block text-sm font-medium text-gray-400 mb-3">
                            Action
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {actions.map((a) => (
                                <button
                                    key={a.id}
                                    onClick={() => setAction(a.id)}
                                    className={`p-4 rounded-xl text-center transition-all duration-150 border ${
                                        action === a.id
                                            ? a.color === 'amber' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' :
                                              a.color === 'yellow' ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' :
                                              a.color === 'orange' ? 'bg-orange-500/20 border-orange-500/40 text-orange-400' :
                                              'bg-red-500/20 border-red-500/40 text-red-400'
                                            : 'bg-white/[0.02] border-white/[0.04] text-gray-400 hover:bg-white/[0.04]'
                                    }`}
                                >
                                    <span className="text-2xl block mb-1">{a.icon}</span>
                                    <span className="text-sm font-medium">{a.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Duration (for mute/timeout) */}
                    {['mute', 'timeout'].includes(action) && (
                        <div className="card">
                            <label className="block text-sm font-medium text-gray-400 mb-3">
                                Duration
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {durationOptions.map((d) => (
                                    <button
                                        key={d.value}
                                        onClick={() => setDuration(d.value)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            duration === d.value
                                                ? 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-400'
                                                : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white'
                                        }`}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reason */}
                    <div className="card">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Reason
                        </label>
                        
                        {/* Quick Templates */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {reasonTemplates.slice(0, 6).map((t) => (
                                <button
                                    key={t.label}
                                    onClick={() => setReason(t.value)}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        reason === t.value
                                            ? 'bg-amber-500/20 text-amber-400'
                                            : 'bg-white/[0.04] text-gray-500 hover:bg-white/[0.08] hover:text-white'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        
                        <textarea
                            placeholder="Enter reason for action..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 resize-none"
                        />
                    </div>

                    {/* Evidence (optional) */}
                    <div className="card">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Evidence (optional)
                        </label>
                        <input
                            type="text"
                            placeholder="Link to evidence or additional notes..."
                            value={evidence}
                            onChange={(e) => setEvidence(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                        />
                    </div>

                    {/* Execute Button */}
                    <button
                        onClick={executeAction}
                        disabled={loading || !userId || !reason}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                            action === 'warn' ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white' :
                            action === 'mute' ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black' :
                            action === 'kick' ? 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white' :
                            'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white'
                        }`}
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Processing...
                            </div>
                        ) : (
                            `${actions.find(a => a.id === action)?.icon} ${actions.find(a => a.id === action)?.label} User`
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
                                    {result.caseId && (
                                        <p className="text-sm text-emerald-400/70 font-mono mt-1">
                                            Case: {result.caseId}
                                        </p>
                                    )}
                                    {result.discordResult && (
                                        <p className="text-sm text-emerald-400/70 mt-1">
                                            {result.discordResult}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Preview Panel */}
                <div className="card">
                    <h2 className="heading-md text-white mb-4">Action Preview</h2>
                    
                    <div className="space-y-6">
                        {/* Summary Card */}
                        <div className={`p-6 rounded-xl border-2 ${
                            action === 'warn' ? 'bg-amber-500/5 border-amber-500/30' :
                            action === 'mute' ? 'bg-yellow-500/5 border-yellow-500/30' :
                            action === 'kick' ? 'bg-orange-500/5 border-orange-500/30' :
                            'bg-red-500/5 border-red-500/30'
                        }`}>
                            <div className="text-center">
                                <span className="text-5xl block mb-3">
                                    {actions.find(a => a.id === action)?.icon}
                                </span>
                                <h3 className={`text-2xl font-bold mb-1 ${
                                    action === 'warn' ? 'text-amber-400' :
                                    action === 'mute' ? 'text-yellow-400' :
                                    action === 'kick' ? 'text-orange-400' :
                                    'text-red-400'
                                }`}>
                                    {actions.find(a => a.id === action)?.label}
                                </h3>
                                <p className="text-gray-400">
                                    {actions.find(a => a.id === action)?.desc}
                                </p>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-3">
                            <div className="p-3 rounded-lg bg-white/[0.02]">
                                <p className="text-xs text-gray-500 mb-1">Target User</p>
                                <p className="text-white font-mono">
                                    {userInfo ? (userInfo.nick || userInfo.username) : (userId || 'Not specified')}
                                </p>
                            </div>
                            
                            {['mute', 'timeout'].includes(action) && (
                                <div className="p-3 rounded-lg bg-white/[0.02]">
                                    <p className="text-xs text-gray-500 mb-1">Duration</p>
                                    <p className="text-white">
                                        {durationOptions.find(d => d.value === duration)?.label || duration}
                                    </p>
                                </div>
                            )}
                            
                            <div className="p-3 rounded-lg bg-white/[0.02]">
                                <p className="text-xs text-gray-500 mb-1">Reason</p>
                                <p className="text-white text-sm">
                                    {reason || 'Not specified'}
                                </p>
                            </div>
                            
                            {evidence && (
                                <div className="p-3 rounded-lg bg-white/[0.02]">
                                    <p className="text-xs text-gray-500 mb-1">Evidence</p>
                                    <p className="text-white text-sm truncate">{evidence}</p>
                                </div>
                            )}
                        </div>

                        {/* Warnings */}
                        {action === 'ban' && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div>
                                        <p className="text-red-400 font-medium">Permanent Action</p>
                                        <p className="text-red-400/70 text-sm">
                                            This will permanently ban the user from the server. This action cannot be easily undone.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
