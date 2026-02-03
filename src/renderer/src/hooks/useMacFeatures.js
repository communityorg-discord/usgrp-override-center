import { useEffect, useState, useCallback } from 'react';

/**
 * Hook for macOS-specific features
 * Returns no-op functions on Windows
 */
export function useMacFeatures() {
    const [isMac] = useState(() => window.electron?.mac?.isMac || false);
    const [systemAppearance, setSystemAppearance] = useState({ isDark: true });
    
    // Listen for system theme changes
    useEffect(() => {
        if (!isMac) return;
        
        // Get initial appearance
        window.electron?.mac?.getAppearance?.().then(appearance => {
            if (appearance) setSystemAppearance(appearance);
        });
        
        // Listen for changes
        const unsubscribe = window.electron?.on?.('system-theme-changed', (data) => {
            console.log('[Mac] System theme changed:', data);
            setSystemAppearance(data);
        });
        
        return () => unsubscribe?.();
    }, [isMac]);
    
    // Set dock badge (shows number on dock icon)
    const setDockBadge = useCallback(async (count) => {
        if (!isMac) return;
        try {
            await window.electron?.mac?.setDockBadge?.(count);
        } catch (e) {
            console.error('[Mac] Failed to set dock badge:', e);
        }
    }, [isMac]);
    
    // Bounce dock icon to get attention
    const bounceDock = useCallback(async (type = 'informational') => {
        if (!isMac) return;
        try {
            await window.electron?.mac?.bounceDock?.(type);
        } catch (e) {
            console.error('[Mac] Failed to bounce dock:', e);
        }
    }, [isMac]);
    
    // Show/hide dock icon
    const showDock = useCallback(async () => {
        if (!isMac) return;
        await window.electron?.mac?.showDock?.();
    }, [isMac]);
    
    const hideDock = useCallback(async () => {
        if (!isMac) return;
        await window.electron?.mac?.hideDock?.();
    }, [isMac]);
    
    return {
        isMac,
        systemAppearance,
        setDockBadge,
        bounceDock,
        showDock,
        hideDock
    };
}

/**
 * Component that syncs app theme with macOS system appearance
 */
export function MacAppearanceSync({ onThemeChange }) {
    const { isMac, systemAppearance } = useMacFeatures();
    
    useEffect(() => {
        if (isMac && onThemeChange) {
            onThemeChange(systemAppearance.isDark ? 'dark' : 'light');
        }
    }, [isMac, systemAppearance, onThemeChange]);
    
    return null;
}

/**
 * Hook to show dock badge for pending items (tickets, alerts, etc.)
 */
export function useDockBadge(count) {
    const { setDockBadge, isMac } = useMacFeatures();
    
    useEffect(() => {
        if (isMac) {
            setDockBadge(count);
        }
        
        // Clear badge on unmount
        return () => {
            if (isMac) setDockBadge(0);
        };
    }, [count, setDockBadge, isMac]);
}

/**
 * Hook to bounce dock on important events
 */
export function useDockBounce() {
    const { bounceDock, isMac } = useMacFeatures();
    
    const bounce = useCallback((critical = false) => {
        if (isMac) {
            bounceDock(critical ? 'critical' : 'informational');
        }
    }, [bounceDock, isMac]);
    
    return bounce;
}

export default useMacFeatures;
