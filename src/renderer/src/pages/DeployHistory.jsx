import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Link } from 'react-router-dom';

export default function DeployHistory() {
    const { fetchApi } = useApi();
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [gitHistory, setGitHistory] = useState([]);
    const [deployHistory, setDeployHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [rollbackModal, setRollbackModal] = useState(null);
    const [rollbackStatus, setRollbackStatus] = useState(null);
    const [compareModal, setCompareModal] = useState(null);
    const [compareData, setCompareData] = useState(null);
    
    useEffect(() => {
        loadProjects();
        loadDeployHistory();
    }, []);

    useEffect(() => {
        if (selectedProject) {
            loadGitHistory(selectedProject);
        }
    }, [selectedProject]);

    async function loadProjects() {
        try {
            const data = await fetchApi('/override/deploy/projects');
            if (data?.projects) {
                setProjects(data.projects);
                if (data.projects.length > 0 && !selectedProject) {
                    setSelectedProject(data.projects[0].name);
                }
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    }

    async function loadDeployHistory() {
        const h = await window.electron.store.get('deploy_history') || [];
        setDeployHistory(h);
    }

    async function loadGitHistory(projectName) {
        setLoading(true);
        try {
            const project = projects.find(p => p.name === projectName);
            if (!project?.path) return;
            
            const log = await window.electron.git.log(project.path);
            setGitHistory(log || []);
        } catch (error) {
            console.error('Failed to load git history:', error);
            setGitHistory([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleRollback(commit) {
        setRollbackStatus({ type: 'loading', message: 'Starting rollback...' });
        
        try {
            const project = projects.find(p => p.name === selectedProject);
            if (!project?.path) throw new Error('Project path not found');

            // Step 1: Reset to the selected commit
            setRollbackStatus({ type: 'loading', message: 'Resetting to commit...' });
            await window.electron.git.reset(project.path, 'hard', commit.hash);

            // Step 2: Trigger a deployment
            setRollbackStatus({ type: 'loading', message: 'Triggering deployment...' });
            
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/deploy/${selectedProject}`, {
                method: 'POST',
                headers: { 'X-Override-Token': token }
            });

            if (!response.ok) {
                throw new Error('Deployment failed');
            }

            // Read the stream for deploy status
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let deploySuccess = true;
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(l => l.trim());
                
                for (const line of lines) {
                    try {
                        const msg = JSON.parse(line);
                        if (msg.type === 'error' || msg.type === 'fatal') {
                            deploySuccess = false;
                        }
                    } catch (e) {}
                }
            }

            if (deploySuccess) {
                setRollbackStatus({ type: 'success', message: `Successfully rolled back to ${commit.hash.substring(0, 7)}` });
                
                // Record this rollback in history
                const newEntry = {
                    id: Date.now(),
                    project: selectedProject,
                    timestamp: new Date().toISOString(),
                    status: 'success',
                    type: 'rollback',
                    toCommit: commit.hash,
                    commitMessage: commit.message,
                    user: 'You'
                };
                const newHistory = [newEntry, ...deployHistory].slice(0, 100);
                setDeployHistory(newHistory);
                window.electron.store.set('deploy_history', newHistory);
                
                // Refresh git history
                loadGitHistory(selectedProject);
            } else {
                setRollbackStatus({ type: 'error', message: 'Deployment after rollback failed' });
            }
        } catch (error) {
            setRollbackStatus({ type: 'error', message: error.message });
        }
        
        setTimeout(() => {
            setRollbackModal(null);
            setRollbackStatus(null);
        }, 3000);
    }

    async function handleCompare(commit1, commit2) {
        setCompareModal({ commit1, commit2 });
        setCompareData(null);
        
        try {
            const project = projects.find(p => p.name === selectedProject);
            if (!project?.path) return;
            
            // Get diff between commits via API
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/git/diff?path=${encodeURIComponent(project.path)}&from=${commit1.hash}&to=${commit2.hash}`, {
                headers: { 'X-Override-Token': token }
            });
            
            if (response.ok) {
                const data = await response.json();
                setCompareData(data);
            } else {
                setCompareData({ error: 'Failed to fetch diff' });
            }
        } catch (error) {
            setCompareData({ error: error.message });
        }
    }

    const currentProject = projects.find(p => p.name === selectedProject);
    const projectDeployHistory = deployHistory.filter(d => d.project === selectedProject);

    function formatTimeAgo(date) {
        const now = new Date();
        const then = new Date(date);
        const diff = Math.floor((now - then) / 1000);
        
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return then.toLocaleDateString();
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Deployment History & Rollback
                    </h1>
                    <p className="text-gray-400 mt-1">View deployment history and rollback to previous versions</p>
                </div>
                <Link 
                    to="/deploy"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Deploy Center
                </Link>
            </div>

            <div className="flex gap-6 flex-1 min-h-0">
                {/* Left: Project Selector & Deploy History */}
                <div className="w-80 flex flex-col gap-4">
                    {/* Project Selector */}
                    <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Select Project</h3>
                        <div className="space-y-2">
                            {projects.map(p => (
                                <button
                                    key={p.name}
                                    onClick={() => setSelectedProject(p.name)}
                                    className={`w-full text-left p-3 rounded-lg transition-all ${
                                        selectedProject === p.name
                                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                                            : 'bg-white/5 border border-transparent text-gray-300 hover:bg-white/10'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-sm">{p.name}</span>
                                        {p.dirty && (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400">DIRTY</span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-gray-500 font-mono mt-1">
                                        {p.branch} • {p.commit?.substring(0, 7) || '???'}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recent Deploys for this Project */}
                    <div className="flex-1 bg-[#1a1a24] border border-white/5 rounded-xl flex flex-col overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/5">
                            <h3 className="text-xs font-bold text-gray-400 uppercase">Recent Deployments</h3>
                        </div>
                        <div className="flex-1 overflow-auto p-3 space-y-2">
                            {projectDeployHistory.length === 0 ? (
                                <p className="text-center text-gray-600 text-xs py-4">No deployments yet</p>
                            ) : (
                                projectDeployHistory.slice(0, 20).map(h => (
                                    <div key={h.id} className={`p-3 rounded-lg border ${
                                        h.type === 'rollback' 
                                            ? 'bg-purple-500/5 border-purple-500/20' 
                                            : h.status === 'success' 
                                                ? 'bg-emerald-500/5 border-emerald-500/20' 
                                                : 'bg-red-500/5 border-red-500/20'
                                    }`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-xs font-bold ${
                                                h.type === 'rollback' ? 'text-purple-400' :
                                                h.status === 'success' ? 'text-emerald-400' : 'text-red-400'
                                            }`}>
                                                {h.type === 'rollback' ? '↩️ ROLLBACK' : h.status === 'success' ? '✓ SUCCESS' : '✗ FAILED'}
                                            </span>
                                            <span className="text-[10px] text-gray-500">{formatTimeAgo(h.timestamp)}</span>
                                        </div>
                                        {h.toCommit && (
                                            <p className="text-[10px] text-gray-400 font-mono truncate">
                                                → {h.toCommit.substring(0, 7)}: {h.commitMessage}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Git Commit History */}
                <div className="flex-1 bg-[#1a1a24] border border-white/5 rounded-xl flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-white">Git Commit History</h3>
                            <p className="text-[10px] text-gray-500">{currentProject?.path || 'No project selected'}</p>
                        </div>
                        <button
                            onClick={() => selectedProject && loadGitHistory(selectedProject)}
                            className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                            title="Refresh"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : gitHistory.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                <p>No commits found</p>
                            </div>
                        ) : (
                            <div className="p-4 space-y-1">
                                {/* Current HEAD indicator */}
                                {gitHistory.length > 0 && (
                                    <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                        <span className="text-xs text-emerald-400 font-bold">CURRENT VERSION</span>
                                        <span className="text-xs text-gray-400 font-mono">{gitHistory[0]?.hash?.substring(0, 7)}</span>
                                    </div>
                                )}
                                
                                {gitHistory.map((commit, index) => (
                                    <div 
                                        key={commit.hash}
                                        className={`group relative p-3 rounded-lg border transition-all hover:bg-white/5 ${
                                            index === 0 
                                                ? 'bg-emerald-500/5 border-emerald-500/20' 
                                                : 'border-white/5 hover:border-white/10'
                                        }`}
                                    >
                                        {/* Timeline connector */}
                                        {index < gitHistory.length - 1 && (
                                            <div className="absolute left-6 top-full w-0.5 h-1 bg-white/10"></div>
                                        )}
                                        
                                        <div className="flex items-start gap-3">
                                            {/* Commit dot */}
                                            <div className={`mt-1 w-3 h-3 rounded-full border-2 ${
                                                index === 0 
                                                    ? 'bg-emerald-500 border-emerald-500' 
                                                    : 'bg-transparent border-gray-600'
                                            }`}></div>
                                            
                                            {/* Commit info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-mono text-xs text-amber-400">{commit.hash?.substring(0, 7)}</span>
                                                    {index === 0 && (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400">HEAD</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-white truncate">{commit.message}</p>
                                                <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                                                    <span>{commit.author}</span>
                                                    <span>{formatTimeAgo(commit.date)}</span>
                                                </div>
                                            </div>
                                            
                                            {/* Actions */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {index > 0 && (
                                                    <>
                                                        <button
                                                            onClick={() => handleCompare(gitHistory[0], commit)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                                                            title="Compare with current"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => setRollbackModal(commit)}
                                                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                            title="Rollback to this commit"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                            </svg>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Rollback Confirmation Modal */}
            {rollbackModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        {rollbackStatus ? (
                            <div className="text-center py-4">
                                {rollbackStatus.type === 'loading' && (
                                    <>
                                        <div className="w-12 h-12 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-white">{rollbackStatus.message}</p>
                                    </>
                                )}
                                {rollbackStatus.type === 'success' && (
                                    <>
                                        <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <p className="text-emerald-400 font-medium">{rollbackStatus.message}</p>
                                    </>
                                )}
                                {rollbackStatus.type === 'error' && (
                                    <>
                                        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </div>
                                        <p className="text-red-400 font-medium">{rollbackStatus.message}</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Confirm Rollback</h3>
                                        <p className="text-sm text-gray-400">This action will reset the repository</p>
                                    </div>
                                </div>
                                
                                <div className="bg-black/30 rounded-lg p-4 mb-4 border border-white/5">
                                    <p className="text-sm text-gray-400 mb-2">Rolling back <span className="text-amber-400 font-bold">{selectedProject}</span> to:</p>
                                    <div className="font-mono">
                                        <span className="text-amber-400">{rollbackModal.hash?.substring(0, 7)}</span>
                                        <p className="text-white text-sm mt-1 truncate">{rollbackModal.message}</p>
                                        <p className="text-xs text-gray-500 mt-1">{rollbackModal.author} • {formatTimeAgo(rollbackModal.date)}</p>
                                    </div>
                                </div>

                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                                    <p className="text-xs text-red-400">
                                        ⚠️ <strong>Warning:</strong> This will perform a hard reset and redeploy. Any uncommitted changes will be lost.
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setRollbackModal(null)}
                                        className="flex-1 py-2 px-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleRollback(rollbackModal)}
                                        className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors"
                                    >
                                        Rollback & Deploy
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Compare Modal */}
            {compareModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#1a1a24] border border-white/10 rounded-xl max-w-4xl w-full mx-4 shadow-2xl max-h-[80vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-white">Compare Commits</h3>
                                <p className="text-xs text-gray-500 font-mono mt-1">
                                    {compareModal.commit1.hash?.substring(0, 7)} → {compareModal.commit2.hash?.substring(0, 7)}
                                </p>
                            </div>
                            <button
                                onClick={() => { setCompareModal(null); setCompareData(null); }}
                                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-6">
                            {!compareData ? (
                                <div className="flex items-center justify-center h-32">
                                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : compareData.error ? (
                                <div className="text-center text-red-400 py-8">
                                    <p>{compareData.error}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                                            <p className="text-[10px] text-red-400 uppercase font-bold mb-1">From (Current)</p>
                                            <p className="font-mono text-sm text-white">{compareModal.commit1.hash?.substring(0, 7)}</p>
                                            <p className="text-xs text-gray-400 truncate">{compareModal.commit1.message}</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                                            <p className="text-[10px] text-emerald-400 uppercase font-bold mb-1">To (Rollback Target)</p>
                                            <p className="font-mono text-sm text-white">{compareModal.commit2.hash?.substring(0, 7)}</p>
                                            <p className="text-xs text-gray-400 truncate">{compareModal.commit2.message}</p>
                                        </div>
                                    </div>
                                    
                                    {compareData.stats && (
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="text-gray-400">{compareData.stats.filesChanged} files changed</span>
                                            <span className="text-emerald-400">+{compareData.stats.insertions} insertions</span>
                                            <span className="text-red-400">-{compareData.stats.deletions} deletions</span>
                                        </div>
                                    )}
                                    
                                    <div className="bg-black/40 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                                        <pre className="text-gray-300 whitespace-pre-wrap">
                                            {compareData.diff || 'No diff available'}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
