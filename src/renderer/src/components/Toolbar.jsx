import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

// Grouped tabs for better organization
const tabGroups = [
    {
        id: 'overview',
        tabs: [
            { path: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { path: '/health', label: 'Health', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
        ]
    },
    {
        id: 'systems',
        tabs: [
            { path: '/systems', label: 'Systems', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01' },
            { path: '/metrics', label: 'Metrics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            { path: '/processes', label: 'Processes', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
            { path: '/network', label: 'Network', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
            { path: '/cron', label: 'Cron', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
        ]
    },
    {
        id: 'discord',
        tabs: [
            { path: '/discord', label: 'Discord', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
            { path: '/bans', label: 'Bans', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
            { path: '/audit', label: 'Audit', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
        ]
    },
    {
        id: 'tools',
        tabs: [
            { path: '/deploy', label: 'Deploy', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
            { path: '/terminal', label: 'Terminal', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
            { path: '/quick-commands', label: 'Commands', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
            { path: '/logs', label: 'Logs', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
        ]
    },
    {
        id: 'data',
        tabs: [
            { path: '/files', label: 'Files', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
            { path: '/config', label: 'Config', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
            { path: '/database', label: 'Database', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
            { path: '/backups', label: 'Backups', icon: 'M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4' },
            { path: '/memory', label: 'Memory', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
            { path: '/apikeys', label: 'Keys', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
        ]
    },
];

const allTabs = tabGroups.flatMap(g => g.tabs);

export default function Toolbar({ currentPath, user, onLogout, onChatToggle, onImpersonate }) {
    const location = useLocation();
    const [showMore, setShowMore] = useState(false);
    const [visibleTabs, setVisibleTabs] = useState(10);
    const containerRef = useRef(null);
    const moreMenuRef = useRef(null);
    
    // Close menu on click outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
                setShowMore(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const displayedTabs = allTabs.slice(0, visibleTabs);
    const hiddenTabs = allTabs.slice(visibleTabs);
    const hasMore = hiddenTabs.length > 0;
    
    return (
        <div 
            className="h-12 flex items-center justify-between px-2 relative"
            style={{
                background: 'linear-gradient(180deg, rgba(12, 12, 20, 0.95) 0%, rgba(8, 8, 14, 0.98) 100%)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
            }}
            ref={containerRef}
        >
            {/* Left: Navigation Tabs */}
            <div className="flex items-center gap-0.5 flex-1 overflow-hidden">
                {displayedTabs.map((tab, index) => {
                    const isActive = location.pathname === tab.path;
                    return (
                        <NavTab
                            key={tab.path}
                            to={tab.path}
                            icon={tab.icon}
                            label={tab.label}
                            isActive={isActive}
                            index={index}
                        />
                    );
                })}
                
                {/* More dropdown */}
                {hasMore && (
                    <div className="relative" ref={moreMenuRef}>
                        <button
                            onClick={() => setShowMore(!showMore)}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all duration-150 ${
                                showMore 
                                    ? 'bg-amber-500/10 text-amber-400' 
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                            }`}
                        >
                            <span>More</span>
                            <svg 
                                className={`w-3.5 h-3.5 transition-transform duration-200 ${showMore ? 'rotate-180' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        
                        {showMore && (
                            <div 
                                className="absolute top-full left-0 mt-1 py-2 rounded-xl shadow-2xl z-50 min-w-[180px] animate-fade-in"
                                style={{
                                    background: 'linear-gradient(145deg, rgba(22, 22, 38, 0.98) 0%, rgba(14, 14, 26, 0.99) 100%)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                                }}
                            >
                                {hiddenTabs.map((tab) => {
                                    const isActive = location.pathname === tab.path;
                                    return (
                                        <Link
                                            key={tab.path}
                                            to={tab.path}
                                            onClick={() => setShowMore(false)}
                                            className={`flex items-center gap-3 px-4 py-2.5 transition-all duration-150 ${
                                                isActive 
                                                    ? 'bg-amber-500/10 text-amber-400' 
                                                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                                            }`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
                                            </svg>
                                            <span className="text-sm font-medium">{tab.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right: Quick Actions & Profile */}
            <div className="flex items-center gap-1.5 ml-4">
                {/* Quick Action Buttons */}
                <div className="flex items-center gap-0.5 pr-3 mr-2 border-r border-white/[0.06]">
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
        </div>
    );
}

function NavTab({ to, icon, label, isActive, index }) {
    return (
        <Link
            to={to}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-150 ${
                isActive
                    ? 'text-amber-400'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
            }`}
            style={{
                background: isActive ? 'rgba(212, 175, 55, 0.08)' : undefined,
                boxShadow: isActive ? 'inset 0 0 0 1px rgba(212, 175, 55, 0.15)' : undefined,
                animationDelay: `${index * 30}ms`
            }}
        >
            <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
            </svg>
            <span>{label}</span>
        </Link>
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
