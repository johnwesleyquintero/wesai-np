import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '../Icons';

const CollapsibleSection: React.FC<{
    title: string;
    count?: number;
    actions?: React.ReactNode;
    children: React.ReactNode;
    defaultExpanded?: boolean;
}> = ({ title, count, actions, children, defaultExpanded = true }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className="py-1">
            <div className="flex justify-between items-center mb-1 px-2 group h-8">
                <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center text-xs font-semibold text-light-text/60 dark:text-dark-text/60 w-full hover:text-light-text dark:hover:text-dark-text transition-colors">
                    {isExpanded ? <ChevronDownIcon className="w-4 h-4 mr-1" /> : <ChevronRightIcon className="w-4 h-4 mr-1" />}
                    <h3 className="uppercase tracking-wider">{title}</h3>
                    {typeof count !== 'undefined' && <span className="ml-2 text-light-text/50 dark:text-dark-text/50">({count})</span>}
                </button>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {actions}
                </div>
            </div>
            <div className={`collapsible-content ${isExpanded ? 'expanded' : ''}`}>
                <div>
                    <div className="pl-1 pr-2">{children}</div>
                </div>
            </div>
        </div>
    );
};

export default CollapsibleSection;