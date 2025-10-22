import React, { useState } from 'react';
import { useStoreContext } from '../context/AppContext';
import { Collection } from '../types';
import { FolderArrowDownIcon, TagIcon, TrashIcon, XMarkIcon } from './Icons';

interface CollectionOptionProps {
    collection: Collection;
    level: number;
    onSelect: (id: string | null) => void;
}

const CollectionOption: React.FC<CollectionOptionProps> = ({ collection, level, onSelect }) => (
    <option value={collection.id} style={{ paddingLeft: `${level * 1.5}rem` }}>
        {'--'.repeat(level)} {collection.name}
    </option>
);

const renderCollectionOptions = (collections: Collection[], parentId: string | null, level: number): React.ReactNode[] => {
    return collections
        .filter(c => c.parentId === parentId)
        .flatMap(c => [
            <CollectionOption key={c.id} collection={c} level={level} onSelect={() => {}} />,
            ...renderCollectionOptions(collections, c.id, level + 1)
        ]);
};


const BulkActionToolbar: React.FC = () => {
    const { selectedNoteIds, clearBulkSelect, collections, moveNotes, addTagsToNotes, setNotesToDelete, notes } = useStoreContext();
    const [showMove, setShowMove] = useState(false);
    const [showTag, setShowTag] = useState(false);
    const [tagsInput, setTagsInput] = useState('');

    const handleMove = (collectionId: string | null) => {
        moveNotes(selectedNoteIds, collectionId);
        setShowMove(false);
    };

    const handleTag = () => {
        if (!tagsInput.trim()) return;
        const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
        addTagsToNotes(selectedNoteIds, tags);
        setTagsInput('');
        setShowTag(false);
    };

    const handleDelete = () => {
        const notesForDeletion = notes.filter(n => selectedNoteIds.includes(n.id));
        setNotesToDelete(notesForDeletion);
    };

    const count = selectedNoteIds.length;
    if (count === 0) return null;

    return (
        <div className="flex-shrink-0 border-t border-light-border dark:border-dark-border p-2 space-y-2 bg-light-background dark:bg-dark-background">
            <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">{count} item(s) selected</span>
                <button onClick={clearBulkSelect} className="p-1 rounded-full hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover">
                    <XMarkIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flex justify-around items-center">
                <button onClick={() => { setShowMove(true); setShowTag(false); }} className="flex flex-col items-center text-xs p-1 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui w-16">
                    <FolderArrowDownIcon className="w-5 h-5 mb-1" />
                    Move
                </button>
                 <button onClick={() => { setShowTag(true); setShowMove(false); }} className="flex flex-col items-center text-xs p-1 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui w-16">
                    <TagIcon className="w-5 h-5 mb-1" />
                    Tag
                </button>
                 <button onClick={handleDelete} className="flex flex-col items-center text-xs p-1 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui w-16 text-red-500">
                    <TrashIcon className="w-5 h-5 mb-1" />
                    Delete
                </button>
            </div>
            {showMove && (
                <div className="pt-2">
                    <select
                        onChange={(e) => handleMove(e.target.value === 'root' ? null : e.target.value)}
                        className="w-full p-2 text-sm bg-light-ui dark:bg-dark-ui rounded-md border border-light-border dark:border-dark-border focus:ring-1 focus:ring-light-primary"
                    >
                        <option value="">Move to...</option>
                        <option value="root">-- Root --</option>
                        {renderCollectionOptions(collections, null, 0)}
                    </select>
                </div>
            )}
            {showTag && (
                 <div className="pt-2 space-y-2">
                    <input
                        type="text"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="tag1, tag2, ..."
                        className="w-full p-2 text-sm bg-light-ui dark:bg-dark-ui rounded-md border border-light-border dark:border-dark-border focus:ring-1 focus:ring-light-primary"
                    />
                    <button onClick={handleTag} className="w-full px-4 py-2 text-sm bg-light-primary text-white rounded-md hover:bg-light-primary-hover">
                        Add Tags
                    </button>
                </div>
            )}
        </div>
    );
};

export default BulkActionToolbar;
