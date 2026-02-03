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
            { type: 'separator' },
            { label: 'Impersonate User...', action: 'tools.impersonate' },
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
    const [hoveredItem, setHoveredItem] = useState(null);
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
        <div 
            ref={menuRef} 
            className="h-7 flex items-center px-1 text-sm select-none"
            style={{
                background: 'rgba(10, 10, 18, 0.95)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.03)'
            }}
        >
            {menuConfig.map((menu) => (
                <div key={menu.label} className="relative">
                    <button
                        onClick={() => handleMenuClick(menu.label)}
                        onMouseEnter={() => activeMenu && setActiveMenu(menu.label)}
                        className="px-3 py-1 rounded transition-all duration-100"
                        style={{
                            background: activeMenu === menu.label 
                                ? 'rgba(255, 255, 255, 0.08)' 
                                : 'transparent',
                            color: activeMenu === menu.label 
                                ? '#fff' 
                                : 'rgba(255, 255, 255, 0.5)'
                        }}
                        onMouseOver={(e) => {
                            if (!activeMenu) {
                                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!activeMenu || activeMenu !== menu.label) {
                                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                            }
                        }}
                    >
                        {menu.label}
                    </button>
                    
                    {activeMenu === menu.label && (
                        <div 
                            className="absolute top-full left-0 mt-0.5 w-56 rounded-xl py-1.5 z-50 animate-fade-in"
                            style={{
                                background: 'linear-gradient(145deg, rgba(22, 22, 38, 0.98) 0%, rgba(14, 14, 26, 0.99) 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255, 255, 255, 0.1)'
                            }}
                        >
                            {menu.items.map((item, i) => (
                                item.type === 'separator' ? (
                                    <div 
                                        key={i} 
                                        className="h-px mx-2 my-1.5"
                                        style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                                    />
                                ) : (
                                    <button
                                        key={i}
                                        onClick={() => handleItemClick(item.action)}
                                        onMouseEnter={() => setHoveredItem(`${menu.label}-${i}`)}
                                        onMouseLeave={() => setHoveredItem(null)}
                                        className="w-full px-3 py-1.5 text-left flex items-center justify-between transition-colors duration-100"
                                        style={{
                                            background: hoveredItem === `${menu.label}-${i}` 
                                                ? 'rgba(212, 175, 55, 0.08)' 
                                                : 'transparent',
                                            color: hoveredItem === `${menu.label}-${i}` 
                                                ? '#fff' 
                                                : 'rgba(255, 255, 255, 0.7)'
                                        }}
                                    >
                                        <span className="text-sm">{item.label}</span>
                                        {item.shortcut && (
                                            <span 
                                                className="text-xs font-mono"
                                                style={{ color: 'rgba(255, 255, 255, 0.3)' }}
                                            >
                                                {item.shortcut}
                                            </span>
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
