import React, { useState, useLayoutEffect, useRef } from 'react';

interface UseDynamicPositionOptions {
    anchorRect: DOMRect | null;
    isOpen: boolean;
    align?: 'bottom' | 'top';
    menuRef: React.RefObject<HTMLElement>;
    margin?: number;
}

export const useDynamicPosition = ({ anchorRect, isOpen, align = 'bottom', menuRef, margin = 8 }: UseDynamicPositionOptions) => {
    const [style, setStyle] = useState<React.CSSProperties>({
        opacity: 0,
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
    });
    const frameId = useRef<number | null>(null);

    useLayoutEffect(() => {
        if (!isOpen || !anchorRect) {
            setStyle(prev => ({ ...prev, opacity: 0, top: '-9999px' }));
            return;
        }

        const calculatePosition = () => {
            if (!anchorRect || !menuRef.current) return;

            const menuWidth = menuRef.current.offsetWidth;
            const menuHeight = menuRef.current.offsetHeight;
            const { innerWidth, innerHeight } = window;
            const { top, bottom, left } = anchorRect;
            
            let newTop: number;
            if (align === 'bottom') {
                newTop = bottom + margin;
                if (newTop + menuHeight > innerHeight) {
                    newTop = top - menuHeight - margin;
                }
            } else { // align === 'top'
                newTop = top - menuHeight - margin;
                if (newTop < 0) {
                    newTop = bottom + margin;
                }
            }

            let newLeft = left;
            if (newLeft + menuWidth > innerWidth) {
                newLeft = innerWidth - menuWidth - 10;
            }
            if (newLeft < 10) newLeft = 10;
            
            if (newTop < 10) newTop = 10;

            setStyle({
                position: 'fixed',
                top: `${newTop}px`,
                left: `${newLeft}px`,
                opacity: 1,
                zIndex: 50,
                transition: 'opacity 0.1s ease-in-out',
            });
        };

        const handlePositionUpdate = () => {
            if (frameId.current) {
                cancelAnimationFrame(frameId.current);
            }
            frameId.current = requestAnimationFrame(calculatePosition);
        };

        // Initial calculation
        handlePositionUpdate();

        window.addEventListener('resize', handlePositionUpdate);
        window.addEventListener('scroll', handlePositionUpdate, true);

        return () => {
            window.removeEventListener('resize', handlePositionUpdate);
            window.removeEventListener('scroll', handlePositionUpdate, true);
            if (frameId.current) {
                cancelAnimationFrame(frameId.current);
            }
        };

    }, [isOpen, anchorRect, align, menuRef, margin]);

    return style;
};
