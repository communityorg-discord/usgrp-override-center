import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function TransactionLog() {
    const { fetchApi, loading, error } = useApi();
    const [transactions, setTransactions] = useState([]);
    const [types, setTypes] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, limit: 100, offset: 0 });
    
    // Filters
    const [userId, setUserId] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        loadTransactions();
    }, []);

    async function loadTransactions(offset = 0) {
        try {
            const params = new URLSearchParams();
            if (userId) params.set('userId', userId);
            if (selectedType) params.set('type', selectedType);
            if (startDate) params.set('startDate', startDate);
            if (endDate) params.set('endDate', endDate);
            params.set('limit', '100');
            params.set('offset', offset.toString());
            
            const data = await fetchApi(`/override/economy/transactions?${params.toString()}`);
            if (data) {
                setTransactions(data.transactions || []);
                setTypes(data.types || []);
                setPagination(data.pagination || { total: 0, limit: 100, offset: 0 });
            }
        } catch (err) {
            console.error('Failed to load transactions:', err);
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
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function exportToCSV() {
        const headers = ['Date', 'Transaction ID', 'User ID', 'Type', 'Amount', 'Balance After', 'Description'];
        const rows = transactions.map(tx => [
            tx.created_at,
            tx.transaction_id,
            tx.user_id,
            tx.type,
            tx.amount,
            tx.balance_after,
            `"${(tx.description || '').replace(/"/g, '""')}"`
        ]);
        
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
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
                        Transaction Log
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        View and search all economy transactions
                    </p>
                </div>
                <button 
                    onClick={exportToCSV}
                    disabled={transactions.length === 0}
                    className="btn btn-secondary flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="grid grid-cols-5 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">User ID</label>
                        <input
                            type="text"
                            placeholder="Discord ID..."
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 text-sm font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Type</label>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white focus:outline-none focus:border-amber-500/50 text-sm"
                        >
                            <option value="">All Types</option>
                            {types.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white focus:outline-none focus:border-amber-500/50 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white focus:outline-none focus:border-amber-500/50 text-sm"
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <button
                            onClick={() => loadTransactions(0)}
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
                                setSelectedType('');
                                setStartDate('');
                                setEndDate('');
                                loadTransactions(0);
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

            {/* Transaction Table */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="heading-md text-white">
                        Transactions
                        <span className="text-sm font-normal text-gray-500 ml-2">
                            {pagination.total.toLocaleString()} total
                        </span>
                    </h2>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => loadTransactions(Math.max(0, pagination.offset - pagination.limit))}
                                disabled={currentPage === 1 || loading}
                                className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                ← Prev
                            </button>
                            <span className="text-sm text-gray-500">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => loadTransactions(pagination.offset + pagination.limit)}
                                disabled={currentPage === totalPages || loading}
                                className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Balance After</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-gray-500">
                                        {loading ? 'Loading transactions...' : 'No transactions found'}
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((tx, i) => (
                                    <tr key={tx.transaction_id || i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                                        <td className="py-3 px-4 text-sm text-gray-400 whitespace-nowrap">
                                            {formatDate(tx.created_at)}
                                        </td>
                                        <td className="py-3 px-4 text-xs text-gray-500 font-mono">
                                            {tx.transaction_id?.slice(0, 16) || 'N/A'}...
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-400 font-mono">
                                            {tx.user_id}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                tx.type?.includes('override') ? 'bg-amber-500/20 text-amber-400' :
                                                tx.type === 'payroll' ? 'bg-blue-500/20 text-blue-400' :
                                                tx.type === 'transfer' ? 'bg-purple-500/20 text-purple-400' :
                                                tx.type?.includes('deposit') || tx.type?.includes('withdraw') ? 'bg-cyan-500/20 text-cyan-400' :
                                                'bg-gray-500/20 text-gray-400'
                                            }`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className={`py-3 px-4 text-sm font-mono text-right ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {tx.amount >= 0 ? '+' : ''}{formatMoney(tx.amount)}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-400 font-mono text-right">
                                            {formatMoney(tx.balance_after)}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-500 max-w-xs truncate" title={tx.description}>
                                            {tx.description || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
