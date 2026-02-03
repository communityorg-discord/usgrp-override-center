import React, { useState, useEffect, createContext, useContext } from 'react';

const ContextMenuContext = createContext();

export function useContextMenu() {
    return useContext(ContextMenuContext);
}

export function ContextMenuProvider({ children }) {
    const [menu, setMenu] = useState(null);
    
    const showContextMenu = (e, items, data = {}) => {
        e.preventDefault();
        e.stopPropagation();
        setMenu({
            x: e.clientX,
            y: e.clientY,
            items,
            data
        });
    };
    
    const hideContextMenu = () => setMenu(null);
    
    useEffect(() => {
        const handleClick = () => hideContextMenu();
        const handleScroll = () => hideContextMenu();
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') hideContextMenu();
        };
        
        document.addEventListener('click', handleClick);
        document.addEventListener('scroll', handleScroll, true);
        document.addEventListener('keydown', handleKeyDown);
        
        return () => {
            document.removeEventListener('click', handleClick);
            document.removeEventListener('scroll', handleScroll, true);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);
    
    return (
        <ContextMenuContext.Provider value={{ showContextMenu, hideContextMenu }}>
            {children}
            {menu && (
                <ContextMenuPopup
                    x={menu.x}
                    y={menu.y}
                    items={menu.items}
                    data={menu.data}
                    onClose={hideContextMenu}
                />
            )}
        </ContextMenuContext.Provider>
    );
}

function ContextMenuPopup({ x, y, items, data, onClose }) {
    const [position, setPosition] = useState({ x, y });
    const menuRef = React.useRef(null);
    
    useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const newX = x + rect.width > window.innerWidth ? x - rect.width : x;
            const newY = y + rect.height > window.innerHeight ? y - rect.height : y;
            setPosition({ x: Math.max(0, newX), y: Math.max(0, newY) });
        }
    }, [x, y]);
    
    return (
        <div
            ref={menuRef}
            className="fixed z-[99999] bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-2xl py-1 min-w-[180px] animate-fade-in"
            style={{ left: position.x, top: position.y }}
            onClick={(e) => e.stopPropagation()}
        >
            {items.map((item, i) => {
                if (item.separator) {
                    return <div key={i} className="border-t border-white/10 my-1" />;
                }
                
                if (item.disabled) {
                    return (
                        <div
                            key={i}
                            className="px-3 py-2 text-sm text-gray-600 cursor-not-allowed flex items-center gap-2"
                        >
                            {item.icon && <span>{item.icon}</span>}
                            {item.label}
                        </div>
                    );
                }
                
                return (
                    <button
                        key={i}
                        onClick={() => {
                            item.onClick?.(data);
                            onClose();
                        }}
                        className={`w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors ${
                            item.danger 
                                ? 'text-red-400 hover:bg-red-500/20' 
                                : 'text-gray-200 hover:bg-white/10'
                        }`}
                    >
                        {item.icon && <span>{item.icon}</span>}
                        <span className="flex-1">{item.label}</span>
                        {item.shortcut && (
                            <span className="text-xs text-gray-500">{item.shortcut}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// Pre-defined context menu builders
export const userContextMenu = (user, actions) => [
    { icon: '👤', label: 'View Profile', onClick: () => actions.viewProfile?.(user) },
    { icon: '💰', label: 'Edit Balance', onClick: () => actions.editBalance?.(user) },
    { icon: '📋', label: 'Copy ID', onClick: () => navigator.clipboard.writeText(user.id || user.user_id) },
    { separator: true },
    { icon: '📨', label: 'Send Message', onClick: () => actions.sendMessage?.(user) },
    { icon: '🔔', label: 'Add to Watchlist', onClick: () => actions.addToWatchlist?.(user) },
    { separator: true },
    { icon: '⚠️', label: 'Warn User', onClick: () => actions.warn?.(user), danger: true },
    { icon: '🔇', label: 'Mute User', onClick: () => actions.mute?.(user), danger: true },
    { icon: '🚫', label: 'Ban User', onClick: () => actions.ban?.(user), danger: true },
];

export const transactionContextMenu = (tx, actions) => [
    { icon: '🔍', label: 'View Details', onClick: () => actions.viewDetails?.(tx) },
    { icon: '📋', label: 'Copy Transaction ID', onClick: () => navigator.clipboard.writeText(tx.id) },
    { separator: true },
    { icon: '👤', label: 'View Sender', onClick: () => actions.viewUser?.(tx.from_id) },
    { icon: '👤', label: 'View Recipient', onClick: () => actions.viewUser?.(tx.to_id) },
    { separator: true },
    { icon: '↩️', label: 'Reverse Transaction', onClick: () => actions.reverse?.(tx), danger: true },
];

export const sidebarContextMenu = (item, actions) => [
    { icon: '📌', label: 'Pin to Top', onClick: () => actions.pin?.(item) },
    { icon: '🔗', label: 'Open in New Window', onClick: () => actions.openPiP?.(item) },
    { icon: '📋', label: 'Copy Path', onClick: () => navigator.clipboard.writeText(item.path) },
];

export default ContextMenuProvider;
