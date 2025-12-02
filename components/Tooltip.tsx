import React from 'react';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top', className = '' }) => {
    let containerClasses = '';
    let arrowClasses = '';

    switch (position) {
        case 'top':
            containerClasses = 'bottom-full mb-2 left-1/2 -translate-x-1/2';
            arrowClasses = 'left-1/2 -translate-x-1/2 top-full border-t-4 border-t-zinc-800 dark:border-t-zinc-700 border-x-4 border-x-transparent';
            break;
        case 'bottom':
            containerClasses = 'top-full mt-2 left-1/2 -translate-x-1/2';
            arrowClasses = 'left-1/2 -translate-x-1/2 bottom-full border-b-4 border-b-zinc-800 dark:border-b-zinc-700 border-x-4 border-x-transparent';
            break;
        case 'right':
            containerClasses = 'left-full ml-2 top-1/2 -translate-y-1/2';
            arrowClasses = 'right-full top-1/2 -translate-y-1/2 border-r-4 border-r-zinc-800 dark:border-r-zinc-700 border-y-4 border-y-transparent';
            break;
        case 'left':
            containerClasses = 'right-full mr-2 top-1/2 -translate-y-1/2';
            arrowClasses = 'left-full top-1/2 -translate-y-1/2 border-l-4 border-l-zinc-800 dark:border-l-zinc-700 border-y-4 border-y-transparent';
            break;
    }

    return (
        <div className={`relative group ${className}`}>
            {children}
            <div className={`absolute px-2 py-1 bg-zinc-800 dark:bg-zinc-700 text-white dark:text-dark-text text-xs font-semibold rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 ${containerClasses}`}>
                {content}
                <div className={`absolute w-0 h-0 ${arrowClasses}`} />
            </div>
        </div>
    );
};

export default Tooltip;