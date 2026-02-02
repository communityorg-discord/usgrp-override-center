import React from 'react';

export default function UpdateNotification({ info, onDismiss }) {
    const isDownloaded = info.type === 'downloaded';

    async function handleInstall() {
        await window.electron.updater.install();
    }

    async function handleDownload() {
        await window.electron.updater.download();
    }

    return (
        <div className="fixed bottom-6 left-6 max-w-sm bg-surface-tertiary border border-gray-700 rounded-xl shadow-2xl p-4 z-50">
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
    );
}
