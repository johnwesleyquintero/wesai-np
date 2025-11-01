import React from 'react';
import { Note } from '../types';
import { StarIcon } from './Icons';
import Highlight from './Highlight';
import { formatDate } from '../lib/dateUtils';
import { generatePreviewFromMarkdown } from '../lib/markdownUtils';

interface NoteCardProps {
    id: string;
    title: string;
    content: string;
    updatedAt: string;
    isFavorite: boolean;
    isActive: boolean;
    onClick: () => void;
    searchTerm: string;
    onContextMenu?: (event: React.MouseEvent) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ 
    id, title, content, updatedAt, isFavorite, 
    isActive, onClick, searchTerm, onContextMenu 
}) => {
    const preview = generatePreviewFromMarkdown(content);

    return (
        <div
            onClick={onClick}
            onContextMenu={onContextMenu}
            className={`group p-3 mb-2 rounded-lg cursor-pointer transition-all active:scale-95 transform hover:-translate-y-0.5 hover:shadow-md ${
                isActive
                    ? 'bg-light-primary/30 dark:bg-dark-primary/30'
                    : 'hover:bg-light-background dark:hover:bg-dark-background'
            }`}
        >
            <h3 className={`font-semibold truncate flex justify-between items-center transition-colors ${
                    !isActive && 'group-hover:text-light-primary dark:group-hover:text-dark-primary'
                }`}
            >
                <Highlight text={title} highlight={searchTerm} />
                {isFavorite && <StarIcon className="w-4 h-4 text-yellow-500" filled />}
            </h3>
            <p className={`text-sm note-card-preview ${isActive ? 'text-light-text/90 dark:text-dark-text/90' : 'text-light-text/70 dark:text-dark-text/70'}`}>
                 <Highlight text={preview || 'No content'} highlight={searchTerm} />
            </p>
            <p className="text-xs font-semibold text-light-text/50 dark:text-dark-text/50 mt-1">{formatDate(updatedAt)}</p>
        </div>
    );
};

export default React.memo(NoteCard);