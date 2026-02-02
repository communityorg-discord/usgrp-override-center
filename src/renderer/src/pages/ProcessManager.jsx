import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function ProcessManager() {
    const { fetchApi, post, loading: apiLoading } = useApi();
    const [processes, setProcesses] = useState([]);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('cpu');
    const [sortOrder, setSortOrder] = useState('desc');
    const [refreshing, setRefreshing] = useState(false);
    const [killModal, setKillModal] = useState(null); // { pid, command }

    const fetchProcesses = async (isAuto = false) => {
        if (!isAuto) setRefreshing(true);
        try {
            const data = await fetchApi('/override/system/processes');
            if (data.success) {
                setProcesses(data.processes);
            }
        } catch (error) {
            console.error('Failed to fetch processes:', error);
        } finally {
            if (!isAuto) setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchProcesses();
        const interval = setInterval(() => fetchProcesses(true), 5000);
        return () => clearInterval(interval);
    }, []);

    const handleSort = (key) => {
        if (sortBy === key) {
            setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
        } else {
            setSortBy(key);
            setSortOrder('desc');
        }
    };

    const handleKill = async () => {
        if (!killModal) return;
        try {
            await post(`/override/system/kill/${killModal.pid}`);
            setKillModal(null);
            fetchProcesses();
        } catch (error) {
            alert(`Failed to kill process: ${error.message}`);
        }
    };

    const filteredProcesses = processes
        .filter(p => 
            p.command.toLowerCase().includes(search.toLowerCase()) || 
            p.user.toLowerCase().includes(search.toLowerCase()) ||
            p.pid.toString().includes(search)
        )
        .sort((a, b) => {
            const valA = a[sortBy];
            const valB = b[sortBy];
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Process Manager</h1>
                    <p className="text-gray-400 text-sm">Monitor and manage system processes (Top 50 by CPU)</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search processes..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-surface-secondary border border-gray-700 rounded-md px-4 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 w-64"
                        />
                        <svg className="w-4 h-4 text-gray-500 absolute right-3 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <button 
                        onClick={() => fetchProcesses()}
                        className={`p-2 rounded-md bg-surface-secondary border border-gray-700 hover:bg-gray-700 text-gray-300 transition-colors ${refreshing ? 'animate-spin' : ''}`}
                        title="Refresh"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-surface-secondary border border-gray-800 rounded-lg overflow-hidden shadow-lg">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-gray-900/50 text-gray-400 border-b border-gray-800">
                            <th className="px-4 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('pid')}>PID</th>
                            <th className="px-4 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('user')}>User</th>
                            <th className="px-4 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('cpu')}>CPU %</th>
                            <th className="px-4 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('mem')}>Mem %</th>
                            <th className="px-4 py-3 font-medium">Time</th>
                            <th className="px-4 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('command')}>Command</th>
                            <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {apiLoading && processes.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                                    Loading processes...
                                </td>
                            </tr>
                        ) : filteredProcesses.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                                    No processes found matching "{search}"
                                </td>
                            </tr>
                        ) : (
                            filteredProcesses.map(p => (
                                <tr 
                                    key={p.pid} 
                                    className={`hover:bg-gray-800/50 transition-colors ${p.cpu > 50 ? 'bg-red-900/20' : ''}`}
                                >
                                    <td className="px-4 py-2 font-mono text-gray-300">{p.pid}</td>
                                    <td className="px-4 py-2 text-gray-300">{p.user}</td>
                                    <td className={`px-4 py-2 font-bold ${p.cpu > 50 ? 'text-red-400' : p.cpu > 20 ? 'text-amber-400' : 'text-green-400'}`}>
                                        {p.cpu}%
                                    </td>
                                    <td className="px-4 py-2 text-gray-300">{p.mem}%</td>
                                    <td className="px-4 py-2 text-gray-400">{p.time}</td>
                                    <td className="px-4 py-2 text-gray-300 font-mono truncate max-w-xs" title={p.command}>
                                        {p.command}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <button
                                            onClick={() => setKillModal(p)}
                                            className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                                            title="Kill Process"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Kill Confirmation Modal */}
            {killModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-surface-secondary border border-gray-700 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 mb-4 text-red-500">
                            <div className="p-2 bg-red-500/10 rounded-full">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold">Kill Process?</h3>
                        </div>
                        
                        <p className="text-gray-300 mb-2">Are you sure you want to kill this process?</p>
                        <div className="bg-black/30 p-3 rounded border border-gray-800 font-mono text-sm text-gray-400 mb-6 break-all">
                            <span className="text-amber-500">PID:</span> {killModal.pid}<br/>
                            <span className="text-amber-500">Command:</span> {killModal.command}
                        </div>
                        
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setKillModal(null)}
                                className="px-4 py-2 rounded text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleKill}
                                className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white font-medium shadow-lg shadow-red-900/20"
                            >
                                Kill Process
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
