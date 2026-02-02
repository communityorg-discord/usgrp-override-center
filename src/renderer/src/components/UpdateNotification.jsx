import React, { useState, useEffect } from 'react';

export default function UpdateNotification({ info, onDismiss }) {
    const [releaseNotes, setReleaseNotes] = useState(null);
    const [showNotes, setShowNotes] = useState(false);
    const isDownloaded = info.type === 'downloaded';

    useEffect(() => {
        if (info.version) {
            fetchReleaseNotes(info.version);
        }
    }, [info.version]);

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

    return (
        <div className="fixed bottom-6 left-6 max-w-md bg-surface-tertiary border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h4 className="font-semibold text-white">
                            {isDownloaded ? 'Update Ready' : 'Update Available'}
                        </h4>
                        <p className="text-sm text-gray-400 mt-1">
                            {isDownloaded 
                                ? `Version ${info.version} is ready to install.`
                                : `Version ${info.version} is available.`
                            }
                        </p>
                        
                        {releaseNotes && (
                            <button 
                                onClick={() => setShowNotes(!showNotes)}
                                className="text-xs text-gold hover:text-yellow-400 mt-2 transition-colors"
                            >
                                {showNotes ? 'Hide' : 'Show'} what's new ▾
                            </button>
                        )}

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
                    </div>
                    <button onClick={onDismiss} className="text-gray-500 hover:text-gray-300">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Release Notes Expansion */}
            {showNotes && releaseNotes && (
                <div className="px-4 pb-4 pt-0">
                    <div className="bg-gray-900/50 rounded-lg p-3 max-h-48 overflow-auto text-sm text-gray-300 border border-gray-800">
                        <pre className="whitespace-pre-wrap font-sans">{releaseNotes}</pre>
                    </div>
                </div>
            )}
        </div>
    );
}
