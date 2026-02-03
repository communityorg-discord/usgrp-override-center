import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const DEFAULT_DOMAINS = [
    'usgrp.xyz',
    'auth.usgrp.xyz',
    'api.usgrp.xyz',
    'citizens.usgrp.xyz',
    'admin.usgrp.xyz',
    'logs.usgrp.xyz'
];

export default function SSLMonitor() {
    const { fetchApi } = useApi();
    const [domains, setDomains] = useState([]);
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState({});
    const [newDomain, setNewDomain] = useState('');

    useEffect(() => {
        loadDomains();
    }, []);

    async function loadDomains() {
        const stored = await window.electron.store.get('ssl_domains');
        const list = stored || DEFAULT_DOMAINS;
        setDomains(list);
        list.forEach(checkDomain);
    }

    async function addDomain(e) {
        e.preventDefault();
        if (!newDomain || domains.includes(newDomain)) return;
        
        const updated = [...domains, newDomain];
        setDomains(updated);
        await window.electron.store.set('ssl_domains', updated);
        checkDomain(newDomain);
        setNewDomain('');
    }

    async function removeDomain(domain) {
        if (!confirm(`Stop monitoring ${domain}?`)) return;
        const updated = domains.filter(d => d !== domain);
        setDomains(updated);
        await window.electron.store.set('ssl_domains', updated);
    }

    async function checkDomain(domain) {
        setLoading(prev => ({ ...prev, [domain]: true }));
        try {
            const data = await fetchApi(`/override/ssl/check?domain=${domain}`);
            setResults(prev => ({ ...prev, [domain]: data }));
        } catch (error) {
            setResults(prev => ({ 
                ...prev, 
                [domain]: { success: false, error: error.message } 
            }));
        } finally {
            setLoading(prev => ({ ...prev, [domain]: false }));
        }
    }

    function getStatusColor(days) {
        if (!days && days !== 0) return 'text-gray-500';
        if (days > 30) return 'text-emerald-400';
        if (days > 7) return 'text-yellow-400';
        return 'text-red-500';
    }

    function getStatusBadge(days) {
        if (!days && days !== 0) return <span className="badge badge-neutral">Unknown</span>;
        if (days > 30) return <span className="badge badge-success">Healthy</span>;
        if (days > 7) return <span className="badge badge-warning">Expiring Soon</span>;
        return <span className="badge badge-danger">Critical</span>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="heading-xl text-gold-gradient">SSL Monitor</h1>
                    <p className="text-gray-400">Track SSL certificate expiration and validity</p>
                </div>
                <form onSubmit={addDomain} className="flex gap-2">
                    <input 
                        type="text" 
                        value={newDomain}
                        onChange={e => setNewDomain(e.target.value)}
                        placeholder="Add domain (e.g. google.com)"
                        className="input w-64"
                    />
                    <button type="submit" className="btn btn-secondary">Add</button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {domains.map(domain => {
                    const result = results[domain];
                    const isLoading = loading[domain];
                    
                    return (
                        <div key={domain} className="card relative group overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg">{domain}</h3>
                                    {result?.issuer && (
                                        <p className="text-xs text-gray-500 truncate w-48">{result.issuer}</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => checkDomain(domain)}
                                        className={`btn-icon hover:text-white ${isLoading ? 'animate-spin' : ''}`}
                                        title="Refresh"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    </button>
                                    <button 
                                        onClick={() => removeDomain(domain)}
                                        className="btn-icon hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Remove"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="h-24 flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full spin-slow"></div>
                                </div>
                            ) : result ? (
                                result.success !== false ? (
                                    <div>
                                        <div className="flex items-end gap-2 mb-2">
                                            <span className={`text-4xl font-bold tracking-tighter ${getStatusColor(result.daysRemaining)}`}>
                                                {result.daysRemaining}
                                            </span>
                                            <span className="text-sm text-gray-500 mb-1.5">days remaining</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                                            {getStatusBadge(result.daysRemaining)}
                                            <span className="text-xs text-gray-500 font-mono">
                                                Expires: {new Date(result.validTo).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-24 flex flex-col items-center justify-center text-center text-red-400">
                                        <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <span className="text-sm">Check Failed</span>
                                        <span className="text-xs opacity-70 mt-1">{result.error}</span>
                                    </div>
                                )
                            ) : (
                                <div className="h-24 flex items-center justify-center text-gray-600">
                                    Waiting for check...
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
