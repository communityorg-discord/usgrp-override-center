import { useEffect, useCallback, useState } from 'react';

/**
 * Hook for Windows-specific features
 * Returns no-op functions on Mac/Linux
 */
export function useWindowsFeatures() {
    const [isWin] = useState(() => window.electron?.win?.isWin || false);
    
    // Set taskbar progress (0-1 for progress, -1 to hide, 2 for indeterminate)
    const setProgress = useCallback(async (progress) => {
        if (!isWin) return;
        try {
            await window.electron?.win?.setProgress?.(progress);
        } catch (e) {
            console.error('[Windows] Failed to set progress:', e);
        }
    }, [isWin]);
    
    // Set taskbar overlay badge
    const setOverlay = useCallback(async (text, color = '#D4AF37') => {
        if (!isWin) return;
        try {
            await window.electron?.win?.setOverlay?.(text, color);
        } catch (e) {
            console.error('[Windows] Failed to set overlay:', e);
        }
    }, [isWin]);
    
    // Flash taskbar to get attention
    const flashTaskbar = useCallback(async (flash = true) => {
        if (!isWin) return;
        try {
            await window.electron?.win?.flashTaskbar?.(flash);
        } catch (e) {
            console.error('[Windows] Failed to flash taskbar:', e);
        }
    }, [isWin]);
    
    // Set thumbnail toolbar buttons
    const setThumbnailButtons = useCallback(async (buttons) => {
        if (!isWin) return;
        try {
            await window.electron?.win?.setThumbnailButtons?.(buttons);
        } catch (e) {
            console.error('[Windows] Failed to set thumbnail buttons:', e);
        }
    }, [isWin]);
    
    return {
        isWin,
        setProgress,
        setOverlay,
        flashTaskbar,
        setThumbnailButtons
    };
}

/**
 * Hook to show taskbar progress during operations
 */
export function useTaskbarProgress() {
    const { setProgress, isWin } = useWindowsFeatures();
    
    const startProgress = useCallback(() => {
        if (isWin) setProgress(2); // Indeterminate
    }, [setProgress, isWin]);
    
    const updateProgress = useCallback((value) => {
        if (isWin) setProgress(Math.min(1, Math.max(0, value)));
    }, [setProgress, isWin]);
    
    const endProgress = useCallback(() => {
        if (isWin) setProgress(-1); // Hide
    }, [setProgress, isWin]);
    
    return { startProgress, updateProgress, endProgress };
}

/**
 * Hook to show overlay badge for notifications
 */
export function useTaskbarOverlay(count) {
    const { setOverlay, isWin } = useWindowsFeatures();
    
    useEffect(() => {
        if (isWin) {
            setOverlay(count > 0 ? String(count) : null);
        }
        
        return () => {
            if (isWin) setOverlay(null);
        };
    }, [count, setOverlay, isWin]);
}

/**
 * Hook to flash taskbar on important events
 */
export function useTaskbarFlash() {
    const { flashTaskbar, isWin } = useWindowsFeatures();
    
    const flash = useCallback(() => {
        if (isWin) flashTaskbar(true);
    }, [flashTaskbar, isWin]);
    
    const stopFlash = useCallback(() => {
        if (isWin) flashTaskbar(false);
    }, [flashTaskbar, isWin]);
    
    return { flash, stopFlash };
}

export default useWindowsFeatures;
