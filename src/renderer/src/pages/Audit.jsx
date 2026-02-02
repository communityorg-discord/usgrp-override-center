import React, { useState, useEffect } from 'react';

export default function Audit() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [expandedId, setExpandedId] = useState(null);
    
    // Filters
    const [filterUser, setFilterUser] = useState('');
    const [filterSeverity, setFilterSeverity] = useState('all');

    useEffect(() => {
        fetchLogs();
    }, [page]);

    async function fetchLogs() {
        setLoading(true);
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/audit/logs?page=${page}&limit=50`, {
                headers: { 'X-Override-Token': token }
            });
            
            if (response.ok) {
                const data = await response.json();
                setLogs(data.logs);
                setTotalPages(data.totalPages);
            }
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredLogs = logs.filter(log => {
        if (filterUser && !log.user.toLowerCase().includes(filterUser.toLowerCase())) return false;
        if (filterSeverity !== 'all' && log.severity !== filterSeverity) return false;
        return true;
    });

    const getSeverityBadge = (severity) => {
        switch (severity) {
            case 'critical': return <span className="badge badge-danger">CRITICAL</span>;
            case 'warning': return <span className="badge badge-warning">WARNING</span>;
            case 'success': return <span className="badge badge-success">SUCCESS</span>;
            case 'info': default: return <span className="badge badge-info">INFO</span>;
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'bg-red-500';
            case 'warning': return 'bg-amber-500';
            case 'success': return 'bg-emerald-500';
            case 'info': default: return 'bg-blue-500';
        }
    };

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* Header & Filters */}
            <div className="flex flex-col gap-4 bg-surface-secondary p-4 rounded-xl border border-gray-800">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Audit Timeline
                    </h1>
                    <button onClick={fetchLogs} className="icon-btn" title="Refresh">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>

                <div className="flex gap-4">
                    <div className="flex-1">
                        <input 
                            type="text" 
                            placeholder="Filter by User/System..." 
                            className="input w-full"
                            value={filterUser}
                            onChange={(e) => setFilterUser(e.target.value)}
                        />
                    </div>
                    <div className="w-48">
                        <select 
                            className="input w-full"
                            value={filterSeverity}
                            onChange={(e) => setFilterSeverity(e.target.value)}
                        >
                            <option value="all">All Severities</option>
                            <option value="critical">Critical</option>
                            <option value="warning">Warning</option>
                            <option value="info">Info</option>
                            <option value="success">Success</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Timeline View */}
            <div className="flex-1 overflow-auto bg-surface-secondary rounded-xl border border-gray-800 p-6 relative scrollbar-dark">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full spin-slow"></div>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center text-gray-500 py-20">No audit logs found matching criteria.</div>
                ) : (
                    <div className="relative pl-4 space-y-6">
                        {/* Vertical Timeline Line */}
                        <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-gray-800"></div>

                        {filteredLogs.map((log, index) => (
                            <div key={index} className="relative pl-8 group">
                                {/* Timeline Dot */}
                                <div className={`absolute left-[1.35rem] top-1.5 w-3 h-3 rounded-full border-2 border-surface-secondary ${getSeverityColor(log.severity)} z-10`}></div>
                                
                                <div 
                                    className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 hover:bg-gray-800/80 transition-all cursor-pointer"
                                    onClick={() => setExpandedId(expandedId === index ? null : index)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-mono text-gray-500">{log.timestamp || 'Unknown Time'}</span>
                                                {getSeverityBadge(log.severity)}
                                                <span className="text-sm font-semibold text-white">{log.action}</span>
                                            </div>
                                            <div className="text-sm text-gray-300">
                                                <span className="font-medium text-amber-500/80">{log.user}:</span> {log.details}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedId === index && (
                                        <div className="mt-3 pt-3 border-t border-gray-800">
                                            <pre className="text-xs font-mono text-gray-400 whitespace-pre-wrap bg-black/20 p-2 rounded">
                                                {log.original}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center bg-surface-secondary p-3 rounded-xl border border-gray-800">
                <button 
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="btn btn-sm btn-secondary"
                >
                    Previous
                </button>
                <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
                <button 
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="btn btn-sm btn-secondary"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
