import React, { useState, useEffect } from 'react';

export default function TitleBar() {
    const [isMaximized, setIsMaximized] = useState(false);
    const [version, setVersion] = useState('');

    useEffect(() => {
        checkMaximized();
        getVersion();
    }, []);

    async function checkMaximized() {
        const max = await window.electron.window.isMaximized();
        setIsMaximized(max);
    }

    async function getVersion() {
        const v = await window.electron.app.getVersion();
        setVersion(v);
    }

    async function handleMinimize() {
        await window.electron.window.minimize();
    }

    async function handleMaximize() {
        const max = await window.electron.window.maximize();
        setIsMaximized(max);
    }

    async function handleClose() {
        await window.electron.window.close();
    }

    return (
        <div className="titlebar h-9 bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 border-b border-gray-800/80 flex items-center justify-between px-3 select-none">
            {/* Left: Logo and App Name */}
            <div className="flex items-center gap-3 no-drag">
                <div className="w-6 h-6 bg-gradient-to-br from-amber-500 to-amber-600 rounded-md flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <span className="text-white font-bold text-xs">U</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm tracking-tight">Override Center</span>
                    <span className="text-xs text-gray-500 font-mono bg-gray-800 px-1.5 py-0.5 rounded">v{version}</span>
                </div>
            </div>

            {/* Center: Optional status indicator */}
            <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-sm shadow-emerald-400/50"></div>
                    <span>Connected</span>
                </div>
            </div>

            {/* Right: Window Controls */}
            <div className="flex items-center no-drag">
                <button
                    onClick={handleMinimize}
                    className="w-10 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                    title="Minimize"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                </button>
                <button
                    onClick={handleMaximize}
                    className="w-10 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                    title={isMaximized ? 'Restore' : 'Maximize'}
                >
                    {isMaximized ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeWidth={2} d="M8 4h12v12M4 8h12v12H4z" />
                        </svg>
                    ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="4" y="4" width="16" height="16" strokeWidth={2} rx="1" />
                        </svg>
                    )}
                </button>
                <button
                    onClick={handleClose}
                    className="w-10 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-600 transition-colors"
                    title="Close"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
