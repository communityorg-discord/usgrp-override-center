import React from 'react';

const changelog = [
    {
        version: '2.0.0',
        date: '2026-02-04',
        changes: [
            { type: 'added', text: 'Deploy, Terminal, Memory, Database modules' },
            { type: 'added', text: 'Chat, Audit, Impersonation, Alerts systems' },
            { type: 'added', text: 'Files, Cron, Network, Backups management' },
            { type: 'added', text: 'Discord, Processes, Logs, Bans, Keys, Health monitoring' }
        ]
    },
    {
        version: '1.3.0',
        date: '2026-02-02',
        changes: [
            { type: 'added', text: 'Premium polished UI with enhanced animations' },
            { type: 'added', text: 'Live connection status in title bar' },
            { type: 'added', text: 'Service cards with CPU/Memory/Restart stats' },
            { type: 'added', text: 'Systems page with search, filter, and log viewer' },
            { type: 'added', text: 'Table styles with hover states' },
            { type: 'improved', text: 'Refined color palette and shadows' },
            { type: 'improved', text: 'Better loading states and error handling' },
            { type: 'improved', text: 'Smoother animations and transitions' },
        ]
    },
    {
        version: '1.1.0',
        date: '2026-02-02',
        changes: [
            { type: 'added', text: 'Auth integration with auth.usgrp.xyz SSO' },
            { type: 'added', text: 'Custom protocol handler (usgrp-override://)' },
            { type: 'added', text: 'Menu bar with File, Edit, View, Tools, Help' },
            { type: 'added', text: 'Top toolbar with navigation tabs' },
            { type: 'added', text: 'Changelog and About modals' },
            { type: 'improved', text: 'Redesigned layout with horizontal navigation' },
        ]
    },
    {
        version: '1.0.0',
        date: '2026-02-02',
        changes: [
            { type: 'added', text: 'Initial release' },
            { type: 'added', text: 'Dashboard with real-time PM2 stats' },
            { type: 'added', text: 'Systems page for service management' },
            { type: 'added', text: 'One-click deploy from GitHub' },
            { type: 'added', text: 'Integrated SSH terminal' },
            { type: 'added', text: 'Memory file editor' },
            { type: 'added', text: 'Database browser with SQL queries' },
            { type: 'added', text: 'System tray with quick actions' },
            { type: 'added', text: 'Global hotkeys' },
            { type: 'added', text: 'Auto-updater framework' },
        ]
    }
];

export default function ChangelogModal({ onClose }) {
    const typeColors = {
        added: 'text-emerald-400',
        improved: 'text-blue-400',
        fixed: 'text-amber-400',
        removed: 'text-red-400',
    };

    const typeLabels = {
        added: 'NEW',
        improved: 'IMPROVED',
        fixed: 'FIXED',
        removed: 'REMOVED',
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="w-full max-w-2xl max-h-[80vh] bg-surface-secondary border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">📋 Changelog</h2>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-auto max-h-[60vh] space-y-6">
                    {changelog.map((release) => (
                        <div key={release.version}>
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-lg font-bold text-gold">v{release.version}</span>
                                <span className="text-sm text-gray-500">{release.date}</span>
                            </div>
                            <ul className="space-y-2">
                                {release.changes.map((change, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className={`text-xs font-bold ${typeColors[change.type]} bg-gray-800 px-1.5 py-0.5 rounded`}>
                                            {typeLabels[change.type]}
                                        </span>
                                        <span className="text-gray-300 text-sm">{change.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 flex justify-end">
                    <button onClick={onClose} className="btn btn-primary">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
