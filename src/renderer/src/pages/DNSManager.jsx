import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function DNSManager() {
    const { fetchApi, post, put, loading: apiLoading } = useApi();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState('');
    const [hasToken, setHasToken] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [formData, setFormData] = useState({ type: 'A', name: '', content: '', proxied: true, ttl: 1 });

    useEffect(() => {
        checkToken();
    }, []);

    useEffect(() => {
        if (hasToken) {
            loadRecords();
        }
    }, [hasToken]);

    async function checkToken() {
        const savedToken = await window.electron.store.get('cf_token');
        if (savedToken) {
            setToken(savedToken);
            setHasToken(true);
        }
    }

    async function saveToken(newToken) {
        await window.electron.store.set('cf_token', newToken);
        setToken(newToken);
        setHasToken(true);
    }

    async function loadRecords() {
        setLoading(true);
        try {
            const data = await fetchApi('/override/dns/records', {
                headers: { 'X-CF-Token': token }
            });
            if (data.success && data.result) {
                setRecords(data.result);
            }
        } catch (error) {
            console.error('Failed to load DNS records:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                type: formData.type,
                name: formData.name,
                content: formData.content,
                proxied: formData.proxied,
                ttl: parseInt(formData.ttl)
            };

            if (editingRecord) {
                await fetchApi(`/override/dns/records/${editingRecord.id}`, {
                    method: 'PUT',
                    headers: { 'X-CF-Token': token },
                    body: JSON.stringify(payload)
                });
            } else {
                await fetchApi('/override/dns/records', {
                    method: 'POST',
                    headers: { 'X-CF-Token': token },
                    body: JSON.stringify(payload)
                });
            }
            setShowModal(false);
            setEditingRecord(null);
            loadRecords();
        } catch (error) {
            alert('Failed to save record: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Are you sure you want to delete this record?')) return;
        setLoading(true);
        try {
            await fetchApi(`/override/dns/records/${id}`, {
                method: 'DELETE',
                headers: { 'X-CF-Token': token }
            });
            loadRecords();
        } catch (error) {
            alert('Failed to delete record: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    function openEdit(record) {
        setEditingRecord(record);
        setFormData({
            type: record.type,
            name: record.name,
            content: record.content,
            proxied: record.proxied,
            ttl: record.ttl
        });
        setShowModal(true);
    }

    function openAdd() {
        setEditingRecord(null);
        setFormData({ type: 'A', name: '', content: '', proxied: true, ttl: 1 });
        setShowModal(true);
    }

    if (!hasToken) {
        return (
            <div className="max-w-md mx-auto mt-20 p-6 card glass">
                <h2 className="heading-lg mb-4 text-gold">Cloudflare Setup</h2>
                <p className="text-gray-400 mb-6">Please enter your Cloudflare API Token to manage DNS records.</p>
                <form onSubmit={(e) => { e.preventDefault(); saveToken(e.target.token.value); }}>
                    <input 
                        name="token" 
                        type="password" 
                        className="input mb-4" 
                        placeholder="Cloudflare API Token" 
                        required 
                    />
                    <button type="submit" className="btn btn-primary w-full">Save Token</button>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="heading-xl text-gold-gradient">DNS Manager</h1>
                    <p className="text-gray-400">Manage Cloudflare DNS records for usgrp.xyz</p>
                </div>
                <button onClick={openAdd} className="btn btn-primary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Record
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full spin-slow"></div>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-surface-secondary">
                    <table className="table-dark w-full">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Name</th>
                                <th>Content</th>
                                <th>Proxy Status</th>
                                <th>TTL</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(record => (
                                <tr key={record.id} className="group hover:bg-white/[0.02]">
                                    <td className="font-mono text-gold">{record.type}</td>
                                    <td>{record.name}</td>
                                    <td className="max-w-xs truncate text-gray-400" title={record.content}>{record.content}</td>
                                    <td>
                                        {record.proxied ? (
                                            <span className="badge badge-warning">Proxied</span>
                                        ) : (
                                            <span className="badge badge-neutral">DNS Only</span>
                                        )}
                                    </td>
                                    <td className="text-gray-500">{record.ttl === 1 ? 'Auto' : record.ttl}</td>
                                    <td>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(record)} className="btn-icon hover:text-blue-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button onClick={() => handleDelete(record.id)} className="btn-icon hover:text-red-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
                    <div className="modal-content w-full max-w-lg rounded-xl p-6 animate-scale-in">
                        <h2 className="heading-lg mb-6">{editingRecord ? 'Edit Record' : 'Add Record'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Type</label>
                                    <select 
                                        value={formData.type}
                                        onChange={e => setFormData({...formData, type: e.target.value})}
                                        className="select"
                                    >
                                        <option value="A">A</option>
                                        <option value="CNAME">CNAME</option>
                                        <option value="TXT">TXT</option>
                                        <option value="MX">MX</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">TTL</label>
                                    <select 
                                        value={formData.ttl}
                                        onChange={e => setFormData({...formData, ttl: e.target.value})}
                                        className="select"
                                    >
                                        <option value="1">Auto</option>
                                        <option value="60">1 min</option>
                                        <option value="300">5 min</option>
                                        <option value="3600">1 hour</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Name</label>
                                <input 
                                    type="text" 
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="input"
                                    placeholder="e.g. sub.example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Content</label>
                                <input 
                                    type="text" 
                                    value={formData.content}
                                    onChange={e => setFormData({...formData, content: e.target.value})}
                                    className="input"
                                    placeholder="IP address or domain"
                                    required
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="proxy"
                                    checked={formData.proxied}
                                    onChange={e => setFormData({...formData, proxied: e.target.checked})}
                                    className="rounded border-gray-600 bg-gray-700 text-gold focus:ring-gold"
                                />
                                <label htmlFor="proxy" className="text-sm cursor-pointer">Proxy through Cloudflare</label>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
