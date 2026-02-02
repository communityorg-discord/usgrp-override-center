import React, { createContext, useContext, useState, useEffect } from 'react';

const NotificationContext = createContext();

export function useNotifications() {
    return useContext(NotificationContext);
}

export default function NotificationManager({ children }) {
    const [alerts, setAlerts] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastId, setLastId] = useState(null);

    // Load initial state
    useEffect(() => {
        if (Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
    }, []);

    // Polling Logic
    useEffect(() => {
        const pollAlerts = async () => {
            try {
                // Ensure window.electron exists (it should in Renderer)
                if (!window.electron || !window.electron.api) return;

                const apiBase = await window.electron.api.getBase();
                const token = await window.electron.api.getToken();
                
                if (!token) return;

                const url = new URL(`${apiBase}/override/alerts/poll`);
                if (lastId) url.searchParams.append('lastId', lastId);

                const response = await fetch(url.toString(), {
                    headers: { 'X-Override-Token': token }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.alerts && data.alerts.length > 0) {
                        handleNewAlerts(data.alerts);
                        setLastId(data.lastId);
                    }
                }
            } catch (error) {
                console.error('Alert polling failed:', error);
            }
        };

        // Poll every 10 seconds
        const interval = setInterval(pollAlerts, 10000);
        
        // Initial poll
        pollAlerts();

        return () => clearInterval(interval);
    }, [lastId]);

    const handleNewAlerts = (newAlerts) => {
        // Add new alerts to the top of the list
        // Backend sends chronological (oldest -> newest)
        // We want newest first in UI usually
        const reversed = [...newAlerts].reverse();
        
        setAlerts(prev => [...reversed, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + newAlerts.length);

        // Notify for the latest alert
        const latest = newAlerts[newAlerts.length - 1]; 
        
        if (latest) {
            // Native Notification
            if (Notification.permission === 'granted') {
                new Notification(`System Alert: ${latest.type?.toUpperCase() || 'INFO'}`, {
                    body: latest.message,
                    silent: false
                });
            }
            
            // Play sound (simple beep using AudioContext or HTML5 Audio)
            // Using a simple data URI for a "beep" to avoid asset dependency issues
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);
                
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.5);
            } catch (e) {
                console.error('Audio play failed', e);
            }
        }
    };

    const markAllRead = () => {
        setUnreadCount(0);
    };

    const value = {
        alerts,
        unreadCount,
        markAllRead
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}
