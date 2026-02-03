import React, { useState, useEffect, lazy, Suspense } from 'react';

const RecordingManagerLazy = lazy(() => import('../components/SessionRecording').then(m => ({ default: m.RecordingManager })));

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
    { id: 'midnight', name: 'Midnight', colors: ['#232526', '#414345'], angle: 135 },
    { id: 'custom', name: 'Custom', colors: ['#D4AF37', '#8B5CF6'], angle: 135 },
];

const THEME_MODES = [
    { id: 'dark', name: 'Dark', icon: '🌙', bg: '#0a0a10' },
    { id: 'light', name: 'Light', icon: '☀️', bg: '#f5f5f5' },
    { id: 'oled', name: 'OLED', icon: '🖤', bg: '#000000' },
];

export default function Settings() {
    const [settings, setSettings] = useState({
        themeMode: 'dark',
        gradientPreset: 'gold',
        gradientColor1: '#D4AF37',
        gradientColor2: '#B8860B',
        gradientAngle: 135,
        saturation: 100,
        animatedBackground: false,
    });
    
    const [user, setUser] = useState(null);
    const [version, setVersion] = useState('');
    const [loading, setLoading] = useState(true);

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
                         'gradientAngle', 'saturation', 'animatedBackground'];
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
                                if (discordData.user) {
                                    setUser(prev => ({ 
                                        ...prev, 
                                        avatar: discordData.user.avatar, 
                                        username: discordData.user.username 
                                    }));
                                }
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
        
        // Function to hex to rgb
        const hexToRgb = (hex) => {
            try {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `${r}, ${g}, ${b}`;
            } catch (e) {
                return '212, 175, 55';
            }
        };
        
        // Function to darken a hex color for background - MORE PROMINENT
        const darkenHex = (hex, factor = 0.15) => {
            try {
                let r = parseInt(hex.slice(1, 3), 16);
                let g = parseInt(hex.slice(3, 5), 16);
                let b = parseInt(hex.slice(5, 7), 16);
                r = Math.floor(r * factor);
                g = Math.floor(g * factor);
                b = Math.floor(b * factor);
                return `rgb(${r}, ${g}, ${b})`;
            } catch (e) {
                return '#0a0a10';
            }
        };
        
        // Apply theme mode
        root.classList.remove('dark-theme', 'light-theme', 'oled-theme', 'midnight-theme');
        root.classList.add(`${settings.themeMode}-theme`);
        
        // Apply gradient
        const gradient = `linear-gradient(${settings.gradientAngle}deg, ${settings.gradientColor1}, ${settings.gradientColor2})`;
        root.style.setProperty('--gradient-primary', gradient);
        root.style.setProperty('--gradient-color-1', settings.gradientColor1);
        root.style.setProperty('--gradient-color-2', settings.gradientColor2);
        root.style.setProperty('--gradient-color-1-rgb', hexToRgb(settings.gradientColor1));
        root.style.setProperty('--gradient-color-2-rgb', hexToRgb(settings.gradientColor2));
        
        // Apply accent (use first gradient color)
        root.style.setProperty('--gold', settings.gradientColor1);
        root.style.setProperty('--gold-light', settings.gradientColor2);
        root.style.setProperty('--accent', settings.gradientColor1);
        
        // Apply PROMINENT gradient tint to backgrounds (if not light theme)
        if (settings.themeMode !== 'light') {
            // Create dark versions of the gradient colors for backgrounds - MORE VISIBLE
            const bgColor1 = darkenHex(settings.gradientColor1, 0.12);
            const bgColor2 = darkenHex(settings.gradientColor2, 0.08);
            const bgColor3 = darkenHex(settings.gradientColor1, 0.06);
            
            // Set actual background colors based on gradient
            root.style.setProperty('--bg-primary', bgColor3);
            root.style.setProperty('--bg-secondary', bgColor2);
            root.style.setProperty('--bg-tertiary', bgColor1);
            
            // Background gradient overlay
            root.style.setProperty('--bg-gradient-tint', `linear-gradient(135deg, ${bgColor1} 0%, ${bgColor3} 50%, ${bgColor2} 100%)`);
            
            // Card backgrounds with gradient color tint
            root.style.setProperty('--bg-card', `rgba(${hexToRgb(settings.gradientColor1)}, 0.08)`);
            root.style.setProperty('--bg-elevated', `rgba(${hexToRgb(settings.gradientColor1)}, 0.12)`);
            
            // Apply border accent - MORE VISIBLE
            root.style.setProperty('--border-subtle', `rgba(${hexToRgb(settings.gradientColor1)}, 0.15)`);
            root.style.setProperty('--border-default', `rgba(${hexToRgb(settings.gradientColor1)}, 0.25)`);
            root.style.setProperty('--border-hover', `rgba(${hexToRgb(settings.gradientColor1)}, 0.4)`);
            root.style.setProperty('--border-active', `rgba(${hexToRgb(settings.gradientColor1)}, 0.5)`);
            
            // Apply glow effect - STRONGER
            root.style.setProperty('--shadow-glow', `0 0 40px rgba(${hexToRgb(settings.gradientColor1)}, 0.25)`);
            root.style.setProperty('--shadow-glow-gold', `0 0 50px rgba(${hexToRgb(settings.gradientColor1)}, 0.3)`);
        }
        
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

    const currentGradient = `linear-gradient(${settings.gradientAngle}deg, ${settings.gradientColor1}, ${settings.gradientColor2})`;

    return (
        <div className="h-full overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                <p className="text-gray-500 mb-8">Customize your Override Center experience</p>

                {/* User Info */}
                <section className="mb-10 flex items-center gap-6 p-6 bg-white/5 rounded-2xl">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-black/30 border-2 border-white/10">
                        {user?.avatar ? (
                            <img 
                                src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=128`} 
                                alt="Avatar" 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl text-white">
                                {user?.name?.[0] || '?'}
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-white">{user?.name || 'User'}</h2>
                        <p className="text-gray-500">{user?.discordId || 'Not connected'}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors"
                    >
                        Sign Out
                    </button>
                </section>

                {/* Theme Mode */}
                <section className="mb-10">
                    <h2 className="text-lg font-semibold text-white mb-4">Theme Mode</h2>
                    <div className="grid grid-cols-3 gap-4">
                        {THEME_MODES.map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => updateSetting('themeMode', mode.id)}
                                className={`p-5 rounded-xl border-2 transition-all ${
                                    settings.themeMode === mode.id
                                        ? 'border-white/50 ring-2 ring-offset-2 ring-offset-black/50'
                                        : 'border-white/10 hover:border-white/20'
                                }`}
                                style={{ 
                                    background: mode.bg,
                                    borderColor: settings.themeMode === mode.id ? settings.gradientColor1 : undefined,
                                    ringColor: settings.gradientColor1
                                }}
                            >
                                <div className="text-3xl mb-2">{mode.icon}</div>
                                <div className={`font-medium ${mode.id === 'light' ? 'text-black' : 'text-white'}`}>{mode.name}</div>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Theme Colors (Gradient) */}
                <section className="mb-10">
                    <h2 className="text-lg font-semibold text-white mb-2">Theme Colors</h2>
                    <p className="text-gray-500 text-sm mb-4">Choose a gradient for headings, buttons, and accents throughout the app</p>
                    
                    {/* Preset Grid */}
                    <div className="grid grid-cols-5 gap-3 mb-6">
                        {GRADIENT_PRESETS.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => selectGradientPreset(preset)}
                                className={`aspect-video rounded-xl border-2 transition-all relative overflow-hidden ${
                                    settings.gradientPreset === preset.id
                                        ? 'border-white ring-2 ring-white/30'
                                        : 'border-transparent hover:border-white/30'
                                }`}
                                style={{
                                    background: `linear-gradient(${preset.angle}deg, ${preset.colors[0]}, ${preset.colors[1]})`
                                }}
                                title={preset.name}
                            >
                                <div className="absolute inset-0 flex items-end p-2">
                                    <span className="text-xs text-white font-medium drop-shadow-lg">{preset.name}</span>
                                </div>
                                {settings.gradientPreset === preset.id && (
                                    <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                                        <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Custom Color Pickers */}
                    <div className="bg-white/5 rounded-xl p-6">
                        <h3 className="text-sm font-medium text-gray-400 mb-4">Custom Colors</h3>
                        <div className="flex gap-6 items-start">
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 block mb-2">Primary Color</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={settings.gradientColor1}
                                        onChange={(e) => {
                                            updateSetting('gradientColor1', e.target.value);
                                            updateSetting('gradientPreset', 'custom');
                                        }}
                                        className="w-14 h-14 rounded-xl cursor-pointer border-2 border-white/10"
                                    />
                                    <input
                                        type="text"
                                        value={settings.gradientColor1}
                                        onChange={(e) => {
                                            updateSetting('gradientColor1', e.target.value);
                                            updateSetting('gradientPreset', 'custom');
                                        }}
                                        className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 block mb-2">Secondary Color</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={settings.gradientColor2}
                                        onChange={(e) => {
                                            updateSetting('gradientColor2', e.target.value);
                                            updateSetting('gradientPreset', 'custom');
                                        }}
                                        className="w-14 h-14 rounded-xl cursor-pointer border-2 border-white/10"
                                    />
                                    <input
                                        type="text"
                                        value={settings.gradientColor2}
                                        onChange={(e) => {
                                            updateSetting('gradientColor2', e.target.value);
                                            updateSetting('gradientPreset', 'custom');
                                        }}
                                        className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm"
                                    />
                                </div>
                            </div>
                            <div className="w-40">
                                <label className="text-xs text-gray-500 block mb-2">Angle: {settings.gradientAngle}°</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="360"
                                    value={settings.gradientAngle}
                                    onChange={(e) => {
                                        updateSetting('gradientAngle', parseInt(e.target.value));
                                        updateSetting('gradientPreset', 'custom');
                                    }}
                                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                    style={{ background: currentGradient }}
                                />
                            </div>
                        </div>
                        
                        {/* Theme Preview */}
                        <div className="mt-6">
                            <label className="text-xs text-gray-500 block mb-3">Preview</label>
                            <div className="bg-black/20 rounded-xl p-4 space-y-3">
                                <h3 
                                    className="text-xl font-bold"
                                    style={{ 
                                        background: currentGradient,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent'
                                    }}
                                >
                                    Dashboard Heading
                                </h3>
                                <div className="flex gap-3">
                                    <button 
                                        className="px-4 py-2 rounded-lg text-black font-semibold text-sm"
                                        style={{ background: currentGradient }}
                                    >
                                        Primary Button
                                    </button>
                                    <button className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm">
                                        Secondary
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div 
                                        className="w-3 h-3 rounded-full"
                                        style={{ background: settings.gradientColor1 }}
                                    ></div>
                                    <span style={{ color: settings.gradientColor1 }}>Accent text and indicators</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Saturation */}
                <section className="mb-10">
                    <h2 className="text-lg font-semibold text-white mb-4">Color Saturation</h2>
                    <div className="bg-white/5 rounded-xl p-6">
                        <input
                            type="range"
                            min="0"
                            max="200"
                            value={settings.saturation}
                            onChange={(e) => updateSetting('saturation', parseInt(e.target.value))}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-700"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                            <span>Grayscale</span>
                            <span className="font-medium text-white">{settings.saturation}%</span>
                            <span>Vivid</span>
                        </div>
                    </div>
                </section>

                {/* Effects */}
                <section className="mb-10">
                    <h2 className="text-lg font-semibold text-white mb-4">Visual Effects</h2>
                    <div className="bg-white/5 rounded-xl p-6 space-y-4">
                        <label className="flex items-center justify-between cursor-pointer">
                            <div>
                                <span className="text-white font-medium">Animated Background</span>
                                <p className="text-xs text-gray-500 mt-0.5">Floating particles with gradient connections</p>
                            </div>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={settings.animatedBackground}
                                    onChange={(e) => updateSetting('animatedBackground', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                            </div>
                        </label>
                    </div>
                </section>

                {/* Session Recordings */}
                <section className="mb-10" id="recordings">
                    <h2 className="text-lg font-semibold text-white mb-4">Session Recordings</h2>
                    <div className="bg-white/5 rounded-xl p-6">
                        <p className="text-sm text-gray-400 mb-4">
                            Record your actions and replay them later for demos or auditing.
                        </p>
                        <Suspense fallback={<div className="text-gray-500">Loading...</div>}>
                            <RecordingManagerLazy />
                        </Suspense>
                    </div>
                </section>

                {/* About & Updates */}
                <section className="mb-10">
                    <h2 className="text-lg font-semibold text-white mb-4">About</h2>
                    <div className="bg-white/5 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div 
                                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                                    style={{ background: currentGradient }}
                                >
                                    <span className="text-2xl">🦅</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">USGRP Developer Panel</h3>
                                    <p className="text-gray-500">Version {version}</p>
                                </div>
                            </div>
                            <button
                                onClick={checkUpdates}
                                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
                            >
                                Check for Updates
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
