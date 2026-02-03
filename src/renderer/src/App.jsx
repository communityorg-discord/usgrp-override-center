import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import TitleBar from './components/TitleBar';
import MenuBar from './components/MenuBar';
import Toolbar from './components/Toolbar';
import Dashboard from './pages/Dashboard';
import Systems from './pages/Systems';
import ProcessManager from './pages/ProcessManager';
import Audit from './pages/Audit';
import Deploy from './pages/Deploy';
import CronManager from './pages/CronManager';
import Terminal from './pages/Terminal';
import Memory from './pages/Memory';
import Database from './pages/Database';
import FileManager from './pages/FileManager';
import Network from './pages/Network';
import Settings from './pages/Settings';
import Servers from './pages/Servers';
import ServiceTemplates from './pages/ServiceTemplates';
import WebhookTester from './pages/WebhookTester';
import Profiler from './pages/Profiler';
import Backups from './pages/Backups';
import DiscordManager from './pages/DiscordManager';
import BanManager from './pages/BanManager';
import LogAggregator from './pages/LogAggregator';
import ApiKeyManager from './pages/ApiKeyManager';
import QuickCommands from './pages/QuickCommands';
import Metrics from './pages/Metrics';
import ConfigEditor from './pages/ConfigEditor';
import ServiceHealth from './pages/ServiceHealth';
import DNSManager from './pages/DNSManager';
import SecretsVault from './pages/SecretsVault';
import SSLMonitor from './pages/SSLMonitor';
import AuditTimeline from './pages/AuditTimeline';
import RateLimits from './pages/RateLimits';
import Chat from './components/Chat';
import Login from './pages/Login';
import UpdateNotification from './components/UpdateNotification';
import ChangelogModal from './components/ChangelogModal';
import AboutModal from './components/AboutModal';
import ImpersonateModal from './components/ImpersonateModal';
import SetupWizard from './components/SetupWizard';

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isFirstRun, setIsFirstRun] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [updateInfo, setUpdateInfo] = useState(null);
    const [showChangelog, setShowChangelog] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [showImpersonate, setShowImpersonate] = useState(false);
    const [impersonatingUser, setImpersonatingUser] = useState(null);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        initialize();
        setupEventListeners();
        setupKeyboardShortcuts();
        
        // Check for active impersonation
        const impUser = localStorage.getItem('impersonateUser');
        const impName = localStorage.getItem('impersonateUserName');
        if (impUser && impName) {
            setImpersonatingUser({ id: impUser, name: impName });
        }
    }, []);

    async function initialize() {
        try {
            // Check first run
            const hasRun = await window.electron.store.get('hasCompletedSetup');
            if (!hasRun) {
                setIsFirstRun(true);
                setIsLoading(false);
                return;
            }

            // Check auth
            const token = await window.electron.api.getToken();
            if (token) {
                const apiBase = await window.electron.api.getBase();
                const response = await fetch(`${apiBase}/override/auth/verify`, {
                    headers: { 'X-Override-Token': token }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setIsAuthenticated(true);
                    setUser(data.superuser);
                } else {
                    await window.electron.api.setToken(null);
                    setIsAuthenticated(false);
                }
            }
        } catch (error) {
            console.error('Initialization failed:', error);
        } finally {
            setIsLoading(false);
        }
    }

    function setupEventListeners() {
        window.electron.on('navigate', (path) => navigate(path));
        window.electron.on('quick-action', (action) => console.log('Quick action:', action));
        window.electron.on('update-checking', () => setUpdateInfo({ type: 'checking' }));
        window.electron.on('update-available', (info) => setUpdateInfo({ type: 'available', ...info }));
        window.electron.on('update-not-available', () => setUpdateInfo({ type: 'up-to-date' }));
        window.electron.on('update-downloaded', (info) => setUpdateInfo({ type: 'downloaded', ...info }));
        window.electron.on('update-error', (message) => setUpdateInfo({ type: 'error', message }));
        window.electron.on('update-progress', (progress) => setUpdateInfo(prev => ({ ...prev, progress })));
        window.electron.on('auth-success', (token) => {
            window.electron.api.setToken(token);
            setIsAuthenticated(true);
            checkAuth();
        });
    }

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+T - Terminal
            if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                navigate('/terminal');
            }
            // Ctrl+Shift+D - Deploy
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                navigate('/deploy');
            }
            // Ctrl+, - Settings
            if (e.ctrlKey && e.key === ',') {
                e.preventDefault();
                navigate('/settings');
            }
            // F1 - Help/Changelog
            if (e.key === 'F1') {
                e.preventDefault();
                setShowChangelog(true);
            }
        });
    }

    async function handleLogin(token) {
        await window.electron.api.setToken(token);
        setIsAuthenticated(true);
        checkAuth();
    }

    async function handleLogout() {
        await window.electron.api.setToken(null);
        setIsAuthenticated(false);
        setUser(null);
    }
    
    function stopImpersonation() {
        localStorage.removeItem('impersonateUser');
        localStorage.removeItem('impersonateUserName');
        window.location.reload();
    }

    // Menu handlers
    const menuHandlers = {
        // File
        'file.export': () => console.log('Export...'),
        'file.import': () => console.log('Import...'),
        'file.preferences': () => navigate('/settings'),
        'file.exit': () => window.electron.window.close(),
        
        // Edit
        'edit.copy': () => document.execCommand('copy'),
        'edit.paste': () => document.execCommand('paste'),
        'edit.cut': () => document.execCommand('cut'),
        'edit.selectAll': () => document.execCommand('selectAll'),
        
        // View
        'view.refresh': () => window.location.reload(),
        'view.zoomIn': () => console.log('Zoom in'),
        'view.zoomOut': () => console.log('Zoom out'),
        'view.resetZoom': () => console.log('Reset zoom'),
        
        // Tools
        'tools.terminal': () => navigate('/terminal'),
        'tools.deploy': () => navigate('/deploy'),
        'tools.database': () => navigate('/database'),
        'tools.memory': () => navigate('/memory'),
        'tools.systems': () => navigate('/systems'),
        'tools.impersonate': () => setShowImpersonate(true),
        
        // Help
        'help.docs': () => window.electron.shell.openExternal('https://docs.usgrp.xyz'),
        'help.changelog': () => setShowChangelog(true),
        'help.checkUpdates': () => window.electron.updater.check(),
        'help.about': () => setShowAbout(true),
    };

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-surface-primary">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full spin-slow mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading Override Center...</p>
                </div>
            </div>
        );
    }

    if (isFirstRun) {
        return (
            <div className="h-screen flex flex-col bg-surface-primary">
                <TitleBar />
                <SetupWizard onComplete={() => { setIsFirstRun(false); initialize(); }} />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="h-screen flex flex-col bg-surface-primary">
                <TitleBar />
                <Login onLogin={handleLogin} />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-surface-primary overflow-hidden">
            {/* Impersonation Banner */}
            {impersonatingUser && (
                <div className="bg-red-600/90 backdrop-blur-sm text-white px-4 py-1.5 text-center text-sm font-bold flex justify-center items-center gap-4 shadow-lg z-50 animate-fade-in-down border-b border-red-400/30">
                    <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        IMPERSONATING USER: {impersonatingUser.name}
                    </span>
                    <button 
                        onClick={stopImpersonation}
                        className="bg-white text-red-600 px-3 py-0.5 rounded text-xs hover:bg-gray-100 transition-colors uppercase tracking-wide font-bold shadow-sm"
                    >
                        Stop Impersonation
                    </button>
                </div>
            )}

            {/* Title bar with window controls */}
            <TitleBar />
            
            {/* Menu bar (File, Edit, View, Tools, Help) */}
            <MenuBar onMenuAction={(action) => menuHandlers[action]?.()} />
            
            {/* Toolbar with tabs and quick actions */}
            <Toolbar 
                currentPath={location.pathname} 
                user={user}
                onLogout={handleLogout}
                onChatToggle={() => setChatOpen(!chatOpen)}
                onImpersonate={() => setShowImpersonate(true)}
            />
            
            {/* Main content area */}
            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 overflow-auto p-6 scrollbar-dark">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/audit" element={<Audit />} />
                        <Route path="/systems" element={<Systems />} />
                        <Route path="/processes" element={<ProcessManager />} />
                        <Route path="/deploy" element={<Deploy />} />
                        <Route path="/cron" element={<CronManager />} />
                        <Route path="/terminal" element={<Terminal />} />
                        <Route path="/memory" element={<Memory />} />
                        <Route path="/database" element={<Database />} />
                        <Route path="/files" element={<FileManager />} />
                        <Route path="/network" element={<Network />} />
                        <Route path="/backups" element={<Backups />} />
                        <Route path="/discord" element={<DiscordManager />} />
                        <Route path="/bans" element={<BanManager />} />
                        <Route path="/logs" element={<LogAggregator />} />
                        <Route path="/apikeys" element={<ApiKeyManager />} />
                        <Route path="/quick-commands" element={<QuickCommands />} />
                        <Route path="/metrics" element={<Metrics />} />
                        <Route path="/config" element={<ConfigEditor />} />
                        <Route path="/health" element={<ServiceHealth />} />
                        <Route path="/dns" element={<DNSManager />} />
                        <Route path="/secrets" element={<SecretsVault />} />
                        <Route path="/ssl" element={<SSLMonitor />} />
                        <Route path="/timeline" element={<AuditTimeline />} />
                        <Route path="/ratelimits" element={<RateLimits />} />
                        <Route path="/servers" element={<Servers />} />
                        <Route path="/templates" element={<ServiceTemplates />} />
                        <Route path="/webhooks" element={<WebhookTester />} />
                        <Route path="/profiler" element={<Profiler />} />
                        <Route path="/settings" element={<Settings />} />
                    </Routes>
                </main>

                {/* AI Chat Panel */}
                <Chat isOpen={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />
            </div>

            {/* Floating Chat Button */}
            {!chatOpen && (
                <button
                    onClick={() => setChatOpen(true)}
                    className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-amber-600 to-amber-500 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform pulse-gold z-50"
                    title="Chat with Atlas"
                >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </button>
            )}

            {/* Modals */}
            {updateInfo && (
                <UpdateNotification info={updateInfo} onDismiss={() => setUpdateInfo(null)} />
            )}
            {showChangelog && (
                <ChangelogModal onClose={() => setShowChangelog(false)} />
            )}
            {showAbout && (
                <AboutModal onClose={() => setShowAbout(false)} />
            )}
            {showImpersonate && (
                <ImpersonateModal onClose={() => setShowImpersonate(false)} />
            )}
        </div>
    );
}
