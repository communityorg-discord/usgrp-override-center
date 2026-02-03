import React, { useState, useEffect } from 'react';

export default function WebhookTester() {
    const [url, setUrl] = useState('');
    const [method, setMethod] = useState('POST');
    const [payload, setPayload] = useState('{\n  "content": "Hello World!"\n}');
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [savedWebhooks, setSavedWebhooks] = useState([]);
    const [name, setName] = useState('');
    const [showSaveModal, setShowSaveModal] = useState(false);

    useEffect(() => {
        loadSaved();
    }, []);

    async function loadSaved() {
        const saved = await window.electron.webhooks.get();
        setSavedWebhooks(saved);
    }

    async function handleSend() {
        if (!url) return;
        setLoading(true);
        setResponse(null);

        try {
            const start = Date.now();
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: ['POST', 'PUT', 'PATCH'].includes(method) ? payload : undefined
            });
            const ms = Date.now() - start;

            let body;
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                body = await res.json();
            } else {
                body = await res.text();
            }

            setResponse({
                status: res.status,
                statusText: res.statusText,
                headers: [...res.headers.entries()],
                body,
                time: ms
            });
        } catch (error) {
            setResponse({
                error: error.message
            });
        } finally {
            setLoading(false);
        }
    }

    async function saveWebhook() {
        if (!name || !url) return;
        await window.electron.webhooks.save({
            name,
            url,
            method,
            payload
        });
        setShowSaveModal(false);
        setName('');
        loadSaved();
    }

    async function loadWebhook(w) {
        setUrl(w.url);
        setMethod(w.method);
        setPayload(w.payload);
    }

    async function deleteWebhook(id) {
        if (confirm('Delete this saved webhook?')) {
            await window.electron.webhooks.delete(id);
            loadSaved();
        }
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Webhook Tester</h1>
                    <p className="text-gray-400 mt-1">Test and debug webhooks</p>
                </div>
                <button 
                    onClick={() => setShowSaveModal(true)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Save Preset
                </button>
            </div>

            <div className="flex gap-6 flex-1 min-h-0">
                {/* Left: Editor */}
                <div className="flex-1 flex flex-col gap-4">
                    <div className="flex gap-2">
                        <select 
                            value={method} 
                            onChange={e => setMethod(e.target.value)}
                            className="bg-[#0a0a0f] border border-white/10 rounded-lg px-3 text-white font-mono focus:border-amber-500 outline-none"
                        >
                            <option>POST</option>
                            <option>GET</option>
                            <option>PUT</option>
                            <option>DELETE</option>
                        </select>
                        <input 
                            type="url" 
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            placeholder="https://discord.com/api/webhooks/..."
                            className="flex-1 bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-amber-500 outline-none"
                        />
                        <button 
                            onClick={handleSend}
                            disabled={loading}
                            className={`px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Sending...' : 'Send'}
                        </button>
                    </div>

                    <div className="flex-1 bg-[#0a0a0f] border border-white/10 rounded-xl overflow-hidden flex flex-col">
                        <div className="px-4 py-2 border-b border-white/10 text-xs font-bold text-gray-400 uppercase">JSON Payload</div>
                        <textarea 
                            value={payload}
                            onChange={e => setPayload(e.target.value)}
                            className="flex-1 bg-transparent p-4 text-white font-mono text-sm resize-none focus:outline-none"
                            spellCheck="false"
                        />
                    </div>

                    {response && (
                        <div className="h-1/3 bg-[#0a0a0f] border border-white/10 rounded-xl overflow-hidden flex flex-col animate-fade-in">
                            <div className={`px-4 py-2 border-b border-white/10 flex justify-between items-center ${
                                response.error ? 'bg-red-900/20' : 
                                response.status >= 200 && response.status < 300 ? 'bg-green-900/20' : 'bg-yellow-900/20'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <span className={`font-bold ${
                                        response.error ? 'text-red-400' : 
                                        response.status >= 200 && response.status < 300 ? 'text-green-400' : 'text-yellow-400'
                                    }`}>
                                        {response.error ? 'ERROR' : `${response.status} ${response.statusText}`}
                                    </span>
                                    {!response.error && (
                                        <span className="text-gray-500 text-xs">{response.time}ms</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 p-4 overflow-auto">
                                <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">
                                    {response.error ? response.error : JSON.stringify(response.body, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Saved */}
                <div className="w-80 bg-[#1a1a24] border border-white/5 rounded-xl flex flex-col">
                    <div className="px-4 py-3 border-b border-white/5">
                        <h3 className="text-sm font-bold text-gray-400 uppercase">Saved Webhooks</h3>
                    </div>
                    <div className="flex-1 overflow-auto p-2 space-y-2">
                        {savedWebhooks.map(w => (
                            <div key={w.id} className="p-3 rounded-lg bg-black/20 hover:bg-black/40 border border-white/5 group transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-white text-sm">{w.name}</h4>
                                    <button onClick={() => deleteWebhook(w.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="text-[10px] text-gray-500 font-mono truncate mb-2">{w.url}</div>
                                <button 
                                    onClick={() => loadWebhook(w)}
                                    className="w-full py-1 bg-white/5 hover:bg-white/10 text-xs text-gray-300 rounded transition-colors"
                                >
                                    Load
                                </button>
                            </div>
                        ))}
                        {savedWebhooks.length === 0 && (
                            <p className="text-center text-gray-600 text-sm py-8">No saved webhooks</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Save Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#1a1a24] p-6 rounded-xl border border-white/10 w-full max-w-sm shadow-2xl">
                        <h2 className="text-lg font-bold text-white mb-4">Save Webhook Preset</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Name</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Discord Logs"
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button 
                                    onClick={() => setShowSaveModal(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white text-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={saveWebhook}
                                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg text-sm"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
