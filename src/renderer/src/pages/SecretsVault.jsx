import React, { useState, useEffect } from 'react';

export default function SecretsVault() {
    const [secrets, setSecrets] = useState([]);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [editingSecret, setEditingSecret] = useState(null);
    const [visibleSecrets, setVisibleSecrets] = useState({});
    const [formData, setFormData] = useState({ label: '', value: '', category: 'General' });

    const categories = ['All', 'API Keys', 'Database', 'SSH', 'General', 'Tokens'];

    useEffect(() => {
        loadSecrets();
    }, []);

    async function loadSecrets() {
        const stored = await window.electron.store.get('secrets');
        if (stored) {
            setSecrets(stored);
        }
    }

    async function saveSecrets(newSecrets) {
        await window.electron.store.set('secrets', newSecrets);
        setSecrets(newSecrets);
    }

    function handleSubmit(e) {
        e.preventDefault();
        const newSecret = {
            id: editingSecret ? editingSecret.id : crypto.randomUUID(),
            label: formData.label,
            value: formData.value,
            category: formData.category,
            updatedAt: new Date().toISOString()
        };

        let updatedSecrets;
        if (editingSecret) {
            updatedSecrets = secrets.map(s => s.id === editingSecret.id ? newSecret : s);
        } else {
            updatedSecrets = [...secrets, newSecret];
        }

        saveSecrets(updatedSecrets);
        setShowModal(false);
        setEditingSecret(null);
    }

    function handleDelete(id) {
        if (!confirm('Are you sure you want to delete this secret? This cannot be undone.')) return;
        const updatedSecrets = secrets.filter(s => s.id !== id);
        saveSecrets(updatedSecrets);
    }

    function openEdit(secret) {
        setEditingSecret(secret);
        setFormData({
            label: secret.label,
            value: secret.value,
            category: secret.category
        });
        setShowModal(true);
    }

    function openAdd() {
        setEditingSecret(null);
        setFormData({ label: '', value: '', category: 'General' });
        setShowModal(true);
    }

    function toggleVisibility(id) {
        setVisibleSecrets(prev => ({ ...prev, [id]: !prev[id] }));
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text);
        // Could add toast here
    }

    const filteredSecrets = secrets.filter(s => {
        const matchesSearch = s.label.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || s.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="heading-xl text-gold-gradient">Secrets Vault</h1>
                    <p className="text-gray-400">Securely manage API keys and credentials</p>
                </div>
                <button onClick={openAdd} className="btn btn-primary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Secret
                </button>
            </div>

            <div className="flex gap-4">
                <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input 
                        type="text" 
                        placeholder="Search secrets..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input pl-10"
                    />
                </div>
                <select 
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="select w-48"
                >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSecrets.map(secret => (
                    <div key={secret.id} className="card hover:border-white/10 transition-colors group">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-semibold text-lg">{secret.label}</h3>
                                <span className="text-xs text-gray-500 uppercase tracking-wider">{secret.category}</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEdit(secret)} className="btn-icon hover:text-blue-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => handleDelete(secret.id)} className="btn-icon hover:text-red-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>

                        <div className="bg-black/30 rounded p-2 flex items-center justify-between border border-white/5">
                            <code className="font-mono text-sm truncate flex-1 mr-2 text-gold-light">
                                {visibleSecrets[secret.id] ? secret.value : '••••••••••••••••••••'}
                            </code>
                            <div className="flex gap-1">
                                <button onClick={() => toggleVisibility(secret.id)} className="p-1 hover:text-white text-gray-500 transition-colors">
                                    {visibleSecrets[secret.id] ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                                <button onClick={() => copyToClipboard(secret.value)} className="p-1 hover:text-white text-gray-500 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredSecrets.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        No secrets found. Create one to get started.
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
                    <div className="modal-content w-full max-w-lg rounded-xl p-6 animate-scale-in">
                        <h2 className="heading-lg mb-6">{editingSecret ? 'Edit Secret' : 'New Secret'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Label</label>
                                <input 
                                    type="text" 
                                    value={formData.label}
                                    onChange={e => setFormData({...formData, label: e.target.value})}
                                    className="input"
                                    placeholder="e.g. Database Password"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Category</label>
                                <select 
                                    value={formData.category}
                                    onChange={e => setFormData({...formData, category: e.target.value})}
                                    className="select"
                                >
                                    {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Secret Value</label>
                                <textarea 
                                    value={formData.value}
                                    onChange={e => setFormData({...formData, value: e.target.value})}
                                    className="input font-mono min-h-[100px]"
                                    placeholder="Paste your secret here..."
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Secret</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
