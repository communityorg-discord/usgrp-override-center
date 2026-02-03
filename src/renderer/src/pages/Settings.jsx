import React, { useState, useEffect } from 'react';

export default function Settings() {
    const [settings, setSettings] = useState({
        alwaysOnTop: false,
        startMinimized: false,
        theme: 'dark'
    });
    const [version, setVersion] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    // Apply theme on load and change
    useEffect(() => {
        applyTheme(settings.theme);
    }, [settings.theme]);

    async function loadSettings() {
        const alwaysOnTop = await window.electron.store.get('alwaysOnTop');
        const startMinimized = await window.electron.store.get('startMinimized');
        const theme = await window.electron.store.get('theme');
        const ver = await window.electron.app.getVersion();

        setSettings({
            alwaysOnTop: alwaysOnTop || false,
            startMinimized: startMinimized || false,
            theme: theme || 'dark'
        });
        setVersion(ver);
    }

    function applyTheme(theme) {
        const root = document.documentElement;
        if (theme === 'light') {
            root.classList.add('light-theme');
            root.classList.remove('dark-theme');
        } else {
            root.classList.add('dark-theme');
            root.classList.remove('light-theme');
        }
    }

    async function updateSetting(key, value) {
        await window.electron.store.set(key, value);
        setSettings(prev => ({ ...prev, [key]: value }));

        if (key === 'alwaysOnTop') {
            await window.electron.settings.setAlwaysOnTop(value);
        }
    }

    async function checkUpdates() {
        await window.electron.updater.check();
    }

    async function clearToken() {
        if (confirm('This will log you out. Continue?')) {
            await window.electron.api.setToken(null);
            window.location.reload();
        }
    }

    return (
        <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

            {/* Window Settings */}
            <div className="card mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">Window</h2>
                
                <div className="space-y-4">
                    <label className="flex items-center justify-between cursor-pointer">
                        <div>
                            <span className="text-white">Always on Top</span>
                            <p className="text-sm text-gray-500">Keep window above other applications</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.alwaysOnTop}
                            onChange={(e) => updateSetting('alwaysOnTop', e.target.checked)}
                            className="w-5 h-5 accent-amber-500"
                        />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                        <div>
                            <span className="text-white">Start Minimized</span>
                            <p className="text-sm text-gray-500">Start in system tray</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.startMinimized}
                            onChange={(e) => updateSetting('startMinimized', e.target.checked)}
                            className="w-5 h-5 accent-amber-500"
                        />
                    </label>
                </div>
            </div>

            {/* Appearance */}
            <div className="card mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">Appearance</h2>
                
                <div className="space-y-4">
                    <div>
                        <span className="text-white block mb-3">Theme</span>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => updateSetting('theme', 'dark')}
                                className={`p-4 rounded-lg border-2 transition-all ${
                                    settings.theme === 'dark' 
                                        ? 'border-amber-500 bg-amber-500/10' 
                                        : 'border-white/10 hover:border-white/20'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-center">
                                        <span className="text-lg">🌙</span>
                                    </div>
                                    <div className="text-left">
                                        <div className="text-white font-medium">Dark</div>
                                        <div className="text-sm text-gray-500">Default theme</div>
                                    </div>
                                </div>
                            </button>
                            <button
                                onClick={() => updateSetting('theme', 'light')}
                                className={`p-4 rounded-lg border-2 transition-all ${
                                    settings.theme === 'light' 
                                        ? 'border-amber-500 bg-amber-500/10' 
                                        : 'border-white/10 hover:border-white/20'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-300 flex items-center justify-center">
                                        <span className="text-lg">☀️</span>
                                    </div>
                                    <div className="text-left">
                                        <div className="text-white font-medium">Light</div>
                                        <div className="text-sm text-gray-500">Light mode</div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hotkeys */}
            <div className="card mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">Keyboard Shortcuts</h2>
                
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Command Palette</span>
                        <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-400 font-mono">Ctrl+K</kbd>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Show/Focus Window</span>
                        <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-400 font-mono">Ctrl+Shift+U</kbd>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Quick Deploy</span>
                        <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-400 font-mono">Ctrl+Shift+D</kbd>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Terminal</span>
                        <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-400 font-mono">Ctrl+Shift+T</kbd>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Refresh Data</span>
                        <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-400 font-mono">F5</kbd>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Settings</span>
                        <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-400 font-mono">Ctrl+,</kbd>
                    </div>
                </div>
            </div>

            {/* Updates */}
            <div className="card mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">Updates</h2>
                
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-white">Current Version</span>
                        <p className="text-sm text-gray-500">v{version}</p>
                    </div>
                    <button onClick={checkUpdates} className="btn btn-secondary">
                        Check for Updates
                    </button>
                </div>
            </div>

            {/* Security */}
            <div className="card mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">Security</h2>
                
                <button onClick={clearToken} className="btn btn-danger">
                    Clear Auth Token & Logout
                </button>
            </div>

            {/* About */}
            <div className="card">
                <h2 className="text-lg font-semibold text-white mb-4">About</h2>
                
                <div className="text-sm text-gray-400 space-y-1">
                    <p>USGRP Override Center v{version}</p>
                    <p>© 2026 USGRP. All rights reserved.</p>
                    <p className="text-gray-600">Superuser access for Dion & Evan only.</p>
                </div>
            </div>
        </div>
    );
}
