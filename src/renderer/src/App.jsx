import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import TitleBar from './components/TitleBar';
import MenuBar from './components/MenuBar';
import Toolbar from './components/Toolbar';
import ActivityMonitor, { useActivityTracker } from './components/ActivityMonitor';
import { useMacFeatures, useDockBadge } from './hooks/useMacFeatures';
import { useWindowsFeatures, useTaskbarOverlay } from './hooks/useWindowsFeatures';
import { useNotifications, usePowerMonitor, useIdleDetection } from './hooks/usePlatformFeatures';
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
import DependencyGraph from './pages/DependencyGraph';
import Migrations from './pages/Migrations';
import MobileAlerts from './pages/MobileAlerts';
import Chat from './components/Chat';
import Login from './pages/Login';
import UpdateNotification from './components/UpdateNotification';
import ChangelogModal from './components/ChangelogModal';
import AboutModal from './components/AboutModal';
import ImpersonateModal from './components/ImpersonateModal';
import SetupWizard from './components/SetupWizard';

import UserLookup from './pages/UserLookup';
import EconomyUsers from './pages/EconomyUsers';
import MoneyEditor from './pages/MoneyEditor';
import Treasury from './pages/Treasury';
import TransactionLog from './pages/TransactionLog';
import PayrollManager from './pages/PayrollManager';
import CaseManager from './pages/CaseManager';
import QuickModeration from './pages/QuickModeration';
import PositionManager from './pages/PositionManager';
import HousingManager from './pages/HousingManager';
import VehicleRegistry from './pages/VehicleRegistry';
import BusinessManager from './pages/BusinessManager';
import WatchlistViewer from './pages/WatchlistViewer';
import GangManager from './pages/GangManager';
import ActivityDashboard from './pages/ActivityDashboard';
import GodMode from './pages/GodMode';
import EconomyStats from './pages/EconomyStats';
import BulkWipe from './pages/BulkWipe';
import AutoModConfig from './pages/AutoModConfig';
import CommandPalette from './components/CommandPalette';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import AnimatedBackground from './components/AnimatedBackground';
import { PiPProvider } from './components/PictureInPicture';
import { ContextMenuProvider } from './components/ContextMenu';
import { SessionRecordingProvider } from './components/SessionRecording';
import { ScreenShareProvider } from './components/ScreenShareDetection';
import GlobalSearch from './components/GlobalSearch';
import FraudDetection from './pages/FraudDetection';
import RelationshipMapper from './pages/RelationshipMapper';
import LiveMap from './pages/LiveMap';
import ScriptRunner from './pages/ScriptRunner';
import GitManager from './pages/GitManager';
import AnnouncementBuilder from './pages/AnnouncementBuilder';
import AtlasBrainConfig from './pages/AtlasBrainConfig';
import EconomySimulator from './pages/EconomySimulator';
import JudicialPanel from './pages/JudicialPanel';
import TicketManager from './pages/TicketManager';
import TicketKanban from './pages/TicketKanban';
import DeployHistory from './pages/DeployHistory';
import SystemMonitor from './pages/SystemMonitor';
import SessionViewer from './pages/SessionViewer';

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isFirstRun, setIsFirstRun] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [updateInfo, setUpdateInfo] = useState(null);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
    const [animatedBgEnabled, setAnimatedBgEnabled] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const [activityMonitorOpen, setActivityMonitorOpen] = useState(false);
    const [pendingAlerts, setPendingAlerts] = useState(0);
    
    // Activity tracking
    useActivityTracker();
    
    // Mac features - dock badge for pending alerts
    const { isMac, bounceDock } = useMacFeatures();
    useDockBadge(pendingAlerts);
    
    // Windows features - taskbar overlay for pending alerts
    const { isWin, flashTaskbar } = useWindowsFeatures();
    useTaskbarOverlay(pendingAlerts);
    
    // Cross-platform features
    const { sendNotification } = useNotifications();
    
    // Power monitoring - pause polling when locked/suspended
    const powerState = usePowerMonitor({
        onSuspend: () => console.log('[App] System suspended'),
        onResume: () => console.log('[App] System resumed'),
        onLock: () => console.log('[App] Screen locked'),
        onUnlock: () => console.log('[App] Screen unlocked')
    });
    
    // Idle detection
    useIdleDetection({
        threshold: 300, // 5 minutes
        onIdle: () => console.log('[App] User idle'),
        onActive: () => console.log('[App] User active')
    });
    
    const [showAbout, setShowAbout] = useState(false);
    const [showImpersonate, setShowImpersonate] = useState(false);
    const [impersonatingUser, setImpersonatingUser] = useState(null);
    const [user, setUser] = useState(null);
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        initialize();
        setupEventListeners();
        setupKeyboardShortcuts();
        applyStoredTheme();
        
        // Check for active impersonation
        const impUser = localStorage.getItem('impersonateUser');
        const impName = localStorage.getItem('impersonateUserName');
        if (impUser && impName) {
            setImpersonatingUser({ id: impUser, name: impName });
        }
    }, []);

    async function applyStoredTheme() {
        try {
            const theme = await window.electron.store.get('theme') || 'dark';
            const accentColor = await window.electron.store.get('accentColor') || '#D4AF37';
            const saturation = await window.electron.store.get('saturation') || 100;
            const fontFamily = await window.electron.store.get('fontFamily') || 'Inter';
            const fontSize = await window.electron.store.get('fontSize') || 'normal';
            const reduceMotion = await window.electron.store.get('reduceMotion') || false;
            const compactMode = await window.electron.store.get('compactMode') || false;
            const animatedBg = await window.electron.store.get('animatedBackground') || false;
            
            setAnimatedBgEnabled(animatedBg);
            
            const root = document.documentElement;
            
            // Apply theme preset
            root.classList.remove('light-theme', 'dark-theme', 'oled-theme', 'midnight-theme');
            const themeMode = await window.electron.store.get('themeMode') || theme;
            root.classList.add(`${themeMode}-theme`);
            
            // Apply gradient
            const gradientColor1 = await window.electron.store.get('gradientColor1') || accentColor;
            const gradientColor2 = await window.electron.store.get('gradientColor2') || '#B8860B';
            const gradientAngle = await window.electron.store.get('gradientAngle') || 135;
            
            const hexToRgb = (hex) => {
                try {
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    return `${r}, ${g}, ${b}`;
                } catch (e) { return '212, 175, 55'; }
            };
            
            const darkenHex = (hex, factor = 0.15) => {
                try {
                    let r = parseInt(hex.slice(1, 3), 16);
                    let g = parseInt(hex.slice(3, 5), 16);
                    let b = parseInt(hex.slice(5, 7), 16);
                    r = Math.floor(r * factor);
                    g = Math.floor(g * factor);
                    b = Math.floor(b * factor);
                    return `rgb(${r}, ${g}, ${b})`;
                } catch (e) { return '#0a0a10'; }
            };

            const gradient = `linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${gradientColor2})`;
            root.style.setProperty('--gradient-primary', gradient);
            root.style.setProperty('--gradient-color-1', gradientColor1);
            root.style.setProperty('--gradient-color-2', gradientColor2);
            root.style.setProperty('--gradient-color-1-rgb', hexToRgb(gradientColor1));
            root.style.setProperty('--gradient-color-2-rgb', hexToRgb(gradientColor2));
            
            // Apply accent color
            root.style.setProperty('--gold', gradientColor1);
            root.style.setProperty('--gold-light', gradientColor2);
            root.style.setProperty('--accent', gradientColor1);
            
            // Apply PROMINENT background gradient (for dark themes)
            if (themeMode !== 'light') {
                const bgColor1 = darkenHex(gradientColor1, 0.12);
                const bgColor2 = darkenHex(gradientColor2, 0.08);
                const bgColor3 = darkenHex(gradientColor1, 0.06);
                
                // Set actual background colors based on gradient - STAND OUT
                root.style.setProperty('--bg-primary', bgColor3);
                root.style.setProperty('--bg-secondary', bgColor2);
                root.style.setProperty('--bg-tertiary', bgColor1);
                
                root.style.setProperty('--bg-gradient-tint', `linear-gradient(135deg, ${bgColor1} 0%, ${bgColor3} 50%, ${bgColor2} 100%)`);
                root.style.setProperty('--bg-card', `rgba(${hexToRgb(gradientColor1)}, 0.08)`);
                root.style.setProperty('--bg-elevated', `rgba(${hexToRgb(gradientColor1)}, 0.12)`);
                
                // Borders with gradient color - MORE VISIBLE
                root.style.setProperty('--border-subtle', `rgba(${hexToRgb(gradientColor1)}, 0.15)`);
                root.style.setProperty('--border-default', `rgba(${hexToRgb(gradientColor1)}, 0.25)`);
                root.style.setProperty('--border-hover', `rgba(${hexToRgb(gradientColor1)}, 0.4)`);
                root.style.setProperty('--border-active', `rgba(${hexToRgb(gradientColor1)}, 0.5)`);
                
                // Strong glow effects
                root.style.setProperty('--shadow-glow', `0 0 40px rgba(${hexToRgb(gradientColor1)}, 0.25)`);
                root.style.setProperty('--shadow-glow-gold', `0 0 50px rgba(${hexToRgb(gradientColor1)}, 0.3)`);
            }
            
            // Apply saturation
            root.style.setProperty('--saturation', `${saturation}%`);
            
            // Apply font settings
            root.style.setProperty('--font-family', fontFamily === 'system' ? 'system-ui' : fontFamily);
            root.style.setProperty('--font-size', fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : '16px');
            
            // Apply motion/compact
            if (reduceMotion) root.classList.add('reduce-motion');
            if (compactMode) root.classList.add('compact-mode');
        } catch (error) {
            console.error('Failed to apply stored theme:', error);
        }
    }

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
            // Ctrl+K - Command Palette
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                setCommandPaletteOpen(prev => !prev);
            }
            // Ctrl+Shift+F - Global Search
            if (e.ctrlKey && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                setGlobalSearchOpen(prev => !prev);
            }
            // ? - Keyboard Shortcuts (when not typing)
            if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
                e.preventDefault();
                setShortcutsOpen(prev => !prev);
            }
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
                    <p className="text-gray-400">Loading Developer Panel...</p>
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
        <ScreenShareProvider>
        <ContextMenuProvider>
        <PiPProvider>
        <SessionRecordingProvider>
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
                onActivityMonitor={() => setActivityMonitorOpen(true)}
            />
            
            {/* Activity Monitor */}
            <ActivityMonitor 
                isOpen={activityMonitorOpen} 
                onClose={() => setActivityMonitorOpen(false)} 
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
                        <Route path="/graph" element={<DependencyGraph />} />
                        <Route path="/migrations" element={<Migrations />} />
                        <Route path="/alerts" element={<MobileAlerts />} />
                        <Route path="/servers" element={<Servers />} />
                        <Route path="/templates" element={<ServiceTemplates />} />
                        <Route path="/webhooks" element={<WebhookTester />} />
                        <Route path="/profiler" element={<Profiler />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/economy/users" element={<EconomyUsers />} />
                        <Route path="/economy/money" element={<MoneyEditor />} />
                        <Route path="/economy/treasury" element={<Treasury />} />
                        <Route path="/economy/transactions" element={<TransactionLog />} />
                        <Route path="/economy/payroll" element={<PayrollManager />} />
                        <Route path="/economy/housing" element={<HousingManager />} />
                        <Route path="/economy/vehicles" element={<VehicleRegistry />} />
                        <Route path="/economy/businesses" element={<BusinessManager />} />
                        <Route path="/moderation/cases" element={<CaseManager />} />
                        <Route path="/moderation/actions" element={<QuickModeration />} />
                        <Route path="/moderation/watchlist" element={<WatchlistViewer />} />
                        <Route path="/moderation/automod" element={<AutoModConfig />} />
                        <Route path="/government/positions" element={<PositionManager />} />
                        <Route path="/users/lookup" element={<UserLookup />} />
                        <Route path="/economy/gangs" element={<GangManager />} />
                        <Route path="/economy/stats" element={<EconomyStats />} />
                        <Route path="/economy/godmode" element={<GodMode />} />
                        <Route path="/economy/bulk-wipe" element={<BulkWipe />} />
                        <Route path="/activity" element={<ActivityDashboard />} />
                        <Route path="/live-map" element={<LiveMap />} />
                        <Route path="/economy/fraud" element={<FraudDetection />} />
                        <Route path="/relationships" element={<RelationshipMapper />} />
                        <Route path="/scripts" element={<ScriptRunner />} />
                        <Route path="/git" element={<GitManager />} />
                        <Route path="/announcements" element={<AnnouncementBuilder />} />
                        <Route path="/atlas-brain" element={<AtlasBrainConfig />} />
                        <Route path="/economy/simulator" element={<EconomySimulator />} />
                        <Route path="/judicial" element={<JudicialPanel />} />
                        <Route path="/tickets" element={<TicketManager />} />
                        <Route path="/tickets/kanban" element={<TicketKanban />} />
                        <Route path="/deploy-history" element={<DeployHistory />} />
                        <Route path="/system-monitor" element={<SystemMonitor />} />
                        <Route path="/sessions" element={<SessionViewer />} />
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
            
            {/* Command Palette */}
            <CommandPalette 
                isOpen={commandPaletteOpen} 
                onClose={() => setCommandPaletteOpen(false)} 
            />
            
            {/* Global Search */}
            <GlobalSearch
                isOpen={globalSearchOpen}
                onClose={() => setGlobalSearchOpen(false)}
            />
            
            {/* Keyboard Shortcuts */}
            <KeyboardShortcuts
                isOpen={shortcutsOpen}
                onClose={() => setShortcutsOpen(false)}
            />
            
            {/* Animated Background */}
            <AnimatedBackground enabled={animatedBgEnabled} />
        </div>
        </SessionRecordingProvider>
        </PiPProvider>
        </ContextMenuProvider>
        </ScreenShareProvider>
    );
}
