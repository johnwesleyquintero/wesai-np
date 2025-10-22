import React from 'react';
import { Note } from '../types';
import Highlight from './Highlight';

interface NoteCardProps {
    note: Note;
    isActive: boolean;
    isSelected: boolean;
    onClick: (e: React.MouseEvent) => void;
    searchTerm?: string;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, isActive, isSelected, onClick, searchTerm = '' }) => {
    return (
        <div
            onClick={onClick}
            className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                isActive
                    ? 'bg-light-primary/20 dark:bg-dark-primary/20 border-light-primary/50 dark:border-dark-primary/50'
                    : isSelected 
                    ? 'bg-light-primary/10 dark:bg-dark-primary/10 border-transparent'
                    : 'border-transparent hover:bg-light-background dark:hover:bg-dark-background'
            }`}
        >
            <h3 className="font-semibold truncate text-sm">
                <Highlight text={note.title} highlight={searchTerm} />
            </h3>
            <p className="text-xs text-light-text/60 dark:text-dark-text/60 truncate mt-1">
                 <Highlight text={note.content} highlight={searchTerm} />
            </p>
        </div>
    );
};

export default NoteCard;