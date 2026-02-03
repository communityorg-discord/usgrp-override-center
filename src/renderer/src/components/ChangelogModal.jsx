import React, { useState, useEffect } from 'react';

export default function ChangelogModal({ onClose }) {
    const [releases, setReleases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchReleases();
    }, []);

    async function fetchReleases() {
        try {
            const response = await fetch(
                'https://api.github.com/repos/communityorg-discord/usgrp-override-center/releases',
                { headers: { 'Accept': 'application/vnd.github.v3+json' } }
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch releases');
            }
            
            const data = await response.json();
            setReleases(data.slice(0, 10)); // Last 10 releases
        } catch (err) {
            console.error('Failed to fetch releases:', err);
            setError(err.message);
            // Fall back to static changelog
            setReleases(staticChangelog);
        } finally {
            setLoading(false);
        }
    }

    function parseBody(body) {
        if (!body) return [];
        
        const changes = [];
        const lines = body.split('\n');
        let currentSection = '';
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            
            // Skip header lines and horizontal rules
            if (trimmed.startsWith('#') || trimmed === '---' || trimmed.startsWith('**Full Changelog')) continue;
            
            // Detect section headers (bold text like **Section Name**)
            const sectionMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
            if (sectionMatch) {
                currentSection = sectionMatch[1];
                continue;
            }
            
            // Parse markdown list items
            const listMatch = trimmed.match(/^[-*]\s*\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/) ||  // **Bold** — description
                              trimmed.match(/^[-*]\s*\*\*(.+?)\*\*:\s*(.+)$/) ||           // **Bold**: description
                              trimmed.match(/^[-*]\s*(.+)$/);                               // - Just text
            
            if (listMatch) {
                let text = '';
                let type = 'added';
                
                if (listMatch[2]) {
                    // Has title and description
                    text = `**${listMatch[1]}** — ${listMatch[2]}`;
                } else {
                    text = listMatch[1];
                }
                
                // Determine type from keywords
                const lowerText = text.toLowerCase();
                if (lowerText.includes('fix') || lowerText.includes('bug')) {
                    type = 'fixed';
                } else if (lowerText.includes('improve') || lowerText.includes('update') || lowerText.includes('change') || lowerText.includes('enhance')) {
                    type = 'improved';
                } else if (lowerText.includes('remove') || lowerText.includes('delete')) {
                    type = 'removed';
                }
                
                if (text && text.length > 2) {
                    // Clean up markdown bold
                    text = text.replace(/\*\*/g, '');
                    changes.push({ type, text: text.trim(), section: currentSection });
                }
            }
        }
        
        // If no changes found, just return the body summary
        if (changes.length === 0 && body.length > 0) {
            const summary = body.replace(/[#*`]/g, '').slice(0, 300).trim();
            return [{ type: 'added', text: summary || 'See release notes for details' }];
        }
        
        return changes;
    }

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
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
                            <span className="ml-3 text-gray-400">Loading changelog...</span>
                        </div>
                    ) : error && releases.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <p>Failed to load changelog</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    ) : (
                        releases.map((release) => {
                            const isGitHub = release.tag_name !== undefined;
                            const version = isGitHub ? release.tag_name.replace('v', '') : release.version;
                            const date = isGitHub 
                                ? new Date(release.published_at).toLocaleDateString()
                                : release.date;
                            const changes = isGitHub 
                                ? parseBody(release.body)
                                : release.changes;

                            return (
                                <div key={version}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-lg font-bold text-gold">v{version}</span>
                                        <span className="text-sm text-gray-500">{date}</span>
                                        {release.prerelease && (
                                            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                                                PRE-RELEASE
                                            </span>
                                        )}
                                    </div>
                                    {release.name && release.name !== release.tag_name && (
                                        <p className="text-gray-300 mb-2">{release.name}</p>
                                    )}
                                    <ul className="space-y-2">
                                        {changes.map((change, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className={`text-xs font-bold ${typeColors[change.type]} bg-gray-800 px-1.5 py-0.5 rounded`}>
                                                    {typeLabels[change.type]}
                                                </span>
                                                <span className="text-gray-300 text-sm">{change.text}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 flex justify-between items-center">
                    <a 
                        href="https://github.com/communityorg-discord/usgrp-override-center/releases"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-400 hover:text-gold transition-colors"
                    >
                        View all releases on GitHub →
                    </a>
                    <button onClick={onClose} className="btn btn-primary">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// Fallback static changelog if GitHub fetch fails
const staticChangelog = [
    {
        version: '2.0.1',
        date: '2026-02-02',
        changes: [
            { type: 'added', text: 'Setup Wizard - First-run flow: Login → Theme → Complete' },
            { type: 'added', text: 'GitHub Actions CI/CD - Auto-builds Windows installers' },
            { type: 'added', text: 'Auto-update system via GitHub Releases' },
            { type: 'improved', text: 'Login button now says "Login via USGRP Auth"' },
            { type: 'fixed', text: 'Token verification now checks auth database' },
        ]
    },
    {
        version: '2.0.0',
        date: '2026-02-02',
        changes: [
            { type: 'added', text: 'Deploy, Terminal, Memory, Database modules' },
            { type: 'added', text: 'Chat, Audit, Impersonation, Alerts systems' },
            { type: 'added', text: 'Files, Cron, Network, Backups management' },
            { type: 'added', text: 'Discord, Processes, Logs, Bans, Keys, Health monitoring' }
        ]
    }
];
