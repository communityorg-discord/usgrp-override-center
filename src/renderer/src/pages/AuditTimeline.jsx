import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function AuditTimeline() {
    const { fetchApi } = useApi();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('All');
    const [source, setSource] = useState('all'); // 'all', 'system', 'moderation'

    useEffect(() => {
        loadLogs();
    }, [source]);

    async function loadLogs() {
        setLoading(true);
        try {
            const allLogs = [];
            
            // Fetch system audit logs
            if (source === 'all' || source === 'system') {
                const systemData = await fetchApi('/override/audit/logs?limit=100');
                if (systemData?.logs) {
                    allLogs.push(...systemData.logs.map(l => ({ ...l, source: 'system' })));
                }
            }
            
            // Fetch moderation audit logs
            if (source === 'all' || source === 'moderation') {
                const modData = await fetchApi('/override/audit/moderation?limit=100');
                if (modData?.logs) {
                    allLogs.push(...modData.logs.map(l => ({ ...l, source: 'moderation' })));
                }
            }
            
            // Sort by timestamp (newest first)
            allLogs.sort((a, b) => {
                const dateA = new Date(a.timestamp || 0);
                const dateB = new Date(b.timestamp || 0);
                return dateB - dateA;
            });
            
            setLogs(allLogs);
        } catch (error) {
            console.error('Failed to load audit logs:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredLogs = filter === 'All' 
        ? logs 
        : logs.filter(l => l.action?.includes(filter) || l.severity === filter.toLowerCase());

    function getIcon(action, severity) {
        const act = action || '';
        
        if (severity === 'critical' || severity === 'danger' || ['BAN', 'KICK'].includes(act)) 
            return <span className="bg-red-500/20 text-red-500 p-2 rounded-full"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></span>;
        
        if (act.includes('MUTE') || act.includes('WARN'))
            return <span className="bg-yellow-500/20 text-yellow-500 p-2 rounded-full"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span>;
        
        if (act.includes('Deploy'))
            return <span className="bg-blue-500/20 text-blue-500 p-2 rounded-full"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></span>;
            
        if (act.includes('System') || act.includes('MASS_'))
            return <span className="bg-purple-500/20 text-purple-500 p-2 rounded-full"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></span>;

        return <span className="bg-gray-500/20 text-gray-500 p-2 rounded-full"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span>;
    }

    return (
        <div className="space-y-6 animate-fade-in h-full flex flex-col">
            <div className="flex justify-between items-center flex-shrink-0">
                <div>
                    <h1 className="heading-xl text-gold-gradient">Audit Timeline</h1>
                    <p className="text-gray-400">Chronological view of system events and actions ({logs.length} entries)</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => loadLogs()} 
                        className="btn btn-secondary"
                        disabled={loading}
                    >
                        Refresh
                    </button>
                    <select 
                        value={filter} 
                        onChange={e => setFilter(e.target.value)}
                        className="select w-40"
                    >
                        <option value="All">All Events</option>
                        <option value="Deploy">Deployments</option>
                        <option value="System">System</option>
                        <option value="Critical">Critical</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 relative">
                {loading && logs.length === 0 ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full spin-slow"></div>
                    </div>
                ) : (
                    <div className="relative border-l-2 border-white/10 ml-6 space-y-8 py-4">
                        {filteredLogs.map((log, index) => (
                            <div key={index} className="relative pl-8 group">
                                <div className="absolute -left-[21px] top-1 bg-surface-primary p-1 rounded-full border border-white/10 group-hover:border-gold/50 transition-colors">
                                    {getIcon(log.action, log.severity)}
                                </div>
                                
                                <div className="card hover:bg-white/[0.02] transition-colors p-4">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`font-semibold text-sm px-2 py-0.5 rounded ${
                                            log.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                                            log.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-blue-500/10 text-blue-400'
                                        }`}>
                                            {log.action}
                                        </span>
                                        <span className="text-xs text-gray-500 font-mono">
                                            {log.timestamp}
                                        </span>
                                    </div>
                                    <p className="text-gray-300 mt-2 leading-relaxed">{log.details}</p>
                                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        {log.user}
                                    </p>
                                </div>
                            </div>
                        ))}
                        
                        {filteredLogs.length === 0 && (
                            <div className="text-center text-gray-500 py-10 pl-4">
                                No logs found matching current filter.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
