import React from 'react';
import { SparklesIcon } from '../Icons';

interface ThinkingIndicatorProps {
    status: string;
}

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ status }) => {
    return (
        <div className="flex items-center gap-4 animate-fade-in-up my-4 pl-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-light-primary to-purple-600 dark:from-dark-primary dark:to-purple-500 flex items-center justify-center text-white flex-shrink-0 shadow-md ring-2 ring-white dark:ring-dark-background z-10 animate-pulse">
                <SparklesIcon className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-light-background dark:bg-zinc-900 border border-light-border dark:border-dark-border shadow-sm">
                <div className="flex space-x-1" role="status" aria-label="Loading">
                    <div className="w-1.5 h-1.5 bg-light-primary dark:bg-dark-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-light-primary dark:bg-dark-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-light-primary dark:bg-dark-primary rounded-full animate-bounce"></div>
                </div>
                <span className="text-xs font-semibold text-light-text/70 dark:text-dark-text/70 bg-gradient-to-r from-light-primary to-purple-600 dark:from-dark-primary dark:to-purple-400 bg-clip-text text-transparent animate-pulse">
                    {status}
                </span>
            </div>
        </div>
    );
};

export default ThinkingIndicator;