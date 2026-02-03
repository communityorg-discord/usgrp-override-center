import React, { useState, useEffect } from 'react';

export default function MobileAlerts() {
    const [config, setConfig] = useState({
        enabled: false,
        discordWebhook: '',
        telegramToken: '',
        telegramChatId: '',
        email: '',
        triggers: {
            serviceDown: true,
            highCpu: true,
            deployFailed: true,
            sslExpiring: true
        }
    });
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    async function loadConfig() {
        try {
            const data = await window.electron.ipcRenderer.invoke('store:get', 'alertsConfig');
            if (data) setConfig(data);
        } catch (error) {
            console.error('Failed to load alert config:', error);
        }
    }

    async function saveConfig() {
        setSaving(true);
        try {
            await window.electron.ipcRenderer.invoke('store:set', 'alertsConfig', config);
            await window.electron.ipcRenderer.invoke('alerts:reload'); // Notify backend to reload config
        } catch (error) {
            alert('Failed to save config: ' + error.message);
        } finally {
            setSaving(false);
        }
    }

    async function sendTest() {
        setTesting(true);
        try {
            await window.electron.ipcRenderer.invoke('alerts:test', config);
            alert('Test alert sent!');
        } catch (error) {
            alert('Test failed: ' + error.message);
        } finally {
            setTesting(false);
        }
    }

    return (
        <div className="h-full flex flex-col max-w-4xl mx-auto">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-2">Mobile Push Notifications</h1>
                <p className="text-gray-400">Configure alerts for critical system events</p>
            </header>

            <div className="bg-surface-secondary rounded-xl border border-white/5 p-6 space-y-8">
                {/* Master Switch */}
                <div className="flex items-center justify-between pb-6 border-b border-white/5">
                    <div>
                        <h3 className="text-lg font-bold text-white">Enable Alerts</h3>
                        <p className="text-sm text-gray-400">Master switch for all notifications</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={config.enabled}
                            onChange={e => setConfig({...config, enabled: e.target.checked})}
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                </div>

                {/* Channels */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Notification Channels</h3>
                    
                    <div className="grid gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Discord Webhook URL</label>
                            <input 
                                type="text"
                                value={config.discordWebhook}
                                onChange={e => setConfig({...config, discordWebhook: e.target.value})}
                                placeholder="https://discord.com/api/webhooks/..."
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none transition-colors"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Telegram Bot Token</label>
                                <input 
                                    type="text"
                                    value={config.telegramToken}
                                    onChange={e => setConfig({...config, telegramToken: e.target.value})}
                                    placeholder="123456789:ABC..."
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Telegram Chat ID</label>
                                <input 
                                    type="text"
                                    value={config.telegramChatId}
                                    onChange={e => setConfig({...config, telegramChatId: e.target.value})}
                                    placeholder="123456789"
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Email Address (Optional)</label>
                            <input 
                                type="email"
                                value={config.email}
                                onChange={e => setConfig({...config, email: e.target.value})}
                                placeholder="admin@usgrp.xyz"
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Triggers */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Alert Triggers</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        {Object.entries(config.triggers).map(([key, value]) => (
                            <label key={key} className="flex items-center gap-3 p-3 bg-black/20 rounded-lg cursor-pointer hover:bg-black/30 transition-colors">
                                <input 
                                    type="checkbox"
                                    checked={value}
                                    onChange={e => setConfig({
                                        ...config,
                                        triggers: { ...config.triggers, [key]: e.target.checked }
                                    })}
                                    className="rounded border-gray-600 text-amber-500 focus:ring-amber-500 bg-gray-700"
                                />
                                <span className="text-sm text-gray-300 capitalize">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                    <button
                        onClick={sendTest}
                        disabled={testing}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        {testing ? 'Sending...' : 'Send Test Alert'}
                    </button>
                    <button
                        onClick={saveConfig}
                        disabled={saving}
                        className="px-6 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-lg text-sm font-bold shadow-lg shadow-amber-900/20 transition-all transform hover:scale-105"
                    >
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
}
