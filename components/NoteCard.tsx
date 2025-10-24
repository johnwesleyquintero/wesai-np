import React from 'react';
import { Note } from '../types';
import { StarIcon } from './Icons';
import Highlight from './Highlight';
import { formatDate } from '../lib/dateUtils';

interface NoteCardProps {
    note: Note;
    isActive: boolean;
    onClick: () => void;
    searchTerm: string;
    onContextMenu?: (event: React.MouseEvent) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, isActive, onClick, searchTerm, onContextMenu }) => {
    const preview = note.content.substring(0, 80) + (note.content.length > 80 ? '...' : '');

    return (
        <div
            onClick={onClick}
            onContextMenu={onContextMenu}
            className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors active:scale-95 transform transition-transform ${
                isActive
                    ? 'bg-light-primary/30 dark:bg-dark-primary/30'
                    : 'hover:bg-light-background dark:hover:bg-dark-background'
            }`}
        >
            <h3 className="font-semibold truncate flex justify-between items-center">
                <Highlight text={note.title} highlight={searchTerm} />
                {note.isFavorite && <StarIcon className="w-4 h-4 text-yellow-500" filled />}
            </h3>
            <p className="text-sm text-light-text/70 dark:text-dark-text/70 truncate">
                 <Highlight text={preview || 'No content'} highlight={searchTerm} />
            </p>
            <p className="text-xs text-light-text/50 dark:text-dark-text/50 mt-1">{formatDate(note.updatedAt)}</p>
        </div>
    );
};

export default React.memo(NoteCard);