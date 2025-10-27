import React from 'react';

const FooterButton: React.FC<{
    onClick?: () => void;
    tooltip: string;
    children: React.ReactNode;
    isActive?: boolean;
    className?: string;
    hasIndicator?: boolean;
    tooltipPosition?: 'top' | 'right';
    id?: string;
}> = ({ onClick, tooltip, children, isActive = false, className = '', hasIndicator = false, tooltipPosition = 'right', id }) => {
    const tooltipContainerClasses = tooltipPosition === 'right'
        ? 'left-full ml-2'
        : 'bottom-full mb-2 left-1/2 -translate-x-1/2';

    const arrowClasses = tooltipPosition === 'right'
        ? 'right-full top-1/2 -translate-y-1/2 border-r-4 border-r-zinc-800 dark:border-r-zinc-700 border-y-4 border-y-transparent'
        : 'left-1/2 -translate-x-1/2 top-full border-t-4 border-t-zinc-800 dark:border-t-zinc-700 border-x-4 border-x-transparent';

    return (
        <div className="relative group">
            <button
                id={id}
                onClick={onClick}
                className={`p-2 rounded-md transition-colors text-light-text/70 dark:text-dark-text/70 hover:text-light-text dark:hover:text-dark-text ${className} ${
                    isActive
                        ? 'bg-light-primary/20 dark:bg-dark-primary/20 !text-light-primary dark:!text-dark-primary'
                        : 'hover:bg-light-background dark:hover:bg-dark-background'
                }`}
                 aria-label={tooltip}
            >
                {children}
                {hasIndicator && <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-yellow-400 rounded-full border-2 border-light-ui dark:border-dark-ui"></div>}
            </button>
            <div className={`absolute px-2 py-1 bg-zinc-800 dark:bg-zinc-700 text-white dark:text-dark-text text-xs font-semibold rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 ${tooltipContainerClasses}`}>
                {tooltip}
                <div className={`absolute w-0 h-0 ${arrowClasses}`} />
            </div>
        </div>
    );
};

export default FooterButton;
