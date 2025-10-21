import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Note, Template, Collection, SmartCollection, EditorActions, ContextMenuItem, FilterType, SearchMode, ChatMessage, NoteVersion } from '../types';
import { useStore as useStoreHook } from '../hooks/useStore';
import { useDebounce } from '../hooks/useDebounce';
import { getStreamingChatResponse, semanticSearchNotes, generateCustomerResponse, getGeneralChatResponseStream, resetGeneralChat } from '../services/geminiService';
import { useMobileView } from '../hooks/useMobileView';
import { useToast } from './ToastContext';
import { useApiKey } from '../hooks/useApiKey';

// Store Context
interface StoreContextType extends ReturnType<typeof useStoreHook> {
    activeNoteId: string | null;
    setActiveNoteId: React.Dispatch<React.SetStateAction<string | null>>;
    activeNote: Note | null;
    filteredNotes: Note[];
    filter: FilterType;
    setFilter: React.Dispatch<React.SetStateAction<FilterType>>;
    searchTerm: string;
    handleSearchTermChange: (term: string) => void;
    searchMode: SearchMode;
    setSearchMode: React.Dispatch<React.SetStateAction<SearchMode>>;
    isAiSearching: boolean;
    aiSearchError: string | null;
    activeSmartCollection: SmartCollection | null;
    handleActivateSmartCollection: (collection: SmartCollection) => void;
    handleClearActiveSmartCollection: () => void;
    noteToDelete: Note | null;
    setNoteToDelete: React.Dispatch<React.SetStateAction<Note | null>>;
    collectionToDelete: Collection | null;
    setCollectionToDelete: React.Dispatch<React.SetStateAction<Collection | null>>;
    smartCollectionToDelete: SmartCollection | null;
    setSmartCollectionToDelete: React.Dispatch<React.SetStateAction<SmartCollection | null>>;
    handleDeleteNoteConfirm: () => void;
    handleDeleteCollectionConfirm: () => void;
    handleDeleteSmartCollectionConfirm: () => void;
    chatMessages: ChatMessage[];
    chatStatus: 'idle' | 'searching' | 'replying';
    onSendMessage: (query: string) => Promise<void>;
    onGenerateServiceResponse: (customerQuery: string) => Promise<void>;
    onSendGeneralMessage: (query: string) => Promise<void>;
    clearChat: () => void;
    onAddNote: (parentId?: string | null) => string;
    onAddNoteFromFile: (title: string, content: string, parentId: string | null) => string;
}
const StoreContext = createContext<StoreContextType | undefined>(undefined);
export const useStoreContext = () => {
    const context = useContext(StoreContext);
    if (!context) throw new Error('useStoreContext must be used within an AppProvider');
    return context;
};

// UI Context
interface UIContextType {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    view: 'NOTES' | 'CHAT';
    setView: React.Dispatch<React.SetStateAction<'NOTES' | 'CHAT'>>;
    isMobileView: boolean;
    isSidebarOpen: boolean;
    setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
    onToggleSidebar: () => void;
    isAiRateLimited: boolean;
    renamingItemId: string | null;
    setRenamingItemId: React.Dispatch<React.SetStateAction<string | null>>;
    isSettingsOpen: boolean;
    setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    openSettings: () => void;
    isCommandPaletteOpen: boolean;
    setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isSmartFolderModalOpen: boolean;
    setIsSmartFolderModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    smartFolderToEdit: SmartCollection | null;
    openSmartFolderModal: (folder: SmartCollection | null) => void;
    contextMenu: { x: number; y: number; items: ContextMenuItem[] } | null;
    setContextMenu: React.Dispatch<React.SetStateAction<{ x: number; y: number; items: ContextMenuItem[] } | null>>;
    onOpenContextMenu: (e: React.MouseEvent, items: ContextMenuItem[]) => void;
    isWelcomeModalOpen: boolean;
    closeWelcomeModal: () => void;
    isApiKeyMissing: boolean;
}
const UIContext = createContext<UIContextType | undefined>(undefined);
export const useUIContext = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error('useUIContext must be used within an AppProvider');
    return context;
};

// Editor Context
interface EditorContextType {
    editorActions: EditorActions | null;
    registerEditorActions: (actions: EditorActions) => void;
    unregisterEditorActions: () => void;
}
const EditorContext = createContext<EditorContextType | undefined>(undefined);
export const useEditorContext = () => {
    const context = useContext(EditorContext);
    if (!context) throw new Error('useEditorContext must be used within an AppProvider');
    return context;
};


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Store Hook
    const store = useStoreHook();
    const { notes, getNoteById, deleteCollection, deleteNote, deleteSmartCollection, addNote: createNote, addNoteFromFile } = store;
    
    // Toast
    const { showToast } = useToast();
    const { apiKey } = useApiKey();

    // Store State
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>('RECENT');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchMode, setSearchMode] = useState<SearchMode>('KEYWORD');
    const [isAiSearching, setIsAiSearching] = useState(false);
    const [aiSearchError, setAiSearchError] = useState<string | null>(null);
    const [aiSearchResultIds, setAiSearchResultIds] = useState<string[] | null>(null);
    const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
    const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
    const [smartCollectionToDelete, setSmartCollectionToDelete] = useState<SmartCollection | null>(null);
    const [activeSmartCollectionId, setActiveSmartCollectionId] = useState<string | null>(null);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // Chat State
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatStatus, setChatStatus] = useState<'idle' | 'searching' | 'replying'>('idle');
    const [chatError, setChatError] = useState<string | null>(null);

    // UI State
    const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
    const [view, setView] = useState<'NOTES' | 'CHAT'>('NOTES');
    const isMobileView = useMobileView();
    const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobileView);
    const [isAiRateLimited, setIsAiRateLimited] = useState(false);
    const rateLimitTimerRef = useRef<number | null>(null);
    const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [isSmartFolderModalOpen, setIsSmartFolderModalOpen] = useState(false);
    const [smartFolderToEdit, setSmartFolderToEdit] = useState<SmartCollection | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
    const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);

    // Editor State
    const [editorActions, setEditorActions] = useState<EditorActions | null>(null);

    // UI Effects
    useEffect(() => {
        const hasSeenWelcome = localStorage.getItem('wesai-seen-welcome');
        if (!hasSeenWelcome) {
            setIsWelcomeModalOpen(true);
        }
    }, []);

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
            if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
            rateLimitTimerRef.current = window.setTimeout(() => setIsAiRateLimited(false), 60000);
        };
        window.addEventListener('ai-rate-limit', handleRateLimit);
        return () => {
            window.removeEventListener('ai-rate-limit', handleRateLimit);
            if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
        };
    }, []);
    
    const onAddNote = useCallback((parentId: string | null = null) => {
        const newNoteId = createNote(parentId);
        setActiveNoteId(newNoteId);
        setView('NOTES');
        if (isMobileView) setIsSidebarOpen(false);
        return newNoteId;
    }, [createNote, isMobileView]);

    const handleAddNoteFromFile = useCallback((title: string, content: string, parentId: string | null) => {
        const newNoteId = addNoteFromFile(title, content, parentId);
        setActiveNoteId(newNoteId);
        setView('NOTES');
        if (isMobileView) setIsSidebarOpen(false);
        showToast({ message: `Imported "${title}"`, type: 'success'});
        return newNoteId;
    }, [addNoteFromFile, isMobileView, showToast]);


    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().includes('MAC');
            const modKey = isMac ? event.metaKey : event.ctrlKey;

            if (modKey) {
                switch (event.key.toLowerCase()) {
                    case 'n': event.preventDefault(); onAddNote(); break;
                    case 'b': event.preventDefault(); setIsSidebarOpen(prev => !prev); break;
                    case 's': event.preventDefault(); break; // Prevent browser save
                    case 'k': event.preventDefault(); setIsCommandPaletteOpen(prev => !prev); break;
                    case 'f':
                        if (!event.shiftKey) {
                            event.preventDefault();
                            (document.querySelector('input[placeholder="Search notes..."]') as HTMLInputElement)?.focus();
                        }
                        break;
                }

                if (event.shiftKey) {
                     switch (event.key.toLowerCase()) {
                        case 'c': event.preventDefault(); setView(v => v === 'CHAT' ? 'NOTES' : 'CHAT'); break;
                        case 'f': 
                            event.preventDefault();
                            if (activeNoteId) store.toggleFavorite(activeNoteId);
                            break;
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onAddNote, activeNoteId, store.toggleFavorite]);


    // AI Search Effect
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
                    setAiSearchError(error instanceof Error ? error.message : "An unknown AI search error occurred.");
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

    // Derived State and Memoized Values
    const filteredNotes = useMemo(() => {
        let sortedNotes = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        if (filter === 'FAVORITES') {
            sortedNotes = sortedNotes.filter(note => note.isFavorite);
        }

        if (searchTerm.trim() || activeSmartCollectionId) {
            if (searchMode === 'AI' && aiSearchResultIds) {
                const noteMap = new Map(sortedNotes.map(note => [note.id, note]));
                return aiSearchResultIds.map(id => noteMap.get(id)).filter((note): note is Note => !!note);
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
    }, [notes, filter, searchTerm, searchMode, aiSearchResultIds, activeSmartCollectionId]);

    const activeNote = useMemo(() => activeNoteId ? getNoteById(activeNoteId) : null, [activeNoteId, getNoteById]);
    const activeSmartCollection = useMemo(() => activeSmartCollectionId ? store.smartCollections.find(sc => sc.id === activeSmartCollectionId) : null, [activeSmartCollectionId, store.smartCollections]);
    
    // Store Context Functions
    const handleDeleteNoteConfirm = () => {
        if (noteToDelete) {
            if (activeNoteId === noteToDelete.id) setActiveNoteId(null);
            deleteNote(noteToDelete.id);
            setNoteToDelete(null);
        }
    };
    const handleDeleteCollectionConfirm = () => {
        if (collectionToDelete) {
            const deletedNoteIds = deleteCollection(collectionToDelete.id);
            if (activeNoteId && deletedNoteIds.includes(activeNoteId)) setActiveNoteId(null);
            setCollectionToDelete(null);
        }
    };
    const handleDeleteSmartCollectionConfirm = () => {
        if (smartCollectionToDelete) {
            deleteSmartCollection(smartCollectionToDelete.id);
            setSmartCollectionToDelete(null);
        }
    };
    const handleActivateSmartCollection = (collection: SmartCollection) => {
        setSearchTerm(collection.query);
        setSearchMode('AI');
        setActiveSmartCollectionId(collection.id);
        setFilter('ALL');
    };
    const handleSearchTermChange = (term: string) => {
        if (activeSmartCollectionId) setActiveSmartCollectionId(null);
        setSearchTerm(term);
    };
    const handleClearActiveSmartCollection = () => {
        setActiveSmartCollectionId(null);
        setSearchTerm('');
    };
    const onSendMessage = async (query: string) => {
        setChatError(null);
        const newUserMessage: ChatMessage = { role: 'user', content: query };
        setChatMessages(prev => [...prev, newUserMessage]);
        setChatStatus('searching');

        try {
            const sourceNoteIds = await semanticSearchNotes(query, notes);
            const sourceNotes = sourceNoteIds.map(id => getNoteById(id)).filter((n): n is Note => !!n);
            
            setChatStatus('replying');

            const stream = await getStreamingChatResponse(query, sourceNotes);
            const newAiMessage: ChatMessage = { role: 'ai', content: '', sources: sourceNotes };
            setChatMessages(prev => [...prev, newAiMessage]);

            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk.text;
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

    const onGenerateServiceResponse = async (customerQuery: string) => {
        setChatError(null);
        const newUserMessage: ChatMessage = { role: 'user', content: customerQuery };
        setChatMessages(prev => [...prev, newUserMessage]);
        setChatStatus('searching');

        try {
            const sourceNoteIds = await semanticSearchNotes(customerQuery, notes);
            const sourceNotes = sourceNoteIds.map(id => getNoteById(id)).filter((n): n is Note => !!n);
            
            setChatStatus('replying');
            
            const responseText = await generateCustomerResponse(customerQuery, sourceNotes);
            const newAiMessage: ChatMessage = { role: 'ai', content: responseText, sources: sourceNotes };
            setChatMessages(prev => [...prev, newAiMessage]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setChatError(errorMessage);
            const errorAiMessage: ChatMessage = { role: 'ai', content: `Sorry, I ran into an error: ${errorMessage}` };
            setChatMessages(prev => [...prev, errorAiMessage]);
        } finally {
            setChatStatus('idle');
        }
    };
    
    const onSendGeneralMessage = async (query: string) => {
        setChatError(null);
        const newUserMessage: ChatMessage = { role: 'user', content: query };
        setChatMessages(prev => [...prev, newUserMessage]);
        setChatStatus('replying');

        try {
            const stream = await getGeneralChatResponseStream(query);
            const newAiMessage: ChatMessage = { role: 'ai', content: '' };
            setChatMessages(prev => [...prev, newAiMessage]);

            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk.text;
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

    const clearChat = useCallback(() => {
        setChatMessages([]);
        setChatError(null);
        setChatStatus('idle');
        resetGeneralChat();
    }, []);


    // UI Context Functions
    const toggleTheme = () => setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    const onToggleSidebar = useCallback(() => setIsSidebarOpen(p => !p), []);
    const openSettings = () => setIsSettingsOpen(true);
    const openSmartFolderModal = (folder: SmartCollection | null) => {
        setSmartFolderToEdit(folder);
        setIsSmartFolderModalOpen(true);
    };
    const onOpenContextMenu = (e: React.MouseEvent, items: ContextMenuItem[]) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, items });
    };
    const closeWelcomeModal = () => {
        localStorage.setItem('wesai-seen-welcome', 'true');
        setIsWelcomeModalOpen(false);
    };

    // Editor Context Functions
    const registerEditorActions = (actions: EditorActions) => setEditorActions(actions);
    const unregisterEditorActions = () => setEditorActions(null);

    return (
        <StoreContext.Provider value={{
            ...store, onAddNote, onAddNoteFromFile: handleAddNoteFromFile,
            activeNoteId, setActiveNoteId, activeNote, filteredNotes, filter, setFilter, searchTerm,
            handleSearchTermChange, searchMode, setSearchMode, isAiSearching, aiSearchError,
            activeSmartCollection, handleActivateSmartCollection, handleClearActiveSmartCollection,
            noteToDelete, setNoteToDelete, collectionToDelete, setCollectionToDelete,
            smartCollectionToDelete, setSmartCollectionToDelete, handleDeleteNoteConfirm,
            handleDeleteCollectionConfirm, handleDeleteSmartCollectionConfirm,
            chatMessages, chatStatus, onSendMessage, onGenerateServiceResponse, onSendGeneralMessage, clearChat
        }}>
            <UIContext.Provider value={{
                theme, toggleTheme, view, setView, isMobileView, isSidebarOpen, setIsSidebarOpen,
                onToggleSidebar,
                isAiRateLimited, renamingItemId, setRenamingItemId, isSettingsOpen, setIsSettingsOpen,
                openSettings, isCommandPaletteOpen, setIsCommandPaletteOpen, isSmartFolderModalOpen,
                setIsSmartFolderModalOpen, smartFolderToEdit, openSmartFolderModal, contextMenu,
                setContextMenu, onOpenContextMenu, isWelcomeModalOpen, closeWelcomeModal, isApiKeyMissing: !apiKey,
            }}>
                <EditorContext.Provider value={{ editorActions, registerEditorActions, unregisterEditorActions }}>
                    {children}
                </EditorContext.Provider>
            </UIContext.Provider>
        </StoreContext.Provider>
    );
};