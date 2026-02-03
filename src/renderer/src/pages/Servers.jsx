import React, { useState, useEffect } from 'react';

export default function Servers() {
    const [servers, setServers] = useState([]);
    const [current, setCurrent] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({ name: '', apiBase: 'https://', token: '' });

    useEffect(() => {
        loadServers();
    }, []);

    async function loadServers() {
        const list = await window.electron.servers.getAll();
        const curr = await window.electron.servers.getCurrent();
        setServers(list);
        setCurrent(curr);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        await window.electron.servers.add(formData);
        setIsAdding(false);
        setFormData({ name: '', apiBase: 'https://', token: '' });
        loadServers();
    }

    async function handleDelete(id) {
        if (confirm('Are you sure you want to remove this server?')) {
            await window.electron.servers.remove(id);
            loadServers();
        }
    }

    async function handleSelect(id) {
        await window.electron.servers.select(id);
        // Page reload happens automatically via main process, but we can update state too
        loadServers();
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Server Management</h1>
                    <p className="text-gray-400 mt-1">Manage multiple USGRP Override instances</p>
                </div>
                <button 
                    onClick={() => setIsAdding(true)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Server
                </button>
            </div>

            {/* Default Server (System) */}
            <div className={`p-4 rounded-xl border transition-all ${!current ? 'bg-amber-500/10 border-amber-500/50' : 'bg-[#1a1a24] border-white/5 hover:border-white/10'}`}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${!current ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400'}`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg text-white">Default Server</h3>
                                {!current && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded font-bold uppercase">Active</span>}
                            </div>
                            <p className="text-gray-400 text-sm">api.usgrp.xyz</p>
                        </div>
                    </div>
                    {current && (
                        <button 
                            onClick={() => handleSelect(null)}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium"
                        >
                            Switch
                        </button>
                    )}
                </div>
            </div>

            {/* Added Servers */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {servers.map(server => (
                    <div key={server.id} className={`p-4 rounded-xl border transition-all ${current === server.id ? 'bg-amber-500/10 border-amber-500/50' : 'bg-[#1a1a24] border-white/5 hover:border-white/10'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${current === server.id ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400'}`}>
                                <span className="font-bold text-lg">{server.name[0].toUpperCase()}</span>
                            </div>
                            <div className="flex gap-2">
                                {current !== server.id && (
                                    <button 
                                        onClick={() => handleSelect(server.id)}
                                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-bold"
                                    >
                                        Connect
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleDelete(server.id)}
                                    className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                    title="Delete"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-white">{server.name}</h3>
                                {current === server.id && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded font-bold uppercase">Active</span>}
                            </div>
                            <p className="text-gray-500 text-xs truncate font-mono">{server.apiBase}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#1a1a24] p-6 rounded-xl border border-white/10 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4">Add New Server</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Server Name</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                                    placeholder="e.g. Production VPS"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">API Base URL</label>
                                <input 
                                    type="url" 
                                    required
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                                    placeholder="https://api.example.com"
                                    value={formData.apiBase}
                                    onChange={e => setFormData({...formData, apiBase: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Auth Token (Optional)</label>
                                <input 
                                    type="password" 
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                                    placeholder="Paste token if you have it"
                                    value={formData.token}
                                    onChange={e => setFormData({...formData, token: e.target.value})}
                                />
                                <p className="text-xs text-gray-500 mt-1">If left blank, you'll need to login via browser.</p>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button 
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg"
                                >
                                    Add Server
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
