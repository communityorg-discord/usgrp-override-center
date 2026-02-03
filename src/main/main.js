/**
 * USGRP Override Center - Main Process
 * 
 * Electron main process handling window management, IPC, and system integration.
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, nativeImage, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
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
        theme: 'dark'
    }
});

// Config
const API_BASE = 'https://api.usgrp.xyz';
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
                    "connect-src 'self' https://api.usgrp.xyz wss://api.usgrp.xyz https://api.github.com https://github.com;"
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
    ipcMain.handle('api:getBase', () => API_BASE);
    ipcMain.handle('api:getAuthBase', () => AUTH_BASE);
    ipcMain.handle('api:getToken', () => store.get('authToken'));
    ipcMain.handle('api:setToken', (event, token) => store.set('authToken', token));
    
    // Auth flow - open browser for SSO
    ipcMain.handle('auth:openLogin', () => {
        const loginUrl = `${AUTH_BASE}/login?app=override-center`;
        shell.openExternal(loginUrl);
    });
    
    // Open external links
    ipcMain.handle('shell:openExternal', (event, url) => shell.openExternal(url));
    
    // Auto updater
    ipcMain.handle('updater:check', () => autoUpdater.checkForUpdatesAndNotify());
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
    registerShortcuts();
    setupIPC();
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
