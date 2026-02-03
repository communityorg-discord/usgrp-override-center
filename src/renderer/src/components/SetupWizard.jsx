import React, { useState } from 'react';
import Login from '../pages/Login';

export default function SetupWizard({ onComplete }) {
    const [step, setStep] = useState(1);
    const [config, setConfig] = useState({ theme: 'dark' });

    const nextStep = () => setStep(s => s + 1);
    
    const handleLoginSuccess = async (token) => {
        await window.electron.api.setToken(token);
        nextStep();
    };

    const handleThemeSelect = (theme) => {
        setConfig({ ...config, theme });
    };

    const finishSetup = async () => {
        await window.electron.store.set('hasCompletedSetup', true);
        await window.electron.store.set('theme', config.theme);
        onComplete();
    };

    return (
        <div 
            className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden"
            style={{
                background: 'linear-gradient(180deg, #050508 0%, #0a0a10 100%)'
            }}
        >
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Radial glow */}
                <div 
                    className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full"
                    style={{
                        background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 60%)'
                    }}
                />
                
                {/* Grid pattern */}
                <div 
                    className="absolute inset-0 opacity-[0.015]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(212, 175, 55, 0.5) 1px, transparent 1px),
                                          linear-gradient(90deg, rgba(212, 175, 55, 0.5) 1px, transparent 1px)`,
                        backgroundSize: '80px 80px'
                    }}
                />
            </div>

            {/* Main container */}
            <div 
                className="relative z-10 w-full max-w-2xl rounded-2xl p-8"
                style={{
                    background: 'linear-gradient(145deg, rgba(18, 18, 32, 0.85) 0%, rgba(10, 10, 18, 0.95) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    boxShadow: '0 30px 100px rgba(0, 0, 0, 0.6)'
                }}
            >
                {/* Top highlight */}
                <div 
                    className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.3), transparent)'
                    }}
                />
                
                {/* Steps Indicator */}
                <div className="flex justify-between mb-10 relative px-8">
                    {/* Progress line */}
                    <div 
                        className="absolute top-4 left-12 right-12 h-0.5"
                        style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                    />
                    <div 
                        className="absolute top-4 left-12 h-0.5 transition-all duration-500"
                        style={{ 
                            background: 'linear-gradient(90deg, #D4AF37, rgba(212, 175, 55, 0.5))',
                            width: step === 1 ? '0%' : step === 2 ? 'calc(50% - 24px)' : 'calc(100% - 48px)'
                        }}
                    />
                    
                    {[
                        { num: 1, label: 'Authenticate' },
                        { num: 2, label: 'Customize' },
                        { num: 3, label: 'Launch' }
                    ].map(({ num, label }) => (
                        <div key={num} className="flex flex-col items-center gap-3 relative">
                            <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300"
                                style={{
                                    background: step >= num 
                                        ? 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)' 
                                        : 'rgba(255, 255, 255, 0.04)',
                                    color: step >= num ? '#111' : 'rgba(255, 255, 255, 0.3)',
                                    border: step >= num ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                                    boxShadow: step >= num ? '0 4px 15px rgba(212, 175, 55, 0.3)' : 'none',
                                    transform: step === num ? 'scale(1.1)' : 'scale(1)'
                                }}
                            >
                                {step > num ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : num}
                            </div>
                            <span 
                                className="text-xs font-semibold uppercase tracking-wider"
                                style={{ 
                                    color: step >= num ? '#D4AF37' : 'rgba(255, 255, 255, 0.3)'
                                }}
                            >
                                {label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Step 1: Login */}
                {step === 1 && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-8">
                            <h2 
                                className="text-3xl font-bold mb-3"
                                style={{
                                    background: 'linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.7) 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}
                            >
                                Welcome, Superuser
                            </h2>
                            <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                Authenticate to access the USGRP Developer Panel
                            </p>
                        </div>
                        <div 
                            className="rounded-xl p-6"
                            style={{
                                background: 'rgba(0, 0, 0, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.04)'
                            }}
                        >
                            <Login onLogin={handleLoginSuccess} embedded={true} />
                        </div>
                    </div>
                )}

                {/* Step 2: Theme */}
                {step === 2 && (
                    <div className="animate-fade-in text-center">
                        <h2 
                            className="text-2xl font-bold mb-3"
                            style={{
                                background: 'linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.7) 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}
                        >
                            Choose Your Theme
                        </h2>
                        <p className="mb-8" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            Select your preferred visual style
                        </p>
                        
                        <div className="grid grid-cols-3 gap-5">
                            <ThemeOption 
                                name="Dark"
                                subtitle="Default"
                                isSelected={config.theme === 'dark'}
                                onClick={() => handleThemeSelect('dark')}
                                colors={{
                                    bg: '#0a0a0f',
                                    header: '#141420',
                                    sidebar: '#111118',
                                    accent: '#D4AF37'
                                }}
                            />
                            
                            <ThemeOption 
                                name="Midnight"
                                subtitle="Deep Blue"
                                isSelected={config.theme === 'midnight'}
                                onClick={() => handleThemeSelect('midnight')}
                                colors={{
                                    bg: '#0f172a',
                                    header: '#1e293b',
                                    sidebar: '#1a2540',
                                    accent: '#3b82f6'
                                }}
                            />
                            
                            <ThemeOption 
                                name="Light"
                                subtitle="Coming Soon"
                                isSelected={false}
                                onClick={() => {}}
                                disabled
                                colors={{
                                    bg: '#f8fafc',
                                    header: '#e2e8f0',
                                    sidebar: '#f1f5f9',
                                    accent: '#D4AF37'
                                }}
                            />
                        </div>

                        <button 
                            onClick={nextStep} 
                            className="mt-10 px-10 py-3.5 rounded-xl font-semibold transition-all duration-200"
                            style={{
                                background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
                                color: '#111',
                                boxShadow: '0 4px 20px rgba(212, 175, 55, 0.3)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.boxShadow = '0 8px 30px rgba(212, 175, 55, 0.45)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.boxShadow = '0 4px 20px rgba(212, 175, 55, 0.3)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            Continue
                        </button>
                    </div>
                )}

                {/* Step 3: Finish */}
                {step === 3 && (
                    <div className="animate-fade-in text-center py-6">
                        {/* Success icon */}
                        <div 
                            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                            style={{
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
                                border: '1px solid rgba(16, 185, 129, 0.2)'
                            }}
                        >
                            <svg 
                                className="w-10 h-10" 
                                style={{ color: '#34d399' }}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        
                        <h2 
                            className="text-3xl font-bold mb-3"
                            style={{
                                background: 'linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.7) 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}
                        >
                            Setup Complete
                        </h2>
                        <p className="mb-8 max-w-md mx-auto" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            Developer Panel is configured and ready. You have full superuser privileges.
                        </p>
                        
                        {/* Summary */}
                        <div 
                            className="rounded-xl p-5 mb-8 max-w-sm mx-auto text-left"
                            style={{
                                background: 'rgba(0, 0, 0, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.04)'
                            }}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div 
                                    className="w-5 h-5 rounded-full flex items-center justify-center"
                                    style={{ background: 'rgba(16, 185, 129, 0.15)' }}
                                >
                                    <svg className="w-3 h-3" style={{ color: '#34d399' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                    Authenticated as Superuser
                                </span>
                            </div>
                            <div className="flex items-center gap-3 mb-3">
                                <div 
                                    className="w-5 h-5 rounded-full flex items-center justify-center"
                                    style={{ background: 'rgba(16, 185, 129, 0.15)' }}
                                >
                                    <svg className="w-3 h-3" style={{ color: '#34d399' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                    Theme: <span className="capitalize">{config.theme}</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-5 h-5 rounded-full flex items-center justify-center"
                                    style={{ background: 'rgba(16, 185, 129, 0.15)' }}
                                >
                                    <svg className="w-3 h-3" style={{ color: '#34d399' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                    Secure connection established
                                </span>
                            </div>
                        </div>

                        <button 
                            onClick={finishSetup}
                            className="px-12 py-4 rounded-xl font-bold text-lg transition-all duration-200"
                            style={{
                                background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
                                color: '#111',
                                boxShadow: '0 6px 30px rgba(212, 175, 55, 0.35)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.boxShadow = '0 10px 40px rgba(212, 175, 55, 0.5)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.boxShadow = '0 6px 30px rgba(212, 175, 55, 0.35)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            Launch Dashboard →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function ThemeOption({ name, subtitle, isSelected, onClick, disabled, colors }) {
    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`p-4 rounded-xl transition-all duration-200 text-left relative group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{
                background: isSelected 
                    ? 'rgba(212, 175, 55, 0.08)' 
                    : 'rgba(255, 255, 255, 0.02)',
                border: isSelected 
                    ? '1px solid rgba(212, 175, 55, 0.3)' 
                    : '1px solid rgba(255, 255, 255, 0.06)',
                boxShadow: isSelected 
                    ? '0 0 20px rgba(212, 175, 55, 0.1)' 
                    : 'none'
            }}
        >
            {/* Theme preview */}
            <div 
                className="h-24 rounded-lg mb-3 relative overflow-hidden"
                style={{ 
                    background: colors.bg,
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
            >
                {/* Header bar */}
                <div 
                    className="absolute top-0 left-0 right-0 h-3"
                    style={{ background: colors.header }}
                />
                {/* Sidebar */}
                <div 
                    className="absolute left-0 top-3 bottom-0 w-5"
                    style={{ 
                        background: colors.sidebar,
                        borderRight: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                />
                {/* Content indicators */}
                <div className="absolute top-5 left-7 right-2 space-y-1.5">
                    <div 
                        className="h-2 rounded-full w-3/4"
                        style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                    />
                    <div 
                        className="h-2 rounded-full w-1/2"
                        style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                    />
                </div>
                {/* Accent dot */}
                <div 
                    className="absolute top-5 right-3 w-2 h-2 rounded-full"
                    style={{ background: colors.accent }}
                />
            </div>
            
            <div>
                <div 
                    className="font-semibold"
                    style={{ color: isSelected ? '#fff' : 'rgba(255, 255, 255, 0.8)' }}
                >
                    {name}
                </div>
                <div 
                    className="text-xs"
                    style={{ color: 'rgba(255, 255, 255, 0.4)' }}
                >
                    {subtitle}
                </div>
            </div>
            
            {/* Selected indicator */}
            {isSelected && (
                <div 
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{
                        background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)'
                    }}
                >
                    <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}
        </button>
    );
}
