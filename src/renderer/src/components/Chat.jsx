import React, { useState, useRef, useEffect } from 'react';

// Simple Markdown Renderer
const MarkdownText = ({ content }) => {
    // 1. Split by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('```') && part.endsWith('```')) {
                    // Code block
                    return (
                        <div key={i} className="bg-black/50 p-2 rounded-md my-1 text-xs font-mono text-emerald-400 border border-emerald-900/30 overflow-x-auto">
                            {part.slice(3, -3).trim()}
                        </div>
                    );
                }
                
                // Text with bold/italic
                // Handle **bold**
                return (
                    <span key={i}>
                        {part.split(/(\*\*.*?\*\*)/g).map((chunk, j) => {
                            if (chunk.startsWith('**') && chunk.endsWith('**')) {
                                return <strong key={j} className="font-bold text-amber-300">{chunk.slice(2, -2)}</strong>;
                            }
                            // Handle *italic*?
                             return chunk.split(/(\*.*?\*)/g).map((sub, k) => {
                                if (sub.startsWith('*') && sub.endsWith('*') && sub.length > 2) {
                                    // Make sure it's not just a bullet point
                                    // Simple check: no space after first *
                                    if (sub[1] !== ' ') {
                                         return <em key={k} className="italic text-gray-300">{sub.slice(1, -1)}</em>;
                                    }
                                }
                                return sub;
                             });
                        })}
                    </span>
                );
            })}
        </>
    );
};

export default function Chat({ isOpen, onToggle }) {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Atlas online. Override systems active." }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function handleSend() {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const response = await fetch(`${apiBase}/override/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-override-token': token
                },
                body: JSON.stringify({ message: userMessage })
            });

            const data = await response.json();

            if (data.success) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.reply
                }]);
            } else {
                throw new Error(data.error || 'Unknown error');
            }

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `**Error**: ${error.message}`
            }]);
        } finally {
            setIsLoading(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="w-96 bg-surface-secondary border-l border-gray-800 flex flex-col h-full shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50 backdrop-blur">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-600 to-amber-800 rounded-lg flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-900/20">
                        <span className="text-white font-bold text-sm">A</span>
                    </div>
                    <div>
                        <h3 className="font-semibold text-white text-sm">Atlas</h3>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span className="text-xs text-emerald-400">Online</span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={onToggle}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                {messages.map((msg, i) => (
                    <div 
                        key={i} 
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div 
                            className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                msg.role === 'user' 
                                    ? 'bg-amber-600 text-white rounded-br-none' 
                                    : 'bg-gray-800/80 text-gray-200 rounded-bl-none border border-gray-700/50'
                            }`}
                        >
                            {msg.role === 'assistant' ? (
                                <MarkdownText content={msg.content} />
                            ) : (
                                msg.content
                            )}
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-800/80 px-4 py-3 rounded-2xl rounded-bl-none border border-gray-700/50">
                            <div className="flex gap-1.5">
                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-800 bg-gray-900/30">
                <div className="flex gap-2 relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                        placeholder="Command or query..."
                        className="w-full bg-gray-950 border border-gray-800 text-gray-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/50 transition-all placeholder:text-gray-600"
                        disabled={isLoading}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="absolute right-1.5 top-1.5 p-1.5 bg-amber-600/10 text-amber-600 hover:bg-amber-600 hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-amber-600"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
                <div className="text-[10px] text-gray-600 mt-2 text-center font-mono">
                    SECURE CONNECTION • OVERRIDE ACCESS
                </div>
            </div>
        </div>
    );
}
