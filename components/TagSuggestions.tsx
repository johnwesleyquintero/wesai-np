import React from 'react';
import { PlusIcon, SparklesIcon } from './Icons';

interface TagSuggestionsProps {
    suggestions: string[];
    onAddTag: (tag: string) => void;
    isLoading: boolean;
    error: string | null;
}

const TagSuggestions: React.FC<TagSuggestionsProps> = ({ suggestions, onAddTag, isLoading, error }) => {
    if (!isLoading && !error && suggestions.length === 0) {
        return null;
    }

    return (
        <div className="mt-3 pt-3 border-t border-light-border/50 dark:border-dark-border/50">
            <h4 className="text-xs font-semibold text-light-text/60 dark:text-dark-text/60 mb-2 flex items-center">
                <SparklesIcon className="w-4 h-4 mr-1 text-light-primary dark:text-dark-primary" />
                AI Tag Suggestions
            </h4>
            {isLoading && (
                 <div className="text-sm text-light-text/70 dark:text-dark-text/70 animate-pulse">
                    Analyzing note...
                 </div>
            )}
            {error && (
                <div className="text-sm text-red-500">
                    <span className="font-semibold">Error:</span> {error}
                </div>
            )}
            {!isLoading && !error && suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {suggestions.map(tag => (
                        <button
                            key={tag}
                            onClick={() => onAddTag(tag)}
                            className="flex items-center bg-light-primary/10 dark:bg-dark-primary/10 text-light-primary dark:text-dark-primary rounded-full px-3 py-1 text-sm hover:bg-light-primary/20 dark:hover:bg-dark-primary/20 transition-colors"
                        >
                            <PlusIcon className="w-4 h-4 mr-1" />
                            {tag}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TagSuggestions;