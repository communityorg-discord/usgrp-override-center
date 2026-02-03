/**
 * USGRP Override Center - Main Process
 * 
 * Electron main process handling window management, IPC, and system integration.
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, nativeImage, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
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
            label: 'Show Override Center', 
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
    
    tray.setToolTip('USGRP Override Center');
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
}

// ═══════════════════════════════════════════════════════════════
// AUTO UPDATER
// ═══════════════════════════════════════════════════════════════

function setupAutoUpdater() {
    autoUpdater.autoDownload = false;
    autoUpdater.logger = require('electron-log');
    autoUpdater.logger.transports.file.level = 'info';
    
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
    
    // Check for updates on startup (in production)
    if (!isDev) {
        setTimeout(() => {
            autoUpdater.checkForUpdatesAndNotify();
        }, 3000); // Delay 3s to let app finish loading
    }
}

// ═══════════════════════════════════════════════════════════════
// TERMINAL HANDLERS
// ═══════════════════════════════════════════════════════════════

const terminals = new Map();

function setupTerminalIPC() {
    ipcMain.handle('terminal:create', (event) => {
        // Security check
        if (!store.get('authToken')) {
            throw new Error('Unauthorized');
        }

        const id = Date.now().toString();
        const shell = process.env[process.platform === 'win32' ? 'COMSPEC' : 'SHELL'] || '/bin/bash';
        
        if (ptyModule) {
            try {
                const ptyProcess = ptyModule.spawn(shell, [], {
                    name: 'xterm-256color',
                    cols: 80,
                    rows: 24,
                    cwd: process.env.HOME || process.cwd(),
                    env: process.env
                });

                ptyProcess.onData((data) => {
                    if (!event.sender.isDestroyed()) {
                        event.sender.send('terminal:data', { id, data });
                    }
                });
                 
                ptyProcess.onExit(({ exitCode, signal }) => {
                     if (!event.sender.isDestroyed()) {
                         event.sender.send('terminal:exit', { id, exitCode, signal });
                     }
                     terminals.delete(id);
                });

                terminals.set(id, { pty: ptyProcess, type: 'pty' });
                return id;
            } catch (err) {
                console.error('Failed to spawn PTY:', err);
                // Fallthrough to fallback
            }
        }

        // Fallback using child_process
        console.log('Using child_process fallback for terminal');
        const cp = require('child_process').spawn(shell, [], {
            cwd: process.env.HOME || process.cwd(),
            env: process.env,
            shell: true
        });
        
        cp.stdout.on('data', (data) => {
            if (!event.sender.isDestroyed()) {
                event.sender.send('terminal:data', { id, data: data.toString() });
            }
        });
        
        cp.stderr.on('data', (data) => {
            if (!event.sender.isDestroyed()) {
                event.sender.send('terminal:data', { id, data: data.toString() });
            }
        });
        
        cp.on('exit', (code) => {
            if (!event.sender.isDestroyed()) {
                event.sender.send('terminal:exit', { id, exitCode: code });
            }
            terminals.delete(id);
        });
        
        // Mock pty interface for fallback
        terminals.set(id, { 
            pty: cp, 
            type: 'cp',
            write: (data) => cp.stdin.write(data),
            resize: () => {}, // No-op
            kill: () => cp.kill()
        });

        return id;
    });

    ipcMain.on('terminal:write', (event, { id, data }) => {
        const terminal = terminals.get(id);
        if (terminal) {
            if (terminal.type === 'pty') {
                terminal.pty.write(data);
            } else {
                terminal.write(data);
            }
        }
    });

    ipcMain.on('terminal:resize', (event, { id, cols, rows }) => {
        const terminal = terminals.get(id);
        if (terminal && terminal.type === 'pty') {
            try {
                terminal.pty.resize(cols, rows);
            } catch (err) {
                console.error('Resize error:', err);
            }
        }
    });

    ipcMain.on('terminal:kill', (event, { id }) => {
        const terminal = terminals.get(id);
        if (terminal) {
            if (terminal.type === 'pty') {
                terminal.pty.kill();
            } else {
                terminal.kill();
            }
            terminals.delete(id);
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// IPC HANDLERS
// ═══════════════════════════════════════════════════════════════

function setupIPC() {
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
        
        // Force timeout after 10 seconds no matter what
        const timeoutId = setTimeout(() => {
            console.log('[AutoUpdater] Check timed out after 10s');
            sendToRenderer('update-error', 'Update check timed out. Try again later.');
        }, 10000);
        
        try {
            const result = await autoUpdater.checkForUpdatesAndNotify();
            clearTimeout(timeoutId);
            
            // If no result, we're up to date
            if (!result || !result.updateInfo) {
                sendToRenderer('update-not-available', {});
            }
            
            return result;
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('[AutoUpdater] Check failed:', error);
            sendToRenderer('update-error', error.message || 'Failed to check for updates');
            throw error;
        }
    });
            throw error;
        }
    });
    ipcMain.handle('updater:download', () => autoUpdater.downloadUpdate());
    ipcMain.handle('updater:install', () => {
        app.isQuitting = true;
        autoUpdater.quitAndInstall();
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
    checkScheduledDeploys();
    registerShortcuts();
    setupIPC();
    setupAdvancedFeatures();
    setupTerminalIPC();
    setupAutoUpdater();
    
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
            
            nodes.forEach((node, i) => {
                if (node.id === 'postgres') { node.x = centerX; node.y = centerY; return; }
                if (node.id === 'redis') { node.x = centerX + 50; node.y = centerY + 50; return; }
                
                const angle = (i / nodes.length) * 2 * Math.PI;
                node.x = centerX + radius * Math.cos(angle);
                node.y = centerY + radius * Math.sin(angle);
            });

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
                    content: '🔔 **Test Alert**\nThis is a test notification from USGRP Override Center.' 
                })
            });
        }
        
        if (config.telegramToken && config.telegramChatId) {
            await fetch(`https://api.telegram.org/bot${config.telegramToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: config.telegramChatId,
                    text: '🔔 *Test Alert*\nThis is a test notification from USGRP Override Center.',
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
