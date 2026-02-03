import React, { useEffect, useRef, useState } from 'react';

export default function MiniMap({ containerRef, scale = 0.1 }) {
    const canvasRef = useRef(null);
    const [viewportPosition, setViewportPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    
    useEffect(() => {
        const container = containerRef?.current;
        if (!container) return;
        
        const updateViewport = () => {
            setViewportPosition({
                x: container.scrollLeft * scale,
                y: container.scrollTop * scale
            });
        };
        
        container.addEventListener('scroll', updateViewport);
        updateViewport();
        
        return () => container.removeEventListener('scroll', updateViewport);
    }, [containerRef, scale]);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef?.current;
        if (!canvas || !container) return;
        
        const ctx = canvas.getContext('2d');
        const containerRect = container.getBoundingClientRect();
        
        // Set canvas size
        canvas.width = container.scrollWidth * scale;
        canvas.height = container.scrollHeight * scale;
        
        // Clear
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw content representation
        const elements = container.querySelectorAll('.card, section, [data-minimap]');
        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const offsetX = rect.left - containerRect.left + container.scrollLeft;
            const offsetY = rect.top - containerRect.top + container.scrollTop;
            
            ctx.fillStyle = el.classList.contains('card') ? 'rgba(212, 175, 55, 0.3)' : 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(
                offsetX * scale,
                offsetY * scale,
                rect.width * scale,
                rect.height * scale
            );
        });
        
        // Draw viewport rectangle
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            viewportPosition.x,
            viewportPosition.y,
            containerRect.width * scale,
            containerRect.height * scale
        );
    }, [containerRef, scale, viewportPosition]);
    
    const handleClick = (e) => {
        const container = containerRef?.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        
        const containerRect = container.getBoundingClientRect();
        container.scrollTo({
            left: x - containerRect.width / 2,
            top: y - containerRect.height / 2,
            behavior: 'smooth'
        });
    };
    
    const handleMouseDown = () => setIsDragging(true);
    const handleMouseUp = () => setIsDragging(false);
    
    const handleMouseMove = (e) => {
        if (!isDragging) return;
        handleClick(e);
    };
    
    return (
        <div className="absolute top-4 right-4 z-40 bg-gray-900/90 backdrop-blur-sm border border-white/10 rounded-lg p-2 shadow-xl">
            <div className="text-xs text-gray-500 mb-1 font-medium">Overview</div>
            <canvas
                ref={canvasRef}
                className="rounded cursor-pointer"
                style={{ 
                    width: 150,
                    height: 100,
                    minWidth: 150,
                    minHeight: 100
                }}
                onClick={handleClick}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onMouseMove={handleMouseMove}
            />
        </div>
    );
}

// Wrapper component that adds minimap to scrollable content
export function WithMiniMap({ children, enabled = true }) {
    const containerRef = useRef(null);
    const [showMiniMap, setShowMiniMap] = useState(enabled);
    
    return (
        <div className="relative h-full">
            <div 
                ref={containerRef} 
                className="h-full overflow-auto"
            >
                {children}
            </div>
            
            {showMiniMap && <MiniMap containerRef={containerRef} />}
            
            {/* Toggle Button */}
            <button
                onClick={() => setShowMiniMap(!showMiniMap)}
                className="absolute bottom-4 right-4 z-40 w-8 h-8 bg-gray-900/90 border border-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                title={showMiniMap ? 'Hide minimap' : 'Show minimap'}
            >
                {showMiniMap ? '🗺️' : '📍'}
            </button>
        </div>
    );
}
