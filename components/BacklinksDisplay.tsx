import React from 'react';
import { Note } from '../types';
import { LinkIcon } from './Icons';
import { useAppContext } from '../context/AppContext';

interface BacklinksDisplayProps {
    backlinks: { sourceNoteId: string; sourceNoteTitle: string }[];
}

const BacklinksDisplay: React.FC<BacklinksDisplayProps> = ({ backlinks }) => {
    const { onSelectNote } = useAppContext();

    if (backlinks.length === 0) {
        return null;
    }

    return (
        <div className="mt-8 pt-4 border-t border-light-border dark:border-dark-border">
            <h3 className="text-sm font-semibold text-light-text/80 dark:text-dark-text/80 mb-3 flex items-center">
                <LinkIcon className="w-4 h-4 mr-2" />
                Linked Mentions ({backlinks.length})
            </h3>
            <div className="space-y-2">
                {backlinks.map(({ sourceNoteId, sourceNoteTitle }) => (
                    <button
                        key={sourceNoteId}
                        onClick={() => onSelectNote(sourceNoteId)}
                        className="w-full text-left p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors"
                    >
                        <p className="font-medium text-sm truncate">{sourceNoteTitle}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default BacklinksDisplay;
