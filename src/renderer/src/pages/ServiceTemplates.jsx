import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';

const TEMPLATES = [
    {
        id: 'discord-bot',
        name: 'Discord Bot',
        description: 'A basic Discord.js bot with command handling and event listeners.',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
        gitUrl: 'https://github.com/usgrp/template-discord-bot.git',
        setup: ['npm install', 'npm run build'],
        start: 'pm2 start index.js --name {name}'
    },
    {
        id: 'nextjs-app',
        name: 'Next.js App',
        description: 'Full-stack React framework with SSR and API routes.',
        icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
        gitUrl: 'https://github.com/usgrp/template-nextjs.git',
        setup: ['npm install', 'npm run build'],
        start: 'pm2 start npm --name {name} -- start'
    },
    {
        id: 'express-api',
        name: 'Express API',
        description: 'Lightweight Node.js API with extensive middleware support.',
        icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
        gitUrl: 'https://github.com/usgrp/template-express.git',
        setup: ['npm install'],
        start: 'pm2 start server.js --name {name}'
    },
    {
        id: 'static-site',
        name: 'Static Site',
        description: 'Simple HTML/CSS/JS site served via PM2 serve.',
        icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
        gitUrl: 'https://github.com/usgrp/template-static.git',
        setup: [],
        start: 'pm2 serve . 8080 --name {name}'
    }
];

export default function ServiceTemplates() {
    const { fetchApi } = useApi();
    const [deploying, setDeploying] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [serviceName, setServiceName] = useState('');
    const [logs, setLogs] = useState([]);

    function handleSelect(template) {
        setSelectedTemplate(template);
        setServiceName('');
        setShowModal(true);
    }

    async function handleDeploy(e) {
        e.preventDefault();
        if (!serviceName || !selectedTemplate) return;
        
        setDeploying(selectedTemplate.id);
        setShowModal(false);
        setLogs(prev => [...prev, { type: 'info', message: `Starting deployment of ${selectedTemplate.name} as "${serviceName}"...` }]);

        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            // Assuming an endpoint exists for this. If not, this is a placeholder.
            const response = await fetch(`${apiBase}/override/services/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Override-Token': token
                },
                body: JSON.stringify({
                    templateId: selectedTemplate.id,
                    name: serviceName,
                    gitUrl: selectedTemplate.gitUrl,
                    setup: selectedTemplate.setup,
                    start: selectedTemplate.start.replace('{name}', serviceName)
                })
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setLogs(prev => [...prev, { type: 'success', message: `Service "${serviceName}" deployed successfully! ID: ${data.id || '?'}` }]);
            
        } catch (error) {
            setLogs(prev => [...prev, { type: 'error', message: `Deployment failed: ${error.message}` }]);
        } finally {
            setDeploying(null);
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Service Templates</h1>
                <p className="text-gray-400 mt-1">Quickly deploy common services to the server</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {TEMPLATES.map(template => (
                    <div key={template.id} className="bg-[#1a1a24] border border-white/5 rounded-xl p-5 hover:border-amber-500/30 transition-all group flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={template.icon} />
                                </svg>
                            </div>
                            <h3 className="font-bold text-lg text-white">{template.name}</h3>
                        </div>
                        <p className="text-sm text-gray-400 mb-6 flex-1">{template.description}</p>
                        <button
                            onClick={() => handleSelect(template)}
                            disabled={deploying !== null}
                            className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {deploying === template.id ? 'Deploying...' : 'Deploy Template'}
                        </button>
                    </div>
                ))}
            </div>

            {/* Logs Area */}
            {logs.length > 0 && (
                <div className="bg-black/50 border border-white/10 rounded-xl p-4 font-mono text-sm max-h-60 overflow-auto">
                    {logs.map((log, i) => (
                        <div key={i} className={`mb-1 ${
                            log.type === 'error' ? 'text-red-400' : 
                            log.type === 'success' ? 'text-green-400' : 'text-gray-300'
                        }`}>
                            <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>
                            {log.message}
                        </div>
                    ))}
                </div>
            )}

            {/* Config Modal */}
            {showModal && selectedTemplate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#1a1a24] p-6 rounded-xl border border-white/10 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4">Deploy {selectedTemplate.name}</h2>
                        <form onSubmit={handleDeploy} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Service Name</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                                    placeholder="my-awesome-service"
                                    value={serviceName}
                                    onChange={e => setServiceName(e.target.value.replace(/[^a-z0-9-]/g, ''))}
                                />
                                <p className="text-xs text-gray-500 mt-1">Lowercase, numbers, and hyphens only.</p>
                            </div>
                            <div className="bg-black/30 p-3 rounded text-xs font-mono text-gray-400 space-y-1">
                                <p>1. git clone {selectedTemplate.gitUrl}</p>
                                {selectedTemplate.setup.map((cmd, i) => <p key={i}>{i+2}. {cmd}</p>)}
                                <p>{selectedTemplate.setup.length + 2}. {selectedTemplate.start.replace('{name}', serviceName || '{name}')}</p>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button 
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg"
                                >
                                    Start Deployment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
