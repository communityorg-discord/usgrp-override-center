import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';

export default function Deploy() {
    const { fetchApi } = useApi();
    const [projects, setProjects] = useState([]);
    const [deployingProject, setDeployingProject] = useState(null);
    const [deployLog, setDeployLog] = useState([]);
    const [history, setHistory] = useState([]);
    const [scheduled, setScheduled] = useState([]);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [projectToSchedule, setProjectToSchedule] = useState(null);
    const logEndRef = useRef(null);
    
    // Rollback state
    const [showRollbackModal, setShowRollbackModal] = useState(false);
    const [rollbackProject, setRollbackProject] = useState(null);
    const [commits, setCommits] = useState([]);
    const [currentCommit, setCurrentCommit] = useState('');
    const [loadingCommits, setLoadingCommits] = useState(false);
    const [rollingBack, setRollingBack] = useState(false);

    useEffect(() => {
        loadProjects();
        loadHistory();
        loadScheduled();
        
        const interval = setInterval(loadScheduled, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [deployLog]);

    async function loadProjects() {
        try {
            const data = await fetchApi('/override/deploy/projects');
            if (data?.projects) {
                setProjects(data.projects);
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    }

    async function loadHistory() {
        const h = await window.electron.store.get('deploy_history') || [];
        setHistory(h);
    }

    async function loadScheduled() {
        if (window.electron.deploy) {
            const s = await window.electron.deploy.getScheduled();
            setScheduled(s.sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor)));
        }
    }

    async function handleDeploy(project) {
        if (deployingProject) return;
        
        setDeployingProject(project);
        setDeployLog([]); // Clear previous log
        let hasError = false;

        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/deploy/${project}`, {
                method: 'POST',
                headers: {
                    'X-Override-Token': token
                }
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(l => l.trim());
                
                for (const line of lines) {
                    try {
                        const msg = JSON.parse(line);
                        if (msg.type === 'error' || msg.type === 'fatal') hasError = true;
                        setDeployLog(prev => [...prev, msg]);
                    } catch (e) {
                        console.error('Failed to parse log line', line);
                    }
                }
            }
        } catch (error) {
            hasError = true;
            setDeployLog(prev => [...prev, { 
                type: 'fatal', 
                message: `Connection Error: ${error.message}`,
                timestamp: new Date().toISOString()
            }]);
        } finally {
            // Save History
            const newEntry = {
                id: Date.now(),
                project,
                timestamp: new Date().toISOString(),
                status: hasError ? 'failed' : 'success',
                user: 'You' // Placeholder
            };
            const newHistory = [newEntry, ...history].slice(0, 50);
            setHistory(newHistory);
            window.electron.store.set('deploy_history', newHistory);

            setDeployingProject(null);
            loadProjects(); // Refresh status after deploy
        }
    }

    async function handleScheduleSubmit(e) {
        e.preventDefault();
        if (!projectToSchedule || !scheduleDate) return;

        const currentServer = await window.electron.servers.getCurrent();
        
        await window.electron.deploy.schedule({
            project: projectToSchedule,
            scheduledFor: new Date(scheduleDate).toISOString(),
            serverId: currentServer
        });
        
        setShowScheduleModal(false);
        setScheduleDate('');
        setProjectToSchedule(null);
        loadScheduled();
    }

    async function cancelSchedule(id) {
        if (confirm('Cancel this scheduled deployment?')) {
            await window.electron.deploy.cancelScheduled(id);
            loadScheduled();
        }
    }

    function openScheduleModal(project) {
        setProjectToSchedule(project);
        // Default to tomorrow 00:00
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        // Format for datetime-local input: YYYY-MM-DDTHH:mm
        const iso = tomorrow.toISOString().slice(0, 16);
        setScheduleDate(iso);
        setShowScheduleModal(true);
    }

    async function openRollbackModal(project) {
        setRollbackProject(project);
        setShowRollbackModal(true);
        setLoadingCommits(true);
        setCommits([]);
        
        try {
            const data = await fetchApi(`/override/deploy/${project}/commits?limit=15`);
            if (data?.commits) {
                setCommits(data.commits);
                setCurrentCommit(data.current);
            }
        } catch (error) {
            console.error('Failed to load commits:', error);
        } finally {
            setLoadingCommits(false);
        }
    }

    async function handleRollback(commit) {
        if (rollingBack || deployingProject) return;
        
        const confirmed = confirm(`Rollback ${rollbackProject} to commit ${commit.short}?\n\n"${commit.message}"\n\nThis will restart the service.`);
        if (!confirmed) return;
        
        setRollingBack(true);
        setShowRollbackModal(false);
        setDeployLog([]);
        setDeployingProject(rollbackProject);
        
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/deploy/${rollbackProject}/rollback`, {
                method: 'POST',
                headers: {
                    'X-Override-Token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ commit: commit.hash })
            });
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let hasError = false;
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(l => l.trim());
                
                for (const line of lines) {
                    try {
                        const msg = JSON.parse(line);
                        if (msg.type === 'error' || msg.type === 'fatal') hasError = true;
                        setDeployLog(prev => [...prev, msg]);
                    } catch (e) {
                        console.error('Failed to parse log line', line);
                    }
                }
            }
            
            // Save to history
            const newEntry = {
                id: Date.now(),
                project: rollbackProject,
                timestamp: new Date().toISOString(),
                status: hasError ? 'failed' : 'success',
                type: 'rollback',
                commit: commit.short,
                user: 'You'
            };
            const newHistory = [newEntry, ...history].slice(0, 50);
            setHistory(newHistory);
            window.electron.store.set('deploy_history', newHistory);
            
        } catch (error) {
            setDeployLog(prev => [...prev, { 
                type: 'fatal', 
                message: `Rollback Error: ${error.message}`,
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setDeployingProject(null);
            setRollingBack(false);
            loadProjects();
        }
    }

    async function handleReturnToLatest() {
        if (rollingBack || deployingProject) return;
        
        const confirmed = confirm(`Return ${rollbackProject} to latest on main branch?\n\nThis will checkout main, pull, and restart.`);
        if (!confirmed) return;
        
        setRollingBack(true);
        setShowRollbackModal(false);
        setDeployLog([]);
        setDeployingProject(rollbackProject);
        
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/deploy/${rollbackProject}/rollback-undo`, {
                method: 'POST',
                headers: {
                    'X-Override-Token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ branch: 'main' })
            });
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(l => l.trim());
                
                for (const line of lines) {
                    try {
                        const msg = JSON.parse(line);
                        setDeployLog(prev => [...prev, msg]);
                    } catch (e) {}
                }
            }
        } catch (error) {
            setDeployLog(prev => [...prev, { 
                type: 'fatal', 
                message: `Error: ${error.message}`,
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setDeployingProject(null);
            setRollingBack(false);
            loadProjects();
        }
    }

    function getStatusColor(type) {
        switch (type) {
            case 'success': return 'text-emerald-400';
            case 'error': return 'text-red-400';
            case 'fatal': return 'text-red-500 font-bold';
            case 'warning': return 'text-yellow-400';
            case 'command': return 'text-blue-400';
            case 'stdout': return 'text-gray-400';
            case 'stderr': return 'text-orange-300';
            case 'info': return 'text-white';
            default: return 'text-gray-500';
        }
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-white">Deploy Center</h1>
                    <p className="text-gray-400 mt-1">Manage and deploy USGRP services</p>
                </div>
            </div>

            <div className="flex gap-6 h-full min-h-0">
                {/* Left: Projects & Schedule */}
                <div className="w-1/3 flex flex-col gap-4">
                    <div className="flex-1 overflow-auto space-y-4 pr-2">
                        {projects.map((p) => (
                            <div key={p.name} className={`bg-[#1a1a24] border border-white/5 rounded-xl p-4 transition-all ${!p.available ? 'opacity-50' : ''}`}>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                            p.dirty ? 'bg-yellow-900/50 text-yellow-400' : 'bg-gray-800 text-gray-400'
                                        }`}>
                                            <span className="text-sm">📦</span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white text-sm">{p.name}</h3>
                                            {p.available ? (
                                                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                    <span className="font-mono bg-gray-800 px-1 rounded">{p.branch || 'unk'}</span>
                                                    <span>•</span>
                                                    <span className="font-mono">{p.commit ? p.commit.substring(0, 7) : '????'}</span>
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-red-400">Path not found</p>
                                            )}
                                        </div>
                                    </div>
                                    {p.dirty && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">DIRTY</span>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleDeploy(p.name)}
                                        disabled={deployingProject !== null || !p.available}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                            deployingProject === p.name 
                                                ? 'bg-blue-600/50 cursor-wait text-white' 
                                                : 'bg-amber-500 hover:bg-amber-600 text-black'
                                        }`}
                                    >
                                        {deployingProject === p.name ? 'Deploying...' : '🚀 Deploy Now'}
                                    </button>
                                    <button
                                        onClick={() => openRollbackModal(p.name)}
                                        disabled={!p.available || deployingProject !== null}
                                        className="px-3 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg transition-colors"
                                        title="Rollback to Previous Version"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => openScheduleModal(p.name)}
                                        disabled={!p.available}
                                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                                        title="Schedule Deploy"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Scheduled Deploys */}
                        {scheduled.length > 0 && (
                            <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Scheduled
                                </h3>
                                <div className="space-y-2">
                                    {scheduled.map(job => (
                                        <div key={job.id} className="bg-black/20 p-2 rounded border border-white/5 flex justify-between items-center text-xs">
                                            <div>
                                                <div className="font-bold text-white">{job.project}</div>
                                                <div className="text-gray-500">{new Date(job.scheduledFor).toLocaleString()}</div>
                                                <div className={`text-[10px] uppercase font-bold mt-0.5 ${
                                                    job.status === 'pending' ? 'text-blue-400' :
                                                    job.status === 'completed' ? 'text-green-400' :
                                                    job.status === 'failed' ? 'text-red-400' : 'text-gray-400'
                                                }`}>
                                                    {job.status}
                                                </div>
                                            </div>
                                            {job.status === 'pending' && (
                                                <button 
                                                    onClick={() => cancelSchedule(job.id)}
                                                    className="text-gray-500 hover:text-red-400"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* History */}
                    <div className="h-1/3 bg-[#1a1a24] border border-white/5 rounded-xl flex flex-col overflow-hidden">
                        <div className="px-4 py-2 border-b border-white/5 bg-[#0a0a0f]/50">
                            <h3 className="text-xs font-bold text-gray-400 uppercase">Recent Deploys</h3>
                        </div>
                        <div className="flex-1 overflow-auto p-2 space-y-1">
                            {history.map(h => (
                                <div key={h.id} className="flex justify-between items-center p-2 rounded hover:bg-white/5 text-xs">
                                    <div>
                                        <span className={`font-bold mr-2 ${h.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                            {h.status === 'success' ? '✓' : '✗'}
                                        </span>
                                        <span className="text-white">{h.project}</span>
                                        {h.type === 'rollback' && (
                                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                                ⏪ {h.commit}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-gray-500">{new Date(h.timestamp).toLocaleTimeString()}</span>
                                </div>
                            ))}
                            {history.length === 0 && <p className="text-center text-gray-600 text-xs py-4">No history</p>}
                        </div>
                    </div>
                </div>

                {/* Right: Console */}
                <div className="flex-1 bg-gray-950 rounded-lg border border-gray-800 flex flex-col overflow-hidden">
                    <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 flex justify-between items-center">
                        <span className="text-xs font-mono text-gray-400">Deployment Console</span>
                        {deployingProject && (
                            <span className="text-xs text-blue-400 animate-pulse">
                                ● Live: {deployingProject}
                            </span>
                        )}
                    </div>
                    <div className="flex-1 p-4 overflow-auto font-mono text-xs space-y-1">
                        {deployLog.length === 0 ? (
                            <div className="text-gray-600 italic text-center mt-20">
                                Select a project to start deployment
                            </div>
                        ) : (
                            deployLog.map((log, i) => (
                                <div key={i} className={`flex gap-3 ${getStatusColor(log.type)}`}>
                                    <span className="text-gray-700 shrink-0 select-none w-16">
                                        {log.timestamp?.split('T')[1]?.split('.')[0]}
                                    </span>
                                    <span className="break-all whitespace-pre-wrap">
                                        {log.type === 'command' ? '$ ' : ''}{log.message}
                                    </span>
                                </div>
                            ))
                        )}
                        <div ref={logEndRef} />
                    </div>
                </div>
            </div>

            {/* Schedule Modal */}
            {showScheduleModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#1a1a24] p-6 rounded-xl border border-white/10 w-full max-w-sm shadow-2xl">
                        <h2 className="text-lg font-bold text-white mb-4">Schedule Deploy: {projectToSchedule}</h2>
                        <form onSubmit={handleScheduleSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm text-gray-400 mb-1">Date & Time</label>
                                <input 
                                    type="datetime-local" 
                                    required
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                                    value={scheduleDate}
                                    onChange={e => setScheduleDate(e.target.value)}
                                    min={new Date().toISOString().slice(0, 16)}
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setShowScheduleModal(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white text-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg text-sm"
                                >
                                    Schedule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Rollback Modal */}
            {showRollbackModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#1a1a24] p-6 rounded-xl border border-white/10 w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                                Rollback: {rollbackProject}
                            </h2>
                            <button onClick={() => setShowRollbackModal(false)} className="text-gray-500 hover:text-white">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        {loadingCommits ? (
                            <div className="flex-1 flex items-center justify-center text-gray-500">
                                <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                            </div>
                        ) : (
                            <>
                                <div className="mb-3 p-2 bg-blue-900/20 border border-blue-500/30 rounded-lg text-xs text-blue-300">
                                    <span className="font-bold">Current:</span> {currentCommit?.substring(0, 7)}
                                    <button 
                                        onClick={handleReturnToLatest}
                                        className="ml-3 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold"
                                    >
                                        ↑ Return to Latest
                                    </button>
                                </div>
                                
                                <div className="flex-1 overflow-auto space-y-2 pr-2">
                                    {commits.map((c, i) => (
                                        <div 
                                            key={c.hash}
                                            className={`p-3 rounded-lg border transition-all cursor-pointer hover:border-purple-500/50 ${
                                                currentCommit === c.hash 
                                                    ? 'bg-green-900/20 border-green-500/50' 
                                                    : 'bg-black/30 border-white/5'
                                            }`}
                                            onClick={() => currentCommit !== c.hash && handleRollback(c)}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs bg-gray-800 px-1.5 py-0.5 rounded text-purple-300">
                                                        {c.short}
                                                    </span>
                                                    {currentCommit === c.hash && (
                                                        <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">
                                                            CURRENT
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-gray-500">
                                                    {new Date(c.date).toLocaleDateString()} {new Date(c.date).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-white truncate">{c.message}</p>
                                            <p className="text-[10px] text-gray-500 mt-1">{c.author}</p>
                                        </div>
                                    ))}
                                </div>
                                
                                <p className="mt-3 text-[10px] text-gray-600 text-center">
                                    Click a commit to rollback. This will checkout that commit, reinstall deps, rebuild, and restart.
                                </p>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
