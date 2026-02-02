import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { FaSearch } from 'react-icons/fa';

export default function LogAggregator() {
    const { fetchApi } = useApi();
    const [query, setQuery] = useState('');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sources, setSources] = useState({
        pm2: true,
        nginx: true,
        syslog: true,
        app: true
    });
    const [stats, setStats] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            const res = await fetchApi(`/override/logs/search?q=${encodeURIComponent(query)}&lines=200`);
            
            if (res.success) {
                setLogs(res.results);
                setStats({ count: res.count });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        if (log.source.startsWith('pm2') && !sources.pm2) return false;
        if (log.source.startsWith('nginx') && !sources.nginx) return false;
        if (log.source === 'syslog' && !sources.syslog) return false;
        if (!log.source.startsWith('pm2') && !log.source.startsWith('nginx') && log.source !== 'syslog' && !sources.app) return false;
        return true;
    });

    return (
        <div className="h-full flex flex-col bg-[#0a0a0f] text-gray-200 overflow-hidden">
            <div className="p-6 pb-2">
                <h1 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white">
                    <span className="text-blue-500">🔍</span> Log Aggregator
                </h1>

                {/* Search & Filters */}
                <div className="bg-[#13131f] p-4 rounded-lg mb-4 border border-gray-800">
                    <form onSubmit={handleSearch} className="flex gap-4 mb-4">
                        <input 
                            type="text" 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search logs (e.g. 'error', 'user:123')..." 
                            className="flex-1 bg-black/30 border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
                        />
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded font-medium disabled:opacity-50 text-white transition-colors"
                        >
                            {loading ? 'Searching...' : 'Search'}
                        </button>
                    </form>

                    <div className="flex flex-wrap gap-4 text-sm">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={sources.pm2} onChange={e => setSources({...sources, pm2: e.target.checked})} className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0" />
                            <span className="text-green-400">PM2</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={sources.nginx} onChange={e => setSources({...sources, nginx: e.target.checked})} className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0" />
                            <span className="text-yellow-400">Nginx</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={sources.syslog} onChange={e => setSources({...sources, syslog: e.target.checked})} className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0" />
                            <span className="text-purple-400">Syslog</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={sources.app} onChange={e => setSources({...sources, app: e.target.checked})} className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0" />
                            <span className="text-cyan-400">App Logs</span>
                        </label>
                        
                        {stats && (
                            <span className="ml-auto text-gray-500">
                                Found {stats.count} matches (showing {filteredLogs.length})
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="flex-1 px-6 pb-6 min-h-0">
                <div className="h-full bg-black/40 rounded-lg border border-gray-800 overflow-auto font-mono text-xs shadow-inner">
                    {filteredLogs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500">
                            {loading ? (
                                <>
                                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <p>Scanning log files...</p>
                                </>
                            ) : (
                                <p>No results found</p>
                            )}
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#1a1a24] text-gray-400 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 border-b border-gray-800 w-48 font-semibold">Source</th>
                                    <th className="p-3 border-b border-gray-800 w-40 font-semibold">Timestamp</th>
                                    <th className="p-3 border-b border-gray-800 font-semibold">Message</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map((log, i) => (
                                    <tr key={i} className="hover:bg-white/5 border-b border-gray-800/50 transition-colors group">
                                        <td className="p-3 text-gray-400 truncate max-w-[200px]" title={log.fullPath}>
                                            <span className="text-blue-400 font-medium">{log.source}</span>
                                            <span className="text-gray-600 ml-1">:{log.line}</span>
                                        </td>
                                        <td className="p-3 text-gray-500 whitespace-nowrap">
                                            {log.timestamp || '-'}
                                        </td>
                                        <td className="p-3 text-gray-300 break-all leading-relaxed group-hover:text-white">
                                            {log.content}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
