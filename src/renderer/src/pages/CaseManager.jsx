import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function CaseManager() {
    const { fetchApi, post, loading, error } = useApi();
    const [cases, setCases] = useState([]);
    const [actionTypes, setActionTypes] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, limit: 100, offset: 0 });
    const [selectedCases, setSelectedCases] = useState(new Set());
    const [selectedCase, setSelectedCase] = useState(null);
    const [caseDetail, setCaseDetail] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [result, setResult] = useState(null);
    
    // Filters
    const [userId, setUserId] = useState('');
    const [moderatorId, setModeratorId] = useState('');
    const [actionType, setActionType] = useState('');
    const [status, setStatus] = useState('');

    useEffect(() => {
        loadCases();
    }, []);

    async function loadCases(offset = 0) {
        try {
            const params = new URLSearchParams();
            if (userId) params.set('userId', userId);
            if (moderatorId) params.set('moderatorId', moderatorId);
            if (actionType) params.set('actionType', actionType);
            if (status) params.set('status', status);
            params.set('limit', '100');
            params.set('offset', offset.toString());
            
            const data = await fetchApi(`/override/moderation/cases?${params.toString()}`);
            if (data) {
                setCases(data.cases || []);
                setActionTypes(data.actionTypes || []);
                setPagination(data.pagination || { total: 0, limit: 100, offset: 0 });
            }
        } catch (err) {
            console.error('Failed to load cases:', err);
        }
    }

    async function loadCaseDetail(caseId) {
        try {
            const data = await fetchApi(`/override/moderation/case/${caseId}`);
            if (data?.case) {
                setCaseDetail(data);
                setSelectedCase(caseId);
            }
        } catch (err) {
            console.error('Failed to load case detail:', err);
        }
    }

    async function bulkAction(action) {
        if (selectedCases.size === 0) {
            alert('No cases selected');
            return;
        }
        
        const reason = action === 'void' ? prompt('Enter void reason:') : null;
        if (action === 'void' && !reason) return;
        
        setActionLoading(true);
        setResult(null);
        try {
            const data = await post('/override/moderation/cases/bulk', {
                caseIds: Array.from(selectedCases),
                action,
                reason
            });
            setResult(data);
            setSelectedCases(new Set());
            await loadCases();
        } catch (err) {
            setResult({ error: err.message });
        } finally {
            setActionLoading(false);
        }
    }

    function toggleCase(caseId) {
        const newSelected = new Set(selectedCases);
        if (newSelected.has(caseId)) {
            newSelected.delete(caseId);
        } else {
            newSelected.add(caseId);
        }
        setSelectedCases(newSelected);
    }

    function toggleAll() {
        if (selectedCases.size === cases.length) {
            setSelectedCases(new Set());
        } else {
            setSelectedCases(new Set(cases.map(c => c.case_id)));
        }
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getActionColor(type) {
        switch (type?.toLowerCase()) {
            case 'ban': return 'bg-red-500/20 text-red-400';
            case 'kick': return 'bg-orange-500/20 text-orange-400';
            case 'mute':
            case 'timeout': return 'bg-yellow-500/20 text-yellow-400';
            case 'warn': return 'bg-amber-500/20 text-amber-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    }

    function getStatusColor(status) {
        switch (status?.toLowerCase()) {
            case 'active': return 'text-emerald-400';
            case 'closed': return 'text-gray-500';
            case 'voided': return 'text-red-400';
            default: return 'text-gray-400';
        }
    }

    const totalPages = Math.ceil(pagination.total / pagination.limit);
    const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="heading-xl text-white flex items-center gap-3">
                        <span className="text-2xl">📋</span>
                        Case Manager
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        View and manage moderation cases
                    </p>
                </div>
                
                {selectedCases.size > 0 && (
                    <div className="flex gap-2">
                        <button 
                            onClick={() => bulkAction('close')}
                            disabled={actionLoading}
                            className="btn btn-secondary"
                        >
                            Close {selectedCases.size} Cases
                        </button>
                        <button 
                            onClick={() => bulkAction('reopen')}
                            disabled={actionLoading}
                            className="btn btn-secondary"
                        >
                            Reopen
                        </button>
                        <button 
                            onClick={() => bulkAction('void')}
                            disabled={actionLoading}
                            className="btn bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        >
                            Void
                        </button>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="card">
                <div className="grid grid-cols-5 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">User ID</label>
                        <input
                            type="text"
                            placeholder="Target user..."
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 text-sm font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Moderator ID</label>
                        <input
                            type="text"
                            placeholder="Moderator..."
                            value={moderatorId}
                            onChange={(e) => setModeratorId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 text-sm font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Action Type</label>
                        <select
                            value={actionType}
                            onChange={(e) => setActionType(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white focus:outline-none focus:border-amber-500/50 text-sm"
                        >
                            <option value="">All Types</option>
                            {actionTypes.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white focus:outline-none focus:border-amber-500/50 text-sm"
                        >
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="closed">Closed</option>
                            <option value="voided">Voided</option>
                        </select>
                    </div>
                    <div className="flex items-end gap-2">
                        <button
                            onClick={() => loadCases(0)}
                            disabled={loading}
                            className="flex-1 btn btn-primary py-2"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                            ) : (
                                'Search'
                            )}
                        </button>
                        <button
                            onClick={() => {
                                setUserId('');
                                setModeratorId('');
                                setActionType('');
                                setStatus('');
                                loadCases(0);
                            }}
                            className="btn btn-secondary py-2 px-3"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {result && (
                <div className={`p-4 rounded-xl ${result.error ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                    {result.error ? (
                        <p className="text-red-400">❌ {result.error}</p>
                    ) : (
                        <p className="text-emerald-400">✅ {result.message}</p>
                    )}
                </div>
            )}

            <div className="grid grid-cols-3 gap-6">
                {/* Cases List */}
                <div className="col-span-2 card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="heading-md text-white">
                            Cases
                            <span className="text-sm font-normal text-gray-500 ml-2">
                                {pagination.total.toLocaleString()} total
                            </span>
                        </h2>
                        
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => loadCases(Math.max(0, pagination.offset - pagination.limit))}
                                    disabled={currentPage === 1 || loading}
                                    className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 disabled:opacity-50 text-sm"
                                >
                                    ← Prev
                                </button>
                                <span className="text-sm text-gray-500">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => loadCases(pagination.offset + pagination.limit)}
                                    disabled={currentPage === totalPages || loading}
                                    className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 disabled:opacity-50 text-sm"
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/[0.06]">
                                    <th className="text-left py-3 px-3 w-8">
                                        <input
                                            type="checkbox"
                                            checked={selectedCases.size === cases.length && cases.length > 0}
                                            onChange={toggleAll}
                                            className="rounded"
                                        />
                                    </th>
                                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Case</th>
                                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">User</th>
                                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Mod</th>
                                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cases.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-gray-500">
                                            {loading ? 'Loading cases...' : 'No cases found'}
                                        </td>
                                    </tr>
                                ) : (
                                    cases.map((c) => (
                                        <tr 
                                            key={c.case_id}
                                            className={`border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer ${
                                                selectedCase === c.case_id ? 'bg-amber-500/5' : ''
                                            }`}
                                            onClick={() => loadCaseDetail(c.case_id)}
                                        >
                                            <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCases.has(c.case_id)}
                                                    onChange={() => toggleCase(c.case_id)}
                                                    className="rounded"
                                                />
                                            </td>
                                            <td className="py-3 px-3 text-sm text-white font-mono">{c.case_id}</td>
                                            <td className="py-3 px-3 text-sm text-gray-400 font-mono">{c.user_id?.slice(0, 8)}...</td>
                                            <td className="py-3 px-3">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(c.action_type)}`}>
                                                    {c.action_type}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-sm text-gray-500">{c.moderator_tag || c.moderator_id?.slice(0, 8)}</td>
                                            <td className={`py-3 px-3 text-sm font-medium ${getStatusColor(c.status)}`}>
                                                {c.status}
                                            </td>
                                            <td className="py-3 px-3 text-sm text-gray-500">{formatDate(c.created_at)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Case Detail */}
                <div className="card">
                    <h2 className="heading-md text-white mb-4">Case Details</h2>
                    
                    {!caseDetail?.case ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-gray-500">Select a case to view details</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-3 rounded-lg bg-white/[0.02]">
                                <p className="text-xs text-gray-500 mb-1">Case ID</p>
                                <p className="text-white font-mono">{caseDetail.case.case_id}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg bg-white/[0.02]">
                                    <p className="text-xs text-gray-500 mb-1">User ID</p>
                                    <p className="text-white font-mono text-sm">{caseDetail.case.user_id}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-white/[0.02]">
                                    <p className="text-xs text-gray-500 mb-1">Action</p>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(caseDetail.case.action_type)}`}>
                                        {caseDetail.case.action_type}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="p-3 rounded-lg bg-white/[0.02]">
                                <p className="text-xs text-gray-500 mb-1">Reason</p>
                                <p className="text-white text-sm">{caseDetail.case.reason || 'No reason provided'}</p>
                            </div>
                            
                            {caseDetail.case.evidence && (
                                <div className="p-3 rounded-lg bg-white/[0.02]">
                                    <p className="text-xs text-gray-500 mb-1">Evidence</p>
                                    <p className="text-white text-sm">{caseDetail.case.evidence}</p>
                                </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg bg-white/[0.02]">
                                    <p className="text-xs text-gray-500 mb-1">Moderator</p>
                                    <p className="text-white text-sm">{caseDetail.case.moderator_tag || caseDetail.case.moderator_id}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-white/[0.02]">
                                    <p className="text-xs text-gray-500 mb-1">Status</p>
                                    <p className={`font-medium ${getStatusColor(caseDetail.case.status)}`}>
                                        {caseDetail.case.status}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="p-3 rounded-lg bg-white/[0.02]">
                                <p className="text-xs text-gray-500 mb-1">Created</p>
                                <p className="text-white text-sm">{formatDate(caseDetail.case.created_at)}</p>
                            </div>
                            
                            {caseDetail.case.status === 'voided' && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <p className="text-xs text-red-400/70 mb-1">Voided</p>
                                    <p className="text-red-400 text-sm">{caseDetail.case.void_reason || 'No reason'}</p>
                                    <p className="text-xs text-red-400/50 mt-1">by {caseDetail.case.voided_by}</p>
                                </div>
                            )}
                            
                            {/* Edit History */}
                            {caseDetail.edits?.length > 0 && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Edit History</p>
                                    <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-dark">
                                        {caseDetail.edits.map((edit, i) => (
                                            <div key={i} className="p-2 rounded-lg bg-white/[0.02] text-xs">
                                                <span className="text-gray-400">{edit.edit_type}</span>
                                                <span className="text-gray-500"> by </span>
                                                <span className="text-white">{edit.edited_by}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
