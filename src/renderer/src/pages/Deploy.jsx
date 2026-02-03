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
        </div>
    );
}
