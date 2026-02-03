import React, { useState, useEffect, createContext, useContext } from 'react';

const ScreenShareContext = createContext();

export function useScreenShare() {
    return useContext(ScreenShareContext);
}

export function ScreenShareProvider({ children }) {
    const [isDetected, setIsDetected] = useState(false);
    const [detectedApps, setDetectedApps] = useState([]);
    const [blurEnabled, setBlurEnabled] = useState(true);
    const [dismissed, setDismissed] = useState(false);
    
    useEffect(() => {
        // Load blur preference
        const savedBlur = localStorage.getItem('screenShareBlur');
        if (savedBlur !== null) {
            setBlurEnabled(savedBlur === 'true');
        }
        
        // Listen for screen capture detection
        const unsubscribe = window.electron?.on?.('screen-capture-detected', (data) => {
            console.log('[ScreenShare] Detection event:', data);
            setIsDetected(data.detected);
            setDetectedApps(data.apps || []);
            
            // Reset dismissed state when new capture is detected
            if (data.detected && data.apps?.length > 0) {
                setDismissed(false);
            }
        });
        
        // Start monitoring using the proper API
        window.electron?.screenShare?.start?.().then(() => {
            console.log('[ScreenShare] Monitoring started');
        }).catch(err => {
            console.error('[ScreenShare] Failed to start monitoring:', err);
        });
        
        // Also do an immediate check
        window.electron?.screenShare?.check?.().then(result => {
            console.log('[ScreenShare] Initial check:', result);
            if (result?.detected) {
                setIsDetected(true);
                setDetectedApps(result.apps || []);
            }
        });
        
        return () => {
            unsubscribe?.();
        };
    }, []);
    
    useEffect(() => {
        // Apply or remove blur class to body
        if (isDetected && blurEnabled && !dismissed) {
            document.body.classList.add('screen-share-blur');
        } else {
            document.body.classList.remove('screen-share-blur');
        }
    }, [isDetected, blurEnabled, dismissed]);
    
    const toggleBlur = () => {
        const newValue = !blurEnabled;
        setBlurEnabled(newValue);
        localStorage.setItem('screenShareBlur', newValue.toString());
    };
    
    const dismissWarning = () => {
        setDismissed(true);
    };
    
    return (
        <ScreenShareContext.Provider value={{
            isDetected,
            detectedApps,
            blurEnabled,
            toggleBlur,
            dismissWarning,
            dismissed
        }}>
            {children}
            
            {/* Warning Banner */}
            {isDetected && !dismissed && (
                <ScreenShareBanner 
                    apps={detectedApps} 
                    blurEnabled={blurEnabled}
                    onToggleBlur={toggleBlur}
                    onDismiss={dismissWarning}
                />
            )}
        </ScreenShareContext.Provider>
    );
}

function ScreenShareBanner({ apps, blurEnabled, onToggleBlur, onDismiss }) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
        <div className="fixed top-0 left-0 right-0 z-[99999] animate-slide-down">
            <div className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full animate-pulse">
                                <span className="text-2xl">📺</span>
                            </div>
                            <div>
                                <div className="font-bold text-lg flex items-center gap-2">
                                    Screen Capture Detected
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/20">
                                        LIVE
                                    </span>
                                </div>
                                <div className="text-sm text-white/80">
                                    {apps.join(', ')} {apps.length === 1 ? 'is' : 'are'} running
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {/* Blur Toggle */}
                            <button
                                onClick={onToggleBlur}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                    blurEnabled 
                                        ? 'bg-white text-red-600 hover:bg-gray-100' 
                                        : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                            >
                                {blurEnabled ? '🔒 Blur ON' : '🔓 Blur OFF'}
                            </button>
                            
                            {/* More Info */}
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="px-3 py-2 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition-colors"
                            >
                                {isExpanded ? '▲ Less' : '▼ More'}
                            </button>
                            
                            {/* Dismiss */}
                            <button
                                onClick={onDismiss}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                                title="Dismiss (blur will remain active)"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                    
                    {/* Expanded Info */}
                    {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="bg-white/10 rounded-lg p-3">
                                <div className="font-semibold mb-1">🎯 What's Detected</div>
                                <ul className="space-y-1 text-white/80">
                                    {apps.map((app, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-red-300 rounded-full" />
                                            {app}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3">
                                <div className="font-semibold mb-1">🔒 Blur Protection</div>
                                <p className="text-white/80">
                                    {blurEnabled 
                                        ? 'Sensitive data (balances, IDs, tokens) is currently blurred.'
                                        : 'Blur is disabled. Sensitive data is visible.'}
                                </p>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3">
                                <div className="font-semibold mb-1">⚠️ Warning</div>
                                <p className="text-white/80">
                                    Content may be visible to others via screen share. Be careful with sensitive operations.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ScreenShareProvider;
