import React from 'react';
import { SparklesIcon } from '../Icons';

interface ThinkingIndicatorProps {
    status: string;
}

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ status }) => {
    return (
        <div className="flex items-start gap-4 animate-fade-in-up my-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-light-primary to-purple-600 dark:from-dark-primary dark:to-purple-500 flex items-center justify-center text-white flex-shrink-0 mt-1 shadow-lg shadow-light-primary/20 dark:shadow-dark-primary/20 ring-2 ring-white dark:ring-dark-background">
                <SparklesIcon className="w-5 h-5 animate-pulse" />
            </div>
            <div className="p-3.5 px-5 rounded-2xl rounded-tl-none bg-white dark:bg-dark-ui border border-light-border/50 dark:border-dark-border/50 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex space-x-1" role="status" aria-label="Loading">
                        <div className="w-1.5 h-1.5 bg-light-primary dark:bg-dark-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 bg-light-primary dark:bg-dark-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-light-primary dark:bg-dark-primary rounded-full animate-bounce"></div>
                    </div>
                    <span className="text-sm font-medium text-light-text/70 dark:text-dark-text/70 bg-gradient-to-r from-light-text to-light-text/50 dark:from-dark-text dark:to-dark-text/50 bg-clip-text text-transparent">
                        {status}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ThinkingIndicator;