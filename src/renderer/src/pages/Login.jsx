import React, { useState, useEffect } from 'react';

export default function Login({ onLogin, embedded = false }) {
    const [status, setStatus] = useState('idle'); // idle, loading, waiting, error
    const [error, setError] = useState('');

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
            const response = await fetch(`https://auth.usgrp.xyz/api/override/verify`, {
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
                        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full spin-slow mx-auto mb-4"></div>
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
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                </svg>
                            )}
                            Login via USGRP Auth
                        </button>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-700"></div>
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
        <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
                        <span className="text-4xl font-bold text-white">U</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Override Center</h1>
                    <p className="text-gray-400 mt-2">Superuser Access Only</p>
                </div>

                {/* Login Card */}
                <div className="card p-6">
                    {status === 'waiting' ? (
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full spin-slow mx-auto mb-4"></div>
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
                                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                    </svg>
                                )}
                                Login via USGRP Auth
                            </button>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-700"></div>
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

                {/* Footer */}
                <p className="text-center text-gray-500 text-sm mt-6">
                    Restricted to Dion & Evan only
                </p>
            </div>
        </div>
    );
}
