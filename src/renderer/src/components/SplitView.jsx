import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function SplitView({ 
    left, 
    right, 
    defaultSplit = 50, 
    minLeft = 20, 
    minRight = 20,
    direction = 'horizontal' // 'horizontal' or 'vertical'
}) {
    const [split, setSplit] = useState(defaultSplit);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef(null);
    
    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);
    
    const handleMouseMove = useCallback((e) => {
        if (!isDragging || !containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        let newSplit;
        
        if (direction === 'horizontal') {
            newSplit = ((e.clientX - rect.left) / rect.width) * 100;
        } else {
            newSplit = ((e.clientY - rect.top) / rect.height) * 100;
        }
        
        newSplit = Math.max(minLeft, Math.min(100 - minRight, newSplit));
        setSplit(newSplit);
    }, [isDragging, direction, minLeft, minRight]);
    
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);
    
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
            document.body.style.userSelect = 'none';
            
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp, direction]);
    
    const isHorizontal = direction === 'horizontal';
    
    return (
        <div 
            ref={containerRef}
            className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} h-full w-full`}
        >
            {/* Left/Top Panel */}
            <div 
                className="overflow-auto"
                style={{ 
                    [isHorizontal ? 'width' : 'height']: `${split}%`,
                    minWidth: isHorizontal ? `${minLeft}%` : undefined,
                    minHeight: !isHorizontal ? `${minLeft}%` : undefined,
                }}
            >
                {left}
            </div>
            
            {/* Divider */}
            <div
                className={`relative flex-shrink-0 ${
                    isHorizontal 
                        ? 'w-1 cursor-col-resize hover:bg-gold/30' 
                        : 'h-1 cursor-row-resize hover:bg-gold/30'
                } bg-white/10 transition-colors group`}
                onMouseDown={handleMouseDown}
            >
                {/* Drag indicator */}
                <div className={`absolute ${
                    isHorizontal 
                        ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8' 
                        : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1'
                } bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity`} />
            </div>
            
            {/* Right/Bottom Panel */}
            <div 
                className="overflow-auto flex-1"
                style={{ 
                    minWidth: isHorizontal ? `${minRight}%` : undefined,
                    minHeight: !isHorizontal ? `${minRight}%` : undefined,
                }}
            >
                {right}
            </div>
        </div>
    );
}

// Wrapper component for enabling split view on any page
export function SplitViewContainer({ children, secondaryContent, enabled = false, direction = 'horizontal' }) {
    if (!enabled || !secondaryContent) {
        return children;
    }
    
    return (
        <SplitView 
            left={children}
            right={secondaryContent}
            direction={direction}
        />
    );
}

// Hook for managing split view state
export function useSplitView() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [secondaryPath, setSecondaryPath] = useState(null);
    
    const openSplit = (path) => {
        setSecondaryPath(path);
        setIsEnabled(true);
    };
    
    const closeSplit = () => {
        setIsEnabled(false);
        setSecondaryPath(null);
    };
    
    const toggleSplit = () => {
        setIsEnabled(prev => !prev);
    };
    
    return {
        isEnabled,
        secondaryPath,
        openSplit,
        closeSplit,
        toggleSplit,
    };
}
