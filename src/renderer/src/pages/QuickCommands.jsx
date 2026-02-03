import React, { useState, useEffect, useRef } from 'react';
import { Terminal as Xterm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export default function QuickCommands() {
    const [commands, setCommands] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingCmd, setEditingCmd] = useState(null);
    const [runningCmd, setRunningCmd] = useState(null); // The command currently running (for modal)
    
    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [cmdString, setCmdString] = useState('');

    useEffect(() => {
        loadCommands();
    }, []);

    async function loadCommands() {
        const stored = await window.electron.store.get('quickCommands') || [];
        setCommands(stored);
    }

    async function saveCommand() {
        if (!name || !cmdString) return;
        
        const newCmd = {
            id: editingCmd ? editingCmd.id : Date.now().toString(),
            name,
            description,
            command: cmdString,
            createdAt: editingCmd ? editingCmd.createdAt : new Date().toISOString()
        };
        
        let newCommands;
        if (editingCmd) {
            newCommands = commands.map(c => c.id === newCmd.id ? newCmd : c);
        } else {
            newCommands = [...commands, newCmd];
        }
        
        await window.electron.store.set('quickCommands', newCommands);
        setCommands(newCommands);
        closeModal();
    }

    async function deleteCommand(id) {
        if (!confirm('Are you sure you want to delete this command?')) return;
        const newCommands = commands.filter(c => c.id !== id);
        await window.electron.store.set('quickCommands', newCommands);
        setCommands(newCommands);
    }

    function openAddModal() {
        setEditingCmd(null);
        setName('');
        setDescription('');
        setCmdString('');
        setShowAddModal(true);
    }

    function openEditModal(cmd) {
        setEditingCmd(cmd);
        setName(cmd.name);
        setDescription(cmd.description);
        setCmdString(cmd.command);
        setShowAddModal(true);
    }

    function closeModal() {
        setShowAddModal(false);
        setEditingCmd(null);
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Quick Commands</h1>
                    <p className="text-gray-400">Save and execute common terminal commands</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Command
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {commands.map(cmd => (
                    <div key={cmd.id} className="bg-[#1a1a24] border border-white/5 rounded-xl p-5 hover:border-amber-500/30 transition-all group">
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-lg text-white group-hover:text-amber-400 transition-colors">{cmd.name}</h3>
                            <div className="flex gap-2">
                                <button onClick={() => openEditModal(cmd)} className="text-gray-500 hover:text-white transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                                <button onClick={() => deleteCommand(cmd.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 mb-4 h-10 line-clamp-2">{cmd.description}</p>
                        <div className="bg-black/50 rounded p-2 mb-4 font-mono text-xs text-gray-300 truncate">
                            $ {cmd.command}
                        </div>
                        <button
                            onClick={() => setRunningCmd(cmd)}
                            className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Execute
                        </button>
                    </div>
                ))}
            </div>
            
            {commands.length === 0 && (
                <div className="text-center py-20 text-gray-500 bg-[#1a1a24]/30 rounded-2xl border border-dashed border-white/10">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-lg font-medium">No commands saved yet</p>
                    <p className="text-sm opacity-60">Create your first quick command to get started</p>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1a1a24] border border-white/10 rounded-xl w-full max-w-lg p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4">{editingCmd ? 'Edit Command' : 'New Command'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                                    placeholder="e.g. Restart Docker"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                                    placeholder="What does this do?"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Command</label>
                                <textarea
                                    value={cmdString}
                                    onChange={e => setCmdString(e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-500 h-24"
                                    placeholder="docker-compose restart"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={closeModal} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
                            <button onClick={saveCommand} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg transition-colors">
                                Save Command
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Execution Modal */}
            {runningCmd && (
                <ExecutionModal cmd={runningCmd} onClose={() => setRunningCmd(null)} />
            )}
        </div>
    );
}

function ExecutionModal({ cmd, onClose }) {
    const terminalRef = useRef(null);
    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);
    const terminalIdRef = useRef(null);

    useEffect(() => {
        // Init xterm
        const term = new Xterm({
            cursorBlink: true,
            theme: {
                background: '#000000',
                foreground: '#ffffff',
            },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14,
            rows: 20
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        if (terminalRef.current) {
            term.open(terminalRef.current);
            fitAddon.fit();
        }

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;
        
        // Start process
        startProcess(term, fitAddon);

        return () => {
             if (terminalIdRef.current && window.electron?.terminal) {
                window.electron.terminal.kill(terminalIdRef.current);
             }
             term.dispose();
        };
    }, []);

    async function startProcess(term, fitAddon) {
        try {
            term.writeln(`\x1b[33m$ ${cmd.command}\x1b[0m\r\n`);
            
            const id = await window.electron.terminal.create();
            terminalIdRef.current = id;
            
            // Initial resize
            const dims = fitAddon.proposeDimensions();
            if (dims) window.electron.terminal.resize(id, dims.cols, dims.rows);

            // Listen to data
            window.electron.terminal.onData(({ id: msgId, data }) => {
                if (msgId === id) term.write(data);
            });
            
            window.electron.terminal.onExit(({ id: msgId, exitCode }) => {
                if (msgId === id) {
                    term.writeln(`\r\n\x1b[32mProcess finished with code ${exitCode}\x1b[0m`);
                }
            });

            // Send command
            window.electron.terminal.write(id, cmd.command + '\r\n'); // Add newline to execute
            
        } catch (err) {
            term.writeln(`\x1b[31mFailed to start: ${err.message}\x1b[0m`);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1a1a24] border border-white/10 rounded-xl w-full max-w-4xl p-0 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-white/10 bg-[#0a0a0f]">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Executing: {cmd.name}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-4 bg-black flex-1 overflow-hidden relative">
                    <div ref={terminalRef} className="h-full w-full" />
                </div>
            </div>
        </div>
    );
}
