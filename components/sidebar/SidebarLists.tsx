import React from 'react';
import { Note, SmartCollection } from '../../types';
import NoteCard from '../NoteCard';
import { StarIcon, PlusIcon, BrainIcon, PencilSquareIcon, TrashIcon } from '../Icons';
import CollapsibleSection from './CollapsibleSection';

interface FavoritesListProps {
    favoriteNotes: Note[];
    activeNoteId: string | null;
    searchTerm: string;
    onSelectNote: (id: string) => void;
    onContextMenu: (e: React.MouseEvent, note: Note) => void;
}

export const FavoritesList: React.FC<FavoritesListProps> = ({ 
    favoriteNotes, activeNoteId, searchTerm, onSelectNote, onContextMenu 
}) => {
    return (
        <CollapsibleSection title="Favorites" count={favoriteNotes.length}>
             {favoriteNotes.length > 0 ? (
                favoriteNotes.map(note => (
                    <NoteCard
                        key={note.id}
                        id={note.id}
                        title={note.title}
                        content={note.content}
                        updatedAt={note.updatedAt}
                        isFavorite={note.isFavorite}
                        isActive={note.id === activeNoteId}
                        onClick={() => onSelectNote(note.id)}
                        searchTerm={searchTerm}
                        onContextMenu={(e) => onContextMenu(e, note)}
                    />
                ))
            ) : (
                <div className="px-2 py-1 text-xs text-light-text/50 dark:text-dark-text/50 flex items-center gap-2">
                    <StarIcon className="w-4 h-4 opacity-70" />
                    <span>No favorite notes yet.</span>
                </div>
            )}
        </CollapsibleSection>
    );
};

interface SmartFolderListProps {
    smartCollections: SmartCollection[];
    onOpenModal: (sc: SmartCollection | null) => void;
    onActivate: (sc: SmartCollection) => void;
    onDelete: (sc: SmartCollection) => void;
    onContextMenu: (e: React.MouseEvent, items: any[]) => void;
}

export const SmartFolderList: React.FC<SmartFolderListProps> = ({
    smartCollections, onOpenModal, onActivate, onDelete, onContextMenu
}) => {
    return (
         <CollapsibleSection
            title="Smart Folders"
            count={smartCollections.length}
            actions={(
                <button onClick={() => onOpenModal(null)} className="p-1 rounded text-light-text/60 dark:text-dark-text/60 hover:text-light-text dark:hover:text-dark-text hover:bg-light-background dark:hover:bg-dark-background" aria-label="Add new smart folder">
                    <PlusIcon className="w-4 h-4" />
                </button>
            )}
        >
            {smartCollections.length > 0 ? (
                smartCollections.map(sc => (
                    <div key={sc.id} 
                        className={`group flex items-center justify-between w-full text-left rounded-md px-2 py-1.5 my-0.5 text-sm cursor-pointer hover:bg-light-background dark:hover:bg-dark-background`}
                         onClick={() => onActivate(sc)}
                         onContextMenu={(e) => onContextMenu(e, [
                             { label: 'Edit Smart Folder', action: () => onOpenModal(sc), icon: <PencilSquareIcon /> },
                             { 
                                 label: 'Delete Smart Folder', 
                                 action: () => onDelete(sc), 
                                 isDestructive: true, 
                                 icon: <TrashIcon /> 
                            },
                         ])}
                    >
                         <div className="flex items-center truncate">
                            <BrainIcon className="w-4 h-4 mr-2 flex-shrink-0 text-light-primary dark:text-dark-primary" />
                            <span className="truncate">{sc.name}</span>
                        </div>
                    </div>
                ))
            ) : (
                <p className="px-2 py-1 text-xs text-light-text/50 dark:text-dark-text/50">
                    No smart folders. Click the '+' icon to create one.
                </p>
            )}
        </CollapsibleSection>
    );
};