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

    useEffect(() => {
        // Initialize xterm
        const term = new Xterm({
            cursorBlink: true,
            theme: {
                background: '#0a0a0f',
                foreground: '#ffffff',
            },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        if (terminalContainerRef.current) {
            term.open(terminalContainerRef.current);
            fitAddon.fit();
        }

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Create terminal on backend
        let unsubscribeData;
        let unsubscribeExit;

        const createTerminal = async () => {
            try {
                if (!window.electron || !window.electron.terminal) {
                    term.writeln('\x1b[31mError: Electron IPC not available.\x1b[0m');
                    return;
                }

                const id = await window.electron.terminal.create();
                terminalIdRef.current = id;
                setConnected(true);
                term.writeln('\x1b[32mConnected to local shell.\x1b[0m\r\n');
                
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
                        term.writeln(`\r\n\x1b[33mProcess exited with code ${exitCode}\x1b[0m`);
                        setConnected(false);
                    }
                });

            } catch (err) {
                term.writeln(`\r\n\x1b[31mFailed to create terminal: ${err.message}\x1b[0m`);
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

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            if (terminalIdRef.current && window.electron && window.electron.terminal) {
                window.electron.terminal.kill(terminalIdRef.current);
            }
            if (unsubscribeData) unsubscribeData();
            if (unsubscribeExit) unsubscribeExit();
            term.dispose();
        };
    }, []);

    return (
        <div className="h-full flex flex-col bg-[#0a0a0f] text-white p-4">
            <div className="flex justify-between items-center mb-2">
                 <h1 className="text-xl font-bold">Local Terminal</h1>
                 <div className={`text-xs px-2 py-1 rounded ${connected ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                     {connected ? 'CONNECTED' : 'DISCONNECTED'}
                 </div>
            </div>
            <div 
                ref={terminalContainerRef} 
                className="flex-1 overflow-hidden rounded border border-gray-800"
                style={{ minHeight: '0' }}
            />
        </div>
    );
}
