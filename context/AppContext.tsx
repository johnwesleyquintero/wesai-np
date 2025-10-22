import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Note, Template, Collection, SmartCollection, EditorActions, ContextMenuItem, FilterType, SearchMode, ChatMessage, NoteVersion, AuthSession } from '../types';
import { useStore as useSupabaseStore } from '../hooks/useStore';
import { useDebounce } from '../hooks/useDebounce';
import { getStreamingChatResponse, semanticSearchNotes, generateCustomerResponse, getGeneralChatSession, resetGeneralChat } from '../services/geminiService';
import { useMobileView } from '../hooks/useMobileView';
import { useToast } from './ToastContext';
import { useApiKey } from '../hooks/useApiKey';
import { supabase } from '../lib/supabaseClient';

// Store Context
interface StoreContextType extends ReturnType<typeof useSupabaseStore> {
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
    handleDeleteNoteConfirm: () => Promise<void>;
    handleDeleteCollectionConfirm: () => Promise<void>;
    handleDeleteSmartCollectionConfirm: () => Promise<void>;
    chatMessages: ChatMessage[];
    chatStatus: 'idle' | 'searching' | 'replying' | 'using_tool';
    onSendMessage: (query: string, image?: string) => Promise<void>;
    onGenerateServiceResponse: (customerQuery: string, image?: string) => Promise<void>;
    onSendGeneralMessage: (query: string, image?: string) => Promise<void>;
    clearChat: () => void;
    onAddNote: (parentId?: string | null, title?: string, content?: string) => Promise<string>;
    onAddNoteFromFile: (title: string, content: string, parentId: string | null) => Promise<string>;
}
const StoreContext = createContext<StoreContextType | undefined>(undefined);
export const useStoreContext = () => {
    const context = useContext(StoreContext);
    if (!context) throw new Error('useStoreContext must be used within an AppProvider');
    return context;
};

// UI Context
interface UIContextType {
    session: AuthSession | null;
    isSessionLoading: boolean;
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
    // UI State
    const [session, setSession] = useState<AuthSession | null>(null);
    const [isSessionLoading, setIsSessionLoading] = useState(true);
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
    
    // Store Hook
    const store = useSupabaseStore(session?.user);
    const { notes, getNoteById, deleteCollection, deleteNote, deleteSmartCollection, addNote: createNote, addNoteFromFile, loading: isStoreLoading, updateNote: updateNoteInStore } = store;
    
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
    const [chatStatus, setChatStatus] = useState<'idle' | 'searching' | 'replying' | 'using_tool'>('idle');
    const [chatError, setChatError] = useState<string | null>(null);

    // Editor State
    const [editorActions, setEditorActions] = useState<EditorActions | null>(null);

    // Auth Effect
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setIsSessionLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    // UI Effects
    useEffect(() => {
        const hasSeenWelcome = localStorage.getItem('wesai-seen-welcome');
        if (!hasSeenWelcome) {
            setIsWelcomeModalOpen(true);
        }
    }, []);

    useEffect(() => {
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
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
    
    // Fix: Update onAddNote to accept title and content, matching its usage.
    const onAddNote = useCallback(async (parentId: string | null = null, title?: string, content?: string) => {
        const newNoteId = await createNote(parentId, title, content);
        setActiveNoteId(newNoteId);
        setView('NOTES');
        if (isMobileView) setIsSidebarOpen(false);
        return newNoteId;
    }, [createNote, isMobileView]);

    const onAddNoteFromFile = useCallback(async (title: string, content: string, parentId: string | null) => {
        const newNoteId = await addNoteFromFile(title, content, parentId);
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

            if (modKey && event.key.toLowerCase() === 'k') {
                 event.preventDefault(); 
                 setIsCommandPaletteOpen(prev => !prev); 
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);


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

    const filteredNotes = useMemo(() => {
        let sortedNotes = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        if (filter === 'FAVORITES') sortedNotes = sortedNotes.filter(note => note.isFavorite);
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
            } else if (searchMode === 'AI') return [];
        }
        return sortedNotes;
    }, [notes, filter, searchTerm, searchMode, aiSearchResultIds, activeSmartCollectionId]);

    const activeNote = useMemo(() => activeNoteId ? getNoteById(activeNoteId) : null, [activeNoteId, getNoteById]);
    const activeSmartCollection = useMemo(() => activeSmartCollectionId ? store.smartCollections.find(sc => sc.id === activeSmartCollectionId) : null, [activeSmartCollectionId, store.smartCollections]);
    
    const handleDeleteNoteConfirm = async () => {
        if (noteToDelete) {
            await deleteNote(noteToDelete.id);
            if (activeNoteId === noteToDelete.id) setActiveNoteId(null);
            setNoteToDelete(null);
        }
    };
    const handleDeleteCollectionConfirm = async () => {
        if (collectionToDelete) {
            const deletedNoteIds = await deleteCollection(collectionToDelete.id);
            if (activeNoteId && deletedNoteIds.includes(activeNoteId)) setActiveNoteId(null);
            setCollectionToDelete(null);
        }
    };
    const handleDeleteSmartCollectionConfirm = async () => {
        if (smartCollectionToDelete) {
            await deleteSmartCollection(smartCollectionToDelete.id);
            setSmartCollectionToDelete(null);
        }
    };
    const handleActivateSmartCollection = (collection: SmartCollection) => { setSearchTerm(collection.query); setSearchMode('AI'); setActiveSmartCollectionId(collection.id); setFilter('ALL'); };
    const handleSearchTermChange = (term: string) => { if (activeSmartCollectionId) setActiveSmartCollectionId(null); setSearchTerm(term); };
    const handleClearActiveSmartCollection = () => { setActiveSmartCollectionId(null); setSearchTerm(''); };
    
    const onSendMessage = async (query: string, image?: string) => {
        setChatError(null);
        const newUserMessage: ChatMessage = { role: 'user', content: query, image };
        setChatMessages(prev => [...prev, newUserMessage]);
        setChatStatus('searching');
        try {
            const sourceNoteIds = await semanticSearchNotes(query, notes);
            const sourceNotes = sourceNoteIds.map(id => getNoteById(id)).filter((n): n is Note => !!n);
            setChatStatus('replying');
            const stream = await getStreamingChatResponse(query, sourceNotes, image);
            const newAiMessage: ChatMessage = { role: 'ai', content: '', sources: sourceNotes };
            setChatMessages(prev => [...prev, newAiMessage]);
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk.text;
                setChatMessages(prev => prev.map((msg, index) => index === prev.length - 1 ? { ...msg, content: fullResponse } : msg));
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setChatError(errorMessage);
            setChatMessages(prev => [...prev, { role: 'ai', content: `Sorry, I ran into an error: ${errorMessage}` }]);
        } finally {
            setChatStatus('idle');
        }
    };

    const onGenerateServiceResponse = async (customerQuery: string, image?: string) => {
        setChatError(null);
        const newUserMessage: ChatMessage = { role: 'user', content: customerQuery, image };
        setChatMessages(prev => [...prev, newUserMessage]);
        setChatStatus('searching');
        try {
            const sourceNoteIds = await semanticSearchNotes(customerQuery, notes);
            const sourceNotes = sourceNoteIds.map(id => getNoteById(id)).filter((n): n is Note => !!n);
            setChatStatus('replying');
            const responseText = await generateCustomerResponse(customerQuery, sourceNotes, image);
            setChatMessages(prev => [...prev, { role: 'ai', content: responseText, sources: sourceNotes }]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setChatError(errorMessage);
            setChatMessages(prev => [...prev, { role: 'ai', content: `Sorry, I ran into an error: ${errorMessage}` }]);
        } finally {
            setChatStatus('idle');
        }
    };
    
    const onSendGeneralMessage = async (query: string, image?: string) => {
        setChatError(null);
        const userMessageId = Date.now();
        const newUserMessage: ChatMessage = { role: 'user', content: query, image, status: 'processing' };
        setChatMessages(prev => [...prev, newUserMessage]);

        try {
            const chat = getGeneralChatSession();
            let response = await chat.sendMessage({ message: query });
            
            while (response.functionCalls && response.functionCalls.length > 0) {
                setChatStatus('using_tool');
                const functionResponses = [];

                for (const fc of response.functionCalls) {
                    setChatMessages(prev => [...prev, { role: 'tool', content: { name: fc.name, args: fc.args, status: 'pending' }}]);
                    let result: any;
                    try {
                        switch (fc.name) {
                            case 'createNote':
                                const title = String(fc.args.title || 'Untitled Note');
                                const content = String(fc.args.content || '');
                                const newNoteId = await onAddNote(null, title, content);
                                result = { success: true, noteId: newNoteId };
                                showToast({ message: `Note "${title}" created!`, type: 'success' });
                                break;
                            case 'findNotes':
                                const queryToSearch = String(fc.args.query || '');
                                const foundNotes = notes
                                    .filter(n => n.title.toLowerCase().includes(queryToSearch.toLowerCase()))
                                    .map(n => ({ id: n.id, title: n.title }));
                                result = { notes: foundNotes };
                                break;
                             case 'getNoteContent':
                                const noteIdToRead = String(fc.args.noteId || '');
                                const noteToRead = getNoteById(noteIdToRead);
                                if (noteToRead) {
                                    result = { title: noteToRead.title, content: noteToRead.content };
                                } else {
                                    result = { error: "Note not found." };
                                }
                                break;
                            case 'updateNote':
                                const noteIdToUpdate = String(fc.args.noteId || '');
                                const noteToUpdate = getNoteById(noteIdToUpdate);
                                if (noteToUpdate) {
                                    const updatedFields: { title?: string, content?: string } = {};
                                    if (fc.args.title) {
                                        updatedFields.title = String(fc.args.title);
                                    }
                                    if (fc.args.content) {
                                        updatedFields.content = String(fc.args.content);
                                    }
                                    if (Object.keys(updatedFields).length > 0) {
                                        await updateNoteInStore(noteIdToUpdate, updatedFields);
                                        result = { success: true, noteId: noteIdToUpdate };
                                        showToast({ message: `Note "${updatedFields.title || noteToUpdate.title}" updated!`, type: 'success' });
                                    } else {
                                        result = { success: false, error: "No fields to update were provided." };
                                    }
                                } else {
                                    result = { success: false, error: "Note not found." };
                                }
                                break;
                            case 'deleteNote':
                                const noteIdToDelete = String(fc.args.noteId || '');
                                const noteToDeleteInstance = getNoteById(noteIdToDelete);
                                if (noteToDeleteInstance) {
                                    await deleteNote(noteIdToDelete);
                                    if (activeNoteId === noteIdToDelete) setActiveNoteId(null);
                                    result = { success: true, noteId: noteIdToDelete };
                                    showToast({ message: `Note "${noteToDeleteInstance.title}" deleted!`, type: 'success' });
                                } else {
                                    result = { success: false, error: "Note not found." };
                                }
                                break;
                            default:
                                result = { success: false, error: `Unknown function: ${fc.name}` };
                        }
                         setChatMessages(prev => [...prev, { role: 'tool', content: { name: fc.name, args: fc.args, status: 'complete', result }}]);
                    } catch (toolError) {
                        result = { success: false, error: (toolError as Error).message };
                        setChatMessages(prev => [...prev, { role: 'tool', content: { name: fc.name, args: fc.args, status: 'error', result }}]);
                    }
                    functionResponses.push({ id: fc.id, name: fc.name, response: { result }});
                }
                
                const functionResponseParts = functionResponses.map(({ name, response }) => ({
                    functionResponse: { name, response },
                }));
                response = await chat.sendMessage({ message: functionResponseParts });
            }

            setChatMessages(prev => prev.map(msg => {
                if (msg === newUserMessage) {
                    const updatedMsg: ChatMessage = { ...msg, status: 'complete' };
                    return updatedMsg;
                }
                return msg;
            }));

            if (response.text) {
                setChatMessages(prev => [...prev, { role: 'ai', content: response.text }]);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setChatError(errorMessage);
            setChatMessages(prev => {
                 const updated = prev.map(msg => {
                    if (msg === newUserMessage) {
                        const updatedMsg: ChatMessage = { ...msg, status: 'complete' };
                        return updatedMsg;
                    }
                    return msg;
                 });
                 return [...updated, { role: 'ai', content: `Sorry, I ran into an error: ${errorMessage}` }];
            });
        } finally {
            setChatStatus('idle');
        }
    };


    const clearChat = useCallback(() => { setChatMessages([]); setChatError(null); setChatStatus('idle'); resetGeneralChat(); }, []);
    const toggleTheme = () => setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    const onToggleSidebar = useCallback(() => setIsSidebarOpen(p => !p), []);
    const openSettings = () => setIsSettingsOpen(true);
    const openSmartFolderModal = (folder: SmartCollection | null) => { setSmartFolderToEdit(folder); setIsSmartFolderModalOpen(true); };
    const onOpenContextMenu = (e: React.MouseEvent, items: ContextMenuItem[]) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, items }); };
    const closeWelcomeModal = () => { localStorage.setItem('wesai-seen-welcome', 'true'); setIsWelcomeModalOpen(false); };
    const registerEditorActions = (actions: EditorActions) => setEditorActions(actions);
    const unregisterEditorActions = () => setEditorActions(null);

    return (
        <StoreContext.Provider value={{
            ...store, onAddNote, onAddNoteFromFile,
            activeNoteId, setActiveNoteId, activeNote, filteredNotes, filter, setFilter, searchTerm,
            handleSearchTermChange, searchMode, setSearchMode, isAiSearching, aiSearchError,
            activeSmartCollection, handleActivateSmartCollection, handleClearActiveSmartCollection,
            noteToDelete, setNoteToDelete, collectionToDelete, setCollectionToDelete,
            smartCollectionToDelete, setSmartCollectionToDelete, handleDeleteNoteConfirm,
            handleDeleteCollectionConfirm, handleDeleteSmartCollectionConfirm,
            chatMessages, chatStatus, onSendMessage, onGenerateServiceResponse, onSendGeneralMessage, clearChat
        }}>
            <UIContext.Provider value={{
                session, isSessionLoading,
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