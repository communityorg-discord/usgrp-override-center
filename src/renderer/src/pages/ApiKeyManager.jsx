import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function ApiKeyManager() {
    const { fetchApi, post, loading } = useApi();
    const [keys, setKeys] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKeyData, setNewKeyData] = useState({ name: '', scopes: '', expiresAt: '' });
    const [generatedKey, setGeneratedKey] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadKeys();
    }, []);

    async function loadKeys() {
        try {
            const data = await fetchApi('/override/apikeys/list');
            if (data.success) {
                setKeys(data.keys);
            }
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleCreate(e) {
        e.preventDefault();
        setError(null);
        
        try {
            const scopesArray = newKeyData.scopes.split(',').map(s => s.trim()).filter(s => s);
            const payload = {
                name: newKeyData.name,
                expiresAt: newKeyData.expiresAt || null,
                scopes: scopesArray
            };

            const response = await post('/override/apikeys/create', payload);
            if (response.success) {
                setGeneratedKey(response.key);
                setNewKeyData({ name: '', scopes: '', expiresAt: '' });
                loadKeys();
            }
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleRevoke(id) {
        if (!confirm('Are you sure you want to revoke this key? This action cannot be undone.')) return;
        
        try {
            await post(`/override/apikeys/revoke/${id}`);
            loadKeys();
        } catch (err) {
            setError(err.message);
        }
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    }

    function closeCreateModal() {
        setShowCreateModal(false);
        setGeneratedKey(null);
        setError(null);
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">API Keys</h1>
                    <p className="text-gray-400">Manage access keys for external services</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Key
                </button>
            </header>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {loading && !keys.length ? (
                <div className="text-center py-12 text-gray-500">Loading keys...</div>
            ) : (
                <div className="grid gap-4">
                    {keys.length === 0 ? (
                        <div className="bg-surface-secondary rounded-xl p-8 text-center text-gray-500">
                            No API keys found. Create one to get started.
                        </div>
                    ) : (
                        keys.map(key => (
                            <div key={key.id} className="bg-surface-secondary rounded-xl p-4 flex items-center justify-between border border-gray-800">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-semibold text-white">{key.name}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            key.status === 'active' 
                                                ? 'bg-emerald-500/20 text-emerald-400' 
                                                : 'bg-red-500/20 text-red-400'
                                        }`}>
                                            {key.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-400 mt-1 space-x-4">
                                        <span>Prefix: <span className="font-mono text-gray-300">{key.prefix}</span></span>
                                        <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
                                        {key.created_by && <span>By: {key.created_by}</span>}
                                    </div>
                                    {key.scopes && key.scopes.length > 0 && (
                                        <div className="flex gap-2 mt-2">
                                            {key.scopes.map((scope, i) => (
                                                <span key={i} className="text-xs bg-gray-700/50 text-gray-300 px-2 py-0.5 rounded">
                                                    {scope}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    {key.status === 'active' && (
                                        <button
                                            onClick={() => handleRevoke(key.id)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded transition-colors text-sm"
                                        >
                                            Revoke
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-surface-secondary border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {generatedKey ? 'Key Generated' : 'Create New API Key'}
                        </h2>

                        {generatedKey ? (
                            <div className="space-y-4">
                                <div className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-lg">
                                    <p className="text-emerald-400 text-sm mb-2">Success! Copy this key now. You won't see it again.</p>
                                    <div className="flex items-center gap-2 bg-black/30 p-2 rounded border border-emerald-500/20">
                                        <code className="flex-1 font-mono text-emerald-300 break-all">{generatedKey.secret}</code>
                                        <button 
                                            onClick={() => copyToClipboard(generatedKey.secret)}
                                            className="text-emerald-400 hover:text-white p-1"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={closeCreateModal}
                                    className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Key Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-surface-primary border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="e.g. Discord Bot Production"
                                        value={newKeyData.name}
                                        onChange={e => setNewKeyData({...newKeyData, name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Scopes (comma separated)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-surface-primary border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="read, write, admin"
                                        value={newKeyData.scopes}
                                        onChange={e => setNewKeyData({...newKeyData, scopes: e.target.value})}
                                    />
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={closeCreateModal}
                                        className="text-gray-400 hover:text-white px-4 py-2"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg"
                                    >
                                        Generate Key
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
