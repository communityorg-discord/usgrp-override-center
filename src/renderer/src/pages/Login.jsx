import React, { useState, useEffect } from 'react';

export default function Login({ onLogin, embedded = false }) {
    const [status, setStatus] = useState('idle'); // idle, loading, waiting, error
    const [error, setError] = useState('');
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        // Listen for auth success from protocol handler
        const unsubscribe = window.electron.on('auth-success', (token) => {
            console.log('Auth success received from protocol handler');
            onLogin(token);
        });
        
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [onLogin]);

    async function handleDiscordLogin() {
        setStatus('loading');
        setError('');

        try {
            // Open auth.usgrp.xyz in external browser
            await window.electron.auth.openLogin();
            setStatus('waiting');
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    }

    async function handleTokenSubmit(e) {
        e.preventDefault();
        const token = e.target.token.value;
        
        if (!token.trim()) {
            setError('Token required');
            return;
        }

        setStatus('loading');

        try {
            const apiBase = await window.electron.api.getBase();
            const response = await fetch(`${apiBase}/override/auth/verify`, {
                headers: { 'X-Override-Token': token }
            });

            if (response.ok) {
                onLogin(token);
            } else {
                const data = await response.json();
                setError(data.message || 'Invalid token');
                setStatus('error');
            }
        } catch (err) {
            setError('Connection failed. Check your internet.');
            setStatus('error');
        }
    }

    if (embedded) {
        return (
            <div className="w-full">
                {status === 'waiting' ? (
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full spin-slow mx-auto mb-4" />
                        <p className="text-gray-300 mb-4">Complete login in your browser...</p>
                        
                        <div className="text-left mt-6">
                            <p className="text-sm text-gray-400 mb-3">Or paste your override token:</p>
                            <form onSubmit={handleTokenSubmit} className="space-y-4">
                                <input
                                    type="password"
                                    name="token"
                                    placeholder="ovr_..."
                                    className="input font-mono"
                                    autoFocus
                                />
                                <button type="submit" className="btn btn-primary w-full justify-center">
                                    Connect
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <>
                        <button
                            onClick={handleDiscordLogin}
                            disabled={status === 'loading'}
                            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-lg font-medium flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
                        >
                            {status === 'loading' ? (
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                </svg>
                            )}
                            Login via USGRP Auth
                        </button>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-700" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-gray-900 text-gray-500">or use token</span>
                            </div>
                        </div>

                        <form onSubmit={handleTokenSubmit} className="space-y-4">
                            <input
                                type="password"
                                name="token"
                                placeholder="Override token (ovr_...)"
                                className="input font-mono"
                            />
                            <button type="submit" className="btn btn-secondary w-full justify-center">
                                Connect with Token
                            </button>
                        </form>
                    </>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div 
            className="flex-1 flex items-center justify-center p-8 relative overflow-hidden"
            style={{
                background: 'linear-gradient(180deg, #050508 0%, #0a0a10 100%)'
            }}
        >
            {/* Animated background elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Subtle radial gradient */}
                <div 
                    className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.03]"
                    style={{
                        background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)'
                    }}
                />
                
                {/* Grid pattern */}
                <div 
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(212, 175, 55, 0.3) 1px, transparent 1px),
                                          linear-gradient(90deg, rgba(212, 175, 55, 0.3) 1px, transparent 1px)`,
                        backgroundSize: '60px 60px'
                    }}
                />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div 
                        className="relative w-24 h-24 mx-auto mb-6"
                        onMouseEnter={() => setIsHovering(true)}
                        onMouseLeave={() => setIsHovering(false)}
                    >
                        {/* Glow effect */}
                        <div 
                            className="absolute inset-0 rounded-2xl transition-all duration-500"
                            style={{
                                background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
                                filter: `blur(${isHovering ? '30px' : '20px'})`,
                                opacity: isHovering ? 0.5 : 0.3,
                                transform: `scale(${isHovering ? 1.2 : 1})`
                            }}
                        />
                        
                        {/* Logo container */}
                        <div 
                            className="relative w-24 h-24 rounded-2xl flex items-center justify-center transition-all duration-300"
                            style={{
                                background: 'linear-gradient(145deg, #D4AF37 0%, #B8960C 100%)',
                                boxShadow: isHovering 
                                    ? '0 20px 60px rgba(212, 175, 55, 0.4)'
                                    : '0 10px 40px rgba(212, 175, 55, 0.25)',
                                transform: isHovering ? 'translateY(-4px)' : 'translateY(0)'
                            }}
                        >
                            <span 
                                className="text-5xl font-bold text-white"
                                style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}
                            >
                                U
                            </span>
                        </div>
                    </div>
                    
                    <h1 
                        className="text-3xl font-bold tracking-tight"
                        style={{
                            background: 'linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.7) 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}
                    >
                        Override Center
                    </h1>
                    <p 
                        className="mt-2 text-sm font-medium tracking-wider uppercase"
                        style={{ color: 'rgba(212, 175, 55, 0.7)' }}
                    >
                        Superuser Access Only
                    </p>
                </div>

                {/* Login Card */}
                <div 
                    className="p-8 rounded-2xl relative overflow-hidden"
                    style={{
                        background: 'linear-gradient(145deg, rgba(18, 18, 32, 0.9) 0%, rgba(10, 10, 18, 0.95) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    {/* Subtle top highlight */}
                    <div 
                        className="absolute top-0 left-0 right-0 h-px"
                        style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)'
                        }}
                    />

                    {status === 'waiting' ? (
                        <div className="text-center py-4">
                            <div className="relative w-16 h-16 mx-auto mb-6">
                                <div 
                                    className="w-16 h-16 rounded-full spin-slow"
                                    style={{
                                        border: '3px solid rgba(212, 175, 55, 0.15)',
                                        borderTopColor: '#D4AF37'
                                    }}
                                />
                                <div 
                                    className="absolute inset-0 flex items-center justify-center"
                                >
                                    <svg 
                                        className="w-6 h-6"
                                        style={{ color: '#D4AF37' }}
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                    </svg>
                                </div>
                            </div>
                            <p className="text-lg font-medium text-white mb-2">Waiting for authentication...</p>
                            <p style={{ color: 'rgba(255, 255, 255, 0.4)' }} className="text-sm">
                                Complete login in your browser
                            </p>
                            
                            <div 
                                className="my-8 h-px"
                                style={{
                                    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.06), transparent)'
                                }}
                            />
                            
                            <div className="text-left">
                                <p className="text-sm mb-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                    Or paste your override token:
                                </p>
                                <form onSubmit={handleTokenSubmit} className="space-y-4">
                                    <input
                                        type="password"
                                        name="token"
                                        placeholder="ovr_..."
                                        className="input font-mono"
                                        autoFocus
                                    />
                                    <button type="submit" className="btn btn-primary w-full justify-center">
                                        Connect
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={handleDiscordLogin}
                                disabled={status === 'loading'}
                                className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 group"
                                style={{
                                    background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
                                    color: '#111',
                                    boxShadow: '0 4px 20px rgba(212, 175, 55, 0.3)'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(212, 175, 55, 0.45)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(212, 175, 55, 0.3)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                {status === 'loading' ? (
                                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                    </svg>
                                )}
                                Login via USGRP Auth
                            </button>

                            <div className="relative my-8">
                                <div 
                                    className="absolute inset-0 flex items-center"
                                >
                                    <div 
                                        className="w-full h-px"
                                        style={{
                                            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent)'
                                        }}
                                    />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span 
                                        className="px-4 text-xs font-medium uppercase tracking-widest"
                                        style={{ 
                                            background: 'rgba(14, 14, 24, 1)',
                                            color: 'rgba(255, 255, 255, 0.3)'
                                        }}
                                    >
                                        or use token
                                    </span>
                                </div>
                            </div>

                            <form onSubmit={handleTokenSubmit} className="space-y-4">
                                <input
                                    type="password"
                                    name="token"
                                    placeholder="Override token (ovr_...)"
                                    className="input font-mono"
                                />
                                <button type="submit" className="btn btn-secondary w-full justify-center">
                                    Connect with Token
                                </button>
                            </form>
                        </>
                    )}

                    {error && (
                        <div 
                            className="mt-6 p-4 rounded-xl animate-fade-in"
                            style={{
                                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(185, 28, 28, 0.05) 100%)',
                                border: '1px solid rgba(239, 68, 68, 0.2)'
                            }}
                        >
                            <p className="text-sm text-red-400 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <p 
                    className="text-center text-xs mt-8 tracking-wider uppercase"
                    style={{ color: 'rgba(255, 255, 255, 0.2)' }}
                >
                    Restricted to Dion & Evan only
                </p>
            </div>
        </div>
    );
}
