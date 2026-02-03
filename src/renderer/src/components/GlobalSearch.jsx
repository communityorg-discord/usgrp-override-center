import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApi } from '../hooks/useApi';

export default function GlobalSearch({ isOpen, onClose }) {
    const { fetchApi } = useApi();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState({ users: [], transactions: [], cases: [], pages: [] });
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);

    // Static pages for instant search
    const pages = useMemo(() => [
        { name: 'Dashboard', path: '/dashboard', icon: '📊', keywords: 'home overview stats' },
        { name: 'Economy Stats', path: '/economy', icon: '💰', keywords: 'money balance wealth' },
        { name: 'Economy Users', path: '/economy/users', icon: '👥', keywords: 'players accounts' },
        { name: 'Transactions', path: '/economy/transactions', icon: '📈', keywords: 'transfers payments' },
        { name: 'What-If Simulator', path: '/economy/simulator', icon: '🧪', keywords: 'simulation tax' },
        { name: 'User Lookup', path: '/users', icon: '🔍', keywords: 'search find player' },
        { name: 'Moderation', path: '/moderation', icon: '🛡️', keywords: 'bans warnings' },
        { name: 'AutoMod Config', path: '/moderation/automod', icon: '🤖', keywords: 'filter spam' },
        { name: 'Terminal', path: '/terminal', icon: '💻', keywords: 'console ssh shell' },
        { name: 'Deploy', path: '/deploy', icon: '🚀', keywords: 'git push pull' },
        { name: 'File Manager', path: '/files', icon: '📁', keywords: 'browse edit' },
        { name: 'Config Editor', path: '/config', icon: '⚙️', keywords: 'settings json' },
        { name: 'Database', path: '/database', icon: '🗄️', keywords: 'sql sqlite query' },
        { name: 'Activity Dashboard', path: '/activity', icon: '📈', keywords: 'messages stats' },
        { name: 'Relationship Map', path: '/relationships', icon: '🕸️', keywords: 'network graph' },
        { name: 'Ticket Manager', path: '/tickets', icon: '🎫', keywords: 'support help' },
        { name: 'Ticket Kanban', path: '/tickets/kanban', icon: '📋', keywords: 'support board drag drop' },
        { name: 'Atlas Brain', path: '/atlas', icon: '🧠', keywords: 'ai config memory' },
        { name: 'Announcement Builder', path: '/announcements', icon: '📢', keywords: 'broadcast message' },
        { name: 'Settings', path: '/settings', icon: '⚙️', keywords: 'theme preferences' },
    ], []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setQuery('');
            setResults({ users: [], transactions: [], cases: [], pages: [] });
            setSelectedIndex(0);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!query.trim()) {
            setResults({ users: [], transactions: [], cases: [], pages: [] });
            return;
        }

        const q = query.toLowerCase();
        
        // Instant: filter pages
        const matchedPages = pages.filter(p => 
            p.name.toLowerCase().includes(q) || 
            p.keywords.includes(q)
        ).slice(0, 5);

        setResults(prev => ({ ...prev, pages: matchedPages }));

        // Debounced: search API
        const timer = setTimeout(async () => {
            if (query.length < 2) return;
            setLoading(true);
            try {
                // Search users
                const userRes = await fetchApi(`/override/users/search?q=${encodeURIComponent(query)}&limit=5`);
                const users = userRes?.users || [];

                // Search transactions (if endpoint exists)
                let transactions = [];
                try {
                    const txRes = await fetchApi(`/override/economy/transactions/search?q=${encodeURIComponent(query)}&limit=5`);
                    transactions = txRes?.transactions || [];
                } catch (e) {}

                setResults(prev => ({ ...prev, users, transactions }));
            } catch (e) {
                console.error('Global search error:', e);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, pages, fetchApi]);

    const allResults = useMemo(() => {
        const items = [];
        results.pages.forEach(p => items.push({ type: 'page', ...p }));
        results.users.forEach(u => items.push({ type: 'user', ...u }));
        results.transactions.forEach(t => items.push({ type: 'transaction', ...t }));
        return items;
    }, [results]);

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, allResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && allResults[selectedIndex]) {
            handleSelect(allResults[selectedIndex]);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    const handleSelect = (item) => {
        if (item.type === 'page') {
            window.location.hash = item.path;
        } else if (item.type === 'user') {
            window.location.hash = `/users/${item.id || item.user_id}`;
        } else if (item.type === 'transaction') {
            window.location.hash = `/economy/transactions?id=${item.id}`;
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            
            <div 
                className="relative bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
                    <span className="text-xl">🔍</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search everything..."
                        className="flex-1 bg-transparent text-white text-lg outline-none placeholder-gray-500"
                        autoComplete="off"
                        spellCheck={false}
                    />
                    {loading && (
                        <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                    )}
                </div>

                {/* Results */}
                <div className="max-h-[50vh] overflow-y-auto">
                    {allResults.length === 0 && query.length > 0 && !loading && (
                        <div className="px-4 py-8 text-center text-gray-500">
                            No results found for "{query}"
                        </div>
                    )}
                    
                    {allResults.length === 0 && query.length === 0 && (
                        <div className="px-4 py-6 text-center text-gray-500">
                            <p className="text-sm">Start typing to search pages, users, transactions...</p>
                            <p className="text-xs mt-2 text-gray-600">
                                Try: "terminal", "user123", "dashboard"
                            </p>
                        </div>
                    )}

                    {results.pages.length > 0 && (
                        <div className="py-2">
                            <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">Pages</div>
                            {results.pages.map((page, i) => {
                                const globalIndex = i;
                                return (
                                    <button
                                        key={page.path}
                                        onClick={() => handleSelect({ type: 'page', ...page })}
                                        className={`w-full px-4 py-2 flex items-center gap-3 text-left transition-colors ${
                                            selectedIndex === globalIndex ? 'bg-gold/20 text-white' : 'text-gray-300 hover:bg-white/5'
                                        }`}
                                    >
                                        <span className="text-lg">{page.icon}</span>
                                        <span>{page.name}</span>
                                        <span className="ml-auto text-xs text-gray-600">{page.path}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {results.users.length > 0 && (
                        <div className="py-2 border-t border-white/5">
                            <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">Users</div>
                            {results.users.map((user, i) => {
                                const globalIndex = results.pages.length + i;
                                return (
                                    <button
                                        key={user.id || user.user_id}
                                        onClick={() => handleSelect({ type: 'user', ...user })}
                                        className={`w-full px-4 py-2 flex items-center gap-3 text-left transition-colors ${
                                            selectedIndex === globalIndex ? 'bg-gold/20 text-white' : 'text-gray-300 hover:bg-white/5'
                                        }`}
                                    >
                                        <span className="text-lg">👤</span>
                                        <span>{user.username || user.name || user.display_name}</span>
                                        <span className="ml-auto text-xs text-gray-600">${(user.balance || 0).toLocaleString()}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-white/10 bg-gray-900/50 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                        <span><kbd className="px-1 py-0.5 bg-gray-800 rounded">↑↓</kbd> Navigate</span>
                        <span><kbd className="px-1 py-0.5 bg-gray-800 rounded">↵</kbd> Select</span>
                        <span><kbd className="px-1 py-0.5 bg-gray-800 rounded">Esc</kbd> Close</span>
                    </div>
                    <span>Ctrl+Shift+F</span>
                </div>
            </div>
        </div>
    );
}
