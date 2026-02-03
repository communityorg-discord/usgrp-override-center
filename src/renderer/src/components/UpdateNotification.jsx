import React, { useState, useEffect } from 'react';

export default function UpdateNotification({ info, onDismiss }) {
    const [releaseNotes, setReleaseNotes] = useState(null);
    const [showNotes, setShowNotes] = useState(false);
    
    const isDownloaded = info.type === 'downloaded';
    const isAvailable = info.type === 'available';
    const isChecking = info.type === 'checking';
    const isUpToDate = info.type === 'up-to-date';
    const isError = info.type === 'error';

    useEffect(() => {
        if (info.version && (isAvailable || isDownloaded)) {
            fetchReleaseNotes(info.version);
        }
        
        // Auto-dismiss "up to date" after 3 seconds
        if (isUpToDate || isError) {
            const timer = setTimeout(onDismiss, 3000);
            return () => clearTimeout(timer);
        }
    }, [info.version, info.type]);

    async function fetchReleaseNotes(version) {
        try {
            const tag = version.startsWith('v') ? version : `v${version}`;
            const response = await fetch(
                `https://api.github.com/repos/communityorg-discord/usgrp-override-center/releases/tags/${tag}`,
                { headers: { 'Accept': 'application/vnd.github.v3+json' } }
            );
            if (response.ok) {
                const data = await response.json();
                setReleaseNotes(data.body || 'No release notes available.');
            }
        } catch (err) {
            console.error('Failed to fetch release notes:', err);
        }
    }

    async function handleInstall() {
        await window.electron.updater.install();
    }

    async function handleDownload() {
        await window.electron.updater.download();
    }

    // Checking state
    if (isChecking) {
        return (
            <div 
                className="fixed bottom-6 left-6 max-w-sm rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in"
                style={{
                    background: 'linear-gradient(145deg, rgba(22, 22, 38, 0.98) 0%, rgba(14, 14, 26, 0.99) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
            >
                <div className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                    <div>
                        <p className="text-white font-medium">Checking for updates...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Up to date state
    if (isUpToDate) {
        return (
            <div 
                className="fixed bottom-6 left-6 max-w-sm rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in"
                style={{
                    background: 'linear-gradient(145deg, rgba(22, 22, 38, 0.98) 0%, rgba(14, 14, 26, 0.99) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                }}
            >
                <div className="p-4 flex items-center gap-3">
                    <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(16, 185, 129, 0.15)' }}
                    >
                        <svg className="w-5 h-5" style={{ color: '#34d399' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-white font-medium">You're up to date!</p>
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            No updates available
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (isError) {
        return (
            <div 
                className="fixed bottom-6 left-6 max-w-sm rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in"
                style={{
                    background: 'linear-gradient(145deg, rgba(22, 22, 38, 0.98) 0%, rgba(14, 14, 26, 0.99) 100%)',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                }}
            >
                <div className="p-4 flex items-center gap-3">
                    <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(239, 68, 68, 0.15)' }}
                    >
                        <svg className="w-5 h-5" style={{ color: '#f87171' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <p className="text-white font-medium">Update check failed</p>
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {info.message || 'Could not check for updates'}
                        </p>
                    </div>
                    <button onClick={onDismiss} style={{ color: 'rgba(255,255,255,0.4)' }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    }

    // Available / Downloaded state
    return (
        <div 
            className="fixed bottom-6 left-6 max-w-md rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in"
            style={{
                background: 'linear-gradient(145deg, rgba(22, 22, 38, 0.98) 0%, rgba(14, 14, 26, 0.99) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.2)'
            }}
        >
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)' }}
                    >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h4 className="font-semibold text-white">
                            {isDownloaded ? 'Update Ready' : 'Update Available'}
                        </h4>
                        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {isDownloaded 
                                ? `Version ${info.version} is ready to install.`
                                : `Version ${info.version} is available.`
                            }
                        </p>
                        
                        {/* Download progress */}
                        {info.progress && !isDownloaded && (
                            <div className="mt-3">
                                <div 
                                    className="h-1.5 rounded-full overflow-hidden"
                                    style={{ background: 'rgba(255,255,255,0.1)' }}
                                >
                                    <div 
                                        className="h-full rounded-full transition-all duration-300"
                                        style={{ 
                                            width: `${info.progress.percent || 0}%`,
                                            background: 'linear-gradient(90deg, #D4AF37, #F4D03F)'
                                        }}
                                    />
                                </div>
                                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                    Downloading... {Math.round(info.progress.percent || 0)}%
                                </p>
                            </div>
                        )}
                        
                        {releaseNotes && !info.progress && (
                            <button 
                                onClick={() => setShowNotes(!showNotes)}
                                className="text-xs mt-2 transition-colors"
                                style={{ color: '#D4AF37' }}
                            >
                                {showNotes ? 'Hide' : 'Show'} what's new ▾
                            </button>
                        )}

                        {!info.progress && (
                            <div className="flex gap-2 mt-3">
                                {isDownloaded ? (
                                    <button onClick={handleInstall} className="btn btn-primary text-sm py-1.5">
                                        Install & Restart
                                    </button>
                                ) : (
                                    <button onClick={handleDownload} className="btn btn-primary text-sm py-1.5">
                                        Download
                                    </button>
                                )}
                                <button onClick={onDismiss} className="btn btn-ghost text-sm py-1.5">
                                    Later
                                </button>
                            </div>
                        )}
                    </div>
                    <button onClick={onDismiss} style={{ color: 'rgba(255,255,255,0.4)' }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Release Notes Expansion */}
            {showNotes && releaseNotes && (
                <div className="px-4 pb-4 pt-0">
                    <div 
                        className="rounded-lg p-3 max-h-48 overflow-auto text-sm border"
                        style={{
                            background: 'rgba(0,0,0,0.3)',
                            borderColor: 'rgba(255,255,255,0.06)',
                            color: 'rgba(255,255,255,0.7)'
                        }}
                    >
                        <pre className="whitespace-pre-wrap font-sans">{releaseNotes}</pre>
                    </div>
                </div>
            )}
        </div>
    );
}
