import React, { useState, useEffect, useRef } from 'react';

// Gradient presets (Discord-style)
const GRADIENT_PRESETS = [
    { id: 'gold', name: 'Gold Rush', colors: ['#D4AF37', '#B8860B'], angle: 135 },
    { id: 'sunset', name: 'Sunset', colors: ['#FF6B6B', '#FFE66D'], angle: 135 },
    { id: 'ocean', name: 'Ocean', colors: ['#667eea', '#764ba2'], angle: 135 },
    { id: 'forest', name: 'Forest', colors: ['#11998e', '#38ef7d'], angle: 135 },
    { id: 'fire', name: 'Fire', colors: ['#f12711', '#f5af19'], angle: 135 },
    { id: 'purple', name: 'Purple Haze', colors: ['#8E2DE2', '#4A00E0'], angle: 135 },
    { id: 'pink', name: 'Cotton Candy', colors: ['#EC4899', '#F472B6'], angle: 135 },
    { id: 'cyber', name: 'Cyberpunk', colors: ['#00f2fe', '#4facfe'], angle: 135 },
    { id: 'midnight', name: 'Midnight', colors: ['#0f0c29', '#302b63'], angle: 135 },
    { id: 'custom', name: 'Custom', colors: ['#D4AF37', '#8B5CF6'], angle: 135 },
];

const THEME_MODES = [
    { id: 'dark', name: 'Dark', icon: '🌙' },
    { id: 'light', name: 'Light', icon: '☀️' },
    { id: 'oled', name: 'OLED', icon: '🖤' },
];

export default function Settings() {
    const [settings, setSettings] = useState({
        themeMode: 'dark',
        gradientPreset: 'gold',
        gradientColor1: '#D4AF37',
        gradientColor2: '#B8860B',
        gradientAngle: 135,
        accentColor: '#D4AF37',
        saturation: 100,
        blur: 20,
        transparency: 0.8,
    });
    
    const [user, setUser] = useState(null);
    const [version, setVersion] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('appearance');

    useEffect(() => {
        loadSettings();
        loadUserData();
    }, []);

    useEffect(() => {
        applyTheme();
    }, [settings]);

    async function loadSettings() {
        try {
            const keys = ['themeMode', 'gradientPreset', 'gradientColor1', 'gradientColor2', 
                         'gradientAngle', 'accentColor', 'saturation', 'blur', 'transparency'];
            const stored = {};
            for (const key of keys) {
                const value = await window.electron.store.get(key);
                if (value !== undefined && value !== null) stored[key] = value;
            }
            setSettings(prev => ({ ...prev, ...stored }));
            const ver = await window.electron.app.getVersion();
            setVersion(ver);
        } catch (e) {
            console.error('Failed to load settings:', e);
        } finally {
            setLoading(false);
        }
    }

    async function loadUserData() {
        try {
            const token = await window.electron.api.getToken();
            const apiBase = await window.electron.api.getBase();
            if (token) {
                const res = await fetch(`${apiBase}/override/auth/verify`, {
                    headers: { 'X-Override-Token': token }
                });
                if (res.ok) {
                    const data = await res.json();
                    setUser(data.superuser);
                    
                    // Fetch Discord avatar
                    if (data.superuser?.discordId) {
                        try {
                            const discordRes = await fetch(`${apiBase}/override/discord/user/${data.superuser.discordId}`);
                            if (discordRes.ok) {
                                const discordData = await discordRes.json();
                                setUser(prev => ({ ...prev, avatar: discordData.avatar, username: discordData.username }));
                            }
                        } catch (e) {}
                    }
                }
            }
        } catch (e) {
            console.error('Failed to load user:', e);
        }
    }

    function applyTheme() {
        const root = document.documentElement;
        
        // Apply theme mode
        root.classList.remove('dark-theme', 'light-theme', 'oled-theme');
        root.classList.add(`${settings.themeMode}-theme`);
        
        // Apply gradient
        const gradient = `linear-gradient(${settings.gradientAngle}deg, ${settings.gradientColor1}, ${settings.gradientColor2})`;
        root.style.setProperty('--gradient-primary', gradient);
        root.style.setProperty('--gradient-color-1', settings.gradientColor1);
        root.style.setProperty('--gradient-color-2', settings.gradientColor2);
        
        // Apply accent
        root.style.setProperty('--gold', settings.accentColor);
        root.style.setProperty('--accent', settings.accentColor);
        
        // Apply saturation
        root.style.setProperty('--saturation', `${settings.saturation}%`);
    }

    async function updateSetting(key, value) {
        await window.electron.store.set(key, value);
        setSettings(prev => ({ ...prev, [key]: value }));
    }

    function selectGradientPreset(preset) {
        updateSetting('gradientPreset', preset.id);
        updateSetting('gradientColor1', preset.colors[0]);
        updateSetting('gradientColor2', preset.colors[1]);
        updateSetting('gradientAngle', preset.angle);
        updateSetting('accentColor', preset.colors[0]);
    }

    async function checkUpdates() {
        await window.electron.updater.check();
    }

    async function logout() {
        await window.electron.api.setToken(null);
        window.location.reload();
    }

    if (loading) {
        return <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>;
    }

    return (
        <div className="h-full flex bg-surface-primary">
            {/* Left Panel - Profile Preview */}
            <div className="w-80 border-r border-white/5 p-6 flex flex-col">
                {/* Profile Card */}
                <div 
                    className="rounded-2xl p-6 mb-6 relative overflow-hidden"
                    style={{ 
                        background: `linear-gradient(${settings.gradientAngle}deg, ${settings.gradientColor1}, ${settings.gradientColor2})` 
                    }}
                >
                    <div className="relative z-10">
                        {/* Avatar */}
                        <div className="w-20 h-20 rounded-full border-4 border-white/20 mb-4 overflow-hidden bg-black/20">
                            {user?.avatar ? (
                                <img 
                                    src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=128`} 
                                    alt="Avatar" 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl">
                                    {user?.name?.[0] || '?'}
                                </div>
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-white">{user?.name || 'User'}</h2>
                        <p className="text-white/60 text-sm">{user?.discordId || 'Not connected'}</p>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="space-y-3 flex-1">
                    <div className="bg-white/5 rounded-xl p-4">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Version</div>
                        <div className="text-white font-medium">v{version}</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Theme</div>
                        <div className="text-white font-medium capitalize">{settings.themeMode}</div>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                    <button
                        onClick={checkUpdates}
                        className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
                    >
                        Check for Updates
                    </button>
                    <button
                        onClick={logout}
                        className="w-full py-3 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Right Panel - Settings */}
            <div className="flex-1 overflow-y-auto p-8">
                <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

                {/* Theme Mode */}
                <section className="mb-10">
                    <h2 className="text-lg font-semibold text-white mb-4">Theme Mode</h2>
                    <div className="flex gap-3">
                        {THEME_MODES.map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => updateSetting('themeMode', mode.id)}
                                className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all ${
                                    settings.themeMode === mode.id
                                        ? 'border-gold bg-gold/10'
                                        : 'border-white/10 hover:border-white/20 bg-white/5'
                                }`}
                            >
                                <div className="text-2xl mb-2">{mode.icon}</div>
                                <div className="text-white font-medium">{mode.name}</div>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Gradient Colors */}
                <section className="mb-10">
                    <h2 className="text-lg font-semibold text-white mb-4">Profile Gradient</h2>
                    <div className="grid grid-cols-5 gap-3 mb-6">
                        {GRADIENT_PRESETS.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => selectGradientPreset(preset)}
                                className={`aspect-square rounded-xl border-2 transition-all relative overflow-hidden ${
                                    settings.gradientPreset === preset.id
                                        ? 'border-white ring-2 ring-gold'
                                        : 'border-transparent hover:border-white/30'
                                }`}
                                style={{
                                    background: `linear-gradient(${preset.angle}deg, ${preset.colors[0]}, ${preset.colors[1]})`
                                }}
                                title={preset.name}
                            >
                                {settings.gradientPreset === preset.id && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Custom Colors */}
                    <div className="bg-white/5 rounded-xl p-6">
                        <h3 className="text-sm font-medium text-gray-400 mb-4">Custom Colors</h3>
                        <div className="flex gap-6">
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 block mb-2">Color 1</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={settings.gradientColor1}
                                        onChange={(e) => {
                                            updateSetting('gradientColor1', e.target.value);
                                            updateSetting('gradientPreset', 'custom');
                                            updateSetting('accentColor', e.target.value);
                                        }}
                                        className="w-12 h-12 rounded-lg cursor-pointer border-0"
                                    />
                                    <input
                                        type="text"
                                        value={settings.gradientColor1}
                                        onChange={(e) => updateSetting('gradientColor1', e.target.value)}
                                        className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 block mb-2">Color 2</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={settings.gradientColor2}
                                        onChange={(e) => {
                                            updateSetting('gradientColor2', e.target.value);
                                            updateSetting('gradientPreset', 'custom');
                                        }}
                                        className="w-12 h-12 rounded-lg cursor-pointer border-0"
                                    />
                                    <input
                                        type="text"
                                        value={settings.gradientColor2}
                                        onChange={(e) => updateSetting('gradientColor2', e.target.value)}
                                        className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm"
                                    />
                                </div>
                            </div>
                            <div className="w-32">
                                <label className="text-xs text-gray-500 block mb-2">Angle</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="360"
                                    value={settings.gradientAngle}
                                    onChange={(e) => updateSetting('gradientAngle', parseInt(e.target.value))}
                                    className="w-full accent-gold"
                                />
                                <div className="text-center text-xs text-gray-500 mt-1">{settings.gradientAngle}°</div>
                            </div>
                        </div>
                        
                        {/* Preview */}
                        <div className="mt-4">
                            <label className="text-xs text-gray-500 block mb-2">Preview</label>
                            <div 
                                className="h-16 rounded-xl"
                                style={{
                                    background: `linear-gradient(${settings.gradientAngle}deg, ${settings.gradientColor1}, ${settings.gradientColor2})`
                                }}
                            />
                        </div>
                    </div>
                </section>

                {/* Saturation */}
                <section className="mb-10">
                    <h2 className="text-lg font-semibold text-white mb-4">Saturation</h2>
                    <div className="bg-white/5 rounded-xl p-6">
                        <input
                            type="range"
                            min="0"
                            max="200"
                            value={settings.saturation}
                            onChange={(e) => updateSetting('saturation', parseInt(e.target.value))}
                            className="w-full accent-gold"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                            <span>Grayscale</span>
                            <span>{settings.saturation}%</span>
                            <span>Vivid</span>
                        </div>
                    </div>
                </section>

                {/* About */}
                <section className="mb-10">
                    <h2 className="text-lg font-semibold text-white mb-4">About</h2>
                    <div className="bg-white/5 rounded-xl p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gold to-amber-600 flex items-center justify-center">
                                <span className="text-3xl">🦅</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">USGRP Developer Panel</h3>
                                <p className="text-gray-400">Version {version}</p>
                            </div>
                        </div>
                        <p className="text-gray-500 text-sm">
                            Server management and override tools for USGRP administrators.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
