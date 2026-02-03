/**
 * Screen Share Detection Module
 * Detects common screen capture/streaming software
 */

const { exec } = require('child_process');
const { ipcMain, BrowserWindow } = require('electron');

// Known screen capture processes
const CAPTURE_PROCESSES = {
    windows: [
        // Discord - always flag as potential capture
        'discord.exe',
        // OBS
        'obs64.exe',
        'obs32.exe',
        'obs.exe',
        // Streamlabs
        'streamlabs obs.exe',
        'slobs.exe',
        // NVIDIA
        'nvcontainer.exe', // ShadowPlay container
        'nvidia share.exe',
        'nvspcaps64.exe',  // NVIDIA capture
        'nvspcaps.exe',
        // Windows Game Bar
        'gamebar.exe',
        'gamebarftserver.exe',
        'gamebarpresencewriter.exe',
        // Zoom
        'zoom.exe',
        'zoomit.exe',
        // Teams
        'teams.exe',
        'ms-teams.exe',
        // Loom
        'loom.exe',
        // Camtasia
        'camtasia.exe',
        'camrec.exe',
        // ScreenPal (Screencast-O-Matic)
        'screenpal.exe',
        // ShareX
        'sharex.exe',
        // Bandicam
        'bandicam.exe',
        'bdcam.exe',
        // XSplit
        'xsplit.core.exe',
        'xsplit.gamecaster.exe',
        // Medal
        'medal.exe',
        // Snagit
        'snagit32.exe',
        'snagit.exe',
        // Windows built-in
        'snippingtool.exe',
        // GeForce Experience
        'nvsphelper64.exe',
    ],
    darwin: [
        'Discord',
        'OBS',
        'Streamlabs OBS',
        'zoom.us',
        'Microsoft Teams',
        'Loom',
        'ScreenFlow',
        'QuickTime Player',
    ],
    linux: [
        'obs',
        'discord',
        'zoom',
        'teams',
        'simplescreenrecorder',
        'kazam',
    ]
};

// Discord-specific indicators (window titles that suggest screen sharing)
const DISCORD_SHARE_INDICATORS = [
    'sharing your screen',
    'screen share',
    'go live',
];

let isMonitoring = false;
let monitorInterval = null;
let lastDetectedApps = [];
let mainWindow = null;

/**
 * Get list of running processes
 */
function getRunningProcesses() {
    return new Promise((resolve) => {
        const platform = process.platform;
        let command;
        
        if (platform === 'win32') {
            command = 'tasklist /fo csv /nh';
        } else if (platform === 'darwin') {
            command = 'ps -axco command';
        } else {
            command = 'ps -eo comm';
        }
        
        exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout) => {
            if (error) {
                resolve([]);
                return;
            }
            
            const processes = stdout.toLowerCase().split('\n').map(line => {
                if (platform === 'win32') {
                    // CSV format: "name.exe","pid","session","session#","mem"
                    const match = line.match(/"([^"]+)"/);
                    return match ? match[1] : '';
                }
                return line.trim();
            }).filter(Boolean);
            
            resolve(processes);
        });
    });
}

/**
 * Check for active window titles (Windows only, for Discord share detection)
 */
function getActiveWindowTitles() {
    return new Promise((resolve) => {
        if (process.platform !== 'win32') {
            resolve([]);
            return;
        }
        
        // PowerShell command to get window titles
        const command = `powershell -command "Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object -ExpandProperty MainWindowTitle"`;
        
        exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout) => {
            if (error) {
                resolve([]);
                return;
            }
            resolve(stdout.toLowerCase().split('\n').map(t => t.trim()).filter(Boolean));
        });
    });
}

/**
 * Detect screen capture software
 */
async function detectScreenCapture() {
    const platform = process.platform;
    const targetProcesses = CAPTURE_PROCESSES[platform] || CAPTURE_PROCESSES.windows;
    
    const [runningProcesses, windowTitles] = await Promise.all([
        getRunningProcesses(),
        getActiveWindowTitles()
    ]);
    
    const detectedApps = [];
    
    // Check for capture processes
    for (const proc of targetProcesses) {
        const procLower = proc.toLowerCase();
        if (runningProcesses.some(p => p.includes(procLower))) {
            // Determine app name
            let appName = proc.replace('.exe', '').replace(/\d+$/, '');
            
            // Map to friendly names
            if (procLower.includes('discord')) appName = 'Discord';
            else if (procLower.includes('obs')) appName = 'OBS Studio';
            else if (procLower.includes('streamlabs') || procLower.includes('slobs')) appName = 'Streamlabs';
            else if (procLower.includes('nvidia') || procLower.includes('nv')) appName = 'NVIDIA ShadowPlay';
            else if (procLower.includes('gamebar')) appName = 'Windows Game Bar';
            else if (procLower.includes('zoom')) appName = 'Zoom';
            else if (procLower.includes('teams')) appName = 'Microsoft Teams';
            else if (procLower.includes('loom')) appName = 'Loom';
            else if (procLower.includes('sharex')) appName = 'ShareX';
            else if (procLower.includes('bandicam') || procLower.includes('bdcam')) appName = 'Bandicam';
            else if (procLower.includes('medal')) appName = 'Medal.tv';
            
            if (!detectedApps.includes(appName)) {
                detectedApps.push(appName);
            }
        }
    }
    
    // Check for Discord screen share specifically
    if (detectedApps.includes('Discord')) {
        const isActivelySharing = windowTitles.some(title => 
            DISCORD_SHARE_INDICATORS.some(indicator => title.includes(indicator))
        );
        
        if (isActivelySharing) {
            // Mark Discord as actively sharing
            const idx = detectedApps.indexOf('Discord');
            if (idx !== -1) {
                detectedApps[idx] = 'Discord (Screen Sharing)';
            }
        }
    }
    
    return detectedApps;
}

/**
 * Start monitoring for screen capture
 */
function startMonitoring(window, intervalMs = 3000) {
    if (isMonitoring) return;
    
    mainWindow = window;
    isMonitoring = true;
    
    const check = async () => {
        try {
            const detected = await detectScreenCapture();
            
            // Only notify if detection state changed
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
                
                if (detected.length > 0) {
                    console.log('[ScreenShare] Detected:', detected.join(', '));
                }
            }
        } catch (error) {
            console.error('[ScreenShare] Detection error:', error);
        }
    };
    
    // Initial check
    check();
    
    // Start interval
    monitorInterval = setInterval(check, intervalMs);
    console.log('[ScreenShare] Monitoring started');
}

/**
 * Stop monitoring
 */
function stopMonitoring() {
    if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
    }
    isMonitoring = false;
    lastDetectedApps = [];
    console.log('[ScreenShare] Monitoring stopped');
}

/**
 * Setup IPC handlers
 */
function setupScreenShareDetection(window) {
    console.log('[ScreenShare] Setting up IPC handlers...');
    mainWindow = window;
    
    ipcMain.handle('screen-share:start', () => {
        console.log('[ScreenShare] IPC: start called');
        startMonitoring(window);
        return { success: true };
    });
    
    ipcMain.handle('screen-share:stop', () => {
        console.log('[ScreenShare] IPC: stop called');
        stopMonitoring();
        return { success: true };
    });
    
    ipcMain.handle('screen-share:check', async () => {
        console.log('[ScreenShare] IPC: check called');
        const apps = await detectScreenCapture();
        return { detected: apps.length > 0, apps };
    });
    
    console.log('[ScreenShare] IPC handlers registered');
    
    // Auto-start monitoring
    startMonitoring(window);
}

module.exports = {
    setupScreenShareDetection,
    startMonitoring,
    stopMonitoring,
    detectScreenCapture
};
