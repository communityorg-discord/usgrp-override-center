import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';

export default function Deploy() {
    const { fetchApi } = useApi();
    const [projects, setProjects] = useState([]);
    const [deployingProject, setDeployingProject] = useState(null);
    const [deployLog, setDeployLog] = useState([]);
    const logEndRef = useRef(null);

    useEffect(() => {
        loadProjects();
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

    async function handleDeploy(project) {
        if (deployingProject) return;
        
        setDeployingProject(project);
        setDeployLog([]); // Clear previous log

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
                        setDeployLog(prev => [...prev, msg]);
                    } catch (e) {
                        console.error('Failed to parse log line', line);
                    }
                }
            }
        } catch (error) {
            setDeployLog(prev => [...prev, { 
                type: 'fatal', 
                message: `Connection Error: ${error.message}`,
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setDeployingProject(null);
            loadProjects(); // Refresh status after deploy
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
            case 'stderr': return 'text-orange-300'; // Stderr isn't always error, but warn-like
            case 'info': return 'text-white';
            default: return 'text-gray-500';
        }
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Deploy Center</h1>
                <p className="text-gray-400 mt-1">Manage and deploy USGRP services</p>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((p) => (
                    <div key={p.name} className={`card ${!p.available ? 'opacity-50' : ''}`}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    p.dirty ? 'bg-yellow-900/50 text-yellow-400' : 'bg-gray-800 text-gray-400'
                                }`}>
                                    <span className="text-lg">📦</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">{p.name}</h3>
                                    {p.available ? (
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className="font-mono bg-gray-800 px-1 rounded">
                                                {p.branch || 'unknown'}
                                            </span>
                                            <span>•</span>
                                            <span className="font-mono">{p.commit || '???????'}</span>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-red-400">Path not found</p>
                                    )}
                                </div>
                            </div>
                            {p.dirty && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                    DIRTY
                                </span>
                            )}
                        </div>

                        {p.error ? (
                            <div className="text-xs text-red-400 bg-red-900/10 p-2 rounded mb-3">
                                {p.error}
                            </div>
                        ) : null}
                        
                        <button
                            onClick={() => handleDeploy(p.name)}
                            disabled={deployingProject !== null || !p.available}
                            className={`btn w-full justify-center ${
                                deployingProject === p.name 
                                    ? 'bg-blue-600/50 cursor-wait' 
                                    : 'btn-primary'
                            }`}
                        >
                            {deployingProject === p.name ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Deploying...
                                </>
                            ) : (
                                <>🚀 Deploy Now</>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {/* Deploy Log Terminal */}
            <div className="flex-1 bg-gray-950 rounded-lg border border-gray-800 flex flex-col overflow-hidden min-h-[300px]">
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
                        <div className="text-gray-600 italic text-center mt-10">
                            Select a project to start deployment
                        </div>
                    ) : (
                        deployLog.map((log, i) => (
                            <div key={i} className={`flex gap-3 ${getStatusColor(log.type)}`}>
                                <span className="text-gray-700 shrink-0 select-none">
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
    );
}
