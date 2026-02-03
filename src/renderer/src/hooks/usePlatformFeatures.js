import { useEffect, useCallback, useState } from 'react';

/**
 * Hook for native system notifications
 */
export function useNotifications() {
    const sendNotification = useCallback(async ({ title, body, icon, actions, urgency }) => {
        try {
            const result = await window.electron?.notify?.send?.({
                title,
                body,
                icon,
                actions,
                urgency
            });
            return result?.success || false;
        } catch (e) {
            console.error('[Notify] Failed to send notification:', e);
            return false;
        }
    }, []);
    
    // Listen for notification events
    useEffect(() => {
        const unsubClick = window.electron?.on?.('notification-clicked', (data) => {
            console.log('[Notify] Notification clicked:', data);
        });
        
        const unsubAction = window.electron?.on?.('notification-action', (data) => {
            console.log('[Notify] Notification action:', data);
        });
        
        return () => {
            unsubClick?.();
            unsubAction?.();
        };
    }, []);
    
    return { sendNotification };
}

/**
 * Hook for idle detection
 */
export function useIdleDetection(options = {}) {
    const { threshold = 300, onIdle, onActive, onAway } = options;
    const [idleState, setIdleState] = useState('active');
    const [idleTime, setIdleTime] = useState(0);
    
    useEffect(() => {
        // Start monitoring
        window.electron?.idle?.startMonitoring?.(threshold);
        
        // Listen for state changes
        const unsub = window.electron?.on?.('idle-state-changed', (data) => {
            console.log('[Idle] State changed:', data);
            setIdleState(data.state);
            setIdleTime(data.idleTime);
            
            if (data.state === 'idle' && onIdle) onIdle(data);
            if (data.state === 'active' && onActive) onActive(data);
            if (data.state === 'away' && onAway) onAway(data);
        });
        
        return () => {
            unsub?.();
            window.electron?.idle?.stopMonitoring?.();
        };
    }, [threshold, onIdle, onActive, onAway]);
    
    const getIdleTime = useCallback(async () => {
        const result = await window.electron?.idle?.getTime?.();
        return result?.idleTime || 0;
    }, []);
    
    return { idleState, idleTime, getIdleTime };
}

/**
 * Hook for power monitoring
 */
export function usePowerMonitor(options = {}) {
    const { onSuspend, onResume, onBattery, onAC, onLock, onUnlock } = options;
    const [powerState, setPowerState] = useState({
        onBattery: false,
        suspended: false,
        locked: false
    });
    
    useEffect(() => {
        // Get initial state
        window.electron?.power?.getState?.().then(state => {
            if (state) {
                setPowerState(prev => ({ ...prev, onBattery: state.onBattery }));
            }
        });
        
        // Listen for power state changes
        const unsubPower = window.electron?.on?.('power-state-changed', (data) => {
            console.log('[Power] State changed:', data);
            
            switch (data.state) {
                case 'suspend':
                    setPowerState(prev => ({ ...prev, suspended: true }));
                    if (onSuspend) onSuspend();
                    break;
                case 'resume':
                    setPowerState(prev => ({ ...prev, suspended: false }));
                    if (onResume) onResume();
                    break;
                case 'on-battery':
                    setPowerState(prev => ({ ...prev, onBattery: true }));
                    if (onBattery) onBattery();
                    break;
                case 'on-ac':
                    setPowerState(prev => ({ ...prev, onBattery: false }));
                    if (onAC) onAC();
                    break;
            }
        });
        
        // Listen for screen lock
        const unsubLock = window.electron?.on?.('screen-lock-changed', (data) => {
            console.log('[Power] Screen lock changed:', data);
            setPowerState(prev => ({ ...prev, locked: data.locked }));
            
            if (data.locked && onLock) onLock();
            if (!data.locked && onUnlock) onUnlock();
        });
        
        return () => {
            unsubPower?.();
            unsubLock?.();
        };
    }, [onSuspend, onResume, onBattery, onAC, onLock, onUnlock]);
    
    return powerState;
}

/**
 * Hook for recent documents
 */
export function useRecentDocuments() {
    const [documents, setDocuments] = useState([]);
    
    useEffect(() => {
        // Load existing recent docs
        window.electron?.recent?.get?.().then(result => {
            if (result?.documents) {
                setDocuments(result.documents);
            }
        });
        
        // Listen for opening recent docs
        const unsub = window.electron?.on?.('open-recent-document', (data) => {
            console.log('[Recent] Opening document:', data);
        });
        
        return () => unsub?.();
    }, []);
    
    const addDocument = useCallback(async (path, name) => {
        await window.electron?.recent?.add?.(path, name);
        const result = await window.electron?.recent?.get?.();
        if (result?.documents) {
            setDocuments(result.documents);
        }
    }, []);
    
    const clearDocuments = useCallback(async () => {
        await window.electron?.recent?.clear?.();
        setDocuments([]);
    }, []);
    
    return { documents, addDocument, clearDocuments };
}

export default {
    useNotifications,
    useIdleDetection,
    usePowerMonitor,
    useRecentDocuments
};
