import React, { useState, useEffect, useRef, useCallback } from 'react';

interface UseSidebarResizerOptions {
    minWidth: number;
    maxWidth: number;
    storageKey: string;
    defaultWidth: number;
}

export const useSidebarResizer = ({ minWidth, maxWidth, storageKey, defaultWidth }: UseSidebarResizerOptions) => {
    const isResizing = useRef(false);
    const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
        const savedWidth = localStorage.getItem(storageKey);
        return savedWidth ? parseInt(savedWidth, 10) : defaultWidth;
    });

    useEffect(() => {
        localStorage.setItem(storageKey, String(sidebarWidth));
    }, [sidebarWidth, storageKey]);

    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        isResizing.current = true;
        document.body.style.cursor = 'col-resize';

        const handleMouseMove = (e: MouseEvent) => {
            if (isResizing.current) {
                let newWidth = e.clientX;
                if (newWidth < minWidth) newWidth = minWidth;
                if (newWidth > maxWidth) newWidth = maxWidth;
                setSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            isResizing.current = false;
            document.body.style.cursor = 'default';
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [minWidth, maxWidth]);

    return { sidebarWidth, handleResizeStart, isResizing };
};