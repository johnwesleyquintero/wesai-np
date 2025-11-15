import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Note } from '../types';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import { MagnifyingGlassIcon, DocumentTextIcon } from './Icons';

interface NoteSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (selectedIds: string[]) => void;
    allNotes: Note[];
    initialSelectedIds: string[];
}

const NoteSelectorModal: React.FC<NoteSelectorModalProps> = ({ isOpen, onClose, onSave, allNotes, initialSelectedIds }) => {
    const [selectedIds, setSelectedIds] = useState(new Set(initialSelectedIds));
    const [searchTerm, setSearchTerm] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useModalAccessibility(isOpen, onClose, modalRef);

    useEffect(() => {
        if (isOpen) {
            setSelectedIds(new Set(initialSelectedIds));
            setSearchTerm('');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, initialSelectedIds]);

    const filteredNotes = useMemo(() => {
        if (!searchTerm) return allNotes;
        const lowercasedTerm = searchTerm.toLowerCase();
        return allNotes.filter(note => note.title.toLowerCase().includes(lowercasedTerm));
    }, [searchTerm, allNotes]);

    const toggleSelection = (noteId: string) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(noteId)) {
            newSelection.delete(noteId);
        } else {
            newSelection.add(noteId);
        }
        setSelectedIds(newSelection);
    };

    const handleSave = () => {
        onSave(Array.from(selectedIds));
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="note-selector-title"
                className="bg-light-background dark:bg-dark-background rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-light-border dark:border-dark-border flex-shrink-0">
                    <h2 id="note-selector-title" className="text-xl font-bold">Select Notes for Context</h2>
                    <div className="relative mt-3">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search notes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-light-ui dark:bg-dark-ui rounded-md border border-light-border dark:border-dark-border focus:ring-1 focus:ring-light-primary focus:outline-none"
                        />
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-text/50 dark:text-dark-text/50" />
                    </div>
                </div>

                <div className="overflow-y-auto p-2 flex-1">
                    {filteredNotes.map(note => (
                        <div key={note.id} onClick={() => toggleSelection(note.id)} className="flex items-center p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedIds.has(note.id)}
                                onChange={() => toggleSelection(note.id)}
                                className="w-4 h-4 rounded text-light-primary dark:text-dark-primary bg-light-ui dark:bg-dark-ui border-light-border dark:border-dark-border focus:ring-light-primary dark:focus:ring-dark-primary mr-3"
                            />
                            <DocumentTextIcon className="w-4 h-4 mr-2 flex-shrink-0 text-light-text/60 dark:text-dark-text/60" />
                            <span className="truncate">{note.title}</span>
                        </div>
                    ))}
                </div>

                <div className="flex justify-between items-center space-x-4 p-4 border-t border-light-border dark:border-dark-border flex-shrink-0">
                    <span className="text-sm text-light-text/60 dark:text-dark-text/60">{selectedIds.size} notes selected</span>
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="px-4 py-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-light-primary text-white rounded-md hover:bg-light-primary-hover dark:bg-dark-primary dark:hover:bg-dark-primary-hover">
                            Set Context
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NoteSelectorModal;