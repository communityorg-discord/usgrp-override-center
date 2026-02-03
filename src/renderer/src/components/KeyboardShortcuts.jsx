import React from 'react';

const shortcuts = [
    { category: 'Navigation', items: [
        { keys: ['Ctrl', 'K'], description: 'Open Command Palette' },
        { keys: ['Ctrl', '1-9'], description: 'Jump to page by number' },
        { keys: ['Ctrl', 'Shift', 'U'], description: 'Show/Focus window' },
        { keys: ['Ctrl', 'Shift', 'D'], description: 'Quick Deploy' },
        { keys: ['?'], description: 'Show this help' },
    ]},
    { category: 'Actions', items: [
        { keys: ['F5'], description: 'Refresh current page' },
        { keys: ['Ctrl', 'S'], description: 'Save (in editors)' },
        { keys: ['Ctrl', 'Enter'], description: 'Execute/Submit' },
        { keys: ['Escape'], description: 'Close modal/Cancel' },
    ]},
    { category: 'Terminal', items: [
        { keys: ['Ctrl', 'C'], description: 'Cancel command' },
        { keys: ['Ctrl', 'L'], description: 'Clear terminal' },
        { keys: ['↑', '↓'], description: 'Command history' },
    ]},
    { category: 'Developer', items: [
        { keys: ['F12'], description: 'Toggle DevTools' },
        { keys: ['Ctrl', 'Shift', 'I'], description: 'Toggle DevTools' },
        { keys: ['Ctrl', 'R'], description: 'Reload app' },
    ]},
];

export default function KeyboardShortcuts({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            
            <div 
                className="relative bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⌨️</span>
                        <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors text-2xl"
                    >
                        ×
                    </button>
                </div>
                
                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)] grid grid-cols-1 md:grid-cols-2 gap-6">
                    {shortcuts.map(category => (
                        <div key={category.category}>
                            <h3 className="text-sm font-semibold text-gold uppercase tracking-wider mb-3">
                                {category.category}
                            </h3>
                            <div className="space-y-2">
                                {category.items.map((shortcut, i) => (
                                    <div key={i} className="flex items-center justify-between gap-4 py-1.5">
                                        <span className="text-gray-300 text-sm">{shortcut.description}</span>
                                        <div className="flex items-center gap-1">
                                            {shortcut.keys.map((key, j) => (
                                                <React.Fragment key={j}>
                                                    <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs font-mono text-gray-300 min-w-[24px] text-center shadow-sm">
                                                        {key}
                                                    </kbd>
                                                    {j < shortcut.keys.length - 1 && (
                                                        <span className="text-gray-600 text-xs">+</span>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Footer */}
                <div className="px-6 py-3 border-t border-white/10 bg-gray-900/50">
                    <p className="text-xs text-gray-500 text-center">
                        Press <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs">?</kbd> anytime to show this help
                    </p>
                </div>
            </div>
        </div>
    );
}
