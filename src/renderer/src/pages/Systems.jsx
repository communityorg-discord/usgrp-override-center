import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function Systems() {
    const { fetchApi, post, loading, error } = useApi();
    const [processes, setProcesses] = useState([]);
    const [actionLoading, setActionLoading] = useState(null);
    const [selectedProcess, setSelectedProcess] = useState(null);
    const [logs, setLogs] = useState('');
    const [logsLoading, setLogsLoading] = useState(false);
    const [filter, setFilter] = useState('all'); // all, online, offline
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadProcesses();
        const interval = setInterval(loadProcesses, 5000);
        return () => clearInterval(interval);
    }, []);

    async function loadProcesses() {
        try {
            const data = await fetchApi('/override/pm2/list');
            if (data?.processes) {
                setProcesses(data.processes);
            }
        } catch (error) {
            console.error('Failed to load processes:', error);
        }
    }

    async function handleAction(name, action) {
        setActionLoading(`${name}-${action}`);
        try {
            await post(`/override/pm2/${action}/${name}`);
            await loadProcesses();
        } catch (error) {
            alert(`Failed to ${action} ${name}: ${error.message}`);
        } finally {
            setActionLoading(null);
        }
    }

    async function handlePanic() {
        const code = prompt('⚠️ EMERGENCY PANIC STOP\n\nThis will immediately stop ALL services.\n\nEnter security code to confirm:');
        if (code !== '470303') {
            if (code !== null) alert('Invalid security code. Panic stop cancelled.');
            return;
        }
        
        setActionLoading('panic');
        try {
            await post('/override/pm2/panic');
            await loadProcesses();
            alert('All services stopped.');
        } catch (error) {
            alert(`Panic stop failed: ${error.message}`);
        } finally {
            setActionLoading(null);
        }
    }

    async function viewLogs(name) {
        setSelectedProcess(name);
        setLogsLoading(true);
        try {
            const data = await fetchApi(`/override/pm2/logs/${name}?lines=200`);
            setLogs(data.logs || 'No logs available');
        } catch (error) {
            setLogs(`Error loading logs: ${error.message}`);
        } finally {
            setLogsLoading(false);
        }
    }

    const filteredProcesses = processes.filter(p => {
        if (filter === 'online' && p.status !== 'online') return false;
        if (filter === 'offline' && p.status === 'online') return false;
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const online = processes.filter(p => p.status === 'online').length;
    const offline = processes.filter(p => p.status !== 'online').length;

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Systems</h1>
                    <p className="text-gray-400 mt-1">
                        <span className="text-emerald-400">{online} online</span>
                        {offline > 0 && <span className="text-red-400 ml-2">{offline} offline</span>}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={loadProcesses} 
                        disabled={loading}
                        className="btn btn-secondary"
                    >
                        {loading ? '...' : '🔄'} Refresh
                    </button>
                    <button 
                        onClick={handlePanic} 
                        disabled={actionLoading === 'panic'}
                        className="btn btn-danger"
                    >
                        {actionLoading === 'panic' ? '...' : '⚠️'} Panic Stop All
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-4">
                <div className="flex bg-gray-800 rounded-lg p-1">
                    {['all', 'online', 'offline'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1 rounded text-sm capitalize transition-colors ${
                                filter === f 
                                    ? 'bg-amber-500 text-white' 
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <input
                    type="text"
                    placeholder="Search services..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input w-64"
                />
                <span className="text-gray-500 text-sm ml-auto">
                    Showing {filteredProcesses.length} of {processes.length}
                </span>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex gap-4 min-h-0">
                {/* Process Table */}
                <div className="flex-1 card p-0 overflow-hidden">
                    <div className="overflow-auto h-full">
                        <table className="w-full">
                            <thead className="bg-gray-800/50 sticky top-0">
                                <tr>
                                    <th className="text-left p-3 text-sm font-medium text-gray-400">Status</th>
                                    <th className="text-left p-3 text-sm font-medium text-gray-400">Name</th>
                                    <th className="text-left p-3 text-sm font-medium text-gray-400">PID</th>
                                    <th className="text-left p-3 text-sm font-medium text-gray-400">CPU</th>
                                    <th className="text-left p-3 text-sm font-medium text-gray-400">Memory</th>
                                    <th className="text-left p-3 text-sm font-medium text-gray-400">Restarts</th>
                                    <th className="text-right p-3 text-sm font-medium text-gray-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {filteredProcesses.map((proc) => (
                                    <tr 
                                        key={proc.id} 
                                        className={`hover:bg-gray-800/30 cursor-pointer ${
                                            selectedProcess === proc.name ? 'bg-amber-500/10' : ''
                                        }`}
                                        onClick={() => viewLogs(proc.name)}
                                    >
                                        <td className="p-3">
                                            <div className={`w-3 h-3 rounded-full ${
                                                proc.status === 'online' ? 'bg-emerald-400' : 'bg-red-400'
                                            }`}></div>
                                        </td>
                                        <td className="p-3">
                                            <span className="font-medium text-white">{proc.name}</span>
                                        </td>
                                        <td className="p-3 text-gray-400 font-mono text-sm">
                                            {proc.pid || '-'}
                                        </td>
                                        <td className="p-3">
                                            <span className={`${proc.cpu > 50 ? 'text-amber-400' : 'text-gray-400'}`}>
                                                {proc.cpu}%
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <span className={`${proc.memoryMB > 200 ? 'text-amber-400' : 'text-gray-400'}`}>
                                                {proc.memoryMB} MB
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <span className={`${proc.restarts > 5 ? 'text-red-400' : 'text-gray-400'}`}>
                                                {proc.restarts}
                                            </span>
                                        </td>
                                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end gap-1">
                                                {proc.status === 'online' ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleAction(proc.name, 'restart')}
                                                            disabled={actionLoading === `${proc.name}-restart`}
                                                            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 disabled:opacity-50"
                                                        >
                                                            {actionLoading === `${proc.name}-restart` ? '...' : '🔄'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleAction(proc.name, 'stop')}
                                                            disabled={actionLoading === `${proc.name}-stop`}
                                                            className="px-2 py-1 bg-red-600/50 hover:bg-red-600 rounded text-xs text-white disabled:opacity-50"
                                                        >
                                                            {actionLoading === `${proc.name}-stop` ? '...' : '⏹️'}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAction(proc.name, 'start')}
                                                        disabled={actionLoading === `${proc.name}-start`}
                                                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-xs text-white disabled:opacity-50"
                                                    >
                                                        {actionLoading === `${proc.name}-start` ? '...' : '▶️'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {filteredProcesses.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                {processes.length === 0 ? 'Loading...' : 'No services match your filter'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Logs Panel */}
                {selectedProcess && (
                    <div className="w-96 card flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-white">
                                📋 {selectedProcess} Logs
                            </h3>
                            <button 
                                onClick={() => setSelectedProcess(null)}
                                className="p-1 hover:bg-gray-700 rounded"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 terminal overflow-auto text-xs">
                            {logsLoading ? (
                                <div className="text-gray-500">Loading logs...</div>
                            ) : (
                                <pre className="whitespace-pre-wrap text-gray-300">{logs}</pre>
                            )}
                        </div>
                        <button 
                            onClick={() => viewLogs(selectedProcess)}
                            className="mt-2 btn btn-secondary text-sm"
                        >
                            🔄 Refresh Logs
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
