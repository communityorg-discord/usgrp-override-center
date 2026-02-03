import React, { useState, useRef, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function TerminalPage() {
    const { fetchApi } = useApi();
    const [history, setHistory] = useState([
        { type: 'system', text: '🦅 USGRP VPS Terminal - Connected to usgrp.xyz' },
        { type: 'system', text: 'Type commands to execute on the server. Type "help" for available commands.' },
        { type: 'system', text: '' },
    ]);
    const [input, setInput] = useState('');
    const [cwd, setCwd] = useState('/home/vpcommunityorganisation');
    const [loading, setLoading] = useState(false);
    const [commandHistory, setCommandHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const inputRef = useRef(null);
    const outputRef = useRef(null);

    useEffect(() => {
        // Focus input on mount
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        // Scroll to bottom on new output
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [history]);

    async function executeCommand(cmd) {
        if (!cmd.trim()) return;

        // Add command to history
        setCommandHistory(prev => [...prev, cmd]);
        setHistoryIndex(-1);

        // Add command to output
        setHistory(prev => [...prev, { type: 'command', text: `$ ${cmd}`, cwd }]);

        // Handle built-in commands
        if (cmd === 'clear') {
            setHistory([{ type: 'system', text: '🦅 USGRP VPS Terminal - Cleared' }]);
            setInput('');
            return;
        }

        if (cmd === 'help') {
            setHistory(prev => [...prev, 
                { type: 'output', text: 'Available commands:' },
                { type: 'output', text: '  clear      - Clear terminal' },
                { type: 'output', text: '  cd <dir>   - Change directory' },
                { type: 'output', text: '  pm2 list   - List PM2 processes' },
                { type: 'output', text: '  pm2 logs   - View PM2 logs' },
                { type: 'output', text: '  Any other shell command' },
                { type: 'output', text: '' },
            ]);
            setInput('');
            return;
        }

        // Handle cd command
        if (cmd.startsWith('cd ')) {
            const newDir = cmd.slice(3).trim();
            let targetDir = newDir;
            if (newDir === '~') targetDir = '/home/vpcommunityorganisation';
            else if (newDir === '..') targetDir = cwd.split('/').slice(0, -1).join('/') || '/';
            else if (!newDir.startsWith('/')) targetDir = `${cwd}/${newDir}`;
            
            // Verify directory exists
            setLoading(true);
            try {
                const result = await fetchApi('/override/terminal/exec', {
                    method: 'POST',
                    body: JSON.stringify({ command: `cd ${targetDir} && pwd`, cwd })
                });
                if (result.success && result.stdout.trim()) {
                    setCwd(result.stdout.trim());
                    setHistory(prev => [...prev, { type: 'output', text: `Changed to ${result.stdout.trim()}` }]);
                } else {
                    setHistory(prev => [...prev, { type: 'error', text: `cd: ${targetDir}: No such directory` }]);
                }
            } catch (e) {
                setHistory(prev => [...prev, { type: 'error', text: `Error: ${e.message}` }]);
            }
            setLoading(false);
            setInput('');
            return;
        }

        // Execute command via API
        setLoading(true);
        try {
            const result = await fetchApi('/override/terminal/exec', {
                method: 'POST',
                body: JSON.stringify({ command: cmd, cwd })
            });

            if (result.stdout) {
                result.stdout.split('\n').forEach(line => {
                    setHistory(prev => [...prev, { type: 'output', text: line }]);
                });
            }
            if (result.stderr) {
                result.stderr.split('\n').forEach(line => {
                    if (line.trim()) setHistory(prev => [...prev, { type: 'error', text: line }]);
                });
            }
            if (!result.success && !result.stdout && !result.stderr) {
                setHistory(prev => [...prev, { type: 'error', text: result.error || 'Command failed' }]);
            }
        } catch (e) {
            setHistory(prev => [...prev, { type: 'error', text: `Error: ${e.message}` }]);
        }
        setLoading(false);
        setInput('');
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !loading) {
            executeCommand(input);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length > 0) {
                const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
                setHistoryIndex(newIndex);
                setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
            } else {
                setHistoryIndex(-1);
                setInput('');
            }
        } else if (e.key === 'l' && e.ctrlKey) {
            e.preventDefault();
            setHistory([{ type: 'system', text: '🦅 USGRP VPS Terminal - Cleared' }]);
        }
    }

    function getLineClass(type) {
        switch (type) {
            case 'command': return 'text-gold font-medium';
            case 'error': return 'text-red-400';
            case 'system': return 'text-gray-500 italic';
            default: return 'text-gray-300';
        }
    }

    return (
        <div className="h-full flex flex-col bg-[#0a0a0f] rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/30 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-gray-400 text-sm font-mono">vpcommunityorganisation@usgrp.xyz</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 font-mono">{cwd}</span>
                    <button
                        onClick={() => setHistory([{ type: 'system', text: '🦅 USGRP VPS Terminal - Cleared' }])}
                        className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-white/5"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Terminal Output */}
            <div 
                ref={outputRef}
                className="flex-1 overflow-y-auto p-4 font-mono text-sm"
                onClick={() => inputRef.current?.focus()}
            >
                {history.map((line, i) => (
                    <div key={i} className={`${getLineClass(line.type)} whitespace-pre-wrap break-all`}>
                        {line.text}
                    </div>
                ))}
                
                {/* Input Line */}
                <div className="flex items-center mt-1">
                    <span className="text-emerald-400 mr-2">$</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={loading}
                        className="flex-1 bg-transparent text-white outline-none font-mono"
                        placeholder={loading ? 'Executing...' : ''}
                        autoComplete="off"
                        spellCheck={false}
                    />
                    {loading && (
                        <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin ml-2"></div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-black/30 border-t border-white/5 flex items-center justify-between text-xs text-gray-600">
                <span>↑↓ Command history • Ctrl+L Clear • Enter Execute</span>
                <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Connected via API
                </span>
            </div>
        </div>
    );
}
