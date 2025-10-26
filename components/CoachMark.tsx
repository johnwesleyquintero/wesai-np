import React, { useLayoutEffect, useRef, useState } from 'react';
import { XMarkIcon } from './Icons';

interface CoachMarkProps {
    targetSelector: string;
    title: string;
    content: string;
    onDismiss: () => void;
}

const CoachMark: React.FC<CoachMarkProps> = ({ targetSelector, title, content, onDismiss }) => {
    const [position, setPosition] = useState<{ top: number; left: number; pos: 'top' | 'bottom' | 'left' | 'right' } | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        // A small delay allows the target element to be mounted in the DOM, especially with lazy loading.
        const timer = setTimeout(() => {
            const target = document.querySelector(targetSelector);
            const popover = popoverRef.current;
            if (!target || !popover) {
                console.warn(`CoachMark target not found: ${targetSelector}`);
                return;
            }

            const targetRect = target.getBoundingClientRect();
            // Since the popover is rendered off-screen, getBoundingClientRect gives us its true dimensions.
            const popoverRect = popover.getBoundingClientRect();
            const { innerWidth, innerHeight } = window;
            const margin = 12;

            // Define all possible positions for the popover
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

            // Function to check if a given position fits within the viewport
            const checkFit = (p: { top: number; left: number; }) => (
                p.top >= margin &&
                p.left >= margin &&
                p.top + popoverRect.height <= innerHeight - margin &&
                p.left + popoverRect.width <= innerWidth - margin
            );
            
            // Try positions in a preferred order to find the best fit
            const order: ('top' | 'bottom' | 'right' | 'left')[] = ['top', 'bottom', 'right', 'left'];
            // FIX: Explicitly type chosenPosition to allow assignment of different position objects.
            let chosenPosition: { top: number; left: number; pos: 'top' | 'bottom' | 'right' | 'left' } = positions.top; // Default to top

            for (const posKey of order) {
                if (checkFit(positions[posKey])) {
                    chosenPosition = positions[posKey];
                    break;
                }
            }

            // Clamp the chosen position to ensure it's always on screen
            let finalTop = Math.max(margin, chosenPosition.top);
            let finalLeft = Math.max(margin, chosenPosition.left);

            if (finalLeft + popoverRect.width > innerWidth - margin) {
                finalLeft = innerWidth - popoverRect.width - margin;
            }
            if (finalTop + popoverRect.height > innerHeight - margin) {
                finalTop = innerHeight - popoverRect.height - margin;
            }
            
            setPosition({ top: finalTop, left: finalLeft, pos: chosenPosition.pos });
        }, 50);

        return () => clearTimeout(timer);
    }, [targetSelector, title, content]); // Rerun if content changes, as that affects height

    const style: React.CSSProperties = position
        ? { top: position.top, left: position.left, opacity: 1, transition: 'opacity 0.2s ease-in-out' }
        : { top: '-9999px', left: '-9999px', opacity: 0 };

    let pointerClasses = '';
    if (position) {
        switch (position.pos) {
            case 'top': pointerClasses = 'top-full left-1/2 -translate-x-1/2 border-x-8 border-x-transparent border-t-8 border-t-inherit'; break;
            case 'bottom': pointerClasses = 'bottom-full left-1/2 -translate-x-1/2 border-x-8 border-x-transparent border-b-8 border-b-inherit'; break;
            case 'left': pointerClasses = 'top-1/2 -translate-y-1/2 left-full border-y-8 border-y-transparent border-l-8 border-l-inherit'; break;
            case 'right': pointerClasses = 'top-1/2 -translate-y-1/2 right-full border-y-8 border-y-transparent border-r-8 border-r-inherit'; break;
        }
    }

    return (
        <div className="fixed inset-0 z-40 bg-black/30 animate-fade-in" onClick={onDismiss}>
            <div
                ref={popoverRef}
                className="fixed bg-light-background dark:bg-dark-background rounded-lg shadow-2xl w-64 p-4 border-inherit border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                style={style}
                onClick={(e) => e.stopPropagation()}
            >
                {position && <div className={`absolute w-0 h-0 ${pointerClasses}`} />}
                
                <button onClick={onDismiss} className="absolute top-2 right-2 p-1 rounded-full hover:bg-light-ui dark:hover:bg-dark-ui">
                    <XMarkIcon className="w-4 h-4" />
                </button>
                <h3 className="font-bold mb-2 pr-6">{title}</h3>
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
