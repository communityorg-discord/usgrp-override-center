import React, { useState, useEffect } from 'react';

export default function AboutModal({ onClose }) {
    const [version, setVersion] = useState('');

    useEffect(() => {
        async function getVersion() {
            const v = await window.electron.app.getVersion();
            setVersion(v);
        }
        getVersion();
    }, []);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="w-full max-w-md bg-surface-secondary border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 text-center">
                    {/* Logo */}
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
                        <span className="text-4xl font-bold text-white">U</span>
                    </div>
                    
                    <h1 className="text-2xl font-bold text-white">USGRP Developer Panel</h1>
                    <p className="text-gold font-semibold mt-1">v{version}</p>
                    <p className="text-gray-400 text-sm mt-2">
                        Superuser control panel for USGRP infrastructure
                    </p>
                </div>

                {/* Credits */}
                <div className="px-6 pb-4">
                    <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Developer</span>
                            <span className="text-white">USGRP / Atlas</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Framework</span>
                            <span className="text-white">Electron + React</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Platform</span>
                            <span className="text-white">{window.platform?.isWindows ? 'Windows' : window.platform?.isMac ? 'macOS' : 'Linux'}</span>
                        </div>
                    </div>
                </div>

                {/* Links */}
                <div className="px-6 pb-4 flex gap-2">
                    <button 
                        onClick={() => window.electron.shell.openExternal('https://usgrp.xyz')}
                        className="flex-1 btn btn-secondary text-sm justify-center"
                    >
                        🌐 Website
                    </button>
                    <button 
                        onClick={() => window.electron.shell.openExternal('https://docs.usgrp.xyz')}
                        className="flex-1 btn btn-secondary text-sm justify-center"
                    >
                        📚 Docs
                    </button>
                    <button 
                        onClick={() => window.electron.shell.openExternal('https://discord.gg/usgrp')}
                        className="flex-1 btn btn-secondary text-sm justify-center"
                    >
                        💬 Discord
                    </button>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 text-center">
                    <p className="text-xs text-gray-500">
                        © 2026 USGRP. All rights reserved.
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                        Restricted to authorized superusers only.
                    </p>
                </div>

                {/* Close button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
