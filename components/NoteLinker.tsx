import React, { useState, useEffect, useRef } from 'react';
import { Note } from '../types';
import { DocumentTextIcon } from './Icons';
import { useStoreContext } from '../context/AppContext';

interface NoteLinkerProps {
    query: string;
    onSelect: (noteId: string, noteTitle: string) => void;
    onClose: () => void;
    position: { top: number; left: number };
}

const NoteLinker: React.FC<NoteLinkerProps> = ({ query, onSelect, onClose, position }) => {
    const { notes } = useStoreContext();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const resultsRef = useRef<HTMLDivElement>(null);

    const filteredNotes = query
        ? notes.filter(note => note.title.toLowerCase().includes(query.toLowerCase()))
        : notes;

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredNotes.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredNotes.length) % filteredNotes.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredNotes[selectedIndex]) {
                    const selected = filteredNotes[selectedIndex];
                    onSelect(selected.id, selected.title);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredNotes, selectedIndex, onSelect, onClose]);

    useEffect(() => {
        const activeItem = resultsRef.current?.querySelector('[data-selected="true"]');
        activeItem?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    const menuStyle: React.CSSProperties = {
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 50,
    };
    
    return (
        <div
            style={menuStyle}
            className="bg-light-background dark:bg-dark-background rounded-lg shadow-xl border border-light-border dark:border-dark-border w-80 animate-fade-in-down"
            onMouseDown={(e) => e.preventDefault()}
        >
            <div ref={resultsRef} className="max-h-60 overflow-y-auto p-2">
                {filteredNotes.length > 0 ? (
                    filteredNotes.map((note, index) => (
                        <div
                            key={note.id}
                            data-selected={index === selectedIndex}
                            onClick={() => onSelect(note.id, note.title)}
                            className={`flex items-center p-2 rounded-md cursor-pointer ${
                                index === selectedIndex
                                    ? 'bg-light-primary/20 dark:bg-dark-primary/20'
                                    : 'hover:bg-light-ui dark:hover:bg-dark-ui'
                            }`}
                        >
                            <DocumentTextIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{note.title}</span>
                        </div>
                    ))
                ) : (
                    <p className="text-center p-4 text-sm text-light-text/60 dark:text-dark-text/60">No notes found.</p>
                )}
            </div>
        </div>
    );
};

export default NoteLinker;
