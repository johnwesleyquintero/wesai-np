import React from 'react';
import { Note } from '../types';

interface NoteInfoPopoverProps {
    note: Note;
    wordCount: number;
    charCount: number;
}

const NoteInfoPopover: React.FC<NoteInfoPopoverProps> = ({ note, wordCount, charCount }) => {

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString(undefined, {
            dateStyle: 'long',
            timeStyle: 'short'
        });
    };
    
    // Simple reading time calculation
    const readingTime = Math.ceil(wordCount / 200);

    return (
        <div className="absolute right-0 mt-2 w-64 bg-light-background dark:bg-dark-background rounded-md shadow-lg border border-light-border dark:border-dark-border z-10 p-4 text-sm">
            <h3 className="font-bold text-base mb-3">Note Information</h3>
            <div className="space-y-2 text-light-text/80 dark:text-dark-text/80">
                <div className="flex justify-between">
                    <span className="font-semibold">Created:</span>
                    <span>{formatDate(note.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-semibold">Last Modified:</span>
                    <span>{formatDate(note.updatedAt)}</span>
                </div>
                <div className="border-t border-light-border dark:border-dark-border my-2"></div>
                <div className="flex justify-between">
                    <span className="font-semibold">Word Count:</span>
                    <span>{wordCount}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-semibold">Character Count:</span>
                    <span>{charCount}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-semibold">Reading Time:</span>
                    <span>~{readingTime} min</span>
                </div>
            </div>
        </div>
    );
};

export default NoteInfoPopover;
