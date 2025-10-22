import React, { useState, useMemo } from 'react';
import { useStoreContext, useUIContext } from '../context/AppContext';
import { Note, Collection, SmartCollection } from '../types';
import NoteCard from './NoteCard';
import SidebarNode from './SidebarNode';
import { PlusIcon, SparklesIcon, Cog6ToothIcon, MagnifyingGlassIcon, ChevronDownIcon, FolderPlusIcon, BrainIcon } from './Icons';
import BulkActionToolbar from './BulkActionToolbar';
import { useDragAndDrop } from '../hooks/useDragAndDrop';

const Sidebar: React.FC = () => {
    const {
        notes, collections, smartCollections,
        onAddNote, onAddCollection, onAddSmartCollection,
        onMoveItem, setActiveNoteId, activeNote,
        bulkSelect, selectedNoteIds, clearBulkSelect
    } = useStoreContext();
    const {
        openSettings, toggleTheme, setView, view, isMobileView, isSidebarOpen, onToggleSidebar, sidebarWidth, startSidebarResize
    } = useUIContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isFavoritesOpen, setIsFavoritesOpen] = useState(true);
    const [isNotesOpen, setIsNotesOpen] = useState(true);

    const rootDropRef = React.useRef<HTMLDivElement>(null);

    const { dragAndDropProps, isFileOver } = useDragAndDrop(rootDropRef, {
        id: null,
        type: 'root',
        onMoveItem: (draggedId, _targetId, _position) => onMoveItem(draggedId, null, 'inside'),
    });

    const filteredNotes = useMemo(() => {
        if (!searchTerm) return [];
        const lowercasedTerm = searchTerm.toLowerCase();
        return notes.filter(note =>
            note.title.toLowerCase().includes(lowercasedTerm) ||
            note.content.toLowerCase().includes(lowercasedTerm) ||
            note.tags.some(tag => tag.toLowerCase().includes(lowercasedTerm))
        );
    }, [searchTerm, notes]);

    const favoriteNotes = useMemo(() => notes.filter(n => n.isFavorite && n.parentId === null), [notes]);
    const pinnedNotes = useMemo(() => notes.filter(n => n.isPinned), [notes]);

    const buildTree = (
        collections: Collection[],
        notes: Note[],
        parentId: string | null
    ): (Collection | Note)[] => {
        const children = [
            ...collections.filter(c => c.parentId === parentId),
            ...notes.filter(n => n.parentId === parentId && !n.isFavorite && !n.isPinned)
        ];
        return children.sort((a, b) => (a as any).name?.localeCompare((b as any).name) || (a as Note).title.localeCompare((b as Note).title));
    };

    const rootNodes = useMemo(() => buildTree(collections, notes, null), [collections, notes]);

    const handleNoteClick = (e: React.MouseEvent, noteId: string) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modKey = isMac ? e.metaKey : e.ctrlKey;
        
        if (modKey) {
            bulkSelect(noteId, 'ctrl');
        } else if (e.shiftKey) {
            bulkSelect(noteId, 'shift');
        } else {
            bulkSelect(noteId, 'single');
            setActiveNoteId(noteId);
            if (view !== 'NOTES') setView('NOTES');
            if (isMobileView) onToggleSidebar();
        }
    };
    
    const handleSelectNode = (noteId: string) => {
        setActiveNoteId(noteId);
        if (view !== 'NOTES') setView('NOTES');
        if (isMobileView) onToggleSidebar();
    };

    return (
        <div 
            className={`fixed top-0 left-0 h-full flex flex-col bg-light-ui dark:bg-dark-ui border-r border-light-border dark:border-dark-border z-40 transform transition-transform md:transform-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            style={{ width: `${sidebarWidth}px` }}
        >
            <header className="p-4 flex-shrink-0 flex justify-between items-center">
                <div className="flex items-center">
                     <svg width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                      <rect width="64" height="64" rx="12" className="fill-light-primary dark:fill-dark-primary"/>
                      <path d="M20 18C20 15.7909 21.7909 14 24 14H44C46.2091 14 48 15.7909 48 18V46C48 48.2091 46.2091 50 44 50H24C21.7909 50 20 48.2091 20 46V18Z" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M24 14V50" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <h1 className="text-xl font-bold">WesAI</h1>
                </div>
                 <div className="flex items-center space-x-2">
                    <button onClick={() => { setView('CHAT'); if (isMobileView) onToggleSidebar(); }} className={`p-2 rounded-md ${view === 'CHAT' ? 'bg-light-primary/20 dark:bg-dark-primary/20' : 'hover:bg-light-background dark:hover:bg-dark-background'}`}><SparklesIcon className="text-light-primary dark:text-dark-primary" /></button>
                    <button onClick={() => onAddNote()} className="p-2 rounded-md hover:bg-light-background dark:hover:bg-dark-background"><PlusIcon /></button>
                </div>
            </header>

            <div className="px-4 pb-2 flex-shrink-0">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-text/50 dark:text-dark-text/50" />
                    <input
                        type="text"
                        placeholder="Search notes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-light-background dark:bg-dark-background pl-9 pr-4 py-2 text-sm rounded-lg border border-light-border dark:border-dark-border focus:ring-1 focus:ring-light-primary focus:outline-none"
                    />
                </div>
            </div>
            
            <div ref={rootDropRef} {...dragAndDropProps} className={`flex-1 overflow-y-auto px-2 ${isFileOver ? 'bg-light-primary/20 dark:bg-dark-primary/20' : ''}`}>
                {searchTerm ? (
                    <div className="p-2">
                        <h2 className="text-sm font-semibold mb-2 px-2">Search Results</h2>
                        {filteredNotes.length > 0 ? (
                            filteredNotes.map(note => (
                                <NoteCard
                                    key={note.id}
                                    note={note}
                                    isActive={activeNote?.id === note.id}
                                    isSelected={selectedNoteIds.includes(note.id)}
                                    onClick={(e) => handleNoteClick(e, note.id)}
                                    searchTerm={searchTerm}
                                />
                            ))
                        ) : (
                            <p className="text-center text-sm text-light-text/60 dark:text-dark-text/60 py-4">No notes found.</p>
                        )}
                    </div>
                ) : (
                    <>
                         {pinnedNotes.length > 0 && (
                            <div className="p-2">
                                <h2 className="text-xs font-bold uppercase text-light-text/60 dark:text-dark-text/60 px-2 pb-1">Pinned</h2>
                                {pinnedNotes.map(note => (
                                    <SidebarNode key={note.id} item={note} type="note" onSelect={handleSelectNode} />
                                ))}
                            </div>
                        )}

                        <div className="p-2">
                             <button onClick={() => setIsFavoritesOpen(!isFavoritesOpen)} className="w-full flex justify-between items-center px-2 py-1 rounded hover:bg-light-background dark:hover:bg-dark-background">
                                <h2 className="text-xs font-bold uppercase text-light-text/60 dark:text-dark-text/60">Favorites</h2>
                                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isFavoritesOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isFavoritesOpen && favoriteNotes.map(note => (
                                <SidebarNode key={note.id} item={note} type="note" onSelect={handleSelectNode} />
                            ))}
                        </div>

                        <div className="p-2">
                            <button onClick={() => setIsNotesOpen(!isNotesOpen)} className="w-full flex justify-between items-center px-2 py-1 rounded hover:bg-light-background dark:hover:bg-dark-background">
                                <h2 className="text-xs font-bold uppercase text-light-text/60 dark:text-dark-text/60">Notes</h2>
                                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isNotesOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isNotesOpen && (
                                <>
                                    {smartCollections.map(sc => <SidebarNode key={sc.id} item={sc} type="smart-collection" onSelect={() => {}} />)}
                                    {rootNodes.map(item => (
                                        <SidebarNode key={item.id} item={item} type={(item as any).query ? 'smart-collection' : (item as any).content !== undefined ? 'note' : 'collection'} onSelect={handleSelectNode} />
                                    ))}
                                </>
                            )}
                        </div>
                        <div className="p-4 space-y-2">
                            <button onClick={() => onAddCollection(null)} className="w-full text-left text-sm flex items-center p-2 rounded hover:bg-light-background dark:hover:bg-dark-background text-light-text/80 dark:text-dark-text/80">
                                <FolderPlusIcon className="mr-2" /> New Folder
                            </button>
                             <button onClick={() => onAddSmartCollection()} className="w-full text-left text-sm flex items-center p-2 rounded hover:bg-light-background dark:hover:bg-dark-background text-light-text/80 dark:text-dark-text/80">
                                <BrainIcon className="mr-2" /> New Smart Folder
                            </button>
                        </div>
                    </>
                )}
            </div>

            {selectedNoteIds.length > 0 && <BulkActionToolbar />}

            <footer className="p-2 flex-shrink-0 border-t border-light-border dark:border-dark-border">
                 <button onClick={openSettings} className="w-full flex items-center space-x-2 p-2 text-sm rounded-md hover:bg-light-background dark:hover:bg-dark-background">
                    <Cog6ToothIcon />
                    <span>Settings</span>
                </button>
            </footer>
        </div>
    );
};

export default Sidebar;