
import React from 'react';
import { SparklesIcon } from '../Icons';

interface ThinkingIndicatorProps {
    status: string;
}

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ status }) => {
    return (
        <div className="flex items-center gap-4 animate-fade-in-up my-6 pl-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-light-primary to-purple-600 dark:from-dark-primary dark:to-purple-500 flex items-center justify-center text-white flex-shrink-0 shadow-md ring-2 ring-white dark:ring-dark-background z-10">
                <SparklesIcon className="w-5 h-5 animate-pulse" />
            </div>
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-light-primary to-purple-600 dark:from-dark-primary dark:to-purple-600 rounded-full opacity-30 blur group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                <div className="relative flex items-center gap-3 px-5 py-2.5 rounded-full bg-light-background dark:bg-zinc-900 border border-light-border dark:border-dark-border shadow-sm">
                    <div className="flex space-x-1" role="status" aria-label="Loading">
                        <div className="w-1.5 h-1.5 bg-light-primary dark:bg-dark-primary rounded-full animate-[bounce_1s_infinite_-0.3s]"></div>
                        <div className="w-1.5 h-1.5 bg-light-primary dark:bg-dark-primary rounded-full animate-[bounce_1s_infinite_-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-light-primary dark:bg-dark-primary rounded-full animate-[bounce_1s_infinite]"></div>
                    </div>
                    <span className="text-xs font-semibold bg-gradient-to-r from-light-text to-light-primary dark:from-dark-text dark:to-dark-primary bg-clip-text text-transparent">
                        {status}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ThinkingIndicator;
