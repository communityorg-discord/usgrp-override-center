/**
 * USGRP Developer Panel - Main Process
 * 
 * Electron main process handling window management, IPC, and system integration.
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, nativeImage, shell, dialog, nativeTheme, Notification, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Platform detection
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';
const util = require('util');
const execPromise = util.promisify(exec);
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const os = require('os');
const fg = require('fast-glob');

// Try to load node-pty for full terminal support
let ptyModule;
try {
    ptyModule = require('node-pty');
} catch (e) {
    console.warn('Failed to load node-pty, falling back to child_process:', e.message);
}

// Persistent store for app settings and auth token
const store = new Store({
    name: 'usgrp-override',
    encryptionKey: 'usgrp-override-encryption-key-2026',
    defaults: {
        authToken: null,
        hwid: null,
        windowBounds: { width: 1400, height: 900 },
        alwaysOnTop: false,
        startMinimized: false,
        theme: 'dark',
        servers: [],
        currentServer: null,
        scheduledDeploys: []
    }
});

// Config
const DEFAULT_API_BASE = 'https://api.usgrp.xyz';
const AUTH_BASE = 'https://auth.usgrp.xyz';
const PROTOCOL = 'usgrp-override';
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow = null;
let tray = null;

// ═══════════════════════════════════════════════════════════════
// CUSTOM PROTOCOL HANDLER
// ═══════════════════════════════════════════════════════════════

// Register as default protocol handler
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
    }
} else {
    app.setAsDefaultProtocolClient(PROTOCOL);
}

// Handle protocol URL on Windows/Linux (app already running)
function handleProtocolUrl(url) {
    console.log('[Protocol] Received URL:', url);
    
    if (!url || !url.startsWith(`${PROTOCOL}://`)) return;
    
    try {
        const urlObj = new URL(url);
        
        if (urlObj.hostname === 'auth') {
            const token = urlObj.searchParams.get('token');
            if (token) {
                console.log('[Protocol] Auth token received');
                store.set('authToken', token);
                
                // Notify renderer to reload auth state
                if (mainWindow && mainWindow.webContents) {
                    mainWindow.webContents.send('auth-success', token);
                }
                
                // Bring window to front
                if (mainWindow) {
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        }
    } catch (error) {
        console.error('[Protocol] Error parsing URL:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// WINDOW CREATION
// ═══════════════════════════════════════════════════════════════

function createWindow() {
    const bounds = store.get('windowBounds');
    
    mainWindow = new BrowserWindow({
        width: bounds.width,
        height: bounds.height,
        minWidth: 1200,
        minHeight: 700,
        frame: false, // Frameless for custom title bar
        titleBarStyle: 'hidden',
        backgroundColor: '#0a0a0f',
        icon: path.join(__dirname, '../../build/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        },
        show: false // Show when ready
    });

    // Set Content Security Policy to allow Google Fonts and GitHub API
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self'; " +
                    "script-src 'self' 'unsafe-inline'; " +
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                    "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                    "font-src 'self' https://fonts.gstatic.com; " +
                    "img-src 'self' data: https:; " +
                    "connect-src 'self' https: wss:;"
                ]
            }
        });
    });

    // Load content
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        mainWindow.loadFile(path.join(__dirname, '../../dist-renderer/index.html'));
    }

    // Show when ready
    mainWindow.once('ready-to-show', () => {
        if (!store.get('startMinimized')) {
            mainWindow.show();
        }
    });

    // Save window bounds on close
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            return;
        }
        store.set('windowBounds', mainWindow.getBounds());
    });

    // Always on top setting
    mainWindow.setAlwaysOnTop(store.get('alwaysOnTop'));

    return mainWindow;
}

// ═══════════════════════════════════════════════════════════════
// APPLICATION MENU (View/Zoom controls)
// ═══════════════════════════════════════════════════════════════

function createApplicationMenu() {
    const template = [];
    
    // macOS app menu (first menu is always app name on Mac)
    if (isMac) {
        template.push({
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { label: 'Settings...', accelerator: 'Cmd+,', click: () => sendToRenderer('navigate', '/settings') },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });
    }
    
    template.push({
        label: 'File',
        submenu: [
            { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => sendToRenderer('navigate', '/settings') },
            { type: 'separator' },
            ...(isMac ? [] : [{ label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => { app.isQuitting = true; app.quit(); } }])
        ]
    });
    
    template.push({
        label: 'Edit',
        submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            ...(isMac ? [
                { role: 'pasteAndMatchStyle' },
                { role: 'delete' },
                { role: 'selectAll' },
                { type: 'separator' },
                {
                    label: 'Speech',
                    submenu: [
                        { role: 'startSpeaking' },
                        { role: 'stopSpeaking' }
                    ]
                }
            ] : [
                { role: 'delete' },
                { type: 'separator' },
                { role: 'selectAll' }
            ])
        ]
    });
    
    template.push({
        label: 'View',
        submenu: [
            { role: 'reload', accelerator: 'CmdOrCtrl+R' },
            { role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
            { type: 'separator' },
            { 
                label: 'Zoom In', 
                accelerator: 'CmdOrCtrl+=',
                click: () => {
                    const currentZoom = mainWindow.webContents.getZoomFactor();
                    mainWindow.webContents.setZoomFactor(currentZoom + 0.1);
                }
            },
            { 
                label: 'Zoom Out', 
                accelerator: 'CmdOrCtrl+-',
                click: () => {
                    const currentZoom = mainWindow.webContents.getZoomFactor();
                    mainWindow.webContents.setZoomFactor(Math.max(0.5, currentZoom - 0.1));
                }
            },
            { 
                label: 'Reset Zoom', 
                accelerator: 'CmdOrCtrl+0',
                click: () => {
                    mainWindow.webContents.setZoomFactor(1.0);
                }
            },
            { type: 'separator' },
            { role: 'togglefullscreen' },
            { type: 'separator' },
            { role: 'toggleDevTools', accelerator: 'F12' }
        ]
    });
    
    template.push({
        label: 'Window',
        submenu: [
            { role: 'minimize' },
            { role: 'zoom' },
            ...(isMac ? [
                { type: 'separator' },
                { role: 'front' },
                { type: 'separator' },
                { role: 'window' }
            ] : [
                { role: 'close' }
            ])
        ]
    });
    
    template.push({
        label: 'Help',
        submenu: [
            { label: 'Check for Updates', click: () => sendToRenderer('trigger-update-check') },
            { type: 'separator' },
            { label: 'About', click: () => sendToRenderer('show-about') }
        ]
    });
    
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM TRAY
// ═══════════════════════════════════════════════════════════════

function createTray() {
    const iconPath = path.join(__dirname, '../../build/tray-icon.png');
    
    // Create a 16x16 empty icon if file doesn't exist
    let icon;
    try {
        icon = nativeImage.createFromPath(iconPath);
    } catch (e) {
        icon = nativeImage.createEmpty();
    }
    
    tray = new Tray(icon);
    
    const contextMenu = Menu.buildFromTemplate([
        { 
            label: 'Show Developer Panel', 
            click: () => mainWindow.show() 
        },
        { type: 'separator' },
        { 
            label: 'Quick Actions',
            submenu: [
                { label: 'Restart All Bots', click: () => sendToRenderer('quick-action', 'restart-all') },
                { label: 'View Logs', click: () => sendToRenderer('quick-action', 'view-logs') },
                { type: 'separator' },
                { label: '⚠️ Panic Stop', click: () => confirmPanic() }
            ]
        },
        { type: 'separator' },
        { label: 'Check for Updates', click: () => autoUpdater.checkForUpdatesAndNotify() },
        { type: 'separator' },
        { 
            label: 'Quit', 
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);
    
    tray.setToolTip('USGRP Developer Panel');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
        if (mainWindow.isVisible()) {
            mainWindow.focus();
        } else {
            mainWindow.show();
        }
    });
}

async function confirmPanic() {
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        buttons: ['Cancel', 'STOP ALL'],
        defaultId: 0,
        title: 'Panic Stop',
        message: 'This will stop ALL services immediately.',
        detail: 'Are you sure you want to proceed?'
    });
    
    if (result.response === 1) {
        sendToRenderer('quick-action', 'panic-stop');
    }
}

// ═══════════════════════════════════════════════════════════════
// GLOBAL SHORTCUTS
// ═══════════════════════════════════════════════════════════════

function registerShortcuts() {
    // Ctrl+Shift+U - Show/Focus window
    globalShortcut.register('CommandOrControl+Shift+U', () => {
        if (mainWindow.isVisible()) {
            mainWindow.focus();
        } else {
            mainWindow.show();
        }
    });
    
    // Ctrl+Shift+D - Quick deploy menu
    globalShortcut.register('CommandOrControl+Shift+D', () => {
        mainWindow.show();
        sendToRenderer('navigate', '/deploy');
    });
    
    // F5 - Refresh data
    globalShortcut.register('F5', () => {
        if (mainWindow.isFocused()) {
            sendToRenderer('refresh');
        }
    });
    
    // F12 - Toggle DevTools (works in production too)
    globalShortcut.register('F12', () => {
        if (mainWindow.isFocused()) {
            mainWindow.webContents.toggleDevTools();
        }
    });
    
    // Ctrl+Shift+I - Also toggle DevTools
    globalShortcut.register('CommandOrControl+Shift+I', () => {
        if (mainWindow.isFocused()) {
            mainWindow.webContents.toggleDevTools();
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// AUTO UPDATER
// ═══════════════════════════════════════════════════════════════
// macOS-SPECIFIC FEATURES
// ═══════════════════════════════════════════════════════════════

let dockBadgeCount = 0;

function setupMacFeatures() {
    console.log('[Mac] Setting up macOS-specific features');
    
    // 1. System Appearance Sync - watch for dark/light mode changes
    nativeTheme.on('updated', () => {
        const isDark = nativeTheme.shouldUseDarkColors;
        console.log(`[Mac] System appearance changed: ${isDark ? 'dark' : 'light'}`);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('system-theme-changed', { isDark });
        }
    });
    
    // Send initial theme
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.on('did-finish-load', () => {
            mainWindow.webContents.send('system-theme-changed', { 
                isDark: nativeTheme.shouldUseDarkColors 
            });
        });
    }
    
    // 2. IPC handlers for Mac features
    ipcMain.handle('mac:set-dock-badge', (event, count) => {
        if (!isMac) return { success: false };
        dockBadgeCount = count;
        app.dock.setBadge(count > 0 ? String(count) : '');
        return { success: true };
    });
    
    ipcMain.handle('mac:bounce-dock', (event, type = 'informational') => {
        if (!isMac) return { success: false };
        // type: 'critical' (bounces until focused) or 'informational' (bounces once)
        app.dock.bounce(type);
        return { success: true };
    });
    
    ipcMain.handle('mac:get-appearance', () => {
        return {
            isDark: nativeTheme.shouldUseDarkColors,
            accent: nativeTheme.shouldUseHighContrastColors ? 'high-contrast' : 'normal'
        };
    });
    
    ipcMain.handle('mac:show-dock', () => {
        if (isMac) app.dock.show();
        return { success: true };
    });
    
    ipcMain.handle('mac:hide-dock', () => {
        if (isMac) app.dock.hide();
        return { success: true };
    });
    
    console.log('[Mac] macOS features initialized');
}

// ═══════════════════════════════════════════════════════════════
// WINDOWS-SPECIFIC FEATURES
// ═══════════════════════════════════════════════════════════════

function setupWindowsFeatures() {
    console.log('[Windows] Setting up Windows-specific features');
    
    // 1. Jump List - Quick actions from taskbar right-click
    app.setUserTasks([
        {
            program: process.execPath,
            arguments: '--goto=dashboard',
            iconPath: process.execPath,
            iconIndex: 0,
            title: 'Open Dashboard',
            description: 'Go to the main dashboard'
        },
        {
            program: process.execPath,
            arguments: '--goto=economy',
            iconPath: process.execPath,
            iconIndex: 0,
            title: 'Economy Overview',
            description: 'View economy statistics'
        },
        {
            program: process.execPath,
            arguments: '--goto=pm2',
            iconPath: process.execPath,
            iconIndex: 0,
            title: 'PM2 Manager',
            description: 'Manage server processes'
        },
        {
            program: process.execPath,
            arguments: '--goto=settings',
            iconPath: process.execPath,
            iconIndex: 0,
            title: 'Settings',
            description: 'Open application settings'
        }
    ]);
    
    // 2. IPC handlers for Windows features
    
    // Taskbar Progress (shows progress bar on taskbar icon)
    ipcMain.handle('win:set-progress', (event, progress) => {
        if (!isWin || !mainWindow) return { success: false };
        // progress: 0-1 for progress, -1 to hide, 2 for indeterminate
        if (progress < 0) {
            mainWindow.setProgressBar(-1); // Hide
        } else if (progress > 1) {
            mainWindow.setProgressBar(progress, { mode: 'indeterminate' });
        } else {
            mainWindow.setProgressBar(progress);
        }
        return { success: true };
    });
    
    // Taskbar Overlay (small badge icon on taskbar)
    ipcMain.handle('win:set-overlay', (event, { text, color = '#D4AF37' }) => {
        if (!isWin || !mainWindow) return { success: false };
        
        if (!text) {
            mainWindow.setOverlayIcon(null, '');
            return { success: true };
        }
        
        // Create a small badge image with text
        const badgeSize = 16;
        const canvas = require('canvas');
        if (canvas && canvas.createCanvas) {
            const cvs = canvas.createCanvas(badgeSize, badgeSize);
            const ctx = cvs.getContext('2d');
            
            // Draw circle background
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(badgeSize/2, badgeSize/2, badgeSize/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw text
            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(text).slice(0, 2), badgeSize/2, badgeSize/2);
            
            const image = nativeImage.createFromDataURL(cvs.toDataURL());
            mainWindow.setOverlayIcon(image, `${text} notifications`);
        } else {
            // Fallback: just use text description
            mainWindow.setOverlayIcon(null, `${text} notifications`);
        }
        
        return { success: true };
    });
    
    // Flash taskbar to get attention
    ipcMain.handle('win:flash-taskbar', (event, flash = true) => {
        if (!isWin || !mainWindow) return { success: false };
        mainWindow.flashFrame(flash);
        return { success: true };
    });
    
    // Thumbnail toolbar buttons (buttons in taskbar preview)
    ipcMain.handle('win:set-thumbnail-buttons', (event, buttons) => {
        if (!isWin || !mainWindow) return { success: false };
        
        const thumbButtons = buttons.map(btn => ({
            tooltip: btn.tooltip,
            icon: nativeImage.createFromPath(btn.icon || path.join(__dirname, '../build/icon.ico')),
            click: () => {
                mainWindow.webContents.send('thumbnail-button-click', btn.id);
            }
        }));
        
        mainWindow.setThumbarButtons(thumbButtons);
        return { success: true };
    });
    
    // Windows dark mode detection
    nativeTheme.on('updated', () => {
        const isDark = nativeTheme.shouldUseDarkColors;
        console.log(`[Windows] System appearance changed: ${isDark ? 'dark' : 'light'}`);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('system-theme-changed', { isDark });
        }
    });
    
    // Handle jump list arguments
    const gotoArg = process.argv.find(arg => arg.startsWith('--goto='));
    if (gotoArg) {
        const page = gotoArg.replace('--goto=', '');
        setTimeout(() => {
            sendToRenderer('navigate', `/${page}`);
        }, 1000);
    }
    
    console.log('[Windows] Windows features initialized');
}

// ═══════════════════════════════════════════════════════════════
// CROSS-PLATFORM FEATURES
// ═══════════════════════════════════════════════════════════════

let idleCheckInterval = null;
let lastIdleState = 'active';
let recentDocuments = [];

function setupCrossPlatformFeatures() {
    console.log('[Platform] Setting up cross-platform features');
    
    // ─────────────────────────────────────────────────────────────
    // NATIVE NOTIFICATIONS
    // ─────────────────────────────────────────────────────────────
    
    ipcMain.handle('notify:send', (event, { title, body, icon, actions, urgency = 'normal' }) => {
        if (!Notification.isSupported()) {
            return { success: false, error: 'Notifications not supported' };
        }
        
        const notification = new Notification({
            title: title || 'USGRP Developer Panel',
            body: body || '',
            icon: icon || path.join(__dirname, '../build/icon.png'),
            urgency: urgency, // 'low', 'normal', 'critical'
            silent: false,
            hasReply: false,
            actions: actions || []
        });
        
        notification.on('click', () => {
            if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
            }
            mainWindow?.webContents.send('notification-clicked', { title, body });
        });
        
        notification.on('action', (event, index) => {
            mainWindow?.webContents.send('notification-action', { title, actionIndex: index });
        });
        
        notification.on('close', () => {
            mainWindow?.webContents.send('notification-closed', { title });
        });
        
        notification.show();
        return { success: true };
    });
    
    // ─────────────────────────────────────────────────────────────
    // IDLE DETECTION
    // ─────────────────────────────────────────────────────────────
    
    ipcMain.handle('idle:get-time', () => {
        return { idleTime: powerMonitor.getSystemIdleTime() };
    });
    
    ipcMain.handle('idle:get-state', () => {
        const idleTime = powerMonitor.getSystemIdleTime();
        let state = 'active';
        if (idleTime > 300) state = 'idle'; // 5 minutes
        if (idleTime > 900) state = 'away'; // 15 minutes
        return { state, idleTime };
    });
    
    ipcMain.handle('idle:start-monitoring', (event, thresholdSeconds = 300) => {
        if (idleCheckInterval) clearInterval(idleCheckInterval);
        
        idleCheckInterval = setInterval(() => {
            const idleTime = powerMonitor.getSystemIdleTime();
            let state = 'active';
            if (idleTime > thresholdSeconds) state = 'idle';
            if (idleTime > thresholdSeconds * 3) state = 'away';
            
            if (state !== lastIdleState) {
                lastIdleState = state;
                mainWindow?.webContents.send('idle-state-changed', { state, idleTime });
            }
        }, 10000); // Check every 10 seconds
        
        return { success: true };
    });
    
    ipcMain.handle('idle:stop-monitoring', () => {
        if (idleCheckInterval) {
            clearInterval(idleCheckInterval);
            idleCheckInterval = null;
        }
        return { success: true };
    });
    
    // ─────────────────────────────────────────────────────────────
    // POWER MONITOR
    // ─────────────────────────────────────────────────────────────
    
    powerMonitor.on('suspend', () => {
        console.log('[Power] System suspending');
        mainWindow?.webContents.send('power-state-changed', { state: 'suspend' });
    });
    
    powerMonitor.on('resume', () => {
        console.log('[Power] System resumed');
        mainWindow?.webContents.send('power-state-changed', { state: 'resume' });
    });
    
    powerMonitor.on('on-ac', () => {
        console.log('[Power] Switched to AC power');
        mainWindow?.webContents.send('power-state-changed', { state: 'on-ac' });
    });
    
    powerMonitor.on('on-battery', () => {
        console.log('[Power] Switched to battery');
        mainWindow?.webContents.send('power-state-changed', { state: 'on-battery' });
    });
    
    powerMonitor.on('lock-screen', () => {
        console.log('[Power] Screen locked');
        mainWindow?.webContents.send('screen-lock-changed', { locked: true });
    });
    
    powerMonitor.on('unlock-screen', () => {
        console.log('[Power] Screen unlocked');
        mainWindow?.webContents.send('screen-lock-changed', { locked: false });
    });
    
    // IPC to get current power state
    ipcMain.handle('power:get-state', () => {
        return {
            onBattery: powerMonitor.isOnBatteryPower ? powerMonitor.isOnBatteryPower() : false,
            idleTime: powerMonitor.getSystemIdleTime()
        };
    });
    
    // ─────────────────────────────────────────────────────────────
    // RECENT DOCUMENTS
    // ─────────────────────────────────────────────────────────────
    
    ipcMain.handle('recent:add', (event, { path: docPath, name }) => {
        if (docPath) {
            app.addRecentDocument(docPath);
            recentDocuments.unshift({ path: docPath, name, addedAt: Date.now() });
            recentDocuments = recentDocuments.slice(0, 10); // Keep last 10
        }
        return { success: true };
    });
    
    ipcMain.handle('recent:clear', () => {
        app.clearRecentDocuments();
        recentDocuments = [];
        return { success: true };
    });
    
    ipcMain.handle('recent:get', () => {
        return { documents: recentDocuments };
    });
    
    // Handle opening recent documents
    app.on('open-file', (event, filePath) => {
        event.preventDefault();
        mainWindow?.webContents.send('open-recent-document', { path: filePath });
    });
    
    console.log('[Platform] Cross-platform features initialized');
}

// ═══════════════════════════════════════════════════════════════

function setupAutoUpdater() {
    autoUpdater.autoDownload = false;
    autoUpdater.logger = require('electron-log');
    autoUpdater.logger.transports.file.level = 'info';
    
    // Use GitHub for releases (GitHub Actions builds there)
    autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'communityorg-discord',
        repo: 'usgrp-override-center'
    });
    
    autoUpdater.on('checking-for-update', () => {
        console.log('[AutoUpdater] Checking for update...');
        sendToRenderer('update-checking', {});
    });
    
    autoUpdater.on('update-available', (info) => {
        console.log('[AutoUpdater] Update available:', info.version);
        sendToRenderer('update-available', info);
    });
    
    autoUpdater.on('update-not-available', (info) => {
        console.log('[AutoUpdater] No update available. Current version is up to date.');
        sendToRenderer('update-not-available', info);
    });
    
    autoUpdater.on('update-downloaded', (info) => {
        console.log('[AutoUpdater] Update downloaded:', info.version);
        sendToRenderer('update-downloaded', info);
    });
    
    autoUpdater.on('error', (error) => {
        console.error('[AutoUpdater] Error:', error.message);
        sendToRenderer('update-error', error.message);
    });
    
    autoUpdater.on('download-progress', (progress) => {
        console.log(`[AutoUpdater] Download progress: ${Math.round(progress.percent)}%`);
        sendToRenderer('update-progress', progress);
    });
    
    // Auto-check for updates on startup using custom GitHub checker
    if (!isDev) {
        setTimeout(async () => {
            try {
                console.log('[AutoUpdate] Checking for updates on startup...');
                await checkAndAutoDownload();
            } catch (e) {
                console.error('[AutoUpdate] Startup check failed:', e.message);
            }
        }, 3000);
    }
}

// Auto-check and auto-download on startup
async function checkAndAutoDownload() {
    try {
        sendToRenderer('update-checking', {});
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(
            'https://api.github.com/repos/communityorg-discord/usgrp-override-center/releases/latest',
            { 
                signal: controller.signal,
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            }
        );
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            console.log('[AutoUpdate] GitHub API error:', response.status);
            return;
        }
        
        const release = await response.json();
        const latestVersion = release.tag_name.replace('v', '');
        const currentVersion = app.getVersion();
        
        console.log(`[AutoUpdate] Current: ${currentVersion}, Latest: ${latestVersion}`);
        
        // Compare versions
        const partsA = latestVersion.split('.').map(Number);
        const partsB = currentVersion.split('.').map(Number);
        let isNewer = false;
        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
            const numA = partsA[i] || 0;
            const numB = partsB[i] || 0;
            if (numA > numB) { isNewer = true; break; }
            if (numA < numB) break;
        }
        
        if (isNewer) {
            console.log('[AutoUpdate] New version found, starting auto-download...');
            
            const exeAsset = release.assets.find(a => a.name.endsWith('.exe') && a.name.includes('Setup'));
            if (!exeAsset) {
                console.log('[AutoUpdate] No installer found in release');
                return;
            }
            
            // Store for later and notify
            global.pendingUpdate = {
                version: latestVersion,
                downloadUrl: exeAsset.browser_download_url,
                fileName: exeAsset.name
            };
            
            sendToRenderer('update-available', {
                version: latestVersion,
                releaseNotes: release.body,
                downloadUrl: exeAsset.browser_download_url,
                fileName: exeAsset.name,
                fileSize: exeAsset.size,
                autoDownloading: true
            });
            
            // Auto-download
            const tempPath = path.join(app.getPath('temp'), exeAsset.name);
            console.log(`[AutoUpdate] Downloading to: ${tempPath}`);
            
            const https = require('https');
            const fs = require('fs');
            
            await new Promise((resolve, reject) => {
                function download(url) {
                    https.get(url, { headers: { 'User-Agent': 'USGRP-Updater' } }, (res) => {
                        if (res.statusCode === 302 || res.statusCode === 301) {
                            download(res.headers.location);
                            return;
                        }
                        
                        if (res.statusCode !== 200) {
                            reject(new Error(`Download failed: ${res.statusCode}`));
                            return;
                        }
                        
                        const totalSize = parseInt(res.headers['content-length'] || '0', 10);
                        let downloaded = 0;
                        const file = fs.createWriteStream(tempPath);
                        
                        res.on('data', (chunk) => {
                            downloaded += chunk.length;
                            const percent = totalSize > 0 ? Math.round((downloaded / totalSize) * 100) : 0;
                            sendToRenderer('update-progress', { percent, downloaded, total: totalSize });
                        });
                        
                        res.pipe(file);
                        
                        file.on('finish', () => {
                            file.close();
                            console.log('[AutoUpdate] Download complete');
                            global.pendingUpdatePath = tempPath;
                            sendToRenderer('update-downloaded', { version: latestVersion, path: tempPath });
                            resolve();
                        });
                        
                        file.on('error', (err) => {
                            fs.unlink(tempPath, () => {});
                            reject(err);
                        });
                    }).on('error', reject);
                }
                download(exeAsset.browser_download_url);
            });
            
        } else {
            console.log('[AutoUpdate] App is up to date');
            // Don't send update-not-available on startup to avoid UI noise
        }
    } catch (error) {
        console.error('[AutoUpdate] Check failed:', error.message);
    }
}

// ═══════════════════════════════════════════════════════════════
// SCRIPT RUNNER
// ═══════════════════════════════════════════════════════════════

function setupScriptRunner() {
    const SCRIPTS_ROOT = '/home/vpcommunityorganisation/CO-Economy-Bot';
    const CUSTOM_SCRIPTS_DIR = path.join(SCRIPTS_ROOT, 'scripts');

    ipcMain.handle('scripts:list', async () => {
        try {
            // Read root scripts
            const rootFiles = await fs.promises.readdir(SCRIPTS_ROOT);
            const rootScripts = rootFiles.filter(f => f.endsWith('.js') && !f.startsWith('node_modules'));
            
            // Read custom scripts
            let customScripts = [];
            try {
                const customFiles = await fs.promises.readdir(CUSTOM_SCRIPTS_DIR);
                customScripts = customFiles.filter(f => f.endsWith('.js'));
            } catch (e) {
                // scripts dir might not exist
            }

            const allScripts = [];
            const scriptStats = store.get('scriptStats') || {};

            // Helper to process files
            const processFile = async (filename, dir, type) => {
                const fullPath = path.join(dir, filename);
                let stats;
                try {
                    stats = await fs.promises.stat(fullPath);
                } catch (e) {
                    return null;
                }

                // Read first 5 lines for description
                let content = '';
                try {
                    content = await fs.promises.readFile(fullPath, 'utf8');
                } catch (e) {
                    content = '';
                }
                
                const lines = content.split('\n').slice(0, 10);
                let description = 'No description';
                for (const line of lines) {
                    const trimmed = line.trim();
                    if ((trimmed.startsWith('//') || trimmed.startsWith('/*')) && !trimmed.includes('eslint') && !trimmed.includes('ts-check')) {
                        description = trimmed.replace(/^\/\/\s*/, '').replace(/^\/\*\s*/, '').replace(/\*\//, '').trim();
                        break;
                    }
                }
                
                return {
                    name: filename,
                    path: fullPath,
                    type, // 'root' or 'custom'
                    description,
                    content, // Send content for editor
                    lastRun: scriptStats[fullPath]?.lastRun || null,
                    lastModified: stats.mtime
                };
            };

            for (const f of rootScripts) {
                // Filter out common config files and non-scripts
                if (['package.json', 'package-lock.json', 'ecosystem.config.js', 'jest.config.js', 'postcss.config.js', 'tailwind.config.js'].includes(f)) continue;
                const s = await processFile(f, SCRIPTS_ROOT, 'root');
                if (s) allScripts.push(s);
            }
            for (const f of customScripts) {
                const s = await processFile(f, CUSTOM_SCRIPTS_DIR, 'custom');
                if (s) allScripts.push(s);
            }

            return allScripts;
        } catch (error) {
            console.error('Script list error:', error);
            return [];
        }
    });

    ipcMain.handle('scripts:run', async (event, scriptPath, dryRun) => {
        // if (!store.get('authToken')) throw new Error('Unauthorized'); // Disable auth check for local dev/demo
        
        console.log(`[ScriptRunner] Running: ${scriptPath} (DryRun: ${dryRun})`);

        const scriptStats = store.get('scriptStats') || {};
        scriptStats[scriptPath] = { lastRun: new Date().toISOString() };
        store.set('scriptStats', scriptStats);

        return new Promise((resolve, reject) => {
            const cmd = 'node';
            const args = [scriptPath];
            // Pass dry run as arg if supported, and env var
            if (dryRun) {
                args.push('--dry-run');
            }

            const env = { 
                ...process.env, 
                DRY_RUN: dryRun ? 'true' : 'false', 
                FORCE_COLOR: '1',
                // Add DB credentials if needed, or rely on .env in CWD
            };

            const proc = require('child_process').spawn(cmd, args, {
                env,
                cwd: path.dirname(scriptPath), // execute in script's dir to find .env
                shell: true
            });

            proc.stdout.on('data', (data) => {
                if (event.sender && !event.sender.isDestroyed()) {
                    event.sender.send('scripts:output', { type: 'stdout', text: data.toString() });
                }
            });

            proc.stderr.on('data', (data) => {
                if (event.sender && !event.sender.isDestroyed()) {
                    event.sender.send('scripts:output', { type: 'stderr', text: data.toString() });
                }
            });

            proc.on('close', (code) => {
                resolve({ code });
            });

            proc.on('error', (err) => {
                reject(err);
            });
        });
    });

    ipcMain.handle('scripts:save', async (event, name, content) => {
        // if (!store.get('authToken')) throw new Error('Unauthorized');
        
        let targetPath;
        // Check if name is full path
        if (name.startsWith('/')) {
            targetPath = name;
        } else {
            targetPath = path.join(CUSTOM_SCRIPTS_DIR, name);
        }

        // Security check: must be in SCRIPTS_ROOT
        if (!targetPath.startsWith(SCRIPTS_ROOT)) {
            throw new Error('Access denied: Outside script root');
        }

        // Ensure dir exists
        await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
        
        await fs.promises.writeFile(targetPath, content, 'utf8');
        return true;
    });
    
    ipcMain.handle('scripts:upload', async (event, name, content) => {
         // Same as save
         const targetPath = path.join(CUSTOM_SCRIPTS_DIR, name);
         await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
         await fs.promises.writeFile(targetPath, content, 'utf8');
         return true;
    });
}

// ═══════════════════════════════════════════════════════════════
// TERMINAL HANDLERS
// ═══════════════════════════════════════════════════════════════

const terminals = new Map();

function setupTerminalIPC() {
    // Terminal now uses API instead of local/SSH
    // These handlers are kept for backward compatibility but terminal uses HTTP API
    ipcMain.handle('terminal:create', async (event) => {
        // Return a dummy ID - actual terminal runs through API
        return Date.now().toString();
    });
    
    ipcMain.handle('terminal:write', async (event, { id, data }) => {
        // No-op - terminal uses API
    });
    
    ipcMain.handle('terminal:resize', async (event, { id, cols, rows }) => {
        // No-op - terminal uses API
    });
    
    ipcMain.handle('terminal:destroy', async (event, id) => {
        // No-op - terminal uses API
    });
}

// ═══════════════════════════════════════════════════════════════
// IPC HANDLERS
// ═══════════════════════════════════════════════════════════════

// Screen share detection state
let screenShareMonitoring = false;
let screenShareInterval = null;
let lastDetectedApps = [];

const CAPTURE_PROCESSES_WIN = [
    // Dedicated recording/streaming software only
    'obs64.exe', 'obs32.exe', 'obs.exe', 'streamlabs obs.exe', 'slobs.exe',
    'nvcontainer.exe', 'nvidia share.exe', 'gamebar.exe', 'gamebarftserver.exe',
    'loom.exe', 'sharex.exe', 'bandicam.exe', 'bdcam.exe',
    'medal.exe', 'snagit.exe', 'xsplit.core.exe', 'camtasia.exe',
];

const CAPTURE_PROCESSES_MAC = [
    'obs', 'streamlabs', 'loom', 'screenflow', 'camtasia',
    'screencapturekit', 'quicktime player', 'kap', 'cleanshot',
    'snagit', 'screenflick', 'monosnap'
];

async function detectScreenCapture() {
    return new Promise((resolve) => {
        const { exec } = require('child_process');
        const isMac = process.platform === 'darwin';
        
        if (isMac) {
            // macOS: use ps command
            exec('ps -axo comm', { maxBuffer: 1024 * 1024 * 5 }, (error, stdout) => {
                if (error) return resolve([]);
                const processes = stdout.toLowerCase().split('\n').map(l => l.trim()).filter(Boolean);
                
                const detected = [];
                for (const proc of CAPTURE_PROCESSES_MAC) {
                    if (processes.some(p => p.includes(proc))) {
                        let name = proc.charAt(0).toUpperCase() + proc.slice(1);
                        if (proc.includes('obs')) name = 'OBS Studio';
                        else if (proc.includes('loom')) name = 'Loom';
                        else if (proc.includes('screenflow')) name = 'ScreenFlow';
                        else if (proc.includes('quicktime')) name = 'QuickTime';
                        if (!detected.includes(name)) detected.push(name);
                    }
                }
                resolve(detected);
            });
        } else {
            // Windows: use tasklist
            exec('tasklist /fo csv /nh', { maxBuffer: 1024 * 1024 * 5 }, (error, stdout) => {
                if (error) return resolve([]);
                const processes = stdout.toLowerCase().split('\n').map(line => {
                    const match = line.match(/"([^"]+)"/);
                    return match ? match[1] : '';
                }).filter(Boolean);
                
                const detected = [];
                for (const proc of CAPTURE_PROCESSES_WIN) {
                    if (processes.some(p => p.includes(proc.toLowerCase()))) {
                        let name = proc.replace('.exe', '');
                        if (proc.includes('obs') || proc.includes('slobs')) name = 'OBS Studio';
                        else if (proc.includes('nvidia') || proc.includes('gamebar')) name = 'Screen Recorder';
                        else if (proc.includes('loom')) name = 'Loom';
                        else if (proc.includes('sharex')) name = 'ShareX';
                        else if (proc.includes('bandicam') || proc.includes('bdcam')) name = 'Bandicam';
                        else if (proc.includes('medal')) name = 'Medal.tv';
                        if (!detected.includes(name)) detected.push(name);
                    }
                }
                resolve(detected);
            });
        }
    });
}

function startScreenShareMonitoring() {
    if (screenShareMonitoring) return;
    screenShareMonitoring = true;
    
    const check = async () => {
        const detected = await detectScreenCapture();
        const detectedStr = detected.sort().join(',');
        const lastStr = lastDetectedApps.sort().join(',');
        
        if (detectedStr !== lastStr) {
            lastDetectedApps = detected;
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('screen-capture-detected', {
                    detected: detected.length > 0,
                    apps: detected
                });
            }
        }
    };
    
    check();
    screenShareInterval = setInterval(check, 3000);
    console.log('[ScreenShare] Monitoring started');
}

function setupIPC() {
    // Screen share detection
    ipcMain.handle('screen-share:start', () => {
        startScreenShareMonitoring();
        return { success: true };
    });
    
    ipcMain.handle('screen-share:stop', () => {
        if (screenShareInterval) clearInterval(screenShareInterval);
        screenShareMonitoring = false;
        lastDetectedApps = [];
        return { success: true };
    });
    
    ipcMain.handle('screen-share:check', async () => {
        const apps = await detectScreenCapture();
        return { detected: apps.length > 0, apps };
    });

    // Window controls
    ipcMain.handle('window:minimize', () => mainWindow.minimize());
    ipcMain.handle('window:maximize', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
        return mainWindow.isMaximized();
    });
    ipcMain.handle('window:close', () => mainWindow.hide());
    ipcMain.handle('window:isMaximized', () => mainWindow.isMaximized());
    
    // Store operations
    ipcMain.handle('store:get', (event, key) => store.get(key));
    ipcMain.handle('store:set', (event, key, value) => store.set(key, value));
    ipcMain.handle('store:delete', (event, key) => store.delete(key));
    
    // Get hardware ID
    ipcMain.handle('system:getHWID', () => {
        let hwid = store.get('hwid');
        if (!hwid) {
            hwid = require('crypto').randomUUID();
            store.set('hwid', hwid);
        }
        return hwid;
    });
    
    // API configuration
    ipcMain.handle('api:getBase', () => {
        const currentServerId = store.get('currentServer');
        if (currentServerId) {
            const servers = store.get('servers') || [];
            const server = servers.find(s => s.id === currentServerId);
            if (server) return server.apiBase;
        }
        return DEFAULT_API_BASE;
    });
    ipcMain.handle('api:getAuthBase', () => AUTH_BASE);
    ipcMain.handle('api:getToken', () => {
        const currentServerId = store.get('currentServer');
        if (currentServerId) {
            const servers = store.get('servers') || [];
            const server = servers.find(s => s.id === currentServerId);
            if (server) return server.token;
        }
        return store.get('authToken');
    });
    ipcMain.handle('api:setToken', (event, token) => {
        const currentServerId = store.get('currentServer');
        if (currentServerId) {
            // Update token for current server
            const servers = store.get('servers') || [];
            const index = servers.findIndex(s => s.id === currentServerId);
            if (index !== -1) {
                servers[index].token = token;
                store.set('servers', servers);
                return;
            }
        }
        store.set('authToken', token);
    });

    // Server Management
    ipcMain.handle('servers:getAll', () => store.get('servers') || []);
    ipcMain.handle('servers:add', (event, server) => {
        const servers = store.get('servers') || [];
        servers.push({ ...server, id: Date.now().toString() });
        store.set('servers', servers);
        return servers;
    });
    ipcMain.handle('servers:remove', (event, id) => {
        const servers = store.get('servers') || [];
        const newServers = servers.filter(s => s.id !== id);
        store.set('servers', newServers);
        
        if (store.get('currentServer') === id) {
            store.set('currentServer', null);
        }
        return newServers;
    });
    ipcMain.handle('servers:select', (event, id) => {
        store.set('currentServer', id);
        // Reload window to apply changes (api base url etc)
        mainWindow.reload();
        return true;
    });
    ipcMain.handle('servers:getCurrent', () => store.get('currentServer'));

    // Scheduled Deploys
    ipcMain.handle('deploy:schedule', (event, deploy) => {
        const schedule = store.get('scheduledDeploys') || [];
        schedule.push({ ...deploy, id: Date.now().toString(), status: 'pending' });
        store.set('scheduledDeploys', schedule);
        return schedule;
    });
    ipcMain.handle('deploy:getScheduled', () => store.get('scheduledDeploys') || []);
    ipcMain.handle('deploy:cancelScheduled', (event, id) => {
        const schedule = store.get('scheduledDeploys') || [];
        const newSchedule = schedule.filter(d => d.id !== id);
        store.set('scheduledDeploys', newSchedule);
        return newSchedule;
    });

    // Webhooks
    ipcMain.handle('webhooks:get', () => store.get('savedWebhooks') || []);
    ipcMain.handle('webhooks:save', (event, webhook) => {
        const saved = store.get('savedWebhooks') || [];
        saved.push({ ...webhook, id: Date.now().toString() });
        store.set('savedWebhooks', saved);
        return saved;
    });
    ipcMain.handle('webhooks:delete', (event, id) => {
        const saved = store.get('savedWebhooks') || [];
        const newSaved = saved.filter(w => w.id !== id);
        store.set('savedWebhooks', newSaved);
        return newSaved;
    });
    
    // Auth flow - open browser for SSO
    ipcMain.handle('auth:openLogin', () => {
        const loginUrl = `${AUTH_BASE}/login?app=override-center`;
        shell.openExternal(loginUrl);
    });
    
    // Open external links
    ipcMain.handle('shell:openExternal', (event, url) => shell.openExternal(url));
    
    // Auto updater
    ipcMain.handle('updater:check', async () => {
        sendToRenderer('update-checking', {});
        
        try {
            // Use GitHub API to check for updates (reliable)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetch(
                'https://api.github.com/repos/communityorg-discord/usgrp-override-center/releases/latest',
                { 
                    signal: controller.signal,
                    headers: { 'Accept': 'application/vnd.github.v3+json' }
                }
            );
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`GitHub API returned ${response.status}`);
            }
            
            const release = await response.json();
            const latestVersion = release.tag_name.replace('v', '');
            const currentVersion = app.getVersion();
            
            console.log(`[UpdateChecker] Current: ${currentVersion}, Latest: ${latestVersion}`);
            
            // Compare versions
            const isNewer = compareVersions(latestVersion, currentVersion) > 0;
            
            if (isNewer) {
                // Find the exe asset
                const exeAsset = release.assets.find(a => a.name.endsWith('.exe') && a.name.includes('Setup'));
                
                sendToRenderer('update-available', {
                    version: latestVersion,
                    releaseNotes: release.body,
                    downloadUrl: exeAsset ? exeAsset.browser_download_url : null,
                    fileName: exeAsset ? exeAsset.name : null,
                    fileSize: exeAsset ? exeAsset.size : 0
                });
                
                // Store for download
                global.pendingUpdate = {
                    version: latestVersion,
                    downloadUrl: exeAsset ? exeAsset.browser_download_url : null,
                    fileName: exeAsset ? exeAsset.name : null
                };
            } else {
                sendToRenderer('update-not-available', {});
            }
            
            return { version: latestVersion, isNewer };
        } catch (error) {
            console.error('[UpdateChecker] Failed:', error.message);
            if (error.name === 'AbortError') {
                sendToRenderer('update-error', 'Update check timed out. Check your internet connection.');
            } else {
                sendToRenderer('update-error', error.message || 'Failed to check for updates');
            }
            return null;
        }
    });
    
    // Simple version comparator (handles x.y.z format)
    function compareVersions(a, b) {
        const partsA = a.split('.').map(Number);
        const partsB = b.split('.').map(Number);
        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
            const numA = partsA[i] || 0;
            const numB = partsB[i] || 0;
            if (numA > numB) return 1;
            if (numA < numB) return -1;
        }
        return 0;
    }
    
    // Custom download - no electron-updater, just https
    ipcMain.handle('updater:download', async () => {
        if (!global.pendingUpdate || !global.pendingUpdate.downloadUrl) {
            sendToRenderer('update-error', 'No update available. Please check for updates first.');
            return;
        }
        
        const { downloadUrl, fileName, version } = global.pendingUpdate;
        const tempPath = path.join(app.getPath('temp'), fileName || `USGRP-Update-${version}.exe`);
        
        console.log(`[UpdateChecker] Downloading from: ${downloadUrl}`);
        console.log(`[UpdateChecker] Saving to: ${tempPath}`);
        
        try {
            sendToRenderer('update-progress', { percent: 0, status: 'Starting download...' });
            
            // Use https to download
            const https = require('https');
            const fs = require('fs');
            
            await new Promise((resolve, reject) => {
                const file = fs.createWriteStream(tempPath);
                
                const request = https.get(downloadUrl, { 
                    headers: { 'User-Agent': 'USGRP-Override-Center' }
                }, (response) => {
                    // Handle redirects (GitHub uses them)
                    if (response.statusCode === 302 || response.statusCode === 301) {
                        file.close();
                        fs.unlinkSync(tempPath);
                        
                        https.get(response.headers.location, {
                            headers: { 'User-Agent': 'USGRP-Override-Center' }
                        }, (redirectResponse) => {
                            const totalSize = parseInt(redirectResponse.headers['content-length'], 10);
                            let downloadedSize = 0;
                            
                            const newFile = fs.createWriteStream(tempPath);
                            
                            redirectResponse.on('data', (chunk) => {
                                downloadedSize += chunk.length;
                                const percent = Math.round((downloadedSize / totalSize) * 100);
                                sendToRenderer('update-progress', { 
                                    percent, 
                                    status: `Downloading... ${Math.round(downloadedSize / 1024 / 1024)}MB / ${Math.round(totalSize / 1024 / 1024)}MB`
                                });
                            });
                            
                            redirectResponse.pipe(newFile);
                            
                            newFile.on('finish', () => {
                                newFile.close();
                                resolve();
                            });
                            
                            newFile.on('error', (err) => {
                                fs.unlinkSync(tempPath);
                                reject(err);
                            });
                        }).on('error', reject);
                        return;
                    }
                    
                    const totalSize = parseInt(response.headers['content-length'], 10);
                    let downloadedSize = 0;
                    
                    response.on('data', (chunk) => {
                        downloadedSize += chunk.length;
                        const percent = Math.round((downloadedSize / totalSize) * 100);
                        sendToRenderer('update-progress', { 
                            percent, 
                            status: `Downloading... ${Math.round(downloadedSize / 1024 / 1024)}MB / ${Math.round(totalSize / 1024 / 1024)}MB`
                        });
                    });
                    
                    response.pipe(file);
                    
                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });
                });
                
                request.on('error', (err) => {
                    fs.unlinkSync(tempPath);
                    reject(err);
                });
            });
            
            console.log('[UpdateChecker] Download complete, storing path for install');
            global.pendingUpdate.installerPath = tempPath;
            
            sendToRenderer('update-downloaded', { 
                version,
                installerPath: tempPath
            });
            
        } catch (error) {
            console.error('[UpdateChecker] Download failed:', error);
            sendToRenderer('update-error', 'Download failed: ' + error.message);
        }
    });
    
    // Install - run the downloaded installer and quit
    ipcMain.handle('updater:install', async () => {
        if (!global.pendingUpdate || !global.pendingUpdate.installerPath) {
            sendToRenderer('update-error', 'No update downloaded. Please download first.');
            return;
        }
        
        const installerPath = global.pendingUpdate.installerPath;
        console.log(`[UpdateChecker] Running installer: ${installerPath}`);
        
        try {
            // Run installer silently
            const { spawn } = require('child_process');
            spawn(installerPath, ['/S'], {
                detached: true,
                stdio: 'ignore'
            }).unref();
            
            // Quit app so installer can replace files
            setTimeout(() => {
                app.isQuitting = true;
                app.quit();
            }, 1000);
            
        } catch (error) {
            console.error('[UpdateChecker] Install failed:', error);
            sendToRenderer('update-error', 'Install failed: ' + error.message);
        }
    });
    
    // App info
    ipcMain.handle('app:getVersion', () => app.getVersion());
    ipcMain.handle('app:getName', () => app.getName());
    
    // Settings
    ipcMain.handle('settings:setAlwaysOnTop', (event, value) => {
        store.set('alwaysOnTop', value);
        mainWindow.setAlwaysOnTop(value);
    });

    // Config Editor
    ipcMain.handle('config:list', async () => {
        if (!store.get('authToken')) throw new Error('Unauthorized');
        try {
            // Find .env files in /srv/usgrp/*/
            // Using fast-glob
            const files = await fg('/srv/usgrp/*/.env', { deep: 2 });
            return files;
        } catch (error) {
            console.error('Config list error:', error);
            // Fallback for dev/testing if /srv doesn't exist
            if (isDev) return ['/tmp/test/.env', '/tmp/demo/.env'];
            return [];
        }
    });

    ipcMain.handle('config:read', async (event, filePath) => {
        if (!store.get('authToken')) throw new Error('Unauthorized');
        return fs.promises.readFile(filePath, 'utf8');
    });

    ipcMain.handle('config:save', async (event, filePath, content) => {
        if (!store.get('authToken')) throw new Error('Unauthorized');
        // Backup
        try {
            const backupPath = `${filePath}.bak.${Date.now()}`;
            await fs.promises.copyFile(filePath, backupPath);
        } catch (e) {
            console.warn('Backup failed:', e);
        }
        await fs.promises.writeFile(filePath, content, 'utf8');
        return true;
    });
}

function sendToRenderer(channel, data) {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(channel, data);
    }
}

// ═══════════════════════════════════════════════════════════════
// SCHEDULED TASKS
// ═══════════════════════════════════════════════════════════════

function checkScheduledDeploys() {
    console.log('[Scheduler] Starting scheduler...');
    setInterval(async () => {
        try {
            const schedule = store.get('scheduledDeploys') || [];
            const now = new Date();
            let changed = false;

            for (const job of schedule) {
                if (job.status === 'pending' && new Date(job.scheduledFor) <= now) {
                    console.log(`[Scheduler] Triggering deploy for ${job.project}`);
                    
                    // Mark as processing
                    job.status = 'processing';
                    changed = true;

                    // Execute
                    try {
                        // Get server credentials
                        let apiBase = DEFAULT_API_BASE;
                        let token = store.get('authToken');

                        if (job.serverId) {
                            const servers = store.get('servers') || [];
                            const server = servers.find(s => s.id === job.serverId);
                            if (server) {
                                apiBase = server.apiBase;
                                token = server.token;
                            }
                        }

                        // Call API
                        const fetch = (await import('node-fetch')).default || global.fetch; // Use global fetch if available (Node 18+)
                        const response = await fetch(`${apiBase}/override/deploy/${job.project}`, {
                            method: 'POST',
                            headers: {
                                'X-Override-Token': token
                            }
                        });

                        if (response.ok) {
                            job.status = 'completed';
                            job.completedAt = new Date().toISOString();
                        } else {
                            job.status = 'failed';
                            job.error = `HTTP ${response.status}: ${response.statusText}`;
                        }
                    } catch (err) {
                        job.status = 'failed';
                        job.error = err.message;
                    }
                    
                    // Notify renderer
                    sendToRenderer('deploy-update', job);
                }
            }

            if (changed) {
                store.set('scheduledDeploys', schedule);
            }
        } catch (error) {
            console.error('[Scheduler] Error:', error);
        }
    }, 60000); // Check every minute
}

// ═══════════════════════════════════════════════════════════════
// APP LIFECYCLE
// ═══════════════════════════════════════════════════════════════

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine) => {
        // Handle protocol URL from second instance
        const url = commandLine.find(arg => arg.startsWith(`${PROTOCOL}://`));
        if (url) {
            handleProtocolUrl(url);
        }
        
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

// Handle protocol URL on macOS
app.on('open-url', (event, url) => {
    event.preventDefault();
    handleProtocolUrl(url);
});

app.whenReady().then(() => {
    createWindow();
    createTray();
    createApplicationMenu();
    checkScheduledDeploys();
    registerShortcuts();
    setupIPC();
    setupAdvancedFeatures();
    setupFraudDetection();
    setupRelationshipMapper();
    setupEconomySimulator();
    setupScriptRunner();
    setupGitIPC();
    setupTerminalIPC();
    setupAtlasBrainConfig();
    setupAutoUpdater();
    startScreenShareMonitoring(); // Start screen share detection
    
    // macOS-specific setup
    if (isMac) {
        setupMacFeatures();
    }
    
    // Windows-specific setup
    if (isWin) {
        setupWindowsFeatures();
    }
    
    // Cross-platform features (notifications, idle, power, etc.)
    setupCrossPlatformFeatures();
    
    // Check if launched with protocol URL (Windows/Linux)
    const url = process.argv.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (url) {
        handleProtocolUrl(url);
    }
});

app.on('window-all-closed', () => {
    // Don't quit on macOS
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    } else {
        mainWindow.show();
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

// Handle certificate errors (for development)
if (isDev) {
    app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
        event.preventDefault();
        callback(true);
    });
}

// ═══════════════════════════════════════════════════════════════
// GIT HANDLERS
// ═══════════════════════════════════════════════════════════════

function setupGitIPC() {
    const simpleGit = require('simple-git');

    ipcMain.handle('git:listRepos', async () => {
        try {
            const searchPath = isDev ? path.join(app.getPath('home'), 'projects') : '/srv/usgrp';
            // Find directories containing .git
            // deep: 3 usually enough for /srv/usgrp/repo/.git
            const gitDirs = await fg(path.join(searchPath, '**/.git'), { deep: 3, onlyDirectories: true, ignore: ['**/node_modules/**'] });
            
            const repos = await Promise.all(gitDirs.map(async (gitDir) => {
                const repoPath = path.dirname(gitDir);
                try {
                    const git = simpleGit(repoPath);
                    const [remotes, branch] = await Promise.all([
                        git.getRemotes(true),
                        git.branchLocal()
                    ]);
                    
                    return {
                        path: repoPath,
                        name: path.basename(repoPath),
                        branch: branch.current,
                        remotes: remotes
                    };
                } catch (e) {
                    return null;
                }
            }));
            
            // Deduplicate by path
            const uniqueRepos = Array.from(new Map(repos.filter(r => r !== null).map(r => [r.path, r])).values());
            return uniqueRepos;
        } catch (error) {
            console.error('Git list error:', error);
            return [];
        }
    });

    ipcMain.handle('git:status', async (event, repoPath) => {
        const git = simpleGit(repoPath);
        return await git.status();
    });

    ipcMain.handle('git:branches', async (event, repoPath) => {
        const git = simpleGit(repoPath);
        return await git.branch();
    });

    ipcMain.handle('git:checkout', async (event, repoPath, branch) => {
        const git = simpleGit(repoPath);
        await git.checkout(branch);
        return true;
    });

    ipcMain.handle('git:createBranch', async (event, repoPath, branch) => {
        const git = simpleGit(repoPath);
        await git.checkoutLocalBranch(branch);
        return true;
    });

    ipcMain.handle('git:deleteBranch', async (event, repoPath, branch) => {
        const git = simpleGit(repoPath);
        await git.deleteLocalBranch(branch);
        return true;
    });

    ipcMain.handle('git:pull', async (event, repoPath) => {
        const git = simpleGit(repoPath);
        return await git.pull();
    });

    ipcMain.handle('git:push', async (event, repoPath) => {
        const git = simpleGit(repoPath);
        return await git.push();
    });

    ipcMain.handle('git:stage', async (event, repoPath, files) => {
        const git = simpleGit(repoPath);
        if (files === '.') await git.add('.');
        else await git.add(files);
        return true;
    });

    ipcMain.handle('git:unstage', async (event, repoPath, files) => {
        const git = simpleGit(repoPath);
        if (files === '.') await git.reset(['HEAD']); 
        else await git.reset(['HEAD', ...files]);
        return true;
    });

    ipcMain.handle('git:commit', async (event, repoPath, message) => {
        const git = simpleGit(repoPath);
        return await git.commit(message);
    });

    ipcMain.handle('git:log', async (event, repoPath) => {
        const git = simpleGit(repoPath);
        return await git.log({ maxCount: 50 });
    });

    ipcMain.handle('git:diff', async (event, repoPath, file) => {
        const git = simpleGit(repoPath);
        if (file) return await git.diff([file]);
        return await git.diff();
    });

    ipcMain.handle('git:reset', async (event, repoPath, mode, commit) => {
        const git = simpleGit(repoPath);
        if (commit) {
             await git.reset([mode === 'hard' ? '--hard' : '--mixed', commit]);
        } else {
             await git.reset(mode);
        }
        return true;
    });
}

// ═══════════════════════════════════════════════════════════════
// ADVANCED FEATURES (Graph, Migrations, Alerts)
// ═══════════════════════════════════════════════════════════════

function setupAdvancedFeatures() {
    // 1. Service Dependency Graph
    ipcMain.handle('services:getDependencies', async () => {
        try {
            // Try to get PM2 list
            let processes = [];
            try {
                const { stdout } = await execPromise('pm2 jlist');
                processes = JSON.parse(stdout);
            } catch (e) {
                console.warn('PM2 list failed, using mock data for dev:', e.message);
                if (isDev) {
                    processes = [
                        { name: 'api-gateway', pm2_env: { status: 'online', pm_cwd: '/srv/usgrp/api', DATABASE_URL: 'postgres://user:pass@localhost:5432/db', REDIS_URL: 'redis://localhost:6379' } },
                        { name: 'auth-service', pm2_env: { status: 'online', pm_cwd: '/srv/usgrp/auth', DATABASE_URL: 'postgres://user:pass@localhost:5432/auth' } },
                        { name: 'frontend', pm2_env: { status: 'online', pm_cwd: '/srv/usgrp/web', API_URL: 'http://localhost:3000' } }
                    ];
                }
            }

            const nodes = [];
            const links = [];
            
            // Add process nodes
            processes.forEach(proc => {
                nodes.push({
                    id: proc.name,
                    name: proc.name,
                    status: proc.pm2_env.status,
                    path: proc.pm2_env.pm_cwd,
                    type: 'service',
                    color: proc.pm2_env.status === 'online' ? '#10b981' : '#ef4444'
                });
            });

            // Add Infra Nodes and Links
            processes.forEach(proc => {
                const env = proc.pm2_env || {};
                
                // DB
                if (env.DATABASE_URL && env.DATABASE_URL.includes('postgres')) {
                    if (!nodes.find(n => n.id === 'postgres')) {
                        nodes.push({ id: 'postgres', name: 'Postgres DB', type: 'db', color: '#3b82f6' });
                    }
                    links.push({ source: proc.name, target: 'postgres' });
                }

                // Redis
                if (env.REDIS_URL || (env.DATABASE_URL && env.DATABASE_URL.includes('redis'))) {
                    if (!nodes.find(n => n.id === 'redis')) {
                        nodes.push({ id: 'redis', name: 'Redis', type: 'db', color: '#ef4444' });
                    }
                    links.push({ source: proc.name, target: 'redis' });
                }

                // Inter-service (heuristic based on names/env)
                if (env.API_URL || env.AUTH_URL) {
                    const targetName = env.AUTH_URL ? 'auth-service' : 'api-gateway'; // Simplification
                    if (nodes.find(n => n.id === targetName) && proc.name !== targetName) {
                        links.push({ source: proc.name, target: targetName });
                    }
                }
            });

            // Calculate Positions (Circular Layout)
            const centerX = 400;
            const centerY = 300;
            const radius = 200;
            
            // If no nodes from PM2, add a placeholder message
            if (nodes.length === 0) {
                nodes.push({
                    id: 'no-services',
                    name: 'No services detected',
                    type: 'info',
                    color: '#6b7280',
                    x: centerX,
                    y: centerY
                });
            } else {
                nodes.forEach((node, i) => {
                    if (node.id === 'postgres') { node.x = centerX; node.y = centerY; return; }
                    if (node.id === 'redis') { node.x = centerX + 50; node.y = centerY + 50; return; }
                    
                    const angle = (i / nodes.length) * 2 * Math.PI;
                    node.x = centerX + radius * Math.cos(angle);
                    node.y = centerY + radius * Math.sin(angle);
                });
            }

            return { nodes, links };
        } catch (error) {
            console.error('Graph error:', error);
            return { nodes: [], links: [] };
        }
    });

    // 2. Database Migrations
    ipcMain.handle('migrations:getStatus', async () => {
        const projects = [];
        try {
            // Find directories with prisma/schema.prisma
            // Fallback for dev
            const searchPath = isDev ? path.join(app.getPath('home'), 'projects') : '/srv/usgrp';
            
            // Using fast-glob to find schema files
            const schemas = await fg(path.join(searchPath, '**/prisma/schema.prisma'), { deep: 3 });
            
            for (const schemaPath of schemas) {
                const projectDir = path.dirname(path.dirname(schemaPath));
                const projectName = path.basename(projectDir);
                
                let status = 'Unknown';
                let pending = 0;

                try {
                    // Check status
                    const { stdout } = await execPromise('npx prisma migrate status', { cwd: projectDir });
                    status = stdout;
                    
                    const pendingMatch = stdout.match(/(\d+) migration\(s\) are pending/);
                    if (pendingMatch) pending = parseInt(pendingMatch[1]);
                } catch (e) {
                    status = 'Error: ' + e.message;
                }

                projects.push({
                    name: projectName,
                    path: projectDir,
                    status,
                    pending
                });
            }
        } catch (error) {
            console.error('Migration scan error:', error);
        }
        return projects;
    });

    ipcMain.handle('migrations:run', async (event, projectPath) => {
        const { stdout } = await execPromise('npx prisma migrate deploy', { cwd: projectPath });
        return stdout;
    });

    ipcMain.handle('migrations:reset', async (event, projectPath) => {
        const { stdout } = await execPromise('npx prisma migrate reset --force', { cwd: projectPath });
        return stdout;
    });

    // 3. Mobile Alerts
    ipcMain.handle('alerts:reload', () => {
        setupAlertWatcher();
    });

    ipcMain.handle('alerts:test', async (event, config) => {
        const fetch = (await import('node-fetch')).default || global.fetch;
        
        if (config.discordWebhook) {
            await fetch(config.discordWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    content: '🔔 **Test Alert**\nThis is a test notification from USGRP Developer Panel.' 
                })
            });
        }
        
        if (config.telegramToken && config.telegramChatId) {
            await fetch(`https://api.telegram.org/bot${config.telegramToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: config.telegramChatId,
                    text: '🔔 *Test Alert*\nThis is a test notification from USGRP Developer Panel.',
                    parse_mode: 'Markdown'
                })
            });
        }
        return true;
    });

    // Start watcher
    setupAlertWatcher();
}

let alertInterval = null;

function setupAlertWatcher() {
    if (alertInterval) clearInterval(alertInterval);
    
    const config = store.get('alertsConfig');
    if (!config || !config.enabled) return;

    console.log('[Alerts] Watcher started');
    
    alertInterval = setInterval(async () => {
        try {
            // Check PM2
            if (config.triggers.serviceDown) {
                const { stdout } = await execPromise('pm2 jlist');
                const processes = JSON.parse(stdout);
                const downProcs = processes.filter(p => p.pm2_env.status !== 'online');
                
                if (downProcs.length > 0) {
                    // Send alert (debounce logic needed in real app, simplified here)
                    // console.log('Alert: Services down', downProcs.map(p => p.name));
                }
            }
            
            // Check CPU (Mock)
            // ...
            
        } catch (e) {
            // Silent error
        }
    }, 60000);
}

/**
 * Fraud Detection Logic
 * Feature #13 implementation
 */
function setupFraudDetection() {
    ipcMain.handle('fraud:getAlerts', () => {
        return store.get('fraudAlerts') || [];
    });

    ipcMain.handle('fraud:updateAlert', (event, id, data) => {
        const alerts = store.get('fraudAlerts') || [];
        const index = alerts.findIndex(a => a.id === id);
        if (index !== -1) {
            alerts[index] = { ...alerts[index], ...data, updatedAt: new Date().toISOString() };
            store.set('fraudAlerts', alerts);
            return alerts[index];
        }
        return null;
    });

    ipcMain.handle('fraud:scan', async () => {
        try {
            // Helper to get base and token
            const currentServerId = store.get('currentServer');
            let apiBase = 'https://api.usgrp.xyz';
            let token = store.get('authToken');
            
            if (currentServerId) {
                const servers = store.get('servers') || [];
                const server = servers.find(s => s.id === currentServerId);
                if (server) {
                    apiBase = server.apiBase;
                    token = server.token;
                }
            }

            const fetch = (await import('node-fetch')).default || global.fetch;
            
            // 1. Fetch Data
            const txRes = await fetch(`${apiBase}/override/economy/transactions?limit=1000`, {
                headers: { 'X-Override-Token': token }
            });
            let transactions = [];
            if (txRes.ok) {
                const txData = await txRes.json();
                transactions = txData.transactions || [];
            }

            // 2. Fetch User IPs (Potential Alts)
            const userRes = await fetch(`${apiBase}/override/users?limit=1000`, {
                headers: { 'X-Override-Token': token }
            });
            let users = [];
            if (userRes.ok) {
                const userData = await userRes.json();
                users = userData.users || [];
            }

            const alerts = store.get('fraudAlerts') || [];
            const newAlerts = [];

            const addAlert = (type, severity, description, relatedUsers, data) => {
                const exists = alerts.find(a => 
                    a.type === type && 
                    a.description === description && 
                    a.status !== 'dismissed' &&
                    Date.now() - new Date(a.createdAt).getTime() < 86400000
                );
                if (!exists) {
                    newAlerts.push({
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                        type,
                        severity,
                        description,
                        relatedUsers,
                        data,
                        status: 'new',
                        createdAt: new Date().toISOString()
                    });
                }
            };

            // Detection Logic
            
            // Rapid Large Transfers
            const largeTxs = transactions.filter(t => Math.abs(t.amount) > 10000);
            const txByUser = {};
            largeTxs.forEach(tx => {
                if (!txByUser[tx.user_id]) txByUser[tx.user_id] = [];
                txByUser[tx.user_id].push(tx);
            });
            
            for (const [userId, txs] of Object.entries(txByUser)) {
                txs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                for (let i = 0; i < txs.length - 2; i++) {
                    const t1 = new Date(txs[i].created_at);
                    const t3 = new Date(txs[i+2].created_at);
                    if (t3 - t1 < 5 * 60 * 1000) {
                        addAlert('Rapid Large Transfers', 'High', `User ${userId} made 3+ large transfers in 5 minutes`, [userId], { transactions: txs.slice(i, i+3) });
                        break;
                    }
                }
            }

            // Shared IP Detection
            const usersByIp = {};
            users.forEach(u => {
                if (u.last_ip && u.last_ip !== '127.0.0.1') {
                    if (!usersByIp[u.last_ip]) usersByIp[u.last_ip] = [];
                    usersByIp[u.last_ip].push(u.discord_id);
                }
            });

            for (const [ip, discordIds] of Object.entries(usersByIp)) {
                if (discordIds.length > 1) {
                    addAlert('Shared IP Detection', 'Medium', `${discordIds.length} users sharing IP address ${ip}`, discordIds, { ip });
                }
            }

            // Wealth Spike (>500% in 24h - simple logic using flows)
            const flowByUser = {};
            transactions.forEach(tx => {
                if (!flowByUser[tx.user_id]) flowByUser[tx.user_id] = 0;
                // Simplified: assuming inflow is positive, outflow negative
                flowByUser[tx.user_id] += tx.amount;
            });

            for (const [userId, flow] of Object.entries(flowByUser)) {
                if (flow > 500000) { // arbitrary threshold for spike alert without knowing base balance
                    addAlert('Wealth Spike', 'Medium', `User ${userId} had net inflow of ${flow.toLocaleString()} in recent window`, [userId], { netFlow: flow });
                }
            }

            // New Account + Rich
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            users.forEach(u => {
                const created = new Date(u.created_at || u.joined_at);
                if (created > sevenDaysAgo && (u.balance > 100000 || u.bank > 100000)) {
                    addAlert('New Account + Rich', 'High', `Account <7 days old has balance >$100k`, [u.discord_id], { balance: u.balance, created: u.created_at });
                }
            });

            // Save Alerts
            const updatedAlerts = [...newAlerts, ...alerts];
            store.set('fraudAlerts', updatedAlerts);
            
            return {
                scannedTransactions: transactions.length,
                newAlerts: newAlerts.length,
                alerts: newAlerts
            };

        } catch (error) {
            console.error('Fraud Scan Error:', error);
            return { scannedTransactions: 0, newAlerts: 0, alerts: [] };
        }
    });
}

/**
 * Feature #XX: Economy Simulator
 */
function setupEconomySimulator() {
    const getApiConfig = () => {
        const currentServerId = store.get('currentServer');
        let apiBase = 'https://api.usgrp.xyz';
        let token = store.get('authToken');
        
        if (currentServerId) {
            const servers = store.get('servers') || [];
            const server = servers.find(s => s.id === currentServerId);
            if (server) {
                apiBase = server.apiBase;
                token = server.token;
            }
        }
        return { apiBase, token };
    };

    ipcMain.handle('economy:getSimulationData', async () => {
        try {
            const { apiBase, token } = getApiConfig();
            const fetch = (await import('node-fetch')).default || global.fetch;
            
            // Get economy stats
            const statsRes = await fetch(`${apiBase}/override/economy/stats`, {
                headers: { 'X-Override-Token': token }
            });
            
            if (!statsRes.ok) {
                // Return mock data for dev
                return {
                    totalMoney: 50000000,
                    totalUsers: 1500,
                    averageBalance: 33333,
                    medianBalance: 15000,
                    currentTaxRate: 5,
                    dailyTransactionVolume: 2500000,
                    topHolders: [
                        { name: 'User1', balance: 5000000 },
                        { name: 'User2', balance: 3000000 },
                        { name: 'User3', balance: 2000000 }
                    ]
                };
            }
            
            const stats = await statsRes.json();
            return {
                totalMoney: stats.totalMoney || stats.total_money || 0,
                totalUsers: stats.totalUsers || stats.user_count || 0,
                averageBalance: stats.averageBalance || stats.average || 0,
                medianBalance: stats.medianBalance || stats.median || 0,
                currentTaxRate: stats.taxRate || 5,
                dailyTransactionVolume: stats.dailyVolume || 0,
                topHolders: stats.topHolders || []
            };
        } catch (error) {
            console.error('Economy simulation data error:', error);
            // Return mock data on error
            return {
                totalMoney: 50000000,
                totalUsers: 1500,
                averageBalance: 33333,
                medianBalance: 15000,
                currentTaxRate: 5,
                dailyTransactionVolume: 2500000,
                topHolders: []
            };
        }
    });

    ipcMain.handle('economy:simulate', async (event, params) => {
        const { taxRate, moneyInjection } = params;
        
        // Simple simulation logic
        const baseData = await ipcMain.handle('economy:getSimulationData');
        const currentMoney = baseData?.totalMoney || 50000000;
        const currentUsers = baseData?.totalUsers || 1500;
        
        // Project 12 months
        const months = [];
        let runningMoney = currentMoney + (moneyInjection || 0);
        let runningVelocity = baseData?.dailyTransactionVolume || 2500000;
        
        for (let i = 0; i < 12; i++) {
            const taxDrain = runningMoney * (taxRate / 100) * 0.1; // 10% of tax rate per month
            runningMoney = runningMoney - taxDrain + (moneyInjection / 12);
            runningVelocity = runningVelocity * (1 + (taxRate > 10 ? -0.02 : 0.01));
            
            months.push({
                month: i + 1,
                totalMoney: Math.max(0, runningMoney),
                velocity: Math.max(0, runningVelocity),
                avgBalance: runningMoney / currentUsers,
                taxCollected: taxDrain
            });
        }
        
        return {
            projection: months,
            summary: {
                finalMoney: months[11]?.totalMoney || 0,
                totalTaxCollected: months.reduce((sum, m) => sum + m.taxCollected, 0),
                velocityChange: ((months[11]?.velocity / months[0]?.velocity) - 1) * 100
            }
        };
    });
}

/**
 * Feature #17: Relationship Mapper
 */
function setupRelationshipMapper() {
    ipcMain.handle('relationships:get', async (event, filters = {}) => {
        try {
            // Helper to get base and token
            const currentServerId = store.get('currentServer');
            let apiBase = 'https://api.usgrp.xyz';
            let token = store.get('authToken');
            
            if (currentServerId) {
                const servers = store.get('servers') || [];
                const server = servers.find(s => s.id === currentServerId);
                if (server) {
                    apiBase = server.apiBase;
                    token = server.token;
                }
            }

            // Using global fetch (Node 18+)
            const fetch = (await import('node-fetch')).default || global.fetch;

            // 1. Fetch Users
            // Limit to 2000 for performance unless filtered
            const userRes = await fetch(`${apiBase}/override/users?limit=2000`, {
                headers: { 'X-Override-Token': token }
            });
            let users = [];
            if (userRes.ok) {
                const userData = await userRes.json();
                users = userData.users || [];
            } else {
                // If API fails (e.g. dev mode), use mock data if in dev
                if (isDev) {
                    users = generateMockUsers();
                }
            }

            // 2. Fetch Transactions
            const txRes = await fetch(`${apiBase}/override/economy/transactions?limit=5000`, {
                headers: { 'X-Override-Token': token }
            });
            let transactions = [];
            if (txRes.ok) {
                const txData = await txRes.json();
                transactions = txData.transactions || [];
            } else {
                if (isDev) {
                    transactions = generateMockTransactions(users);
                }
            }

            // 3. Process Nodes
            const nodes = users.map(u => ({
                id: u.discord_id,
                label: u.username || u.name || u.discord_id,
                group: u.status || 'citizen', // citizen, staff, banned
                value: (u.balance || 0) + (u.bank || 0), // wealth
                details: u
            }));

            // Filter nodes if needed
            // ...

            // 4. Process Edges
            const edges = [];
            
            // 4a. Trades
            // Aggregate transactions between same pair
            const tradeMap = new Map();
            transactions.forEach(tx => {
                if (!tx.user_id || !tx.target_id) return;
                const key = [tx.user_id, tx.target_id].sort().join('-');
                if (!tradeMap.has(key)) {
                    tradeMap.set(key, { 
                        from: tx.user_id, 
                        to: tx.target_id, 
                        value: 0, 
                        count: 0,
                        type: 'trade' 
                    });
                }
                const entry = tradeMap.get(key);
                entry.value += Math.abs(tx.amount);
                entry.count += 1;
            });
            
            tradeMap.forEach(edge => {
                edges.push({
                    from: edge.from,
                    to: edge.to,
                    value: edge.value,
                    label: `$${edge.value}`,
                    color: '#10b981', // green for money
                    type: 'trade'
                });
            });

            // 4b. Shared IP
            const ipMap = {};
            users.forEach(u => {
                if (u.last_ip && u.last_ip !== '127.0.0.1' && u.last_ip !== '::1') {
                    if (!ipMap[u.last_ip]) ipMap[u.last_ip] = [];
                    ipMap[u.last_ip].push(u.discord_id);
                }
            });

            for (const [ip, ids] of Object.entries(ipMap)) {
                if (ids.length > 1) {
                    // Connect all pairs (clique)
                    for (let i = 0; i < ids.length; i++) {
                        for (let j = i + 1; j < ids.length; j++) {
                            edges.push({
                                from: ids[i],
                                to: ids[j],
                                value: 1,
                                color: '#ef4444', // red for suspicious
                                type: 'shared_ip',
                                dashed: true
                            });
                        }
                    }
                }
            }

            // 4c. Gangs
            const gangMap = {};
            users.forEach(u => {
                if (u.gang && u.gang !== 'None') {
                    if (!gangMap[u.gang]) gangMap[u.gang] = [];
                    gangMap[u.gang].push(u.discord_id);
                }
            });

            for (const [gang, ids] of Object.entries(gangMap)) {
                if (ids.length > 1) {
                    // Create a central "Gang Node" to avoid clique explosion?
                    // Or just connect them. Let's do a chain or simple connections to avoid clutter.
                    // For visualization, maybe just connect sequential to form a cluster, or all to first.
                    // Better: Connect all to a virtual gang node if the library supports it, but here we only have user nodes.
                    // Let's connect everyone to the "leader" (first in list) or just pairwise.
                    // Pairwise is too much. Let's just do a ring: 1-2, 2-3, 3-1.
                    for (let i = 0; i < ids.length; i++) {
                        const next = (i + 1) % ids.length;
                        edges.push({
                            from: ids[i],
                            to: ids[next],
                            value: 2,
                            color: '#8b5cf6', // purple
                            type: 'gang'
                        });
                    }
                }
            }

            // 4d. Family (Mocked for now as we don't have partner field confirmed)
            // if (u.partner) ...

            // 5. Ring Detection (Suspicious Circular Trades)
            // A -> B -> C -> A
            // We build an adjacency list for TRADES only
            const adj = {};
            edges.filter(e => e.type === 'trade').forEach(e => {
                if (!adj[e.from]) adj[e.from] = [];
                adj[e.from].push(e.to);
            });
            
            const suspiciousNodes = new Set();
            
            // DFS for cycles of length 3 or 4
            // Simplified detection
            for (const startNode of Object.keys(adj)) {
                const stack = [[startNode, [startNode]]];
                while (stack.length > 0) {
                    const [node, path] = stack.pop();
                    if (path.length > 4) continue;
                    
                    const neighbors = adj[node] || [];
                    for (const neighbor of neighbors) {
                        if (neighbor === startNode && path.length > 2) {
                            // Cycle found!
                            path.forEach(n => suspiciousNodes.add(n));
                        } else if (!path.includes(neighbor)) {
                            stack.push([neighbor, [...path, neighbor]]);
                        }
                    }
                }
            }

            // Mark suspicious nodes
            nodes.forEach(n => {
                if (suspiciousNodes.has(n.id)) {
                    n.suspicious = true;
                    n.borderColor = '#ef4444';
                    n.borderWidth = 4;
                }
            });

            return { nodes, edges };

        } catch (error) {
            console.error('Relationship Mapper Error:', error);
            return { nodes: [], edges: [] };
        }
    });
}

function generateMockUsers() {
    const statuses = ['citizen', 'citizen', 'citizen', 'staff', 'banned'];
    const users = [];
    for (let i = 0; i < 50; i++) {
        users.push({
            discord_id: `user_${i}`,
            username: `User ${i}`,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            balance: Math.floor(Math.random() * 100000),
            bank: Math.floor(Math.random() * 1000000),
            last_ip: Math.random() > 0.8 ? '192.168.1.50' : `10.0.0.${i}`, // Some shared IPs
            gang: Math.random() > 0.8 ? 'Ballas' : (Math.random() > 0.8 ? 'Vagos' : 'None')
        });
    }
    return users;
}

function generateMockTransactions(users) {
    const txs = [];
    for (let i = 0; i < 100; i++) {
        const u1 = users[Math.floor(Math.random() * users.length)];
        const u2 = users[Math.floor(Math.random() * users.length)];
        if (u1.discord_id !== u2.discord_id) {
            txs.push({
                user_id: u1.discord_id,
                target_id: u2.discord_id,
                amount: Math.floor(Math.random() * 5000),
                created_at: new Date().toISOString()
            });
        }
    }
    // Add a ring
    txs.push({ user_id: 'user_1', target_id: 'user_2', amount: 10000 });
    txs.push({ user_id: 'user_2', target_id: 'user_3', amount: 10000 });
    txs.push({ user_id: 'user_3', target_id: 'user_1', amount: 10000 });
    return txs;
}


/**
 * Feature: Atlas Brain Config
 * Manage Atlas AI configuration and memory files
 */
function setupAtlasBrainConfig() {
    ipcMain.handle('override:atlas:config', async (event, newConfig) => {
        try {
            const currentServerId = store.get('currentServer');
            let apiBase = 'https://admin.usgrp.xyz';
            let token = store.get('authToken');
            
            if (currentServerId) {
                const servers = store.get('servers') || [];
                const server = servers.find(s => s.id === currentServerId);
                if (server) {
                    apiBase = server.apiBase;
                    token = server.token;
                }
            }

            const headers = {
                'Authorization': `Bearer ${token}`,
                'X-Override-Token': token,
                'Content-Type': 'application/json'
            };

            if (newConfig) {
                // Save config
                const response = await fetch(`${apiBase}/api/v1/override/atlas/config`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(newConfig)
                });
                const data = await response.json();
                return data;
            } else {
                // Get config
                const response = await fetch(`${apiBase}/api/v1/override/atlas/config`, {
                    headers
                });
                const data = await response.json();
                return data;
            }
        } catch (error) {
            console.error('Atlas config error:', error);
            // Return default config
            return {
                systemPrompt: 'You are Atlas, the USGRP Chief Systems Officer.',
                personality: { bluntness: 80, loyalty: 100, sarcasm: 60 },
                model: 'flash',
                thinkingMode: false
            };
        }
    });

    ipcMain.handle('override:atlas:memory', async (event, { action, filename, content }) => {
        try {
            const currentServerId = store.get('currentServer');
            let apiBase = 'https://admin.usgrp.xyz';
            let token = store.get('authToken');
            
            if (currentServerId) {
                const servers = store.get('servers') || [];
                const server = servers.find(s => s.id === currentServerId);
                if (server) {
                    apiBase = server.apiBase;
                    token = server.token;
                }
            }

            const headers = {
                'Authorization': `Bearer ${token}`,
                'X-Override-Token': token,
                'Content-Type': 'application/json'
            };

            const endpoint = `${apiBase}/api/v1/override/atlas/memory`;
            
            if (action === 'list') {
                const response = await fetch(endpoint, { headers });
                return await response.json();
            } else if (action === 'read') {
                const response = await fetch(`${endpoint}/${filename}`, { headers });
                return await response.json();
            } else if (action === 'write') {
                const response = await fetch(`${endpoint}/${filename}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({ content })
                });
                return await response.json();
            } else if (action === 'delete') {
                const response = await fetch(`${endpoint}/${filename}`, {
                    method: 'DELETE',
                    headers
                });
                return await response.json();
            }
        } catch (error) {
            console.error('Atlas memory error:', error);
            return [];
        }
    });
}
