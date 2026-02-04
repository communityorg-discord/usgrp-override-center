import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Link } from 'react-router-dom';

/**
 * QuickDeployWidget - One-click deploy shortcuts for dashboard
 */
export default function QuickDeployWidget() {
    const { fetchApi, post } = useApi();
    const [projects, setProjects] = useState([]);
    const [deploying, setDeploying] = useState(null);
    const [lastDeploy, setLastDeploy] = useState(null);
    const [loading, setLoading] = useState(true);

    // Priority projects to show
    const PRIORITY_PROJECTS = [
        'api-gateway',
        'economy-bot',
        'gov-utils',
        'usgrp-auth'
    ];

    useEffect(() => {
        loadProjects();
    }, []);

    async function loadProjects() {
        try {
            const data = await fetchApi('/override/deploy/projects');
            if (data?.projects) {
                // Filter to priority + available
                const filtered = data.projects
                    .filter(p => p.available)
                    .sort((a, b) => {
                        const aIdx = PRIORITY_PROJECTS.indexOf(a.name);
                        const bIdx = PRIORITY_PROJECTS.indexOf(b.name);
                        if (aIdx === -1 && bIdx === -1) return 0;
                        if (aIdx === -1) return 1;
                        if (bIdx === -1) return -1;
                        return aIdx - bIdx;
                    })
                    .slice(0, 6);
                setProjects(filtered);
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleQuickDeploy(project) {
        if (deploying) return;
        
        const confirmed = window.confirm(`Deploy ${project.name}?\n\nThis will:\n1. Git pull\n2. npm install\n3. Build (if applicable)\n4. Restart service`);
        if (!confirmed) return;

        setDeploying(project.name);
        
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            // Start streaming deploy
            const response = await fetch(`${apiBase}/override/deploy/${project.name}`, {
                method: 'POST',
                headers: { 'X-Override-Token': token }
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let success = true;
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(l => l.trim());
                
                for (const line of lines) {
                    try {
                        const msg = JSON.parse(line);
                        if (msg.type === 'error' || msg.type === 'fatal') success = false;
                    } catch {}
                }
            }

            setLastDeploy({
                project: project.name,
                success,
                time: new Date()
            });

            loadProjects(); // Refresh
            
        } catch (error) {
            setLastDeploy({
                project: project.name,
                success: false,
                error: error.message,
                time: new Date()
            });
        } finally {
            setDeploying(null);
        }
    }

    if (loading) {
        return (
            <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-800 rounded w-1/3 mb-3"></div>
                <div className="grid grid-cols-3 gap-2">
                    {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-800 rounded"></div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#1a1a24] border border-white/5 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-amber-400">🚀</span>
                    Quick Deploy
                </h3>
                <Link to="/deploy" className="text-xs text-gray-500 hover:text-amber-400 transition-colors">
                    Full Deploy →
                </Link>
            </div>

            {/* Last Deploy Status */}
            {lastDeploy && (
                <div className={`px-4 py-2 text-xs flex items-center gap-2 ${
                    lastDeploy.success ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
                }`}>
                    <span>{lastDeploy.success ? '✓' : '✗'}</span>
                    <span>{lastDeploy.project}</span>
                    <span className="text-gray-500 ml-auto">
                        {lastDeploy.time.toLocaleTimeString()}
                    </span>
                </div>
            )}

            {/* Quick Deploy Buttons */}
            <div className="p-3 grid grid-cols-2 gap-2">
                {projects.map(p => (
                    <button
                        key={p.name}
                        onClick={() => handleQuickDeploy(p)}
                        disabled={deploying !== null}
                        className={`p-3 rounded-lg text-left transition-all ${
                            deploying === p.name
                                ? 'bg-amber-500/20 border border-amber-500/50'
                                : p.dirty
                                    ? 'bg-yellow-900/20 border border-yellow-500/30 hover:border-yellow-500/50'
                                    : 'bg-black/20 border border-white/5 hover:border-amber-500/30'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-white truncate">
                                {p.name}
                            </span>
                            {p.dirty && (
                                <span className="text-[10px] px-1 bg-yellow-500/20 text-yellow-400 rounded">
                                    DIRTY
                                </span>
                            )}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                            {deploying === p.name ? (
                                <span className="text-amber-400 flex items-center gap-1">
                                    <span className="animate-spin">⟳</span> Deploying...
                                </span>
                            ) : (
                                <span>{p.branch}/{p.commit?.slice(0, 7)}</span>
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-white/5 text-center">
                <Link 
                    to="/deploy"
                    className="text-xs text-gray-500 hover:text-amber-400 transition-colors"
                >
                    View all {projects.length > 6 ? `${projects.length - 6} more` : 'projects'} →
                </Link>
            </div>
        </div>
    );
}
