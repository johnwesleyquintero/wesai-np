
import React from 'react';
import { SparklesIcon } from '../Icons';

interface ThinkingIndicatorProps {
    status: string;
}

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ status }) => {
    return (
        <div className="flex items-center gap-3 animate-fade-in-up my-4 pl-2">
            <div className="relative">
                <div className="absolute inset-0 bg-light-primary dark:bg-dark-primary opacity-20 rounded-full animate-ping"></div>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-light-primary to-cyan-600 dark:from-dark-primary dark:to-cyan-400 flex items-center justify-center text-white shadow-sm relative z-10">
                    <SparklesIcon className="w-4 h-4 animate-pulse" />
                </div>
            </div>
            
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-light-ui/50 dark:bg-dark-ui/50 border border-light-border/50 dark:border-dark-border/50 backdrop-blur-sm">
                <span className="text-xs font-semibold bg-gradient-to-r from-light-text to-light-primary dark:from-dark-text dark:to-dark-primary bg-clip-text text-transparent animate-pulse">
                    {status}
                </span>
                <div className="flex space-x-1 opacity-70">
                    <div className="w-1 h-1 bg-current rounded-full animate-[bounce_1.4s_infinite_-0.3s]"></div>
                    <div className="w-1 h-1 bg-current rounded-full animate-[bounce_1.4s_infinite_-0.15s]"></div>
                    <div className="w-1 h-1 bg-current rounded-full animate-[bounce_1.4s_infinite]"></div>
                </div>
            </div>
        </div>
    );
};

export default ThinkingIndicator;
