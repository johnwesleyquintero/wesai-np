
import React, { useState, useLayoutEffect } from 'react';

interface UseDynamicPositionOptions {
    anchorRect: DOMRect | null;
    isOpen: boolean;
    align?: 'bottom' | 'top';
    menuRef: React.RefObject<HTMLElement>;
}

export const useDynamicPosition = ({ anchorRect, isOpen, align = 'bottom', menuRef }: UseDynamicPositionOptions) => {
    const [style, setStyle] = useState<React.CSSProperties>({
        opacity: 0,
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
    });

    useLayoutEffect(() => {
        if (!isOpen || !anchorRect || !menuRef.current) {
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
                newTop = bottom + 8;
                // If it overflows bottom, position above
                if (newTop + menuHeight > innerHeight) {
                    newTop = top - menuHeight - 8;
                }
            } else { // align === 'top'
                newTop = top - menuHeight - 8;
                // If it overflows top, position below
                if (newTop < 0) {
                    newTop = bottom + 8;
                }
            }

            let newLeft = left;
            // Adjust if it goes off-screen horizontally
            if (newLeft + menuWidth > innerWidth) {
                newLeft = innerWidth - menuWidth - 10;
            }
            if (newLeft < 10) newLeft = 10;
            
            // Final check to prevent vertical overflow
            if (newTop < 10) newTop = 10;
            if (newTop + menuHeight > innerHeight) newTop = innerHeight - menuHeight - 10;

            setStyle({
                position: 'fixed',
                top: `${newTop}px`,
                left: `${newLeft}px`,
                opacity: 1,
                zIndex: 50,
                transition: 'opacity 0.1s ease-in-out',
            });
        };

        // Calculate initial position
        calculatePosition();

        window.addEventListener('resize', calculatePosition);
        window.addEventListener('scroll', calculatePosition, true); // Use capture phase for scroll

        return () => {
            window.removeEventListener('resize', calculatePosition);
            window.removeEventListener('scroll', calculatePosition, true);
        };

    }, [isOpen, anchorRect, align, menuRef]);

    return style;
};
