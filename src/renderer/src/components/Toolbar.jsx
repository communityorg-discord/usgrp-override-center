import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// Navigation structure with grouped submenus
const navigationItems = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
        path: '/',
    },
    {
        id: 'health',
        label: 'Health',
        icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
        path: '/health',
    },
    {
        id: 'activity',
        label: 'Activity',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
        path: '/activity',
    },
    {
        id: 'systems',
        label: 'Systems',
        icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
        submenu: [
            { path: '/servers', label: 'Servers', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            { path: '/processes', label: 'Processes', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
            { path: '/metrics', label: 'Metrics', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
            { path: '/graph', label: 'Graph', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
            { path: '/profiler', label: 'Profiler', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            { path: '/network', label: 'Network', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
            { path: '/cron', label: 'Cron Jobs', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
        ]
    },
    {
        id: 'economy',
        label: 'Economy',
        icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        submenu: [
            { path: '/economy/users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
            { path: '/economy/money', label: 'Money Editor', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
            { path: '/economy/treasury', label: 'Treasury', icon: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z' },
            { path: '/economy/transactions', label: 'Transactions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
            { path: '/economy/payroll', label: 'Payroll', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
            { path: '/economy/housing', label: 'Housing', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { path: '/economy/vehicles', label: 'Vehicles', icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h10zm0 0h6m-6 0a2 2 0 11-4 0m4 0a2 2 0 11-4 0m8 0a2 2 0 11-4 0' },
            { path: '/economy/businesses', label: 'Businesses', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
            { path: '/economy/gangs', label: 'Gangs', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
            { path: '/economy/stats', label: 'Stats', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
            { path: '/economy/godmode', label: 'God Mode', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
            { path: '/economy/bulk-wipe', label: 'Bulk Wipe', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
        ]
    },
    {
        id: 'moderation',
        label: 'Moderation',
        icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
        submenu: [
            { path: '/moderation/cases', label: 'Cases', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            { path: '/moderation/actions', label: 'Quick Actions', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
            { path: '/moderation/watchlist', label: 'Watchlist', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
            { path: '/moderation/automod', label: 'AutoMod', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
            { path: '/audit', label: 'Audit Log', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
            { path: '/users/lookup', label: 'User Lookup', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
        ]
    },
    {
        id: 'government',
        label: 'Government',
        icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
        submenu: [
            { path: '/government/positions', label: 'Positions', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
            { path: '/discord', label: 'Discord Mgmt', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
            { path: '/bans', label: 'Bans', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
        ]
    },
    {
        id: 'security',
        label: 'Security',
        icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
        submenu: [
            { path: '/dns', label: 'DNS', icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z' },
            { path: '/ssl', label: 'SSL', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
            { path: '/secrets', label: 'Secrets', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
            { path: '/ratelimits', label: 'Rate Limits', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
            { path: '/apikeys', label: 'API Keys', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
        ]
    },
    {
        id: 'tools',
        label: 'Tools',
        icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
        submenu: [
            { path: '/deploy', label: 'Deploy', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
            { path: '/terminal', label: 'Terminal', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
            { path: '/quick-commands', label: 'Quick Commands', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
            { path: '/webhooks', label: 'Webhooks', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
            { path: '/templates', label: 'Templates', icon: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z' },
            { path: '/alerts', label: 'Alerts', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
        ]
    },
    {
        id: 'data',
        label: 'Data',
        icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
        submenu: [
            { path: '/files', label: 'Files', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
            { path: '/config', label: 'Config', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
            { path: '/database', label: 'Database', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
            { path: '/migrations', label: 'Migrations', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
            { path: '/backups', label: 'Backups', icon: 'M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4' },
            { path: '/memory', label: 'Memory', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
            { path: '/logs', label: 'Logs', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
        ]
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
        path: '/settings',
    },
];

export default function Toolbar({ currentPath, user, onLogout, onChatToggle, onImpersonate }) {
    const location = useLocation();
    const [openSubmenu, setOpenSubmenu] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [showUserSearch, setShowUserSearch] = useState(false);
    const toolbarRef = useRef(null);
    
    // Detect mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
    // Close menu on click outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
                setOpenSubmenu(null);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keyboard shortcut for search (Ctrl+K)
    useEffect(() => {
        function handleKeyDown(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setShowUserSearch(true);
            }
            if (e.key === 'Escape') {
                setShowUserSearch(false);
            }
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);
    
    // Check if any submenu item is active
    const isItemActive = (item) => {
        if (item.path) {
            return location.pathname === item.path;
        }
        if (item.submenu) {
            return item.submenu.some(sub => location.pathname === sub.path);
        }
        return false;
    };
    
    const handleItemHover = (itemId) => {
        if (!isMobile) {
            setOpenSubmenu(itemId);
        }
    };
    
    const handleItemClick = (itemId, hasSubmenu) => {
        if (isMobile && hasSubmenu) {
            setOpenSubmenu(openSubmenu === itemId ? null : itemId);
        }
    };
    
    return (
        <div 
            className="h-12 flex items-center justify-between px-2 relative"
            style={{
                background: 'linear-gradient(180deg, rgba(12, 12, 20, 0.95) 0%, rgba(8, 8, 14, 0.98) 100%)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
            }}
            ref={toolbarRef}
        >
            {/* Left: Navigation Items */}
            <nav className="flex items-center gap-0.5 flex-1 overflow-visible">
                {navigationItems.map((item) => (
                    <NavItem
                        key={item.id}
                        item={item}
                        isActive={isItemActive(item)}
                        isOpen={openSubmenu === item.id}
                        onHover={() => handleItemHover(item.id)}
                        onLeave={() => !isMobile && setOpenSubmenu(null)}
                        onClick={() => handleItemClick(item.id, !!item.submenu)}
                        onSubmenuClose={() => setOpenSubmenu(null)}
                        isMobile={isMobile}
                        location={location}
                    />
                ))}
            </nav>

            {/* Right: Quick Actions & Profile */}
            <div className="flex items-center gap-1.5 ml-4">
                <ServerSelector />
                
                {/* Quick Action Buttons */}
                <div className="flex items-center gap-0.5 pr-3 mr-2 border-r border-white/[0.06]">
                    {/* Quick User Search Button */}
                    <IconButton 
                        icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        title="Quick User Search (Ctrl+K)"
                        onClick={() => setShowUserSearch(true)}
                    />
                    <IconButton 
                        icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        title="Impersonate User"
                        onClick={onImpersonate}
                    />
                    <IconButton 
                        icon="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        title="Refresh (F5)"
                        onClick={() => window.location.reload()}
                    />
                    <IconButton 
                        icon="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        title="Chat with Atlas"
                        onClick={onChatToggle}
                        highlight
                    />
                    <Link to="/settings" className="contents">
                        <IconButton 
                            icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            icon2="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            title="Settings (Ctrl+,)"
                        />
                    </Link>
                </div>

                {/* Profile */}
                <ProfileButton user={user} onLogout={onLogout} />
            </div>

            {/* Quick User Search Modal */}
            {showUserSearch && (
                <QuickUserSearch onClose={() => setShowUserSearch(false)} />
            )}
        </div>
    );
}

// Quick User Search Modal Component
function QuickUserSearch({ onClose }) {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);
    const modalRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        function handleClickOutside(e) {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                onClose();
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    async function handleSearch(e) {
        e?.preventDefault();
        if (!query.trim()) return;
        
        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/users/unified/${query}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Override-Token': token
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || data.error || 'User not found');
            }
            
            setResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function navigateToLookup() {
        onClose();
        navigate(`/users/lookup?id=${query}`);
    }

    function formatMoney(amount) {
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0 
        }).format(amount || 0);
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div 
                ref={modalRef}
                className="w-full max-w-lg bg-[#0d0d14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
                style={{ boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6)' }}
            >
                {/* Search Header */}
                <form onSubmit={handleSearch} className="flex items-center gap-3 p-4 border-b border-white/[0.06]">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Enter Discord ID or username..."
                        className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-lg font-mono"
                    />
                    <button 
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="px-4 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white rounded-lg hover:bg-white/5"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </form>

                {/* Results Area */}
                <div className="max-h-[400px] overflow-y-auto">
                    {loading && (
                        <div className="p-8 text-center">
                            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-gray-500 mt-3 text-sm">Searching databases...</p>
                        </div>
                    )}

                    {error && (
                        <div className="p-6">
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        </div>
                    )}

                    {results && !loading && (
                        <div className="p-4 space-y-4">
                            {/* User Header */}
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                {results.discord?.avatar ? (
                                    <img 
                                        src={`https://cdn.discordapp.com/avatars/${results.discordId}/${results.discord.avatar}.png?size=64`}
                                        className="w-12 h-12 rounded-full border-2 border-amber-500/30"
                                        alt=""
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 text-lg font-bold">
                                        {results.discord?.username?.[0]?.toUpperCase() || '?'}
                                    </div>
                                )}
                                <div className="flex-1">
                                    <p className="font-bold text-white">{results.discord?.displayName || results.discord?.username || 'Unknown User'}</p>
                                    <p className="text-xs text-gray-500 font-mono">{results.discordId}</p>
                                </div>
                                <button
                                    onClick={navigateToLookup}
                                    className="px-3 py-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 rounded-lg hover:bg-amber-500/20 transition-colors"
                                >
                                    Full Details →
                                </button>
                            </div>

                            {/* Quick Stats Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                {/* Economy */}
                                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                    <p className="text-[10px] text-emerald-400 uppercase font-medium mb-1">💰 Wealth</p>
                                    {results.economy && !results.economy.error ? (
                                        <p className="text-lg font-mono text-emerald-400">{formatMoney(results.economy.totalWealth)}</p>
                                    ) : (
                                        <p className="text-sm text-gray-500">No data</p>
                                    )}
                                </div>

                                {/* Mod Cases */}
                                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                                    <p className="text-[10px] text-red-400 uppercase font-medium mb-1">⚖️ Cases</p>
                                    {results.moderation && !results.moderation.error ? (
                                        <p className="text-lg font-mono text-red-400">{results.moderation.totalCases || 0}</p>
                                    ) : (
                                        <p className="text-sm text-gray-500">No data</p>
                                    )}
                                </div>

                                {/* Roles */}
                                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                    <p className="text-[10px] text-blue-400 uppercase font-medium mb-1">🎭 Roles</p>
                                    <p className="text-lg font-mono text-blue-400">{results.discord?.roles?.length || 0}</p>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2">
                                <Link
                                    to={`/economy/money?id=${results.discordId}`}
                                    onClick={onClose}
                                    className="flex-1 px-3 py-2 text-center text-sm font-medium text-emerald-400 bg-emerald-500/10 rounded-lg hover:bg-emerald-500/20 transition-colors"
                                >
                                    Edit Economy
                                </Link>
                                <Link
                                    to={`/moderation/cases?userId=${results.discordId}`}
                                    onClick={onClose}
                                    className="flex-1 px-3 py-2 text-center text-sm font-medium text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors"
                                >
                                    View Cases
                                </Link>
                                <Link
                                    to={`/discord?userId=${results.discordId}`}
                                    onClick={onClose}
                                    className="flex-1 px-3 py-2 text-center text-sm font-medium text-blue-400 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-colors"
                                >
                                    Manage Roles
                                </Link>
                            </div>
                        </div>
                    )}

                    {!loading && !error && !results && (
                        <div className="p-8 text-center">
                            <p className="text-gray-500 text-sm">Enter a Discord ID or username to search</p>
                            <p className="text-gray-600 text-xs mt-2">Press Enter to search</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-white/[0.06] bg-white/[0.02] flex items-center justify-between text-xs text-gray-600">
                    <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-gray-500">Esc</kbd> to close</span>
                    <span>Searches Economy, Moderation, and Discord</span>
                </div>
            </div>
        </div>
    );
}

function NavItem({ item, isActive, isOpen, onHover, onLeave, onClick, onSubmenuClose, isMobile, location }) {
    const hasSubmenu = !!item.submenu;
    const itemRef = useRef(null);
    
    // Direct link for items without submenu
    if (!hasSubmenu) {
        return (
            <Link
                to={item.path}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-150 ${
                    isActive
                        ? 'text-amber-400'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                }`}
                style={{
                    background: isActive ? 'rgba(212, 175, 55, 0.08)' : undefined,
                    boxShadow: isActive ? 'inset 0 0 0 1px rgba(212, 175, 55, 0.15)' : undefined,
                }}
            >
                <span>{item.label}</span>
            </Link>
        );
    }
    
    return (
        <div 
            className="relative"
            ref={itemRef}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
        >
            <button
                onClick={onClick}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-150 ${
                    isActive || isOpen
                        ? 'text-amber-400 bg-amber-500/10'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                }`}
            >
                <span>{item.label}</span>
                <span>{item.label}</span>
                <svg 
                    className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            
            {/* Submenu Dropdown */}
            {isOpen && (
                <>
                    {/* Invisible bridge to prevent gap hover loss */}
                    <div className="absolute top-full left-0 w-full h-2" />
                    <div 
                        className="absolute top-full left-0 mt-1 py-2 rounded-xl shadow-2xl z-50 min-w-[200px] animate-submenu-in"
                    style={{
                        background: 'linear-gradient(145deg, rgba(22, 22, 38, 0.98) 0%, rgba(14, 14, 26, 0.99) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255,255,255,0.1)'
                    }}
                >
                    {item.submenu.map((subItem) => {
                        const isSubActive = location.pathname === subItem.path;
                        return (
                            <Link
                                key={subItem.path}
                                to={subItem.path}
                                onClick={onSubmenuClose}
                                className={`flex items-center gap-3 px-4 py-2.5 transition-all duration-150 ${
                                    isSubActive 
                                        ? 'bg-amber-500/10 text-amber-400' 
                                        : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                                }`}
                            >
                                <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={subItem.icon} />
                                </svg>
                                <span className="text-sm font-medium">{subItem.label}</span>
                                {isSubActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                                )}
                            </Link>
                        );
                    })}
                </div>
                </>
            )}
        </div>
    );
}

function IconButton({ icon, icon2, title, onClick, highlight }) {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
        <button
            onClick={onClick}
            title={title}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150"
            style={{
                color: isHovered 
                    ? (highlight ? '#D4AF37' : '#fff') 
                    : 'rgba(255, 255, 255, 0.4)',
                background: isHovered 
                    ? (highlight ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255, 255, 255, 0.06)') 
                    : 'transparent'
            }}
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                {icon2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon2} />}
            </svg>
        </button>
    );
}

function ProfileButton({ user, onLogout }) {
    const [isHovered, setIsHovered] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);
    
    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setShowMenu(!showMenu)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-all duration-150"
                style={{
                    background: isHovered || showMenu ? 'rgba(255, 255, 255, 0.04)' : 'transparent'
                }}
            >
                <div 
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200"
                    style={{
                        background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
                        boxShadow: isHovered || showMenu 
                            ? '0 0 16px rgba(212, 175, 55, 0.4)' 
                            : '0 0 8px rgba(212, 175, 55, 0.2)',
                        ring: '2px solid rgba(212, 175, 55, 0.2)'
                    }}
                >
                    <span className="text-white font-bold text-xs">
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                    </span>
                </div>
                <div className="text-left">
                    <p className="text-sm font-medium text-white leading-tight">
                        {user?.name || 'Superuser'}
                    </p>
                </div>
                <svg 
                    className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            
            {showMenu && (
                <div 
                    className="absolute top-full right-0 mt-1 py-1 rounded-xl shadow-2xl z-50 min-w-[160px] animate-fade-in"
                    style={{
                        background: 'linear-gradient(145deg, rgba(22, 22, 38, 0.98) 0%, rgba(14, 14, 26, 0.99) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    <div className="px-3 py-2 border-b border-white/[0.06]">
                        <p className="text-xs text-gray-500">Signed in as</p>
                        <p className="text-sm font-medium text-white truncate">{user?.name || 'Superuser'}</p>
                    </div>
                    <Link
                        to="/settings"
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                    </Link>
                    <button
                        onClick={() => { setShowMenu(false); onLogout(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                    </button>
                </div>
            )}
        </div>
    );
}

function ServerSelector() {
    const [current, setCurrent] = useState(null);
    const [servers, setServers] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        loadData();
        // Listen for server changes
        document.addEventListener('visibilitychange', loadData);
        return () => document.removeEventListener('visibilitychange', loadData);
    }, []);

    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    async function loadData() {
        if (!window.electron?.servers) return;
        const list = await window.electron.servers.getAll();
        const currId = await window.electron.servers.getCurrent();
        setServers(list);
        const curr = list.find(s => s.id === currId);
        setCurrent(curr || { name: 'Main (API)', id: 'default' });
    }

    async function handleSelect(id) {
        if (id === 'default') {
            await window.electron.servers.select(null);
        } else {
            await window.electron.servers.select(id);
        }
        setIsOpen(false);
        setTimeout(loadData, 100);
    }

    if (servers.length === 0) return null;

    return (
        <div className="relative mr-2" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition-colors border border-white/[0.05]"
            >
                <div className={`w-2 h-2 rounded-full ${current?.id === 'default' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                <span className="text-xs font-medium text-gray-300 max-w-[100px] truncate">{current?.name}</span>
                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-[#0a0a0f] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="py-1">
                        <button
                            onClick={() => handleSelect('default')}
                            className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 hover:bg-white/5 ${current?.id === 'default' ? 'text-amber-400' : 'text-gray-400'}`}
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                            Main (API)
                        </button>
                        {servers.map(server => (
                            <button
                                key={server.id}
                                onClick={() => handleSelect(server.id)}
                                className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 hover:bg-white/5 ${current?.id === server.id ? 'text-blue-400' : 'text-gray-400'}`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                {server.name}
                            </button>
                        ))}
                        <div className="border-t border-white/5 mt-1 pt-1">
                            <Link 
                                to="/servers"
                                onClick={() => setIsOpen(false)}
                                className="block w-full text-left px-4 py-2 text-xs text-gray-500 hover:text-white hover:bg-white/5"
                            >
                                + Manage Servers
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
