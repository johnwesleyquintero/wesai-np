import React from 'react';

interface EditorStatusBarProps {
    wordCount: number;
    charCount: number;
    readingTime: number;
    isCheckingSpelling: boolean;
}

const EditorStatusBar: React.FC<EditorStatusBarProps> = ({ wordCount, charCount, readingTime, isCheckingSpelling }) => (
    <div className="flex-shrink-0 px-4 sm:px-8 py-1.5 border-t border-light-border dark:border-dark-border text-xs text-light-text/60 dark:text-dark-text/60 flex items-center justify-end space-x-4">
        {isCheckingSpelling && (
            <div className="flex items-center space-x-1.5 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-blue-500">Checking...</span>
            </div>
        )}
        <span>~{readingTime} min read</span>
        <span>Words: {wordCount}</span>
        <span>Characters: {charCount}</span>
    </div>
);

export default EditorStatusBar;
