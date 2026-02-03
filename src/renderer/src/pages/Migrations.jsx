import React, { useState, useEffect } from 'react';

export default function Migrations() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(null);

    useEffect(() => {
        loadMigrations();
    }, []);

    async function loadMigrations() {
        try {
            const data = await window.electron.ipcRenderer.invoke('migrations:getStatus');
            setProjects(data);
        } catch (error) {
            console.error('Failed to load migrations:', error);
        } finally {
            setLoading(false);
        }
    }

    async function runMigration(projectPath) {
        if (!confirm('Are you sure you want to run pending migrations for this project? This will execute "prisma migrate deploy".')) return;
        
        setRunning(projectPath);
        try {
            await window.electron.ipcRenderer.invoke('migrations:run', projectPath);
            await loadMigrations();
            alert('Migrations applied successfully!');
        } catch (error) {
            alert('Migration failed: ' + error.message);
        } finally {
            setRunning(null);
        }
    }

    async function resetDb(projectPath) {
        if (!confirm('DANGER: This will wipe the database for this project! Are you sure?')) return;
        
        setRunning(projectPath);
        try {
            await window.electron.ipcRenderer.invoke('migrations:reset', projectPath);
            await loadMigrations();
            alert('Database reset successfully!');
        } catch (error) {
            alert('Reset failed: ' + error.message);
        } finally {
            setRunning(null);
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-400">Scanning for Prisma projects...</div>;

    return (
        <div className="h-full flex flex-col">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-2">Database Migrations</h1>
                <p className="text-gray-400">Manage Prisma schema migrations across projects</p>
            </header>

            <div className="grid gap-6">
                {projects.map((project) => (
                    <div key={project.path} className="bg-surface-secondary rounded-xl border border-white/5 p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    {project.name}
                                    {project.pending > 0 && (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20">
                                            {project.pending} Pending
                                        </span>
                                    )}
                                </h2>
                                <p className="text-sm text-gray-500">{project.path}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => runMigration(project.path)}
                                    disabled={running || project.pending === 0}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                        project.pending > 0
                                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-900/20'
                                            : 'bg-white/5 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    {running === project.path ? 'Running...' : 'Run Migrations'}
                                </button>
                                <button
                                    onClick={() => resetDb(project.path)}
                                    disabled={running}
                                    className="px-4 py-2 rounded-lg text-sm font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                                >
                                    Reset DB
                                </button>
                            </div>
                        </div>

                        <div className="bg-black/30 rounded-lg p-4 font-mono text-sm">
                            {project.status ? (
                                <pre className="text-gray-300 whitespace-pre-wrap">{project.status}</pre>
                            ) : (
                                <div className="text-gray-500 italic">No status information available.</div>
                            )}
                        </div>
                    </div>
                ))}

                {projects.length === 0 && (
                    <div className="text-center py-12 bg-surface-secondary rounded-xl border border-white/5">
                        <p className="text-gray-400">No Prisma projects found in /srv/usgrp</p>
                    </div>
                )}
            </div>
        </div>
    );
}
