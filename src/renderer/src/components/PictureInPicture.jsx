import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const PiPContext = React.createContext();

export function usePiP() {
    return React.useContext(PiPContext);
}

export function PiPProvider({ children }) {
    const [windows, setWindows] = useState([]);
    
    const openPiP = (id, title, content, options = {}) => {
        const existing = windows.find(w => w.id === id);
        if (existing) {
            // Bring to front
            setWindows(prev => [
                ...prev.filter(w => w.id !== id),
                existing
            ]);
            return;
        }
        
        setWindows(prev => [...prev, {
            id,
            title,
            content,
            x: options.x || 100 + (prev.length * 30),
            y: options.y || 100 + (prev.length * 30),
            width: options.width || 400,
            height: options.height || 300,
            minimized: false,
        }]);
    };
    
    const closePiP = (id) => {
        setWindows(prev => prev.filter(w => w.id !== id));
    };
    
    const updatePiP = (id, updates) => {
        setWindows(prev => prev.map(w => 
            w.id === id ? { ...w, ...updates } : w
        ));
    };
    
    const minimizePiP = (id) => {
        updatePiP(id, { minimized: true });
    };
    
    const restorePiP = (id) => {
        updatePiP(id, { minimized: false });
    };
    
    return (
        <PiPContext.Provider value={{ openPiP, closePiP, minimizePiP, restorePiP, windows }}>
            {children}
            {windows.map(win => (
                <PiPWindow
                    key={win.id}
                    {...win}
                    onClose={() => closePiP(win.id)}
                    onMinimize={() => minimizePiP(win.id)}
                    onRestore={() => restorePiP(win.id)}
                    onMove={(x, y) => updatePiP(win.id, { x, y })}
                    onResize={(width, height) => updatePiP(win.id, { width, height })}
                    onFocus={() => {
                        setWindows(prev => [
                            ...prev.filter(w => w.id !== win.id),
                            prev.find(w => w.id === win.id)
                        ]);
                    }}
                />
            ))}
            
            {/* Minimized windows dock */}
            {windows.some(w => w.minimized) && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-[9998]">
                    {windows.filter(w => w.minimized).map(win => (
                        <button
                            key={win.id}
                            onClick={() => restorePiP(win.id)}
                            className="bg-gray-800 border border-white/10 rounded-lg px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors shadow-lg flex items-center gap-2"
                        >
                            <span>📌</span>
                            {win.title}
                        </button>
                    ))}
                </div>
            )}
        </PiPContext.Provider>
    );
}

function PiPWindow({ id, title, content, x, y, width, height, minimized, onClose, onMinimize, onMove, onResize, onFocus }) {
    const windowRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                onMove(e.clientX - dragOffset.x, e.clientY - dragOffset.y);
            }
            if (isResizing) {
                const rect = windowRef.current?.getBoundingClientRect();
                if (rect) {
                    onResize(
                        Math.max(200, e.clientX - rect.left),
                        Math.max(150, e.clientY - rect.top)
                    );
                }
            }
        };
        
        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };
        
        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, isResizing, dragOffset, onMove, onResize]);
    
    if (minimized) return null;
    
    const handleDragStart = (e) => {
        e.preventDefault();
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - x,
            y: e.clientY - y
        });
        onFocus();
    };
    
    return createPortal(
        <div
            ref={windowRef}
            className="fixed z-[9999] bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col"
            style={{
                left: x,
                top: y,
                width,
                height,
            }}
            onMouseDown={onFocus}
        >
            {/* Title Bar */}
            <div
                className="flex items-center justify-between px-3 py-2 bg-gray-800/80 border-b border-white/10 cursor-move select-none"
                onMouseDown={handleDragStart}
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm">📌</span>
                    <span className="text-sm font-medium text-white truncate">{title}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onMinimize}
                        className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        −
                    </button>
                    <button
                        onClick={onClose}
                        className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:bg-red-500/50 hover:text-white transition-colors"
                    >
                        ×
                    </button>
                </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-auto p-3">
                {typeof content === 'function' ? content() : content}
            </div>
            
            {/* Resize Handle */}
            <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsResizing(true);
                    onFocus();
                }}
            >
                <svg className="w-3 h-3 text-gray-600 absolute bottom-1 right-1" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
                </svg>
            </div>
        </div>,
        document.body
    );
}

// Pre-built PiP content components
export function PiPTerminal() {
    const [output, setOutput] = useState(['$ Ready...']);
    const [command, setCommand] = useState('');
    
    const runCommand = async () => {
        if (!command.trim()) return;
        setOutput(prev => [...prev, `$ ${command}`]);
        setCommand('');
        
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            const res = await fetch(`${apiBase}/override/terminal/exec`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Override-Token': token
                },
                body: JSON.stringify({ command })
            });
            const data = await res.json();
            setOutput(prev => [...prev, data.output || data.error || 'No output']);
        } catch (err) {
            setOutput(prev => [...prev, `Error: ${err.message}`]);
        }
    };
    
    return (
        <div className="h-full flex flex-col font-mono text-xs">
            <div className="flex-1 overflow-auto bg-black/50 rounded p-2 space-y-1">
                {output.slice(-20).map((line, i) => (
                    <div key={i} className="text-green-400 whitespace-pre-wrap">{line}</div>
                ))}
            </div>
            <div className="mt-2 flex gap-2">
                <input
                    value={command}
                    onChange={e => setCommand(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runCommand()}
                    placeholder="Enter command..."
                    className="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1 text-white text-xs"
                />
                <button onClick={runCommand} className="px-2 py-1 bg-gold/20 text-gold rounded text-xs">Run</button>
            </div>
        </div>
    );
}

export function PiPLogs({ service = 'api-gateway' }) {
    const [logs, setLogs] = useState([]);
    
    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const apiBase = await window.electron.api.getBase();
                const token = await window.electron.api.getToken();
                const res = await fetch(`${apiBase}/override/terminal/exec`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Override-Token': token
                    },
                    body: JSON.stringify({ command: `pm2 logs ${service} --lines 20 --nostream` })
                });
                const data = await res.json();
                setLogs((data.output || '').split('\n').slice(-20));
            } catch (err) {
                setLogs([`Error: ${err.message}`]);
            }
        };
        fetchLogs();
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, [service]);
    
    return (
        <div className="h-full overflow-auto bg-black/50 rounded p-2 font-mono text-xs">
            {logs.map((line, i) => (
                <div key={i} className={`whitespace-pre-wrap ${line.includes('error') ? 'text-red-400' : 'text-gray-300'}`}>
                    {line}
                </div>
            ))}
        </div>
    );
}

export default PiPProvider;
