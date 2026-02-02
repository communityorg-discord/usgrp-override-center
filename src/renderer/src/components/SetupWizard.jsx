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
        // Apply theme immediately if needed via context or window
        // window.electron.api.setTheme(theme);
    };

    const finishSetup = async () => {
        await window.electron.store.set('hasCompletedSetup', true);
        await window.electron.store.set('theme', config.theme);
        onComplete();
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold rounded-full blur-[120px]"></div>
            </div>

            <div className="bg-surface-secondary/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 w-full max-w-2xl z-10">
                
                {/* Steps Indicator */}
                <div className="flex justify-between mb-8 relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -z-10"></div>
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`flex flex-col items-center gap-2 ${step >= i ? 'text-gold' : 'text-gray-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                                step >= i ? 'bg-gold text-black scale-110' : 'bg-surface-tertiary border border-white/10'
                            }`}>
                                {i}
                            </div>
                            <span className="text-xs font-medium uppercase tracking-wider">{
                                i === 1 ? 'Login' : i === 2 ? 'Theme' : 'Complete'
                            }</span>
                        </div>
                    ))}
                </div>

                {/* Step 1: Login */}
                {step === 1 && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold mb-2">Welcome, Superuser.</h2>
                            <p className="text-gray-400">Authenticate to access the USGRP Override Center.</p>
                        </div>
                        <div className="bg-surface-tertiary rounded-xl p-6 border border-white/5">
                            <Login onLogin={handleLoginSuccess} embedded={true} />
                        </div>
                    </div>
                )}

                {/* Step 2: Theme */}
                {step === 2 && (
                    <div className="animate-fade-in text-center">
                        <h2 className="text-2xl font-bold mb-4">Choose Interface Theme</h2>
                        <p className="text-gray-400 mb-8">Select your preferred visual style.</p>
                        
                        <div className="grid grid-cols-3 gap-6">
                            <button 
                                onClick={() => handleThemeSelect('dark')}
                                className={`p-4 rounded-xl border transition-all duration-300 ${
                                    config.theme === 'dark' ? 'border-gold bg-gold/10' : 'border-white/10 hover:border-white/30 bg-black/40'
                                }`}
                            >
                                <div className="h-24 bg-gray-900 rounded mb-3 border border-gray-700 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-2 bg-gray-800"></div>
                                    <div className="absolute left-0 top-2 w-4 h-full bg-gray-800 border-r border-gray-700"></div>
                                </div>
                                <div className="font-medium">Dark (Default)</div>
                            </button>

                            <button 
                                onClick={() => handleThemeSelect('light')}
                                className={`p-4 rounded-xl border transition-all duration-300 ${
                                    config.theme === 'light' ? 'border-gold bg-gold/10' : 'border-white/10 hover:border-white/30 bg-gray-200'
                                }`}
                            >
                                <div className="h-24 bg-white rounded mb-3 border border-gray-300 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-2 bg-gray-100"></div>
                                    <div className="absolute left-0 top-2 w-4 h-full bg-gray-100 border-r border-gray-200"></div>
                                </div>
                                <div className={`font-medium ${config.theme === 'light' ? 'text-white' : 'text-black'}`}>Light</div>
                            </button>

                            <button 
                                onClick={() => handleThemeSelect('midnight')}
                                className={`p-4 rounded-xl border transition-all duration-300 ${
                                    config.theme === 'midnight' ? 'border-gold bg-gold/10' : 'border-white/10 hover:border-white/30 bg-[#0f172a]'
                                }`}
                            >
                                <div className="h-24 bg-[#0f172a] rounded mb-3 border border-slate-700 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-2 bg-slate-800"></div>
                                    <div className="absolute left-0 top-2 w-4 h-full bg-slate-800 border-r border-slate-700"></div>
                                </div>
                                <div className="font-medium text-slate-200">Midnight</div>
                            </button>
                        </div>

                        <button onClick={nextStep} className="mt-8 px-8 py-3 bg-gold text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors">
                            Continue
                        </button>
                    </div>
                )}

                {/* Step 3: Finish */}
                {step === 3 && (
                    <div className="animate-fade-in text-center py-8">
                        <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Setup Complete</h2>
                        <p className="text-gray-400 mb-8 max-w-md mx-auto">
                            The USGRP Override Center is configured and ready. You have full superuser privileges.
                        </p>
                        
                        <div className="bg-surface-tertiary p-4 rounded-lg mb-8 text-left max-w-md mx-auto border border-white/5">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-gold">✓</span>
                                <span>Authenticated as Superuser</span>
                            </div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-gold">✓</span>
                                <span>Theme applied: {config.theme}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-gold">✓</span>
                                <span>Secure connection established</span>
                            </div>
                        </div>

                        <button 
                            onClick={finishSetup}
                            className="px-10 py-4 bg-gradient-to-r from-gold to-yellow-500 text-black font-bold text-lg rounded-xl hover:scale-105 transition-transform shadow-lg shadow-gold/20"
                        >
                            Launch Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
