import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

/**
 * CommandPalette - Quick action search and execute
 * Opens with Ctrl+K / Cmd+K
 */
export default function CommandPalette({ isOpen, onClose }) {
    const navigate = useNavigate();
    const { fetchApi, post } = useApi();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [recentActions, setRecentActions] = useState([]);
    const [executing, setExecuting] = useState(false);
    const [result, setResult] = useState(null);

    // All available commands
    const commands = [
        // Navigation
        { id: 'nav-dashboard', label: 'Go to Dashboard', category: 'Navigation', icon: '🏠', action: () => navigate('/') },
        { id: 'nav-deploy', label: 'Go to Deploy', category: 'Navigation', icon: '🚀', action: () => navigate('/deploy') },
        { id: 'nav-terminal', label: 'Go to Terminal', category: 'Navigation', icon: '💻', action: () => navigate('/terminal') },
        { id: 'nav-logs', label: 'Go to Logs', category: 'Navigation', icon: '📜', action: () => navigate('/logs') },
        { id: 'nav-database', label: 'Go to Database', category: 'Navigation', icon: '🗄️', action: () => navigate('/database') },
        { id: 'nav-files', label: 'Go to File Manager', category: 'Navigation', icon: '📁', action: () => navigate('/files') },
        { id: 'nav-discord', label: 'Go to Discord Manager', category: 'Navigation', icon: '💬', action: () => navigate('/discord') },
        { id: 'nav-economy', label: 'Go to Economy Users', category: 'Navigation', icon: '💰', action: () => navigate('/economy/users') },
        { id: 'nav-monitor', label: 'Go to System Monitor', category: 'Navigation', icon: '📊', action: () => navigate('/system-monitor') },
        { id: 'nav-atlas', label: 'Go to Atlas Config', category: 'Navigation', icon: '🧠', action: () => navigate('/atlas-brain') },
        
        // Quick Actions
        { id: 'action-restart-all', label: 'Restart All Services', category: 'Actions', icon: '🔄', action: async () => {
            const confirm = window.confirm('Restart ALL PM2 services?');
            if (confirm) {
                await post('/override/pm2/restart-all');
                return 'All services restarting...';
            }
            return 'Cancelled';
        }},
        { id: 'action-deploy-api', label: 'Deploy API Gateway', category: 'Actions', icon: '🚀', action: async () => {
            navigate('/deploy');
            return 'Opening deploy page...';
        }},
        { id: 'action-clear-cache', label: 'Clear Redis Cache', category: 'Actions', icon: '🧹', action: async () => {
            await post('/override/redis/flushdb');
            return 'Redis cache cleared';
        }},
        { id: 'action-backup-db', label: 'Backup Databases', category: 'Actions', icon: '💾', action: async () => {
            navigate('/backups');
            return 'Opening backups...';
        }},
        
        // Service Controls
        { id: 'svc-restart-economy', label: 'Restart Economy Bot', category: 'Services', icon: '🤖', action: async () => {
            await post('/override/pm2/restart', { name: 'economy-bot' });
            return 'Economy Bot restarting...';
        }},
        { id: 'svc-restart-gov', label: 'Restart Gov-Utils', category: 'Services', icon: '🏛️', action: async () => {
            await post('/override/pm2/restart', { name: 'gov-utils' });
            return 'Gov-Utils restarting...';
        }},
        { id: 'svc-restart-api', label: 'Restart API Gateway', category: 'Services', icon: '🌐', action: async () => {
            await post('/override/pm2/restart', { name: 'api-gateway' });
            return 'API Gateway restarting...';
        }},
        { id: 'svc-restart-auth', label: 'Restart Auth Service', category: 'Services', icon: '🔐', action: async () => {
            await post('/override/pm2/restart', { name: 'usgrp-auth' });
            return 'Auth Service restarting...';
        }},
        
        // Quick Lookups
        { id: 'lookup-user', label: 'Lookup User...', category: 'Lookup', icon: '🔍', action: () => navigate('/users/lookup') },
        { id: 'lookup-transaction', label: 'Search Transactions...', category: 'Lookup', icon: '💸', action: () => navigate('/economy/transactions') },
        { id: 'lookup-cases', label: 'View Moderation Cases', category: 'Lookup', icon: '⚖️', action: () => navigate('/moderation/cases') },
        
        // System
        { id: 'sys-check-health', label: 'Check System Health', category: 'System', icon: '❤️', action: async () => {
            const data = await fetchApi('/override/health');
            return data?.healthy ? '✅ All systems healthy' : '⚠️ Some services have issues';
        }},
        { id: 'sys-view-metrics', label: 'View System Metrics', category: 'System', icon: '📈', action: () => navigate('/system-monitor') },
        { id: 'sys-view-alerts', label: 'View Alerts', category: 'System', icon: '🔔', action: () => navigate('/alerts') },
    ];

    // Filter commands based on query
    const filteredCommands = query.trim() === '' 
        ? commands.slice(0, 10) 
        : commands.filter(cmd => 
            cmd.label.toLowerCase().includes(query.toLowerCase()) ||
            cmd.category.toLowerCase().includes(query.toLowerCase())
        );

    // Group by category
    const groupedCommands = filteredCommands.reduce((acc, cmd) => {
        if (!acc[cmd.category]) acc[cmd.category] = [];
        acc[cmd.category].push(cmd);
        return acc;
    }, {});

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setResult(null);
        }
    }, [isOpen]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e) => {
        if (!isOpen) return;

        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredCommands[selectedIndex]) {
                executeCommand(filteredCommands[selectedIndex]);
            }
        }
    }, [isOpen, filteredCommands, selectedIndex]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Execute command
    async function executeCommand(cmd) {
        setExecuting(true);
        setResult(null);
        
        try {
            const res = await cmd.action();
            if (typeof res === 'string') {
                setResult({ success: true, message: res });
                setTimeout(() => {
                    onClose();
                }, 1000);
            } else {
                onClose();
            }
        } catch (error) {
            setResult({ success: false, message: error.message });
        } finally {
            setExecuting(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Palette */}
            <div className="relative w-full max-w-xl bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                        placeholder="Type a command or search..."
                        className="flex-1 bg-transparent text-white text-lg placeholder-gray-500 outline-none"
                        autoFocus
                    />
                    <kbd className="px-2 py-1 text-xs bg-gray-800 text-gray-400 rounded">ESC</kbd>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-auto p-2">
                    {result ? (
                        <div className={`p-4 rounded-lg text-center ${result.success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                            {result.message}
                        </div>
                    ) : executing ? (
                        <div className="p-4 text-center text-gray-400">
                            <span className="animate-spin inline-block w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full mr-2"></span>
                            Executing...
                        </div>
                    ) : (
                        Object.entries(groupedCommands).map(([category, cmds]) => (
                            <div key={category} className="mb-2">
                                <div className="px-3 py-1 text-xs font-bold text-gray-500 uppercase">{category}</div>
                                {cmds.map((cmd, idx) => {
                                    const globalIdx = filteredCommands.indexOf(cmd);
                                    return (
                                        <button
                                            key={cmd.id}
                                            onClick={() => executeCommand(cmd)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                                                globalIdx === selectedIndex 
                                                    ? 'bg-amber-500/20 text-white' 
                                                    : 'hover:bg-white/5 text-gray-300'
                                            }`}
                                        >
                                            <span className="text-lg">{cmd.icon}</span>
                                            <span className="flex-1">{cmd.label}</span>
                                            {globalIdx === selectedIndex && (
                                                <kbd className="px-2 py-0.5 text-xs bg-gray-800 text-gray-400 rounded">↵</kbd>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                    
                    {filteredCommands.length === 0 && !result && !executing && (
                        <div className="p-4 text-center text-gray-500">
                            No commands found for "{query}"
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex gap-4">
                        <span><kbd className="px-1 bg-gray-800 rounded">↑↓</kbd> Navigate</span>
                        <span><kbd className="px-1 bg-gray-800 rounded">↵</kbd> Execute</span>
                    </div>
                    <span>Quick Commands</span>
                </div>
            </div>
        </div>
    );
}
