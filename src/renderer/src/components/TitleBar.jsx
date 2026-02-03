import React, { useState, useEffect } from 'react';

export default function TitleBar() {
    const [isMaximized, setIsMaximized] = useState(false);
    const [version, setVersion] = useState('');
    const [isHovered, setIsHovered] = useState(false);
    const [isMac] = useState(() => window.electron?.mac?.isMac || false);

    useEffect(() => {
        checkMaximized();
        getVersion();
    }, []);

    async function checkMaximized() {
        const max = await window.electron.window.isMaximized();
        setIsMaximized(max);
    }

    async function getVersion() {
        const v = await window.electron.app.getVersion();
        setVersion(v);
    }

    async function handleMinimize() {
        await window.electron.window.minimize();
    }

    async function handleMaximize() {
        const max = await window.electron.window.maximize();
        setIsMaximized(max);
    }

    async function handleClose() {
        await window.electron.window.close();
    }

    return (
        <div 
            className="titlebar h-10 flex items-center justify-between px-3 select-none relative"
            style={{
                background: 'linear-gradient(180deg, rgba(16, 16, 28, 0.98) 0%, rgba(10, 10, 18, 0.98) 100%)',
                // On Mac, add left padding for traffic lights
                paddingLeft: isMac ? '80px' : '12px'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Subtle bottom border */}
            <div 
                className="absolute bottom-0 left-0 right-0 h-px"
                style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)'
                }}
            />

            {/* Left: Logo and App Name */}
            <div className="flex items-center gap-3 no-drag">
                {/* Logo */}
                <div className="relative">
                    <img 
                        src={new URL('../assets/logo.png', import.meta.url).href}
                        alt="USGRP"
                        className="w-7 h-7 rounded object-contain"
                    />
                </div>

                {/* App Name & Version */}
                <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-white text-sm tracking-tight">
                        USGRP Developer Panel
                    </span>
                    <span 
                        className="text-xs font-mono px-1.5 py-0.5 rounded transition-colors duration-200"
                        style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            color: 'rgba(255, 255, 255, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.06)'
                        }}
                    >
                        v{version}
                    </span>
                </div>
            </div>

            {/* Center: Connection Status */}
            <div className="flex-1 flex justify-center">
                <div 
                    className="flex items-center gap-2 px-3 py-1 rounded-full transition-all duration-200"
                    style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.15)'
                    }}
                >
                    <div className="relative">
                        <div 
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                                background: '#10b981',
                                boxShadow: '0 0 6px rgba(16, 185, 129, 0.8)'
                            }}
                        />
                        <div 
                            className="absolute inset-0 w-1.5 h-1.5 rounded-full animate-ping"
                            style={{
                                background: '#10b981',
                                opacity: 0.4,
                                animationDuration: '2s'
                            }}
                        />
                    </div>
                    <span className="text-xs font-medium" style={{ color: '#34d399' }}>
                        Connected
                    </span>
                </div>
            </div>

            {/* Right: Window Controls (Windows only - Mac uses native traffic lights) */}
            {!isMac && (
            <div className="flex items-center no-drag">
                <WindowButton onClick={handleMinimize} title="Minimize">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                </WindowButton>
                
                <WindowButton onClick={handleMaximize} title={isMaximized ? 'Restore' : 'Maximize'}>
                    {isMaximized ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeWidth={2} d="M8 4h12v12M4 8h12v12H4z" />
                        </svg>
                    ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="4" y="4" width="16" height="16" strokeWidth={2} rx="1" />
                        </svg>
                    )}
                </WindowButton>
                
                <WindowButton onClick={handleClose} title="Close" isClose>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </WindowButton>
            </div>
            )}
        </div>
    );
}

function WindowButton({ children, onClick, title, isClose }) {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
        <button
            onClick={onClick}
            className="w-11 h-10 flex items-center justify-center transition-all duration-150"
            title={title}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                color: isHovered 
                    ? (isClose ? '#fff' : '#fff') 
                    : 'rgba(255, 255, 255, 0.4)',
                background: isHovered 
                    ? (isClose ? '#ef4444' : 'rgba(255, 255, 255, 0.08)') 
                    : 'transparent'
            }}
        >
            {children}
        </button>
    );
}
