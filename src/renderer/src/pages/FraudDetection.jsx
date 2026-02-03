import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function FraudDetection() {
    const { fetchApi, post, loading, error } = useApi();
    const [alerts, setAlerts] = useState([]);
    const [stats, setStats] = useState({ transactions: 0, newAlerts: 0 });
    const [scanning, setScanning] = useState(false);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        loadAlerts();
    }, []);

    async function loadAlerts() {
        try {
            // Since we implemented IPC handlers in preload, we use window.electron.fraud
            const data = await window.electron.fraud.getAlerts();
            setAlerts(data || []);
        } catch (err) {
            console.error('Failed to load alerts:', err);
        }
    }

    async function handleScan() {
        setScanning(true);
        try {
            const result = await window.electron.fraud.scan();
            setStats({ 
                transactions: result.scannedTransactions, 
                newAlerts: result.newAlerts 
            });
            loadAlerts();
        } catch (err) {
            console.error('Scan failed:', err);
        } finally {
            setScanning(false);
        }
    }

    async function updateStatus(id, status) {
        try {
            await window.electron.fraud.updateAlert(id, { status });
            loadAlerts();
        } catch (err) {
            console.error('Update failed:', err);
        }
    }

    const filteredAlerts = alerts.filter(a => {
        if (filter === 'all') return a.status !== 'dismissed';
        return a.status === filter;
    });

    const getSeverityColor = (severity) => {
        switch (severity.toLowerCase()) {
            case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
            case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="heading-xl text-white flex items-center gap-3">
                        <span className="text-2xl">🛡️</span>
                        Fraud Detection
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Monitor and investigate suspicious financial activity
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {stats.transactions > 0 && (
                        <div className="text-right mr-4">
                            <p className="text-xs text-gray-500">Last Scan Result</p>
                            <p className="text-sm text-emerald-400 font-medium">
                                {stats.transactions} tx / {stats.newAlerts} flagged
                            </p>
                        </div>
                    )}
                    <button 
                        onClick={handleScan}
                        disabled={scanning}
                        className={`btn btn-primary flex items-center gap-2 ${scanning ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {scanning ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        )}
                        {scanning ? 'Scanning...' : 'Run Security Scan'}
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-4">
                <div className="card p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Critical Alerts</p>
                    <p className="text-3xl font-bold text-red-500">{alerts.filter(a => a.severity === 'Critical' && a.status === 'new').length}</p>
                </div>
                <div className="card p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Active Cases</p>
                    <p className="text-3xl font-bold text-white">{alerts.filter(a => a.status === 'new').length}</p>
                </div>
                <div className="card p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Scanned (24h)</p>
                    <p className="text-3xl font-bold text-emerald-500">1.2k</p>
                </div>
                <div className="card p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">False Positives</p>
                    <p className="text-3xl font-bold text-gray-400">12%</p>
                </div>
            </div>

            {/* Filters & Alerts List */}
            <div className="card overflow-hidden">
                <div className="p-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
                    <h2 className="heading-md text-white">Security Incidents</h2>
                    <div className="flex bg-black/20 p-1 rounded-lg">
                        {['all', 'new', 'investigating'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                                    filter === f ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="divide-y divide-white/[0.06]">
                    {filteredAlerts.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="text-4xl mb-4">✅</div>
                            <h3 className="text-white font-medium">No suspicious activity found</h3>
                            <p className="text-sm text-gray-500 mt-1">Run a scan to check recent transactions</p>
                        </div>
                    ) : (
                        filteredAlerts.map(alert => (
                            <div key={alert.id} className="p-5 hover:bg-white/[0.02] transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4">
                                        <div className={`mt-1 p-2 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-white font-semibold">{alert.type}</h3>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getSeverityColor(alert.severity)}`}>
                                                    {alert.severity}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(alert.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-400 mt-1">{alert.description}</p>
                                            
                                            {/* Related Entities */}
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {alert.relatedUsers?.map(uid => (
                                                    <span key={uid} className="px-2 py-1 rounded bg-white/[0.04] text-xs font-mono text-amber-500/80 border border-white/[0.06]">
                                                        👤 {uid}
                                                    </span>
                                                ))}
                                                {alert.data?.ip && (
                                                    <span className="px-2 py-1 rounded bg-white/[0.04] text-xs font-mono text-blue-400 border border-white/[0.06]">
                                                        🌐 {alert.data.ip}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="dropdown relative group">
                                            <button className="btn btn-secondary py-1.5 px-3 text-xs flex items-center gap-2">
                                                Take Action
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            <div className="absolute right-0 mt-2 w-40 rounded-xl bg-[#1a1a24] border border-white/[0.08] shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                                <div className="p-1">
                                                    <button onClick={() => updateStatus(alert.id, 'investigating')} className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-300 hover:bg-white/[0.05] hover:text-white flex items-center gap-2">
                                                        <span>🔍</span> Investigate
                                                    </button>
                                                    <button className="w-full text-left px-3 py-2 rounded-lg text-xs text-yellow-500/80 hover:bg-yellow-500/10 flex items-center gap-2">
                                                        <span>⚠️</span> Warn User
                                                    </button>
                                                    <button className="w-full text-left px-3 py-2 rounded-lg text-xs text-orange-500/80 hover:bg-orange-500/10 flex items-center gap-2">
                                                        <span>❄️</span> Freeze Account
                                                    </button>
                                                    <button className="w-full text-left px-3 py-2 rounded-lg text-xs text-red-500/80 hover:bg-red-500/10 flex items-center gap-2">
                                                        <span>🚫</span> Ban User
                                                    </button>
                                                    <div className="h-px bg-white/[0.06] my-1" />
                                                    <button onClick={() => updateStatus(alert.id, 'dismissed')} className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-white/[0.05] hover:text-white flex items-center gap-2">
                                                        <span>✖️</span> Dismiss
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => window.location.hash = `#/user-lookup?id=${alert.relatedUsers?.[0]}`}
                                            className="btn btn-secondary py-1.5 px-3 text-xs"
                                        >
                                            View Profile
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Alert Details (Expanded) */}
                                {alert.status === 'investigating' && (
                                    <div className="mt-4 p-4 rounded-lg bg-black/20 border border-white/[0.04]">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Investigation Context</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <p className="text-xs text-gray-400 flex justify-between">
                                                    <span>Risk Score:</span>
                                                    <span className="text-orange-400 font-mono">84/100</span>
                                                </p>
                                                <p className="text-xs text-gray-400 flex justify-between">
                                                    <span>Previous Offenses:</span>
                                                    <span className="text-white font-mono">0</span>
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-xs text-gray-400 flex justify-between">
                                                    <span>Confidence:</span>
                                                    <span className="text-emerald-400 font-mono">92%</span>
                                                </p>
                                                <p className="text-xs text-gray-400 flex justify-between">
                                                    <span>Detected by:</span>
                                                    <span className="text-white font-mono">System Neural Scan</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
