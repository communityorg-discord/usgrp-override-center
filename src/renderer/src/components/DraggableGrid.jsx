import React, { useState, useEffect, useCallback } from 'react';

const DEFAULT_LAYOUT = [
    { id: 'quick-stats', x: 0, y: 0, w: 2, h: 1, component: 'QuickStats' },
    { id: 'recent-activity', x: 2, y: 0, w: 2, h: 2, component: 'RecentActivity' },
    { id: 'system-health', x: 0, y: 1, w: 1, h: 1, component: 'SystemHealth' },
    { id: 'quick-actions', x: 1, y: 1, w: 1, h: 1, component: 'QuickActions' },
];

const GRID_COLS = 4;
const CELL_HEIGHT = 180;
const GAP = 16;

export default function DraggableGrid({ widgets, onLayoutChange }) {
    const [layout, setLayout] = useState(widgets || DEFAULT_LAYOUT);
    const [dragging, setDragging] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [ghostPosition, setGhostPosition] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    
    useEffect(() => {
        const saved = localStorage.getItem('dashboard-layout');
        if (saved) {
            try {
                setLayout(JSON.parse(saved));
            } catch (e) {}
        }
    }, []);
    
    const saveLayout = useCallback((newLayout) => {
        localStorage.setItem('dashboard-layout', JSON.stringify(newLayout));
        onLayoutChange?.(newLayout);
    }, [onLayoutChange]);
    
    const handleDragStart = (e, widget) => {
        if (!isEditing) return;
        e.dataTransfer.effectAllowed = 'move';
        setDragging(widget);
        const rect = e.currentTarget.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };
    
    const handleDragOver = (e) => {
        e.preventDefault();
        if (!dragging) return;
        
        const container = e.currentTarget.getBoundingClientRect();
        const cellWidth = (container.width - GAP * (GRID_COLS - 1)) / GRID_COLS;
        
        const x = Math.floor((e.clientX - container.left) / (cellWidth + GAP));
        const y = Math.floor((e.clientY - container.top) / (CELL_HEIGHT + GAP));
        
        setGhostPosition({
            x: Math.max(0, Math.min(GRID_COLS - dragging.w, x)),
            y: Math.max(0, y)
        });
    };
    
    const handleDrop = (e) => {
        e.preventDefault();
        if (!dragging || !ghostPosition) return;
        
        const newLayout = layout.map(w => 
            w.id === dragging.id 
                ? { ...w, x: ghostPosition.x, y: ghostPosition.y }
                : w
        );
        
        setLayout(newLayout);
        saveLayout(newLayout);
        setDragging(null);
        setGhostPosition(null);
    };
    
    const handleDragEnd = () => {
        setDragging(null);
        setGhostPosition(null);
    };
    
    const removeWidget = (id) => {
        const newLayout = layout.filter(w => w.id !== id);
        setLayout(newLayout);
        saveLayout(newLayout);
    };
    
    const resizeWidget = (id, newW, newH) => {
        const newLayout = layout.map(w => 
            w.id === id ? { ...w, w: newW, h: newH } : w
        );
        setLayout(newLayout);
        saveLayout(newLayout);
    };
    
    const resetLayout = () => {
        setLayout(DEFAULT_LAYOUT);
        saveLayout(DEFAULT_LAYOUT);
    };
    
    const getWidgetStyle = (widget) => {
        const containerWidth = typeof window !== 'undefined' ? window.innerWidth - 300 : 1000;
        const cellWidth = (containerWidth - GAP * (GRID_COLS + 1)) / GRID_COLS;
        
        return {
            gridColumn: `${widget.x + 1} / span ${widget.w}`,
            gridRow: `${widget.y + 1} / span ${widget.h}`,
            minHeight: CELL_HEIGHT * widget.h + GAP * (widget.h - 1),
        };
    };
    
    return (
        <div className="space-y-4">
            {/* Edit Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            isEditing 
                                ? 'bg-gold text-black' 
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                    >
                        {isEditing ? '✓ Done Editing' : '✏️ Edit Layout'}
                    </button>
                    {isEditing && (
                        <button
                            onClick={resetLayout}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 text-gray-400 hover:bg-white/10 transition-colors"
                        >
                            ↺ Reset
                        </button>
                    )}
                </div>
                {isEditing && (
                    <span className="text-xs text-gray-500">
                        Drag widgets to rearrange
                    </span>
                )}
            </div>
            
            {/* Grid */}
            <div
                className="grid gap-4 relative"
                style={{
                    gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                    minHeight: Math.max(...layout.map(w => (w.y + w.h))) * (CELL_HEIGHT + GAP),
                }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {/* Ghost indicator */}
                {dragging && ghostPosition && (
                    <div
                        className="absolute bg-gold/20 border-2 border-dashed border-gold rounded-xl pointer-events-none z-10"
                        style={{
                            ...getWidgetStyle({ ...dragging, x: ghostPosition.x, y: ghostPosition.y }),
                            opacity: 0.5,
                        }}
                    />
                )}
                
                {layout.map(widget => (
                    <div
                        key={widget.id}
                        draggable={isEditing}
                        onDragStart={(e) => handleDragStart(e, widget)}
                        onDragEnd={handleDragEnd}
                        className={`relative rounded-xl bg-white/5 border border-white/10 overflow-hidden transition-all ${
                            isEditing 
                                ? 'cursor-move hover:border-gold/50 hover:shadow-lg' 
                                : ''
                        } ${dragging?.id === widget.id ? 'opacity-50' : ''}`}
                        style={getWidgetStyle(widget)}
                    >
                        {isEditing && (
                            <div className="absolute top-2 right-2 flex gap-1 z-20">
                                <button
                                    onClick={() => resizeWidget(widget.id, Math.min(GRID_COLS, widget.w + 1), widget.h)}
                                    className="w-6 h-6 rounded bg-white/10 text-white text-xs hover:bg-white/20"
                                    title="Wider"
                                >
                                    ↔
                                </button>
                                <button
                                    onClick={() => resizeWidget(widget.id, widget.w, widget.h + 1)}
                                    className="w-6 h-6 rounded bg-white/10 text-white text-xs hover:bg-white/20"
                                    title="Taller"
                                >
                                    ↕
                                </button>
                                <button
                                    onClick={() => removeWidget(widget.id)}
                                    className="w-6 h-6 rounded bg-red-500/20 text-red-400 text-xs hover:bg-red-500/40"
                                    title="Remove"
                                >
                                    ×
                                </button>
                            </div>
                        )}
                        
                        <WidgetContent widget={widget} />
                    </div>
                ))}
            </div>
        </div>
    );
}

// Widget content renderer
function WidgetContent({ widget }) {
    switch (widget.component) {
        case 'QuickStats':
            return (
                <div className="p-4 h-full">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">Quick Stats</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-xs text-gray-500">Users Online</div>
                            <div className="text-2xl font-bold text-white">1,234</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-xs text-gray-500">Economy</div>
                            <div className="text-2xl font-bold text-green-400">$5.2M</div>
                        </div>
                    </div>
                </div>
            );
        
        case 'RecentActivity':
            return (
                <div className="p-4 h-full flex flex-col">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">Recent Activity</h3>
                    <div className="flex-1 space-y-2 overflow-auto">
                        {['User joined', 'Transaction completed', 'New ticket', 'Deploy finished'].map((item, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-gray-300 p-2 bg-white/5 rounded">
                                <span className="w-2 h-2 rounded-full bg-gold" />
                                {item}
                            </div>
                        ))}
                    </div>
                </div>
            );
        
        case 'SystemHealth':
            return (
                <div className="p-4 h-full">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">System Health</h3>
                    <div className="flex items-center justify-center h-20">
                        <div className="text-4xl">✅</div>
                    </div>
                    <div className="text-center text-sm text-green-400">All systems operational</div>
                </div>
            );
        
        case 'QuickActions':
            return (
                <div className="p-4 h-full">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {['🚀 Deploy', '💻 Terminal', '📊 Stats', '⚙️ Config'].map((action, i) => (
                            <button key={i} className="p-2 bg-white/5 rounded-lg text-sm text-white hover:bg-white/10 transition-colors">
                                {action}
                            </button>
                        ))}
                    </div>
                </div>
            );
        
        default:
            return (
                <div className="p-4 h-full flex items-center justify-center text-gray-500">
                    Widget: {widget.component}
                </div>
            );
    }
}
