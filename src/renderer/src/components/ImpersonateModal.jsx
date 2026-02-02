import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';

export default function ImpersonateModal({ onClose }) {
    const { fetchApi } = useApi();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function handleSearch(e) {
        e.preventDefault();
        if (!query.trim()) return;
        
        setLoading(true);
        setError(null);
        try {
            const data = await fetchApi(`/override/users/search?q=${encodeURIComponent(query)}`);
            setResults(data.users || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function handleImpersonate(user) {
        if (confirm(`Are you sure you want to impersonate ${user.display_name}?`)) {
            localStorage.setItem('impersonateUser', user.id);
            localStorage.setItem('impersonateUserName', user.display_name);
            window.location.reload();
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-surface-secondary rounded-lg shadow-2xl w-full max-w-lg border border-white/10 flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">🎭</span> Impersonate User
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 flex-1 overflow-hidden flex flex-col">
                    <form onSubmit={handleSearch} className="mb-4 flex gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by name, email, or Discord ID..."
                            className="flex-1 bg-surface-primary border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-gold"
                            autoFocus
                        />
                        <button 
                            type="submit"
                            disabled={loading}
                            className="bg-gold/20 text-gold border border-gold/50 px-4 py-2 rounded hover:bg-gold/30 transition-colors"
                        >
                            {loading ? '...' : 'Search'}
                        </button>
                    </form>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                        {results.length === 0 && !loading && query && (
                            <div className="text-center text-gray-500 py-8">No users found</div>
                        )}
                        
                        {results.map(user => (
                            <div key={user.id} className="bg-surface-primary border border-white/5 rounded p-3 flex justify-between items-center hover:border-gold/30 transition-colors">
                                <div>
                                    <div className="font-medium text-white">{user.display_name}</div>
                                    <div className="text-xs text-gray-400 font-mono">{user.discord_id || user.id}</div>
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                    {user.authority_level > 0 && (
                                        <span className="inline-block mt-1 text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">
                                            Level {user.authority_level}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleImpersonate(user)}
                                    className="bg-red-500/10 text-red-400 border border-red-500/30 px-3 py-1.5 rounded text-sm hover:bg-red-500/20 transition-colors"
                                >
                                    Impersonate
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
