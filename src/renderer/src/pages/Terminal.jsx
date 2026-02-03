import React, { useEffect, useRef, useState } from 'react';
import { Terminal as Xterm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export default function TerminalPage() {
    const terminalContainerRef = useRef(null);
    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);
    const terminalIdRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);
    const [terminalType, setTerminalType] = useState('unknown');

    useEffect(() => {
        // Initialize xterm
        const term = new Xterm({
            cursorBlink: true,
            cursorStyle: 'block',
            theme: {
                background: '#0a0a0f',
                foreground: '#e4e4e7',
                cursor: '#D4AF37',
                cursorAccent: '#0a0a0f',
                selectionBackground: 'rgba(212, 175, 55, 0.3)',
                black: '#09090b',
                red: '#ef4444',
                green: '#22c55e',
                yellow: '#eab308',
                blue: '#3b82f6',
                magenta: '#a855f7',
                cyan: '#06b6d4',
                white: '#e4e4e7',
                brightBlack: '#52525b',
                brightRed: '#f87171',
                brightGreen: '#4ade80',
                brightYellow: '#facc15',
                brightBlue: '#60a5fa',
                brightMagenta: '#c084fc',
                brightCyan: '#22d3ee',
                brightWhite: '#fafafa',
            },
            fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Monaco, "Courier New", monospace',
            fontSize: 14,
            lineHeight: 1.2,
            letterSpacing: 0,
            allowTransparency: true,
            scrollback: 10000,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        if (terminalContainerRef.current) {
            term.open(terminalContainerRef.current);
            // Wait a tick for DOM to be ready
            setTimeout(() => {
                fitAddon.fit();
            }, 0);
        }

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Create terminal on backend
        let unsubscribeData;
        let unsubscribeExit;

        const createTerminal = async () => {
            try {
                if (!window.electron || !window.electron.terminal) {
                    setError('Electron IPC not available. Terminal requires the desktop app.');
                    term.writeln('\x1b[31m┌────────────────────────────────────────────┐\x1b[0m');
                    term.writeln('\x1b[31m│  ⚠  Electron IPC not available            │\x1b[0m');
                    term.writeln('\x1b[31m│     Terminal requires the desktop app     │\x1b[0m');
                    term.writeln('\x1b[31m└────────────────────────────────────────────┘\x1b[0m');
                    return;
                }

                term.writeln('\x1b[90m⏳ Connecting to local shell...\x1b[0m');

                const id = await window.electron.terminal.create();
                terminalIdRef.current = id;
                setConnected(true);
                setError(null);
                
                // Clear and show welcome
                term.clear();
                term.writeln('\x1b[32m┌────────────────────────────────────────────┐\x1b[0m');
                term.writeln('\x1b[32m│  ✓ Connected to VPS Shell                  │\x1b[0m');
                term.writeln('\x1b[32m│    USGRP Developer Panel Terminal          │\x1b[0m');
                term.writeln('\x1b[32m└────────────────────────────────────────────┘\x1b[0m');
                term.writeln('');
                
                // Determine terminal type
                setTerminalType('pty');
                
                // Initial resize
                const dims = fitAddon.proposeDimensions();
                if (dims) {
                    window.electron.terminal.resize(id, dims.cols, dims.rows);
                }

                // Handle data from backend
                unsubscribeData = window.electron.terminal.onData(({ id: msgId, data }) => {
                    if (msgId === id) {
                        term.write(data);
                    }
                });

                unsubscribeExit = window.electron.terminal.onExit(({ id: msgId, exitCode }) => {
                    if (msgId === id) {
                        term.writeln('');
                        term.writeln(`\x1b[33m┌────────────────────────────────────────────┐\x1b[0m`);
                        term.writeln(`\x1b[33m│  Shell exited with code ${String(exitCode).padEnd(17)}│\x1b[0m`);
                        term.writeln(`\x1b[33m│  Press the "Reconnect" button to restart  │\x1b[0m`);
                        term.writeln(`\x1b[33m└────────────────────────────────────────────┘\x1b[0m`);
                        setConnected(false);
                    }
                });

            } catch (err) {
                console.error('Terminal creation failed:', err);
                setError(err.message);
                term.writeln('');
                term.writeln(`\x1b[31m┌────────────────────────────────────────────┐\x1b[0m`);
                term.writeln(`\x1b[31m│  ✗ Failed to create terminal               │\x1b[0m`);
                term.writeln(`\x1b[31m│    ${err.message.substring(0, 38).padEnd(38)}│\x1b[0m`);
                term.writeln(`\x1b[31m└────────────────────────────────────────────┘\x1b[0m`);
            }
        };

        createTerminal();

        // Handle input
        term.onData((data) => {
            if (terminalIdRef.current && window.electron && window.electron.terminal) {
                window.electron.terminal.write(terminalIdRef.current, data);
            }
        });

        // Handle resize
        const handleResize = () => {
            if (fitAddonRef.current && terminalIdRef.current && window.electron && window.electron.terminal) {
                fitAddonRef.current.fit();
                const dims = fitAddonRef.current.proposeDimensions();
                if (dims) {
                    window.electron.terminal.resize(terminalIdRef.current, dims.cols, dims.rows);
                }
            }
        };

        window.addEventListener('resize', handleResize);
        
        // Also handle when the sidebar toggles
        const resizeObserver = new ResizeObserver(() => {
            if (fitAddonRef.current) {
                fitAddonRef.current.fit();
            }
        });
        if (terminalContainerRef.current) {
            resizeObserver.observe(terminalContainerRef.current);
        }

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
            if (terminalIdRef.current && window.electron && window.electron.terminal) {
                window.electron.terminal.kill(terminalIdRef.current);
            }
            if (unsubscribeData) unsubscribeData();
            if (unsubscribeExit) unsubscribeExit();
            term.dispose();
        };
    }, []);

    const handleReconnect = async () => {
        if (xtermRef.current && window.electron?.terminal) {
            xtermRef.current.clear();
            xtermRef.current.writeln('\x1b[90m⏳ Reconnecting...\x1b[0m');
            
            try {
                const id = await window.electron.terminal.create();
                terminalIdRef.current = id;
                setConnected(true);
                setError(null);
                
                xtermRef.current.clear();
                xtermRef.current.writeln('\x1b[32m✓ Reconnected to shell\x1b[0m\r\n');
                
                // Resize
                const dims = fitAddonRef.current?.proposeDimensions();
                if (dims) {
                    window.electron.terminal.resize(id, dims.cols, dims.rows);
                }
            } catch (err) {
                setError(err.message);
                xtermRef.current.writeln(`\x1b[31m✗ Reconnection failed: ${err.message}\x1b[0m`);
            }
        }
    };

    const handleClear = () => {
        if (xtermRef.current) {
            xtermRef.current.clear();
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#0a0a0f] text-white">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-white/[0.06] bg-[#0d0d14]">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">💻</span>
                        <h1 className="text-lg font-bold">VPS Terminal</h1>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                        connected 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                        {connected ? '● Connected' : '○ Disconnected'}
                    </div>
                    {terminalType !== 'unknown' && connected && (
                        <div className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            PTY
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleClear}
                        className="px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        Clear
                    </button>
                    {!connected && (
                        <button
                            onClick={handleReconnect}
                            className="px-4 py-1.5 text-sm font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg transition-colors border border-amber-500/30"
                        >
                            ↻ Reconnect
                        </button>
                    )}
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <span>⚠</span>
                    <span>{error}</span>
                </div>
            )}

            {/* Terminal Container */}
            <div 
                ref={terminalContainerRef} 
                className="flex-1 overflow-hidden p-2"
                style={{ 
                    minHeight: '0',
                    backgroundColor: '#0a0a0f'
                }}
            />

            {/* Footer */}
            <div className="px-4 py-2 border-t border-white/[0.06] bg-[#0d0d14] flex items-center justify-between text-xs text-gray-600">
                <span>Shell: /bin/bash</span>
                <span>Tip: Use Ctrl+C to interrupt, Ctrl+L to clear</span>
            </div>
        </div>
    );
}
