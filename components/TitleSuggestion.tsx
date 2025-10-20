import React from 'react';
import { SparklesIcon } from './Icons';

interface TitleSuggestionProps {
    suggestion: string | null;
    onApply: (title: string) => void;
    isLoading: boolean;
    error: string | null;
}

const TitleSuggestion: React.FC<TitleSuggestionProps> = ({ suggestion, onApply, isLoading, error }) => {
    if (!isLoading && !error && !suggestion) {
        return null;
    }

    const handleClick = () => {
        if (suggestion) {
            onApply(suggestion);
        }
    }

    return (
        <div className="h-8 flex items-center text-sm">
            {isLoading && (
                <div className="text-light-text/70 dark:text-dark-text/70 animate-pulse flex items-center">
                    <SparklesIcon className="w-4 h-4 mr-2 text-light-primary dark:text-dark-primary" />
                    Generating title...
                </div>
            )}
            {error && (
                <div className="text-red-500">
                    <span className="font-semibold">Error:</span> {error}
                </div>
            )}
            {!isLoading && !error && suggestion && (
                <div className="flex items-center gap-2">
                    <span className="text-light-text/70 dark:text-dark-text/70">AI Suggestion:</span>
                     <button
                        onClick={handleClick}
                        className="font-semibold text-light-primary dark:text-dark-primary bg-light-primary/10 dark:bg-dark-primary/10 px-3 py-1 rounded-full hover:bg-light-primary/20 dark:hover:bg-dark-primary/20 transition-colors"
                     >
                        "{suggestion}"
                     </button>
                </div>
            )}
        </div>
    );
};

export default TitleSuggestion;