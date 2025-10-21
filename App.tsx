import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import NoteEditor from './components/NoteEditor';
import { useStore } from './hooks/useStore';
import { Note, FilterType, NoteVersion, Template, SearchMode, ChatMessage, EditorActions, Collection, SmartCollection } from './types';
import SettingsModal from './components/SettingsModal';
import ConfirmationModal from './components/ConfirmationModal';
import { useTemplates } from './hooks/useTemplates';
import { useMobileView } from './hooks/useMobileView';
import { Bars3Icon } from './components/Icons';
import { useDebounce } from './hooks/useDebounce';
import { askAboutNotes, semanticSearchNotes } from './services/geminiService';
import ChatView from './components/ChatView';
import { AppContext } from './context/AppContext';
import CommandPalette from './components/CommandPalette';
import ContextMenu, { ContextMenuItem } from './components/ContextMenu';
import SmartFolderModal from './components/SmartFolderModal';
import { ToastProvider, useToast } from './context/ToastContext';

const WelcomeScreen: React.FC<{ onToggleSidebar?: () => void; isMobileView?: boolean }> = ({ onToggleSidebar, isMobileView }) => (
    <div className="flex flex-col h-full">
        {isMobileView && (
            <header className="flex items-center p-4 border-b border-light-border dark:border-dark-border flex-shrink-0">
                <button onClick={onToggleSidebar} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">
                    <Bars3Icon />
                </button>
            </header>
        )}
        <div className="flex flex-col items-center justify-center h-full text-center text-light-text/60 dark:text-dark-text/60 p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002 2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <h2 className="text-2xl font-bold">WesAI Notepad</h2>
            <p>Select a note to start editing, or create a new one.</p>
        </div>
    </div>
);

function AppContent() {
    const { 
        notes, addNote, updateNote, deleteNote, getNoteById, toggleFavorite, restoreNoteVersion, renameNoteTitle, copyNote,
        collections, addCollection, updateCollection, deleteCollection, moveItem,
        smartCollections, addSmartCollection, updateSmartCollection, deleteSmartCollection
    } = useStore();

    const { templates } = useTemplates();
    const { showToast } = useToast();
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>('RECENT');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchMode, setSearchMode] = useState<SearchMode>('KEYWORD');
    const [isAiSearching, setIsAiSearching] = useState(false);
    const [aiSearchError, setAiSearchError] = useState<string | null>(null);
    const [aiSearchResultIds, setAiSearchResultIds] = useState<string[] | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
    const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
    const [smartCollectionToDelete, setSmartCollectionToDelete] = useState<SmartCollection | null>(null);
    const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
    
    const [isSmartFolderModalOpen, setIsSmartFolderModalOpen] = useState(false);
    const [smartFolderToEdit, setSmartFolderToEdit] = useState<SmartCollection | null>(null);

    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    });

    const [view, setView] = useState<'NOTES' | 'CHAT'>('NOTES');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isAiReplying, setIsAiReplying] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);
    
    const [isAiRateLimited, setIsAiRateLimited] = useState(false);
    const rateLimitTimerRef = useRef<number | null>(null);

    const isMobileView = useMobileView();
    const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobileView);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const [editorActions, setEditorActions] = useState<EditorActions | null>(null);
    const registerEditorActions = (actions: EditorActions) => setEditorActions(actions);
    const unregisterEditorActions = () => setEditorActions(null);

    useEffect(() => {
        setIsSidebarOpen(!isMobileView);
    }, [isMobileView]);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    useEffect(() => {
        const handleRateLimit = () => {
            setIsAiRateLimited(true);
            if (rateLimitTimerRef.current) {
                clearTimeout(rateLimitTimerRef.current);
            }
            rateLimitTimerRef.current = window.setTimeout(() => {
                setIsAiRateLimited(false);
            }, 60000); // Cooldown for 60 seconds
        };

        window.addEventListener('ai-rate-limit', handleRateLimit);

        return () => {
            window.removeEventListener('ai-rate-limit', handleRateLimit);
            if (rateLimitTimerRef.current) {
                clearTimeout(rateLimitTimerRef.current);
            }
        };
    }, []);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const handleAddNote = (parentId: string | null = null) => {
        const newNoteId = addNote(parentId);
        setActiveNoteId(newNoteId);
        setView('NOTES');
         if (isMobileView) {
            setIsSidebarOpen(false);
        }
    };

    const handleCopyNote = useCallback((noteId: string) => {
        const newId = copyNote(noteId);
        if (newId) {
            const copiedNote = getNoteById(newId);
            showToast({ message: `Copied "${copiedNote?.title}"`, type: 'success' });
        }
    }, [copyNote, getNoteById, showToast]);

    const handleAddCollection = (name: string, parentId: string | null = null) => {
        const newCollectionId = addCollection(name, parentId);
        setRenamingItemId(newCollectionId);
    };

    const handleSelectNote = (id: string) => {
        setActiveNoteId(id);
        setView('NOTES');
        if (isMobileView) {
            setIsSidebarOpen(false);
        }
    };

    const handleDeleteNoteRequest = (note: Note) => {
        setNoteToDelete(note);
    };

    const handleDeleteNoteConfirm = () => {
        if (noteToDelete) {
            if (activeNoteId === noteToDelete.id) {
                setActiveNoteId(null);
            }
            deleteNote(noteToDelete.id);
            setNoteToDelete(null);
        }
    };
    
    const handleDeleteCollectionRequest = (collection: Collection) => {
        setCollectionToDelete(collection);
    };
    
    const handleDeleteCollectionConfirm = () => {
        if (collectionToDelete) {
            // Check if the active note is inside the folder being deleted
            const isNoteInDeletedHierarchy = notes.some(n => n.id === activeNoteId && n.parentId === collectionToDelete.id); // This is not recursive, but good enough for now
            if (isNoteInDeletedHierarchy) {
                setActiveNoteId(null);
            }
            deleteCollection(collectionToDelete.id);
            setCollectionToDelete(null);
        }
    };
    
    const handleDeleteSmartCollectionRequest = (collection: SmartCollection) => {
        setSmartCollectionToDelete(collection);
    };

    const handleDeleteSmartCollectionConfirm = () => {
        if (smartCollectionToDelete) {
            deleteSmartCollection(smartCollectionToDelete.id);
            setSmartCollectionToDelete(null);
        }
    };

    const handleSaveSmartCollection = (data: Omit<SmartCollection, 'id'>) => {
        if (smartFolderToEdit) {
            updateSmartCollection(smartFolderToEdit.id, data);
        } else {
            addSmartCollection(data.name, data.query);
        }
    };
    
    const openSmartFolderModal = (folder: SmartCollection | null) => {
        setSmartFolderToEdit(folder);
        setIsSmartFolderModalOpen(true);
    };

    const activeNote = useMemo(() => {
      if (!activeNoteId) return null;
      return getNoteById(activeNoteId) || null;
    }, [activeNoteId, getNoteById]);

    useEffect(() => {
      if (activeNoteId && !notes.some(n => n.id === activeNoteId)) {
        setActiveNoteId(null);
      }
    }, [notes, activeNoteId]);

    const handleRestoreVersion = (noteId: string, version: NoteVersion) => {
        restoreNoteVersion(noteId, version);
    };
    
    const handleOpenContextMenu = (e: React.MouseEvent, items: ContextMenuItem[]) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, items });
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modKey = isMac ? event.metaKey : event.ctrlKey;

            if (modKey) {
                switch (event.key.toLowerCase()) {
                    case 'n':
                        event.preventDefault();
                        handleAddNote();
                        break;
                    case 'b':
                        event.preventDefault();
                        setIsSidebarOpen(prev => !prev);
                        break;
                    case 's':
                        event.preventDefault();
                        break;
                    case 'k':
                        event.preventDefault();
                        setIsCommandPaletteOpen(prev => !prev);
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleAddNote]);

    useEffect(() => {
        if (searchMode === 'AI' && debouncedSearchTerm.trim()) {
            const performAiSearch = async () => {
                setIsAiSearching(true);
                setAiSearchError(null);
                setAiSearchResultIds(null);

                try {
                    const resultIds = await semanticSearchNotes(debouncedSearchTerm, notes);
                    setAiSearchResultIds(resultIds);
                } catch (error) {
                    if (error instanceof Error) {
                        setAiSearchError(error.message);
                    } else {
                        setAiSearchError("An unknown error occurred during AI search.");
                    }
                } finally {
                    setIsAiSearching(false);
                }
            };
            performAiSearch();
        } else {
            setAiSearchResultIds(null);
            setAiSearchError(null);
            setIsAiSearching(false);
        }
    }, [debouncedSearchTerm, searchMode, notes]);

    const filteredNotes = useMemo(() => {
        let sortedNotes = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        if (filter === 'FAVORITES') {
            sortedNotes = sortedNotes.filter(note => note.isFavorite);
        }

        if (searchTerm.trim()) {
            if (searchMode === 'AI' && aiSearchResultIds) {
                const noteMap = new Map(sortedNotes.map(note => [note.id, note]));
                return aiSearchResultIds
                    .map(id => noteMap.get(id))
                    .filter((note): note is Note => !!note);
            } else if (searchMode === 'KEYWORD') {
                const lowercasedSearchTerm = searchTerm.toLowerCase();
                return sortedNotes.filter(note =>
                    note.title.toLowerCase().includes(lowercasedSearchTerm) ||
                    note.content.toLowerCase().includes(lowercasedSearchTerm) ||
                    note.tags.some(tag => tag.toLowerCase().includes(lowercasedSearchTerm))
                );
            } else if (searchMode === 'AI') {
                return [];
            }
        }
        return sortedNotes;
    }, [notes, filter, searchTerm, searchMode, aiSearchResultIds]);


    const handleSendChatMessage = async (query: string) => {
        setChatError(null);
        const newUserMessage: ChatMessage = { role: 'user', content: query };
        setChatMessages(prev => [...prev, newUserMessage]);
        setIsAiReplying(true);

        try {
            const { answer, sourceNoteIds } = await askAboutNotes(query, notes);
            const sourceNotes = sourceNoteIds.map(id => getNoteById(id)).filter((n): n is Note => !!n);
            const newAiMessage: ChatMessage = { role: 'ai', content: answer, sources: sourceNotes };
            setChatMessages(prev => [...prev, newAiMessage]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setChatError(errorMessage);
            const errorAiMessage: ChatMessage = { role: 'ai', content: `Sorry, I ran into an error: ${errorMessage}` };
            setChatMessages(prev => [...prev, errorAiMessage]);
        } finally {
            setIsAiReplying(false);
        }
    };

    const handleSelectNoteFromChat = (noteId: string) => {
        setActiveNoteId(noteId);
        setView('NOTES');
        if (isMobileView) {
            setIsSidebarOpen(false);
        }
    };

    const renderMainView = () => {
        if (view === 'CHAT') {
            return (
                <ChatView
                    messages={chatMessages}
                    onSendMessage={handleSendChatMessage}
                    isReplying={isAiReplying}
                    onSelectNote={handleSelectNoteFromChat}
                    onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                    isMobileView={isMobileView}
                    isAiRateLimited={isAiRateLimited}
                />
            );
        }

        if (activeNote) {
            return (
                <NoteEditor
                    key={activeNote.id}
                    note={activeNote}
                    onUpdate={updateNote}
                    onDelete={handleDeleteNoteRequest}
                    onToggleFavorite={toggleFavorite}
                    onRestoreVersion={handleRestoreVersion}
                    templates={templates}
                    isMobileView={isMobileView}
                    onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                    isAiRateLimited={isAiRateLimited}
                />
            );
        }

        return <WelcomeScreen isMobileView={isMobileView} onToggleSidebar={() => setIsSidebarOpen(true)} />;
    };

    const appContextValue = {
        notes,
        activeNote,
        templates,
        theme,
        view,
        isMobileView,
        isSidebarOpen,
        isAiRateLimited,
        onAddNote: () => handleAddNote(),
        onCopyNote: handleCopyNote,
        onSelectNote: handleSelectNote,
        onDeleteNote: handleDeleteNoteRequest,
        onToggleFavorite: toggleFavorite,
        toggleTheme,
        onSetView: setView,
        setIsSidebarOpen,
        openSettings: () => setIsSettingsOpen(true),
        getNoteById,
        editorActions,
        registerEditorActions,
        unregisterEditorActions,
    };

    return (
        <AppContext.Provider value={appContextValue}>
            <div className="flex h-screen w-screen font-sans text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background overflow-hidden">
                <Sidebar
                    notes={notes}
                    collections={collections}
                    smartCollections={smartCollections}
                    filteredNotes={filteredNotes}
                    activeNoteId={activeNoteId}
                    onSelectNote={handleSelectNote}
                    onAddNote={handleAddNote}
                    onAddCollection={handleAddCollection}
                    onDeleteCollection={handleDeleteCollectionRequest}
                    onUpdateCollection={updateCollection}
                    onRenameNote={renameNoteTitle}
                    onMoveItem={moveItem}
                    onOpenContextMenu={handleOpenContextMenu}
                    filter={filter}
                    setFilter={setFilter}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    searchMode={searchMode}
                    setSearchMode={setSearchMode}
                    isAiSearching={isAiSearching}
                    aiSearchError={aiSearchError}
                    onSettingsClick={() => setIsSettingsOpen(true)}
                    theme={theme}
                    toggleTheme={toggleTheme}
                    isMobileView={isMobileView}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    view={view}
                    onSetView={setView}
                    renamingItemId={renamingItemId}
                    setRenamingItemId={setRenamingItemId}
                    isAiRateLimited={isAiRateLimited}
                    onOpenSmartFolderModal={openSmartFolderModal}
                    onDeleteSmartCollection={handleDeleteSmartCollectionRequest}
                />
                <main className="flex-1 flex flex-col h-full">
                    {renderMainView()}
                </main>
                
                {contextMenu && <ContextMenu {...contextMenu} onClose={() => setContextMenu(null)} />}

                <CommandPalette 
                    isOpen={isCommandPaletteOpen} 
                    onClose={() => setIsCommandPaletteOpen(false)} 
                />

                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                />
                
                <SmartFolderModal
                    isOpen={isSmartFolderModalOpen}
                    onClose={() => setIsSmartFolderModalOpen(false)}
                    onSave={handleSaveSmartCollection}
                    folderToEdit={smartFolderToEdit}
                />

                <ConfirmationModal
                    isOpen={!!noteToDelete}
                    onClose={() => setNoteToDelete(null)}
                    onConfirm={handleDeleteNoteConfirm}
                    title="Delete Note"
                    message={`Are you sure you want to delete "${noteToDelete?.title}"? This action cannot be undone.`}
                />

                <ConfirmationModal
                    isOpen={!!collectionToDelete}
                    onClose={() => setCollectionToDelete(null)}
                    onConfirm={handleDeleteCollectionConfirm}
                    title="Delete Folder"
                    message={`Are you sure you want to delete the folder "${collectionToDelete?.name}"? All notes and folders inside it will also be permanently deleted. This action cannot be undone.`}
                />
                
                 <ConfirmationModal
                    isOpen={!!smartCollectionToDelete}
                    onClose={() => setSmartCollectionToDelete(null)}
                    onConfirm={handleDeleteSmartCollectionConfirm}
                    title="Delete Smart Folder"
                    message={`Are you sure you want to delete the smart folder "${smartCollectionToDelete?.name}"? This will not delete any notes.`}
                />
            </div>
        </AppContext.Provider>
    );
}


export default function App() {
    return (
        <ToastProvider>
            <AppContent />
        </ToastProvider>
    );
}
