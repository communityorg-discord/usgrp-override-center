import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

export default function Backups() {
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [restoring, setRestoring] = useState(null); // ID of backup being restored
    const [restoreConfirm, setRestoreConfirm] = useState('');

    useEffect(() => {
        fetchBackups();
    }, []);

    const fetchBackups = async () => {
        setLoading(true);
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            const res = await fetch(`${apiBase}/override/backups/list`, {
                headers: { 'X-Override-Token': token }
            });
            const data = await res.json();
            if (data.success) {
                setBackups(data.files);
            }
        } catch (error) {
            console.error('Failed to fetch backups:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBackup = async () => {
        setCreating(true);
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            const res = await fetch(`${apiBase}/override/backups/create`, {
                method: 'POST',
                headers: { 'X-Override-Token': token }
            });
            const data = await res.json();
            if (data.success) {
                await fetchBackups();
            }
        } catch (error) {
            console.error('Failed to create backup:', error);
        } finally {
            setCreating(false);
        }
    };

    const handleDownload = async (filename) => {
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            // Using window.open for download might need token handling if auth is strict, 
            // but usually GET param token or cookie is needed. 
            // Assuming the API might accept a query param token or we just try opening it.
            // If header is required, we might need to fetch as blob and save.
            
            // Let's try fetch-blob approach for auth header support
            const res = await fetch(`${apiBase}/override/backups/download?file=${filename}`, {
                headers: { 'X-Override-Token': token }
            });
            
            if (!res.ok) throw new Error('Download failed');
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to download backup');
        }
    };

    const handleRestore = async (filename) => {
        if (restoreConfirm !== 'RESTORE') {
            alert('Please type RESTORE to confirm.');
            return;
        }

        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            const res = await fetch(`${apiBase}/override/backups/restore`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Override-Token': token 
                },
                body: JSON.stringify({ filename })
            });
            const data = await res.json();
            if (data.success) {
                alert('Restore simulation successful: ' + data.message);
                setRestoring(null);
                setRestoreConfirm('');
            }
        } catch (error) {
            console.error('Restore failed:', error);
            alert('Restore failed');
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Backup Manager</h1>
                    <p className="text-gray-400">Manage system backups and snapshots</p>
                </div>
                <button
                    onClick={handleCreateBackup}
                    disabled={creating}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {creating ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Creating...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Create New Backup
                        </>
                    )}
                </button>
            </div>

            <div className="bg-surface-secondary rounded-xl border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-800 text-gray-400 text-sm">
                                <th className="px-6 py-3 font-medium">Filename</th>
                                <th className="px-6 py-3 font-medium">Date Created</th>
                                <th className="px-6 py-3 font-medium">Size</th>
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                        Loading backups...
                                    </td>
                                </tr>
                            ) : backups.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                        No backups found. Create one to get started.
                                    </td>
                                </tr>
                            ) : (
                                backups.map((backup) => (
                                    <tr key={backup.name} className="hover:bg-gray-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-400">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                                    </svg>
                                                </div>
                                                <span className="text-gray-200 font-medium">{backup.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">
                                            {backup.mtime ? new Date(backup.mtime).toLocaleString() : 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 font-mono text-sm">
                                            {(backup.size / 1024 / 1024).toFixed(2)} MB
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleDownload(backup.name)}
                                                    className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                                                    title="Download"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                </button>
                                                
                                                {restoring === backup.name ? (
                                                    <div className="flex items-center gap-2 bg-red-500/10 p-1 rounded animate-fade-in">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Type RESTORE"
                                                            className="bg-gray-900 border border-red-500/30 rounded px-2 py-1 text-xs text-white w-24 focus:outline-none focus:border-red-500"
                                                            value={restoreConfirm}
                                                            onChange={(e) => setRestoreConfirm(e.target.value)}
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => handleRestore(backup.name)}
                                                            className="text-red-500 hover:text-red-400 font-bold text-xs px-2"
                                                        >
                                                            CONFIRM
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setRestoring(null);
                                                                setRestoreConfirm('');
                                                            }}
                                                            className="text-gray-400 hover:text-gray-300"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setRestoring(backup.name)}
                                                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                        title="Restore"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
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
