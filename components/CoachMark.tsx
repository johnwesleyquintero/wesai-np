import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { XMarkIcon } from './Icons';

interface CoachMarkProps {
    targetSelector: string;
    title: string;
    content: string;
    onDismiss: () => void;
}

const CoachMark: React.FC<CoachMarkProps> = ({ targetSelector, title, content, onDismiss }) => {
    const [position, setPosition] = useState<{ top: number; left: number; width: number, height: number, pos: 'top' | 'bottom' | 'left' | 'right' } | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const targetRef = useRef<Element | null>(null);

    useLayoutEffect(() => {
        const updatePosition = () => {
            if (!targetRef.current) {
                targetRef.current = document.querySelector(targetSelector);
            }
            const target = targetRef.current;
            if (!target) {
                console.warn(`CoachMark target not found: ${targetSelector}`);
                return;
            }

            const popover = popoverRef.current;
            if (!popover) return;
            
            const targetRect = target.getBoundingClientRect();
            const popoverRect = popover.getBoundingClientRect();
            const { innerWidth, innerHeight } = window;
            const margin = 12;

            let top: number, left: number, pos: 'top' | 'bottom' | 'left' | 'right';

            // Define all possible positions
            const positions = {
                top: {
                    top: targetRect.top - popoverRect.height - margin,
                    left: targetRect.left + (targetRect.width / 2) - (popoverRect.width / 2),
                    pos: 'top' as const,
                },
                bottom: {
                    top: targetRect.bottom + margin,
                    left: targetRect.left + (targetRect.width / 2) - (popoverRect.width / 2),
                    pos: 'bottom' as const,
                },
                right: {
                    top: targetRect.top + (targetRect.height / 2) - (popoverRect.height / 2),
                    left: targetRect.right + margin,
                    pos: 'right' as const,
                },
                left: {
                    top: targetRect.top + (targetRect.height / 2) - (popoverRect.height / 2),
                    left: targetRect.left - popoverRect.width - margin,
                    pos: 'left' as const,
                }
            };

            // Check if a position fits within the viewport
            const checkFit = (p: { top: number; left: number; }) => {
                return (
                    p.top >= margin &&
                    p.left >= margin &&
                    p.top + popoverRect.height <= innerHeight - margin &&
                    p.left + popoverRect.width <= innerWidth - margin
                );
            };

            // Try positions in order of preference
            const order: ('top' | 'bottom' | 'right' | 'left')[] = ['top', 'bottom', 'right', 'left'];
            let chosenPosition = null;

            for (const p of order) {
                if (checkFit(positions[p])) {
                    chosenPosition = positions[p];
                    break;
                }
            }

            // If no position fits perfectly, fallback to the first option and clamp it
            if (chosenPosition) {
                top = chosenPosition.top;
                left = chosenPosition.left;
                pos = chosenPosition.pos;
            } else {
                // Fallback to top and let clamping handle it
                const fallback = positions.top;
                top = fallback.top;
                left = fallback.left;
                pos = fallback.pos;
            }
            
            // Final clamping to guarantee visibility
            if (left < margin) left = margin;
            if (left + popoverRect.width > innerWidth - margin) left = innerWidth - popoverRect.width - margin;
            if (top < margin) top = margin;
            if (top + popoverRect.height > innerHeight - margin) top = innerHeight - popoverRect.height - margin;

            setPosition({
                top,
                left,
                width: targetRect.width,
                height: targetRect.height,
                pos
            });
        };
        
        const timeoutId = setTimeout(updatePosition, 100);
        
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [targetSelector]);
    
    if (!position) {
        // Render invisibly first to measure dimensions
        return <div ref={popoverRef} className="fixed opacity-0 pointer-events-none w-64"></div>;
    }
    
    let pointerClasses = '';
    switch (position.pos) {
        case 'top': pointerClasses = 'top-full left-1/2 -translate-x-1/2 border-x-8 border-x-transparent border-t-8 border-t-inherit'; break;
        case 'bottom': pointerClasses = 'bottom-full left-1/2 -translate-x-1/2 border-x-8 border-x-transparent border-b-8 border-b-inherit'; break;
        case 'left': pointerClasses = 'top-1/2 -translate-y-1/2 left-full border-y-8 border-y-transparent border-l-8 border-l-inherit'; break;
        case 'right': pointerClasses = 'top-1/2 -translate-y-1/2 right-full border-y-8 border-y-transparent border-r-8 border-r-inherit'; break;
    }


    return (
        <div className="fixed inset-0 z-40 bg-black/30 animate-fade-in-down" onClick={onDismiss}>
            <div
                ref={popoverRef}
                className="fixed bg-light-background dark:bg-dark-background rounded-lg shadow-2xl w-64 p-4 border-inherit border-light-border dark:border-dark-border animate-fade-in-down text-light-text dark:text-dark-text"
                style={{ top: position.top, left: position.left }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`absolute w-0 h-0 ${pointerClasses}`} />
                <button onClick={onDismiss} className="absolute top-2 right-2 p-1 rounded-full hover:bg-light-ui dark:hover:bg-dark-ui">
                    <XMarkIcon className="w-4 h-4" />
                </button>
                <h3 className="font-bold mb-2">{title}</h3>
                <p className="text-sm text-light-text/80 dark:text-dark-text/80">{content}</p>
                <button
                    onClick={onDismiss}
                    className="w-full mt-4 px-4 py-2 bg-light-primary text-white text-sm font-semibold rounded-md hover:bg-light-primary-hover dark:bg-dark-primary dark:text-zinc-900 dark:hover:bg-dark-primary-hover"
                >
                    Got it
                </button>
            </div>
        </div>
    );
};

export default CoachMark;