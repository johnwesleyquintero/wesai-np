import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import NoteEditor from './components/NoteEditor';
import { useStore } from './hooks/useStore';
import { Note, FilterType, NoteVersion, Template, SearchMode, ChatMessage, EditorActions, Collection, SmartCollection, ContextMenuItem } from './types';
import SettingsModal from './components/SettingsModal';
import ConfirmationModal from './components/ConfirmationModal';
import { useTemplates } from './hooks/useTemplates';
import { useMobileView } from './hooks/useMobileView';
import { Bars3Icon, PencilSquareIcon } from './components/Icons';
import { useDebounce } from './hooks/useDebounce';
import { getStreamingChatResponse, semanticSearchNotes } from './services/geminiService';
import ChatView from './components/ChatView';
import { AppContext } from './context/AppContext';
import CommandPalette from './components/CommandPalette';
import ContextMenu from './components/ContextMenu';
import SmartFolderModal from './components/SmartFolderModal';
import { ToastProvider, useToast } from './context/ToastContext';
import SidebarResizer from './components/SidebarResizer';

const WELCOME_SCREEN_SIDEBAR_WIDTH_KEY = 'wesai-sidebar-width';
const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 500;

const WelcomeScreen: React.FC<{ onToggleSidebar?: () => void; isMobileView?: boolean; onAddNote: () => void; }> = ({ onToggleSidebar, isMobileView, onAddNote }) => (
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
            <p className="mb-6">Select a note to start editing, or create a new one.</p>
            <button onClick={onAddNote} className="flex items-center justify-center bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900 rounded-md py-2 px-6 text-base font-semibold hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover">
                <PencilSquareIcon className="w-5 h-5 mr-2" />
                Create New Note
            </button>
        </div>
    </div>
);

function AppContent() {
    const { 
        notes, addNote, updateNote, deleteNote, getNoteById, toggleFavorite, restoreNoteVersion, renameNoteTitle, copyNote,
        addNoteFromFile,
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
    const [activeSmartCollectionId, setActiveSmartCollectionId] = useState<string | null>(null);

    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    });

    const [view, setView] = useState<'NOTES' | 'CHAT'>('NOTES');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatStatus, setChatStatus] = useState<'idle' | 'searching' | 'replying'>('idle');
    const [chatError, setChatError] = useState<string | null>(null);
    
    const [isAiRateLimited, setIsAiRateLimited] = useState(false);
    const rateLimitTimerRef = useRef<number | null>(null);

    const isMobileView = useMobileView();
    const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobileView);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
        const savedWidth = localStorage.getItem(WELCOME_SCREEN_SIDEBAR_WIDTH_KEY);
        return savedWidth ? parseInt(savedWidth, 10) : 320;
    });
    const isResizing = useRef(false);

    const [editorActions, setEditorActions] = useState<EditorActions | null>(null);
    const registerEditorActions = (actions: EditorActions) => setEditorActions(actions);
    const unregisterEditorActions = () => setEditorActions(null);

    useEffect(() => {
        setIsSidebarOpen(!isMobileView);
    }, [isMobileView]);
    
     useEffect(() => {
        localStorage.setItem(WELCOME_SCREEN_SIDEBAR_WIDTH_KEY, String(sidebarWidth));
    }, [sidebarWidth]);

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

    const handleAddNote = useCallback((parentId: string | null = null) => {
        const newNoteId = addNote(parentId);
        setActiveNoteId(newNoteId);
        setView('NOTES');
         if (isMobileView) {
            setIsSidebarOpen(false);
        }
    }, [addNote, isMobileView]);
    
    const handleAddNoteFromFile = useCallback((title: string, content: string, parentId: string | null) => {
        const newNoteId = addNoteFromFile(title, content, parentId);
        setActiveNoteId(newNoteId);
        setView('NOTES');
        if (isMobileView) setIsSidebarOpen(false);
        showToast({ message: `Imported "${title}"`, type: 'success'});
        return newNoteId;
    }, [addNoteFromFile, isMobileView, showToast]);

    const handleCopyNote = useCallback((noteId: string) => {
        const newId = copyNote(noteId);
        if (newId) {
            const copiedNote = getNoteById(newId);
            showToast({ message: `Copied "${copiedNote?.title}"`, type: 'success' });
        }
    }, [copyNote, getNoteById, showToast]);

    const handleAddCollection = useCallback((name: string, parentId: string | null = null) => {
        const newCollectionId = addCollection(name, parentId);
        setRenamingItemId(newCollectionId);
    }, [addCollection]);

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

    const handleActivateSmartCollection = (collection: SmartCollection) => {
        setSearchTerm(collection.query);
        setSearchMode('AI');
        setActiveSmartCollectionId(collection.id);
        setFilter('ALL');
    };
    
    const handleSearchTermChange = (term: string) => {
        if (activeSmartCollectionId) {
            setActiveSmartCollectionId(null);
        }
        setSearchTerm(term);
    };

    const handleClearActiveSmartCollection = () => {
        setActiveSmartCollectionId(null);
        setSearchTerm('');
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
        setChatStatus('searching');

        try {
            // Step 1: Find relevant notes for context
            const sourceNoteIds = await semanticSearchNotes(query, notes);
            const sourceNotes = sourceNoteIds.map(id => getNoteById(id)).filter((n): n is Note => !!n);
            
            setChatStatus('replying');

            // Step 2: Get streaming response using context
            const stream = await getStreamingChatResponse(query, sourceNotes);

            // Add an empty AI message to the chat that we will populate
            const newAiMessage: ChatMessage = { role: 'ai', content: '', sources: sourceNotes };
            setChatMessages(prev => [...prev, newAiMessage]);

            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk.text;
                // Update the last message (the AI's) with the new chunk
                setChatMessages(prev => prev.map((msg, index) => 
                    index === prev.length - 1 ? { ...msg, content: fullResponse } : msg
                ));
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setChatError(errorMessage);
            const errorAiMessage: ChatMessage = { role: 'ai', content: `Sorry, I ran into an error: ${errorMessage}` };
            setChatMessages(prev => [...prev, errorAiMessage]);
        } finally {
            setChatStatus('idle');
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
                    chatStatus={chatStatus}
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

        return <WelcomeScreen isMobileView={isMobileView} onToggleSidebar={() => setIsSidebarOpen(true)} onAddNote={() => handleAddNote()} />;
    };

    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        isResizing.current = true;
        
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizing.current) {
                let newWidth = e.clientX;
                if (newWidth < MIN_SIDEBAR_WIDTH) newWidth = MIN_SIDEBAR_WIDTH;
                if (newWidth > MAX_SIDEBAR_WIDTH) newWidth = MAX_SIDEBAR_WIDTH;
                setSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            isResizing.current = false;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
             document.body.style.cursor = 'default';
        };
        
        document.body.style.cursor = 'col-resize';
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, []);

    const appContextValue = useMemo(() => ({
        notes,
        collections,
        smartCollections,
        activeNote,
        templates,
        theme,
        view,
        isMobileView,
        isSidebarOpen,
        isAiRateLimited,
        onAddNote: () => handleAddNote(),
        onAddNoteFromFile: handleAddNoteFromFile,
        onAddCollection: handleAddCollection,
        onCopyNote: handleCopyNote,
        onSelectNote: handleSelectNote,
        onDeleteNote: handleDeleteNoteRequest,
        onDeleteCollection: handleDeleteCollectionRequest,
        onDeleteSmartCollection: handleDeleteSmartCollectionRequest,
        onOpenSmartFolderModal: openSmartFolderModal,
        onToggleFavorite: toggleFavorite,
        onUpdateCollection: updateCollection,
        onRenameNote: renameNoteTitle,
        onMoveItem: moveItem,
        renamingItemId,
        setRenamingItemId,
        toggleTheme,
        onSetView: setView,
        setIsSidebarOpen,
        openSettings: () => setIsSettingsOpen(true),
        getNoteById,
        editorActions,
        registerEditorActions,
        unregisterEditorActions,
        onOpenContextMenu: handleOpenContextMenu,
    }), [
        notes, collections, smartCollections, activeNote, templates, theme, view, isMobileView, isSidebarOpen, isAiRateLimited,
        handleAddNote, handleAddNoteFromFile, handleAddCollection, handleCopyNote, handleSelectNote, handleDeleteNoteRequest, handleDeleteCollectionRequest,
        handleDeleteSmartCollectionRequest, openSmartFolderModal, toggleFavorite, updateCollection, renameNoteTitle, moveItem,
        renamingItemId, setRenamingItemId, toggleTheme, setView, setIsSidebarOpen, getNoteById, editorActions, registerEditorActions, unregisterEditorActions, handleOpenContextMenu
    ]);

    return (
        <AppContext.Provider value={appContextValue}>
            <div className="flex h-screen w-screen font-sans text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background overflow-hidden">
                <Sidebar
                    filteredNotes={filteredNotes}
                    activeNoteId={activeNoteId}
                    filter={filter}
                    setFilter={setFilter}
                    searchTerm={searchTerm}
                    setSearchTerm={handleSearchTermChange}
                    searchMode={searchMode}
                    setSearchMode={setSearchMode}
                    isAiSearching={isAiSearching}
                    aiSearchError={aiSearchError}
                    width={sidebarWidth}
                    activeSmartCollectionId={activeSmartCollectionId}
                    onActivateSmartCollection={handleActivateSmartCollection}
                    onClearActiveSmartCollection={handleClearActiveSmartCollection}
                />
                {!isMobileView && <SidebarResizer onResizeStart={handleResizeStart} />}
                <main className="flex-1 flex flex-col h-full min-w-0">
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
