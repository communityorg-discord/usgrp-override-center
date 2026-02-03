import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// All navigable pages/actions
const PAGES = [
    // Main
    { path: '/', label: 'Dashboard', keywords: ['home', 'main', 'overview'], emoji: '📊' },
    { path: '/health', label: 'Service Health', keywords: ['status', 'uptime'], emoji: '❤️' },
    
    // Systems
    { path: '/servers', label: 'Servers', keywords: ['nodes', 'machines'], emoji: '🌐' },
    { path: '/processes', label: 'Process Manager', keywords: ['pm2', 'running'], emoji: '⚙️' },
    { path: '/metrics', label: 'Metrics', keywords: ['stats', 'performance'], emoji: '📈' },
    { path: '/graph', label: 'Dependency Graph', keywords: ['dependencies'], emoji: '🔗' },
    { path: '/profiler', label: 'Profiler', keywords: ['performance', 'debug'], emoji: '🔬' },
    { path: '/network', label: 'Network', keywords: ['connections', 'traffic'], emoji: '🌐' },
    { path: '/cron', label: 'Cron Jobs', keywords: ['scheduler', 'tasks'], emoji: '⏰' },
    
    // Economy
    { path: '/economy/users', label: 'Economy Users', keywords: ['players', 'balances'], emoji: '💰' },
    { path: '/economy/money', label: 'Money Editor', keywords: ['balance', 'edit'], emoji: '💵' },
    { path: '/economy/treasury', label: 'Treasury', keywords: ['government', 'funds'], emoji: '🏦' },
    { path: '/economy/transactions', label: 'Transaction Log', keywords: ['history', 'payments'], emoji: '📝' },
    { path: '/economy/payroll', label: 'Payroll Manager', keywords: ['salaries', 'wages'], emoji: '💼' },
    { path: '/economy/housing', label: 'Housing Manager', keywords: ['properties', 'real estate'], emoji: '🏠' },
    { path: '/economy/vehicles', label: 'Vehicle Registry', keywords: ['cars', 'transport'], emoji: '🚗' },
    { path: '/economy/businesses', label: 'Business Manager', keywords: ['companies', 'shops'], emoji: '🏢' },
    { path: '/economy/gangs', label: 'Gang Manager', keywords: ['organizations', 'criminal'], emoji: '🔫' },
    { path: '/economy/stats', label: 'Economy Stats', keywords: ['gdp', 'inflation', 'health'], emoji: '📈' },
    { path: '/economy/godmode', label: 'God Mode', keywords: ['restrictions', 'bypass'], emoji: '⚡' },
    { path: '/economy/bulk-wipe', label: 'Bulk Wipe', keywords: ['reset', 'mass', 'delete'], emoji: '🧹' },
    
    // Moderation
    { path: '/moderation/cases', label: 'Case Manager', keywords: ['warns', 'bans', 'mutes'], emoji: '📋' },
    { path: '/moderation/actions', label: 'Quick Moderation', keywords: ['fast', 'moderate'], emoji: '⚡' },
    { path: '/moderation/watchlist', label: 'Watchlist', keywords: ['monitor', 'suspects'], emoji: '👁️' },
    { path: '/moderation/automod', label: 'AutoMod Config', keywords: ['filters', 'words'], emoji: '🤖' },
    { path: '/audit', label: 'Audit Log', keywords: ['history', 'actions'], emoji: '📜' },
    { path: '/users/lookup', label: 'User Lookup', keywords: ['search', 'find'], emoji: '🔍' },
    
    // Government
    { path: '/government/positions', label: 'Position Manager', keywords: ['roles', 'offices'], emoji: '🏛️' },
    { path: '/discord', label: 'Discord Manager', keywords: ['server', 'roles'], emoji: '💬' },
    { path: '/bans', label: 'Ban Manager', keywords: ['blacklist'], emoji: '🚫' },
    
    // Activity
    { path: '/activity', label: 'Activity Dashboard', keywords: ['usage', 'analytics'], emoji: '📊' },
    
    // Security
    { path: '/dns', label: 'DNS Manager', keywords: ['domains', 'records'], emoji: '🌐' },
    { path: '/ssl', label: 'SSL Monitor', keywords: ['certificates', 'https'], emoji: '🔒' },
    { path: '/secrets', label: 'Secrets Vault', keywords: ['env', 'tokens', 'keys'], emoji: '🔐' },
    { path: '/ratelimits', label: 'Rate Limits', keywords: ['throttle', 'limits'], emoji: '⏱️' },
    { path: '/apikeys', label: 'API Keys', keywords: ['authentication'], emoji: '🔑' },
    
    // Support
    { path: '/tickets', label: 'Ticket Manager', keywords: ['support', 'help'], emoji: '🎫' },
    { path: '/tickets/kanban', label: 'Ticket Kanban', keywords: ['support', 'board', 'drag'], emoji: '📋' },
    
    // Tools
    { path: '/deploy', label: 'Deploy', keywords: ['git', 'push', 'release'], emoji: '🚀' },
    { path: '/terminal', label: 'Terminal', keywords: ['shell', 'cli', 'bash'], emoji: '💻' },
    { path: '/quick-commands', label: 'Quick Commands', keywords: ['scripts', 'shortcuts'], emoji: '⚡' },
    { path: '/webhooks', label: 'Webhook Tester', keywords: ['http', 'post'], emoji: '🪝' },
    { path: '/templates', label: 'Service Templates', keywords: ['configs'], emoji: '📄' },
    { path: '/alerts', label: 'Mobile Alerts', keywords: ['notifications'], emoji: '📱' },
    
    // Data
    { path: '/files', label: 'File Manager', keywords: ['browse', 'explorer'], emoji: '📁' },
    { path: '/config', label: 'Config Editor', keywords: ['settings', 'edit'], emoji: '⚙️' },
    { path: '/database', label: 'Database', keywords: ['sql', 'query'], emoji: '🗄️' },
    { path: '/migrations', label: 'Migrations', keywords: ['schema', 'updates'], emoji: '🔄' },
    { path: '/backups', label: 'Backups', keywords: ['restore', 'snapshot'], emoji: '💾' },
    { path: '/memory', label: 'Memory', keywords: ['ram', 'usage'], emoji: '🧠' },
    { path: '/logs', label: 'Log Aggregator', keywords: ['errors', 'debug'], emoji: '📋' },
    
    // Settings
    { path: '/settings', label: 'Settings', keywords: ['preferences', 'config'], emoji: '⚙️' },
];

export default function CommandPalette({ isOpen, onClose }) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [recentPages, setRecentPages] = useState([]);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Load recent pages from localStorage
    useEffect(() => {
        const recent = JSON.parse(localStorage.getItem('commandPaletteRecent') || '[]');
        setRecentPages(recent);
    }, [isOpen]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setQuery('');
            setSelectedIndex(0);
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Filter results
    const results = query.trim() === '' 
        ? recentPages.length > 0 
            ? recentPages.map(path => PAGES.find(p => p.path === path)).filter(Boolean).slice(0, 5)
            : PAGES.slice(0, 8)
        : PAGES.filter(page => {
            const q = query.toLowerCase();
            return (
                page.label.toLowerCase().includes(q) ||
                page.path.toLowerCase().includes(q) ||
                page.keywords.some(k => k.includes(q))
            );
        }).slice(0, 10);

    // Handle navigation
    const navigateTo = useCallback((path) => {
        // Save to recent
        const recent = JSON.parse(localStorage.getItem('commandPaletteRecent') || '[]');
        const updated = [path, ...recent.filter(p => p !== path)].slice(0, 10);
        localStorage.setItem('commandPaletteRecent', JSON.stringify(updated));
        
        navigate(path);
        onClose();
    }, [navigate, onClose]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        function handleKeyDown(e) {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && results[selectedIndex]) {
                e.preventDefault();
                navigateTo(results[selectedIndex].path);
            }
        }

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex, navigateTo, onClose]);

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh] z-[100] animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="w-full max-w-xl bg-[#0c0c14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)' }}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.06]">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search pages, actions..."
                        className="flex-1 bg-transparent text-white text-lg placeholder-gray-500 focus:outline-none"
                    />
                    <kbd className="hidden sm:block px-2 py-1 text-xs text-gray-500 bg-white/[0.05] rounded">ESC</kbd>
                </div>

                {/* Results */}
                <div className="max-h-[60vh] overflow-y-auto">
                    {results.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-500">
                            No results found
                        </div>
                    ) : (
                        <div className="py-2">
                            {query.trim() === '' && recentPages.length > 0 && (
                                <div className="px-4 py-1 text-xs text-gray-600 uppercase tracking-wider">
                                    Recent
                                </div>
                            )}
                            {results.map((page, idx) => (
                                <button
                                    key={page.path}
                                    onClick={() => navigateTo(page.path)}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                        idx === selectedIndex 
                                            ? 'bg-amber-500/10' 
                                            : 'hover:bg-white/[0.03]'
                                    }`}
                                >
                                    <span className="text-xl w-8 text-center">{page.emoji}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className={`font-medium ${idx === selectedIndex ? 'text-amber-400' : 'text-white'}`}>
                                            {page.label}
                                        </div>
                                        <div className="text-sm text-gray-500 truncate">{page.path}</div>
                                    </div>
                                    {idx === selectedIndex && (
                                        <kbd className="px-2 py-1 text-xs text-gray-500 bg-white/[0.05] rounded">↵</kbd>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white/[0.05] rounded">↑</kbd>
                            <kbd className="px-1.5 py-0.5 bg-white/[0.05] rounded">↓</kbd>
                            to navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white/[0.05] rounded">↵</kbd>
                            to select
                        </span>
                    </div>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white/[0.05] rounded">Ctrl</kbd>
                        <kbd className="px-1.5 py-0.5 bg-white/[0.05] rounded">K</kbd>
                        to toggle
                    </span>
                </div>
            </div>
        </div>
    );
}
