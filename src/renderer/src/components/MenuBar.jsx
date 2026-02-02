import React, { useState, useRef, useEffect } from 'react';

const menuConfig = [
    {
        label: 'File',
        items: [
            { label: 'Export Data...', action: 'file.export', shortcut: 'Ctrl+E' },
            { label: 'Import Data...', action: 'file.import', shortcut: 'Ctrl+I' },
            { type: 'separator' },
            { label: 'Preferences', action: 'file.preferences', shortcut: 'Ctrl+,' },
            { type: 'separator' },
            { label: 'Exit', action: 'file.exit', shortcut: 'Alt+F4' },
        ]
    },
    {
        label: 'Edit',
        items: [
            { label: 'Cut', action: 'edit.cut', shortcut: 'Ctrl+X' },
            { label: 'Copy', action: 'edit.copy', shortcut: 'Ctrl+C' },
            { label: 'Paste', action: 'edit.paste', shortcut: 'Ctrl+V' },
            { type: 'separator' },
            { label: 'Select All', action: 'edit.selectAll', shortcut: 'Ctrl+A' },
        ]
    },
    {
        label: 'View',
        items: [
            { label: 'Refresh', action: 'view.refresh', shortcut: 'F5' },
            { type: 'separator' },
            { label: 'Zoom In', action: 'view.zoomIn', shortcut: 'Ctrl++' },
            { label: 'Zoom Out', action: 'view.zoomOut', shortcut: 'Ctrl+-' },
            { label: 'Reset Zoom', action: 'view.resetZoom', shortcut: 'Ctrl+0' },
        ]
    },
    {
        label: 'Tools',
        items: [
            { label: 'Dashboard', action: 'tools.dashboard', shortcut: 'Ctrl+1' },
            { label: 'Systems', action: 'tools.systems', shortcut: 'Ctrl+2' },
            { label: 'Deploy', action: 'tools.deploy', shortcut: 'Ctrl+Shift+D' },
            { label: 'Terminal', action: 'tools.terminal', shortcut: 'Ctrl+Shift+T' },
            { type: 'separator' },
            { label: 'Memory Editor', action: 'tools.memory' },
            { label: 'Database Browser', action: 'tools.database' },
        ]
    },
    {
        label: 'Help',
        items: [
            { label: 'Documentation', action: 'help.docs', shortcut: 'F1' },
            { label: 'Changelog', action: 'help.changelog' },
            { type: 'separator' },
            { label: 'Check for Updates', action: 'help.checkUpdates' },
            { type: 'separator' },
            { label: 'About Override Center', action: 'help.about' },
        ]
    },
];

export default function MenuBar({ onMenuAction }) {
    const [activeMenu, setActiveMenu] = useState(null);
    const menuRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMenu(null);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function handleMenuClick(label) {
        setActiveMenu(activeMenu === label ? null : label);
    }

    function handleItemClick(action) {
        setActiveMenu(null);
        onMenuAction(action);
    }

    return (
        <div ref={menuRef} className="h-7 bg-surface-secondary border-b border-gray-800 flex items-center px-2 text-sm select-none">
            {menuConfig.map((menu) => (
                <div key={menu.label} className="relative">
                    <button
                        onClick={() => handleMenuClick(menu.label)}
                        onMouseEnter={() => activeMenu && setActiveMenu(menu.label)}
                        className={`px-3 py-1 rounded transition-colors ${
                            activeMenu === menu.label 
                                ? 'bg-gray-700 text-white' 
                                : 'text-gray-300 hover:bg-gray-800'
                        }`}
                    >
                        {menu.label}
                    </button>
                    
                    {activeMenu === menu.label && (
                        <div className="absolute top-full left-0 mt-0.5 w-56 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 z-50">
                            {menu.items.map((item, i) => (
                                item.type === 'separator' ? (
                                    <div key={i} className="h-px bg-gray-700 my-1 mx-2" />
                                ) : (
                                    <button
                                        key={i}
                                        onClick={() => handleItemClick(item.action)}
                                        className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-gray-800 text-gray-300 hover:text-white"
                                    >
                                        <span>{item.label}</span>
                                        {item.shortcut && (
                                            <span className="text-xs text-gray-500">{item.shortcut}</span>
                                        )}
                                    </button>
                                )
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
