/**
 * USGRP Developer Panel - Preload Script
 * 
 * Exposes secure APIs to the renderer process via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electron', {
    // Window controls
    window: {
        minimize: () => ipcRenderer.invoke('window:minimize'),
        maximize: () => ipcRenderer.invoke('window:maximize'),
        close: () => ipcRenderer.invoke('window:close'),
        isMaximized: () => ipcRenderer.invoke('window:isMaximized')
    },
    
    // Persistent store
    store: {
        get: (key) => ipcRenderer.invoke('store:get', key),
        set: (key, value) => ipcRenderer.invoke('store:set', key, value),
        delete: (key) => ipcRenderer.invoke('store:delete', key)
    },
    
    // System
    system: {
        getHWID: () => ipcRenderer.invoke('system:getHWID')
    },
    
    // API helpers
    api: {
        getBase: () => ipcRenderer.invoke('api:getBase'),
        getAuthBase: () => ipcRenderer.invoke('api:getAuthBase'),
        getToken: () => ipcRenderer.invoke('api:getToken'),
        setToken: (token) => ipcRenderer.invoke('api:setToken', token)
    },
    
    // Auth
    auth: {
        openLogin: () => ipcRenderer.invoke('auth:openLogin')
    },
    
    // Shell
    shell: {
        openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
    },
    
    // Auto updater
    updater: {
        check: () => ipcRenderer.invoke('updater:check'),
        download: () => ipcRenderer.invoke('updater:download'),
        install: () => ipcRenderer.invoke('updater:install')
    },
    
    // App info
    app: {
        getVersion: () => ipcRenderer.invoke('app:getVersion'),
        getName: () => ipcRenderer.invoke('app:getName')
    },
    
    // Settings
    settings: {
        setAlwaysOnTop: (value) => ipcRenderer.invoke('settings:setAlwaysOnTop', value)
    },

    // Servers
    servers: {
        getAll: () => ipcRenderer.invoke('servers:getAll'),
        add: (server) => ipcRenderer.invoke('servers:add', server),
        remove: (id) => ipcRenderer.invoke('servers:remove', id),
        select: (id) => ipcRenderer.invoke('servers:select', id),
        getCurrent: () => ipcRenderer.invoke('servers:getCurrent')
    },

    // Config
    config: {
        list: () => ipcRenderer.invoke('config:list'),
        read: (path) => ipcRenderer.invoke('config:read', path),
        save: (path, content) => ipcRenderer.invoke('config:save', path, content)
    },

    // Terminal
    terminal: {
        create: () => ipcRenderer.invoke('terminal:create'),
        write: (id, data) => ipcRenderer.send('terminal:write', { id, data }),
        resize: (id, cols, rows) => ipcRenderer.send('terminal:resize', { id, cols, rows }),
        kill: (id) => ipcRenderer.send('terminal:kill', { id }),
        onData: (callback) => {
            const subscription = (event, data) => callback(data);
            ipcRenderer.on('terminal:data', subscription);
            return () => ipcRenderer.removeListener('terminal:data', subscription);
        },
        onExit: (callback) => {
             const subscription = (event, data) => callback(data);
             ipcRenderer.on('terminal:exit', subscription);
             return () => ipcRenderer.removeListener('terminal:exit', subscription);
        }
    },
    
    // Deploy
    deploy: {
        schedule: (data) => ipcRenderer.invoke('deploy:schedule', data),
        getScheduled: () => ipcRenderer.invoke('deploy:getScheduled'),
        cancelScheduled: (id) => ipcRenderer.invoke('deploy:cancelScheduled', id)
    },
    
    // Webhooks
    webhooks: {
        get: () => ipcRenderer.invoke('webhooks:get'),
        save: (webhook) => ipcRenderer.invoke('webhooks:save', webhook),
        delete: (id) => ipcRenderer.invoke('webhooks:delete', id)
    },

    // Fraud Detection
    fraud: {
        getAlerts: () => ipcRenderer.invoke('fraud:getAlerts'),
        scan: () => ipcRenderer.invoke('fraud:scan'),
        updateAlert: (id, data) => ipcRenderer.invoke('fraud:updateAlert', id, data)
    },

    // Relationship Mapper
    relationships: {
        get: (filters) => ipcRenderer.invoke('relationships:get', filters)
    },

    // Economy Simulator
    economy: {
        getSimulationData: () => ipcRenderer.invoke('economy:getSimulationData'),
        simulate: (params) => ipcRenderer.invoke('economy:simulate', params)
    },

    // Script Runner
    scripts: {
        list: () => ipcRenderer.invoke('scripts:list'),
        run: (script, dryRun) => ipcRenderer.invoke('scripts:run', script, dryRun),
        upload: (name, content) => ipcRenderer.invoke('scripts:upload', name, content),
        save: (name, content) => ipcRenderer.invoke('scripts:save', name, content),
        onOutput: (callback) => {
            const subscription = (event, data) => callback(data);
            ipcRenderer.on('scripts:output', subscription);
            return () => ipcRenderer.removeListener('scripts:output', subscription);
        }
    },

    // Git
    git: {
        listRepos: () => ipcRenderer.invoke('git:listRepos'),
        status: (repoPath) => ipcRenderer.invoke('git:status', repoPath),
        branches: (repoPath) => ipcRenderer.invoke('git:branches', repoPath),
        checkout: (repoPath, branch) => ipcRenderer.invoke('git:checkout', repoPath, branch),
        createBranch: (repoPath, branch) => ipcRenderer.invoke('git:createBranch', repoPath, branch),
        deleteBranch: (repoPath, branch) => ipcRenderer.invoke('git:deleteBranch', repoPath, branch),
        pull: (repoPath) => ipcRenderer.invoke('git:pull', repoPath),
        push: (repoPath) => ipcRenderer.invoke('git:push', repoPath),
        stage: (repoPath, files) => ipcRenderer.invoke('git:stage', repoPath, files),
        unstage: (repoPath, files) => ipcRenderer.invoke('git:unstage', repoPath, files),
        commit: (repoPath, message) => ipcRenderer.invoke('git:commit', repoPath, message),
        log: (repoPath) => ipcRenderer.invoke('git:log', repoPath),
        diff: (repoPath, file) => ipcRenderer.invoke('git:diff', repoPath, file),
        reset: (repoPath, mode, commit) => ipcRenderer.invoke('git:reset', repoPath, mode, commit)
    },

    // Event listeners
    on: (channel, callback) => {
        const allowedChannels = [
            'quick-action',
            'navigate',
            'refresh',
            'update-checking',
            'update-available',
            'update-not-available',
            'update-downloaded',
            'update-error',
            'update-progress',
            'auth-success',
            'screen-capture-detected'
        ];
        
        if (allowedChannels.includes(channel)) {
            const subscription = (event, ...args) => callback(...args);
            ipcRenderer.on(channel, subscription);
            
            // Return unsubscribe function
            return () => ipcRenderer.removeListener(channel, subscription);
        }
    },
    
    // Remove listener
    off: (channel, callback) => {
        ipcRenderer.removeListener(channel, callback);
    }
});

// Expose platform info
contextBridge.exposeInMainWorld('platform', {
    isWindows: process.platform === 'win32',
    isMac: process.platform === 'darwin',
    isLinux: process.platform === 'linux',
    arch: process.arch
});
