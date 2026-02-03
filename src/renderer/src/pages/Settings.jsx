import React, { useState, useEffect } from 'react';

// Settings categories with icons
const CATEGORIES = [
    { id: 'account', label: 'Account', icon: '👤' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'auth', label: 'Auth & API', icon: '🔐' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'advanced', label: 'Advanced', icon: '⚙️' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
];

// Theme presets
const THEME_PRESETS = [
    { id: 'dark', name: 'Dark', icon: '🌙', description: 'Default dark theme', colors: { bg: '#0a0a10', surface: '#0d0d16', accent: '#D4AF37' } },
    { id: 'light', name: 'Light', icon: '☀️', description: 'Light mode', colors: { bg: '#f5f5f5', surface: '#ffffff', accent: '#B8960C' } },
    { id: 'oled', name: 'OLED Black', icon: '🖤', description: 'Pure black for OLED', colors: { bg: '#000000', surface: '#0a0a0a', accent: '#D4AF37' } },
    { id: 'midnight', name: 'Midnight Blue', icon: '🌌', description: 'Deep blue tones', colors: { bg: '#0a1020', surface: '#0d1428', accent: '#60a5fa' } },
];

// Accent color presets
const ACCENT_COLORS = [
    { name: 'Gold', value: '#D4AF37' },
    { name: 'Amber', value: '#F59E0B' },
    { name: 'Emerald', value: '#10B981' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Cyan', value: '#06B6D4' },
];

// Font options
const FONT_FAMILIES = [
    { id: 'inter', name: 'Inter', value: "'Inter', -apple-system, sans-serif" },
    { id: 'roboto', name: 'Roboto', value: "'Roboto', sans-serif" },
    { id: 'system', name: 'System', value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
];

const FONT_SIZES = [
    { id: 'small', name: 'Small', scale: 0.875 },
    { id: 'normal', name: 'Normal', scale: 1 },
    { id: 'large', name: 'Large', scale: 1.125 },
];

export default function Settings() {
    const [activeSection, setActiveSection] = useState('account');
    const [settings, setSettings] = useState({
        // Window
        alwaysOnTop: false,
        startMinimized: false,
        
        // Appearance
        theme: 'dark',
        accentColor: '#D4AF37',
        primaryColor: '#D4AF37',
        backgroundTint: '#0a0a10',
        saturation: 100,
        fontFamily: 'inter',
        fontSize: 'normal',
        reduceMotion: false,
        compactMode: false,
        showKeyboardShortcuts: true,
        
        // Notifications
        desktopNotifications: true,
        soundNotifications: true,
        alertType: 'all',
        notificationPosition: 'bottom-right',
        
        // Advanced
        developerMode: false,
        dataDirectory: '',
    });
    
    const [user, setUser] = useState(null);
    const [version, setVersion] = useState('');
    const [systemInfo, setSystemInfo] = useState({});
    const [sessions, setSessions] = useState([]);
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSettings();
        loadUserData();
        loadSystemInfo();
    }, []);

    useEffect(() => {
        applyTheme();
    }, [settings.theme, settings.accentColor, settings.backgroundTint, settings.saturation, settings.fontFamily, settings.fontSize]);

    async function loadSettings() {
        try {
            const storedSettings = {};
            const keys = [
                'alwaysOnTop', 'startMinimized', 'theme', 'accentColor', 
                'primaryColor', 'backgroundTint', 'saturation', 'fontFamily', 
                'fontSize', 'reduceMotion', 'compactMode', 'showKeyboardShortcuts',
                'desktopNotifications', 'soundNotifications', 'alertType', 
                'notificationPosition', 'developerMode', 'dataDirectory'
            ];
            
            for (const key of keys) {
                const value = await window.electron.store.get(key);
                if (value !== undefined && value !== null) {
                    storedSettings[key] = value;
                }
            }
            
            setSettings(prev => ({ ...prev, ...storedSettings }));
            
            const ver = await window.electron.app.getVersion();
            setVersion(ver);
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadUserData() {
        try {
            const token = await window.electron.api.getToken();
            const apiBase = await window.electron.api.getBase();
            
            if (token) {
                const response = await fetch(`${apiBase}/override/auth/verify`, {
                    headers: { 'X-Override-Token': token }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setUser(data.superuser);
                    setApiKey(token);
                }
                
                // Load sessions
                try {
                    const sessionsRes = await fetch(`${apiBase}/override/auth/sessions`, {
                        headers: { 'X-Override-Token': token }
                    });
                    if (sessionsRes.ok) {
                        const sessionsData = await sessionsRes.json();
                        setSessions(sessionsData.sessions || []);
                    }
                } catch (e) {
                    console.log('Sessions endpoint not available');
                }
            }
        } catch (error) {
            console.error('Failed to load user data:', error);
        }
    }

    async function loadSystemInfo() {
        try {
            const info = {
                electron: process.versions?.electron || 'Unknown',
                chrome: process.versions?.chrome || 'Unknown',
                node: process.versions?.node || 'Unknown',
                platform: window.platform?.isWindows ? 'Windows' : window.platform?.isMac ? 'macOS' : 'Linux',
            };
            setSystemInfo(info);
        } catch (error) {
            console.error('Failed to load system info:', error);
        }
    }

    function applyTheme() {
        const root = document.documentElement;
        
        // Apply theme preset
        root.classList.remove('light-theme', 'dark-theme', 'oled-theme', 'midnight-theme');
        root.classList.add(`${settings.theme}-theme`);
        
        // Apply accent color
        root.style.setProperty('--gold', settings.accentColor);
        root.style.setProperty('--accent-color', settings.accentColor);
        
        // Apply saturation
        root.style.setProperty('--saturation', `${settings.saturation}%`);
        
        // Apply font settings
        const fontFamily = FONT_FAMILIES.find(f => f.id === settings.fontFamily)?.value || FONT_FAMILIES[0].value;
        root.style.setProperty('--font-family', fontFamily);
        document.body.style.fontFamily = fontFamily;
        
        const fontSize = FONT_SIZES.find(f => f.id === settings.fontSize)?.scale || 1;
        root.style.setProperty('--font-scale', fontSize);
        document.body.style.fontSize = `${fontSize * 16}px`;
        
        // Reduce motion
        if (settings.reduceMotion) {
            root.classList.add('reduce-motion');
        } else {
            root.classList.remove('reduce-motion');
        }
        
        // Compact mode
        if (settings.compactMode) {
            root.classList.add('compact-mode');
        } else {
            root.classList.remove('compact-mode');
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

    async function clearCache() {
        if (confirm('Clear all cached data? This won\'t affect your settings.')) {
            try {
                await window.electron.store.set('cache', {});
                alert('Cache cleared successfully!');
            } catch (error) {
                alert('Failed to clear cache');
            }
        }
    }

    async function resetSettings() {
        if (confirm('Reset ALL settings to defaults? This cannot be undone.')) {
            const defaults = {
                theme: 'dark',
                accentColor: '#D4AF37',
                primaryColor: '#D4AF37',
                backgroundTint: '#0a0a10',
                saturation: 100,
                fontFamily: 'inter',
                fontSize: 'normal',
                reduceMotion: false,
                compactMode: false,
                showKeyboardShortcuts: true,
                desktopNotifications: true,
                soundNotifications: true,
                alertType: 'all',
                notificationPosition: 'bottom-right',
                developerMode: false,
                alwaysOnTop: false,
                startMinimized: false,
            };
            
            for (const [key, value] of Object.entries(defaults)) {
                await window.electron.store.set(key, value);
            }
            
            setSettings(prev => ({ ...prev, ...defaults }));
            alert('Settings reset to defaults');
        }
    }

    async function exportSettings() {
        const exportData = JSON.stringify(settings, null, 2);
        const blob = new Blob([exportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'usgrp-settings.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    async function importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const text = await file.text();
                try {
                    const imported = JSON.parse(text);
                    for (const [key, value] of Object.entries(imported)) {
                        await window.electron.store.set(key, value);
                    }
                    setSettings(prev => ({ ...prev, ...imported }));
                    alert('Settings imported successfully!');
                } catch (error) {
                    alert('Invalid settings file');
                }
            }
        };
        input.click();
    }

    async function copyDebugInfo() {
        const debugInfo = {
            version,
            systemInfo,
            settings,
            user: user ? { id: user.id, username: user.username } : null,
            timestamp: new Date().toISOString(),
        };
        await navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
        alert('Debug info copied to clipboard!');
    }

    async function generateNewApiKey() {
        if (confirm('Generate a new API key? Your current key will be invalidated.')) {
            try {
                const apiBase = await window.electron.api.getBase();
                const response = await fetch(`${apiBase}/override/auth/regenerate`, {
                    method: 'POST',
                    headers: { 'X-Override-Token': apiKey }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setApiKey(data.token);
                    await window.electron.api.setToken(data.token);
                    alert('New API key generated!');
                } else {
                    alert('Failed to generate new key');
                }
            } catch (error) {
                alert('Failed to generate new key');
            }
        }
    }

    async function revokeSession(sessionId) {
        if (confirm('Revoke this session?')) {
            try {
                const apiBase = await window.electron.api.getBase();
                await fetch(`${apiBase}/override/auth/sessions/${sessionId}`, {
                    method: 'DELETE',
                    headers: { 'X-Override-Token': apiKey }
                });
                setSessions(sessions.filter(s => s.id !== sessionId));
            } catch (error) {
                alert('Failed to revoke session');
            }
        }
    }

    async function clearToken() {
        if (confirm('This will log you out. Continue?')) {
            await window.electron.api.setToken(null);
            window.location.reload();
        }
    }

    async function openDevTools() {
        await window.electron.window.openDevTools?.();
    }

    function renderSection() {
        switch (activeSection) {
            case 'account':
                return <AccountSection user={user} sessions={sessions} onRevokeSession={revokeSession} onLogout={clearToken} />;
            case 'appearance':
                return <AppearanceSection settings={settings} onUpdate={updateSetting} />;
            case 'auth':
                return <AuthSection apiKey={apiKey} showApiKey={showApiKey} setShowApiKey={setShowApiKey} onGenerateKey={generateNewApiKey} sessions={sessions} onRevokeSession={revokeSession} />;
            case 'notifications':
                return <NotificationsSection settings={settings} onUpdate={updateSetting} />;
            case 'advanced':
                return <AdvancedSection settings={settings} onUpdate={updateSetting} onClearCache={clearCache} onReset={resetSettings} onExport={exportSettings} onImport={importSettings} onOpenDevTools={openDevTools} />;
            case 'about':
                return <AboutSection version={version} systemInfo={systemInfo} onCheckUpdates={checkUpdates} onCopyDebug={copyDebugInfo} />;
            default:
                return null;
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full spin-slow"></div>
            </div>
        );
    }

    return (
        <div className="flex h-full -m-6 animate-fade-in">
            {/* Sidebar Navigation */}
            <aside className="w-56 bg-surface-secondary border-r border-white/5 flex flex-col">
                <div className="p-4 border-b border-white/5">
                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                    </h1>
                </div>
                
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-thin">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveSection(cat.id)}
                            className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 text-sm font-medium transition-all ${
                                activeSection === cat.id 
                                    ? 'bg-gold/15 text-gold border border-gold/20' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span className="text-base">{cat.icon}</span>
                            {cat.label}
                        </button>
                    ))}
                </nav>
                
                {/* User info at bottom */}
                {user && (
                    <div className="p-3 border-t border-white/5">
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                            <img 
                                src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 5}.png`}
                                alt="Avatar"
                                className="w-8 h-8 rounded-full"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate">{user.username}</div>
                                <div className="text-xs text-gray-500 truncate">Superuser</div>
                            </div>
                        </div>
                    </div>
                )}
            </aside>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto scrollbar-dark p-6">
                <div className="max-w-3xl mx-auto">
                    {renderSection()}
                </div>
            </main>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNT SECTION
// ═══════════════════════════════════════════════════════════════════════════

function AccountSection({ user, sessions, onRevokeSession, onLogout }) {
    if (!user) {
        return (
            <div className="text-center py-12">
                <div className="text-6xl mb-4">👤</div>
                <h2 className="text-xl font-bold text-white mb-2">Not logged in</h2>
                <p className="text-gray-400">Please log in to view account settings</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            <SectionHeader icon="👤" title="Account" description="Manage your profile and session" />
            
            {/* Profile Card */}
            <div className="card">
                <div className="flex items-start gap-6">
                    <div className="relative">
                        <img 
                            src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 5}.png`}
                            alt="Avatar"
                            className="w-24 h-24 rounded-2xl border-2 border-gold/30"
                        />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-surface-secondary"></div>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white">{user.username}</h3>
                        <p className="text-gray-400 font-mono text-sm mt-1">ID: {user.id}</p>
                        <div className="flex items-center gap-2 mt-3">
                            <span className="badge badge-gold">Superuser</span>
                            <span className="badge badge-success">Active</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Permissions */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Permissions & Roles
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {['Full Access', 'Economy Management', 'User Management', 'System Administration', 'Database Access', 'Deploy Access'].map(perm => (
                        <div key={perm} className="flex items-center gap-2 p-3 bg-white/5 rounded-lg">
                            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm text-gray-300">{perm}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Session Info */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Current Session
                </h3>
                <div className="space-y-3">
                    <InfoRow label="Login Time" value={new Date().toLocaleString()} />
                    <InfoRow label="Device" value={navigator.userAgent.includes('Windows') ? 'Windows' : navigator.userAgent.includes('Mac') ? 'macOS' : 'Linux'} />
                    <InfoRow label="Application" value="USGRP Override Center (Desktop)" />
                </div>
            </div>

            {/* Logout */}
            <div className="card">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Sign Out</h3>
                        <p className="text-sm text-gray-500">Sign out of your current session</p>
                    </div>
                    <button onClick={onLogout} className="btn btn-danger">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// APPEARANCE SECTION
// ═══════════════════════════════════════════════════════════════════════════

function AppearanceSection({ settings, onUpdate }) {
    const [customAccent, setCustomAccent] = useState(settings.accentColor);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <SectionHeader icon="🎨" title="Appearance" description="Customize the look and feel of your app" />
            
            {/* Theme Presets */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Theme</h3>
                <div className="grid grid-cols-2 gap-3">
                    {THEME_PRESETS.map(theme => (
                        <button
                            key={theme.id}
                            onClick={() => onUpdate('theme', theme.id)}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                                settings.theme === theme.id 
                                    ? 'border-gold bg-gold/10' 
                                    : 'border-white/10 hover:border-white/20'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-12 h-12 rounded-lg flex items-center justify-center text-xl border border-white/10"
                                    style={{ background: theme.colors.surface }}
                                >
                                    {theme.icon}
                                </div>
                                <div>
                                    <div className="text-white font-medium">{theme.name}</div>
                                    <div className="text-xs text-gray-500">{theme.description}</div>
                                </div>
                            </div>
                            {settings.theme === theme.id && (
                                <div className="mt-3 flex items-center gap-1 text-xs text-gold">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Selected
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Colors */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Accent Color</h3>
                <div className="grid grid-cols-4 gap-3 mb-4">
                    {ACCENT_COLORS.map(color => (
                        <button
                            key={color.value}
                            onClick={() => {
                                setCustomAccent(color.value);
                                onUpdate('accentColor', color.value);
                            }}
                            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                settings.accentColor === color.value 
                                    ? 'border-white' 
                                    : 'border-white/10 hover:border-white/20'
                            }`}
                        >
                            <div 
                                className="w-8 h-8 rounded-full shadow-lg"
                                style={{ backgroundColor: color.value }}
                            />
                            <span className="text-xs text-gray-400">{color.name}</span>
                        </button>
                    ))}
                </div>
                
                {/* Custom color picker */}
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                    <label className="text-sm text-gray-400">Custom:</label>
                    <input 
                        type="color" 
                        value={customAccent}
                        onChange={(e) => {
                            setCustomAccent(e.target.value);
                            onUpdate('accentColor', e.target.value);
                        }}
                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                    />
                    <input 
                        type="text" 
                        value={customAccent}
                        onChange={(e) => {
                            setCustomAccent(e.target.value);
                            if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                                onUpdate('accentColor', e.target.value);
                            }
                        }}
                        className="input input-sm w-32 font-mono uppercase"
                        placeholder="#D4AF37"
                    />
                </div>
            </div>

            {/* Saturation */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Saturation</h3>
                <div className="flex items-center gap-4">
                    <input 
                        type="range" 
                        min="0" 
                        max="200" 
                        value={settings.saturation}
                        onChange={(e) => onUpdate('saturation', parseInt(e.target.value))}
                        className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-gold"
                    />
                    <span className="text-white font-mono w-12 text-right">{settings.saturation}%</span>
                </div>
            </div>

            {/* Preview Panel */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
                <div 
                    className="p-6 rounded-xl border border-white/10"
                    style={{ 
                        background: `linear-gradient(135deg, ${settings.backgroundTint}ee 0%, ${settings.backgroundTint}ff 100%)`,
                        filter: `saturate(${settings.saturation}%)`
                    }}
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-black"
                            style={{ backgroundColor: settings.accentColor }}
                        >
                            U
                        </div>
                        <div>
                            <div className="font-bold text-white">Sample Card Title</div>
                            <div className="text-sm text-gray-400">This is how your theme looks</div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            className="px-4 py-2 rounded-lg font-medium text-sm text-black"
                            style={{ backgroundColor: settings.accentColor }}
                        >
                            Primary
                        </button>
                        <button className="px-4 py-2 rounded-lg font-medium text-sm bg-white/10 text-white">
                            Secondary
                        </button>
                    </div>
                </div>
            </div>

            {/* Font Settings */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Font Settings</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Font Size</label>
                        <div className="flex gap-2">
                            {FONT_SIZES.map(size => (
                                <button
                                    key={size.id}
                                    onClick={() => onUpdate('fontSize', size.id)}
                                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                                        settings.fontSize === size.id 
                                            ? 'bg-gold/20 text-gold border border-gold/30' 
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                                >
                                    {size.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Font Family</label>
                        <div className="flex gap-2">
                            {FONT_FAMILIES.map(font => (
                                <button
                                    key={font.id}
                                    onClick={() => onUpdate('fontFamily', font.id)}
                                    className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                                        settings.fontFamily === font.id 
                                            ? 'bg-gold/20 text-gold border border-gold/30' 
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                                    style={{ fontFamily: font.value }}
                                >
                                    {font.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* UI Options */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">UI Options</h3>
                <div className="space-y-4">
                    <ToggleRow 
                        label="Reduce Motion" 
                        description="Disable animations for accessibility"
                        checked={settings.reduceMotion}
                        onChange={(v) => onUpdate('reduceMotion', v)}
                    />
                    <ToggleRow 
                        label="Compact Mode" 
                        description="Reduce spacing for more content"
                        checked={settings.compactMode}
                        onChange={(v) => onUpdate('compactMode', v)}
                    />
                    <ToggleRow 
                        label="Show Keyboard Shortcuts" 
                        description="Display shortcuts in menus and tooltips"
                        checked={settings.showKeyboardShortcuts}
                        onChange={(v) => onUpdate('showKeyboardShortcuts', v)}
                    />
                    <ToggleRow 
                        label="Always on Top" 
                        description="Keep window above other applications"
                        checked={settings.alwaysOnTop}
                        onChange={(v) => onUpdate('alwaysOnTop', v)}
                    />
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH & API SECTION
// ═══════════════════════════════════════════════════════════════════════════

function AuthSection({ apiKey, showApiKey, setShowApiKey, onGenerateKey, sessions, onRevokeSession }) {
    const maskedKey = apiKey ? `${apiKey.slice(0, 8)}${'•'.repeat(32)}${apiKey.slice(-4)}` : '';

    return (
        <div className="space-y-6 animate-fade-in-up">
            <SectionHeader icon="🔐" title="Auth & API" description="Manage authentication and API access" />
            
            {/* API Key */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">API Key</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 p-3 bg-black/30 rounded-lg font-mono text-sm text-gray-300 overflow-hidden">
                            {showApiKey ? apiKey : maskedKey}
                        </div>
                        <button 
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="btn btn-secondary btn-sm"
                        >
                            {showApiKey ? '🙈 Hide' : '👁️ Show'}
                        </button>
                        <button 
                            onClick={() => navigator.clipboard.writeText(apiKey)}
                            className="btn btn-secondary btn-sm"
                        >
                            📋 Copy
                        </button>
                    </div>
                    <button onClick={onGenerateKey} className="btn btn-danger btn-sm">
                        🔄 Generate New Key
                    </button>
                    <p className="text-xs text-gray-500">
                        ⚠️ Generating a new key will invalidate your current key. All active sessions will be terminated.
                    </p>
                </div>
            </div>

            {/* Active Sessions */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Active Sessions</h3>
                {sessions.length > 0 ? (
                    <div className="space-y-3">
                        {sessions.map(session => (
                            <div key={session.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                                        💻
                                    </div>
                                    <div>
                                        <div className="text-sm text-white font-medium">{session.device || 'Unknown Device'}</div>
                                        <div className="text-xs text-gray-500">{session.ip || 'Unknown IP'} • {session.lastActive || 'Recently'}</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => onRevokeSession(session.id)}
                                    className="btn btn-ghost btn-sm text-red-400 hover:text-red-300"
                                >
                                    Revoke
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">🔒</div>
                        <p>No other active sessions</p>
                    </div>
                )}
            </div>

            {/* OAuth Connections */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Connected Services</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-[#5865F2]/10 rounded-lg border border-[#5865F2]/30">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#5865F2] rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                                </svg>
                            </div>
                            <div>
                                <div className="text-white font-medium">Discord</div>
                                <div className="text-xs text-gray-400">Connected for authentication</div>
                            </div>
                        </div>
                        <span className="badge badge-success">Connected</span>
                    </div>
                </div>
            </div>

            {/* 2FA Status */}
            <div className="card">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Two-Factor Authentication</h3>
                        <p className="text-sm text-gray-500">Enhanced security via Discord</p>
                    </div>
                    <span className="badge badge-info">Via Discord</span>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                    2FA is managed through your Discord account. Enable 2FA on Discord for enhanced security.
                </p>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS SECTION
// ═══════════════════════════════════════════════════════════════════════════

function NotificationsSection({ settings, onUpdate }) {
    return (
        <div className="space-y-6 animate-fade-in-up">
            <SectionHeader icon="🔔" title="Notifications" description="Configure how you receive alerts" />
            
            {/* Notification Toggles */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Notification Types</h3>
                <div className="space-y-4">
                    <ToggleRow 
                        label="Desktop Notifications" 
                        description="Show system notifications for important events"
                        checked={settings.desktopNotifications}
                        onChange={(v) => onUpdate('desktopNotifications', v)}
                    />
                    <ToggleRow 
                        label="Sound Notifications" 
                        description="Play sounds for alerts"
                        checked={settings.soundNotifications}
                        onChange={(v) => onUpdate('soundNotifications', v)}
                    />
                </div>
            </div>

            {/* Alert Types */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Alert Types</h3>
                <div className="space-y-2">
                    {[
                        { id: 'all', label: 'All Notifications', description: 'Receive all types of alerts' },
                        { id: 'errors', label: 'Errors Only', description: 'Only critical errors and failures' },
                        { id: 'none', label: 'None', description: 'Disable all notifications' },
                    ].map(type => (
                        <button
                            key={type.id}
                            onClick={() => onUpdate('alertType', type.id)}
                            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                                settings.alertType === type.id 
                                    ? 'border-gold bg-gold/10' 
                                    : 'border-white/10 hover:border-white/20'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-white font-medium">{type.label}</div>
                                    <div className="text-sm text-gray-500">{type.description}</div>
                                </div>
                                {settings.alertType === type.id && (
                                    <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Notification Position */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Notification Position</h3>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { id: 'top-right', label: 'Top Right', icon: '↗️' },
                        { id: 'bottom-right', label: 'Bottom Right', icon: '↘️' },
                        { id: 'bottom-left', label: 'Bottom Left', icon: '↙️' },
                    ].map(pos => (
                        <button
                            key={pos.id}
                            onClick={() => onUpdate('notificationPosition', pos.id)}
                            className={`p-4 rounded-xl border-2 transition-all text-center ${
                                settings.notificationPosition === pos.id 
                                    ? 'border-gold bg-gold/10' 
                                    : 'border-white/10 hover:border-white/20'
                            }`}
                        >
                            <div className="text-2xl mb-2">{pos.icon}</div>
                            <div className="text-sm text-white">{pos.label}</div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED SECTION
// ═══════════════════════════════════════════════════════════════════════════

function AdvancedSection({ settings, onUpdate, onClearCache, onReset, onExport, onImport, onOpenDevTools }) {
    return (
        <div className="space-y-6 animate-fade-in-up">
            <SectionHeader icon="⚙️" title="Advanced" description="Developer options and data management" />
            
            {/* Developer Mode */}
            <div className="card">
                <div className="space-y-4">
                    <ToggleRow 
                        label="Developer Mode" 
                        description="Enable developer features and debug info"
                        checked={settings.developerMode}
                        onChange={(v) => onUpdate('developerMode', v)}
                    />
                    
                    {settings.developerMode && (
                        <button onClick={onOpenDevTools} className="btn btn-secondary">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                            Open DevTools
                        </button>
                    )}
                </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Keyboard Shortcuts</h3>
                <div className="space-y-2">
                    {[
                        { label: 'Command Palette', shortcut: 'Ctrl+K' },
                        { label: 'Show/Focus Window', shortcut: 'Ctrl+Shift+U' },
                        { label: 'Quick Deploy', shortcut: 'Ctrl+Shift+D' },
                        { label: 'Terminal', shortcut: 'Ctrl+Shift+T' },
                        { label: 'Refresh Data', shortcut: 'F5' },
                        { label: 'Settings', shortcut: 'Ctrl+,' },
                        { label: 'Help/Changelog', shortcut: 'F1' },
                    ].map(item => (
                        <div key={item.label} className="flex items-center justify-between py-2">
                            <span className="text-gray-300">{item.label}</span>
                            <kbd className="px-3 py-1.5 bg-black/40 rounded-lg text-gray-400 font-mono text-sm border border-white/10">
                                {item.shortcut}
                            </kbd>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cache Management */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Cache & Data</h3>
                <div className="space-y-4">
                    <button onClick={onClearCache} className="btn btn-secondary w-full justify-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Clear Cache
                    </button>
                    <button onClick={onReset} className="btn btn-danger w-full justify-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset All Settings
                    </button>
                </div>
            </div>

            {/* Import/Export */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Export / Import</h3>
                <div className="flex gap-3">
                    <button onClick={onExport} className="btn btn-secondary flex-1 justify-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Export Settings
                    </button>
                    <button onClick={onImport} className="btn btn-secondary flex-1 justify-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Import Settings
                    </button>
                </div>
            </div>

            {/* Data Directory */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-2">Data Directory</h3>
                <p className="text-sm text-gray-500 mb-3">Location where app data is stored</p>
                <div className="p-3 bg-black/30 rounded-lg font-mono text-sm text-gray-400 break-all">
                    {settings.dataDirectory || '~/.usgrp-override-center/'}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// ABOUT SECTION
// ═══════════════════════════════════════════════════════════════════════════

function AboutSection({ version, systemInfo, onCheckUpdates, onCopyDebug }) {
    return (
        <div className="space-y-6 animate-fade-in-up">
            <SectionHeader icon="ℹ️" title="About" description="App information and support" />
            
            {/* App Info */}
            <div className="card text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20 glow-pulse">
                    <span className="text-4xl font-bold text-white">U</span>
                </div>
                <h2 className="text-2xl font-bold text-white">USGRP Override Center</h2>
                <p className="text-gold font-semibold mt-1">v{version}</p>
                <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">
                    Superuser control panel for USGRP infrastructure and Discord server management
                </p>
            </div>

            {/* Update Check */}
            <div className="card">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Updates</h3>
                        <p className="text-sm text-gray-500">Current version: v{version}</p>
                    </div>
                    <button onClick={onCheckUpdates} className="btn btn-primary">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Check for Updates
                    </button>
                </div>
            </div>

            {/* Links */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Resources</h3>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: 'Documentation', icon: '📚', url: 'https://docs.usgrp.xyz' },
                        { label: 'GitHub', icon: '🐙', url: 'https://github.com/communityorg-discord/usgrp-override-center' },
                        { label: 'Discord', icon: '💬', url: 'https://discord.gg/usgrp' },
                        { label: 'Website', icon: '🌐', url: 'https://usgrp.xyz' },
                    ].map(link => (
                        <button 
                            key={link.label}
                            onClick={() => window.electron.shell.openExternal(link.url)}
                            className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-left group"
                        >
                            <div className="text-2xl mb-2">{link.icon}</div>
                            <div className="text-white font-medium group-hover:text-gold transition-colors">{link.label}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* System Info */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">System Information</h3>
                <div className="space-y-2">
                    <InfoRow label="Electron" value={systemInfo.electron} />
                    <InfoRow label="Chrome" value={systemInfo.chrome} />
                    <InfoRow label="Node.js" value={systemInfo.node} />
                    <InfoRow label="Platform" value={systemInfo.platform} />
                </div>
                <button onClick={onCopyDebug} className="btn btn-secondary w-full mt-4 justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Debug Info
                </button>
            </div>

            {/* Credits */}
            <div className="card">
                <div className="text-center text-sm text-gray-500">
                    <p>© 2026 USGRP. All rights reserved.</p>
                    <p className="mt-1 text-gray-600">Built by USGRP / Atlas</p>
                    <p className="mt-2 text-gray-700">Restricted to authorized superusers only.</p>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function SectionHeader({ icon, title, description }) {
    return (
        <div className="mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span>{icon}</span>
                {title}
            </h2>
            <p className="text-gray-400 mt-1">{description}</p>
        </div>
    );
}

function ToggleRow({ label, description, checked, onChange }) {
    return (
        <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex-1">
                <span className="text-white group-hover:text-gold transition-colors">{label}</span>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
            <div className="relative">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className="sr-only"
                />
                <div 
                    className={`w-12 h-7 rounded-full transition-all ${
                        checked ? 'bg-gold' : 'bg-white/10'
                    }`}
                >
                    <div 
                        className={`w-5 h-5 bg-white rounded-full shadow-lg transition-all absolute top-1 ${
                            checked ? 'left-6' : 'left-1'
                        }`}
                    />
                </div>
            </div>
        </label>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex justify-between py-2 border-b border-white/5 last:border-0">
            <span className="text-gray-400">{label}</span>
            <span className="text-white font-mono text-sm">{value || 'Unknown'}</span>
        </div>
    );
}
