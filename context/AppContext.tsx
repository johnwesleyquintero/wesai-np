import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Note, Template, Collection, SmartCollection, EditorActions, ContextMenuItem, SearchMode, ChatMessage, NoteVersion, AuthSession, ChatMode, TreeNode } from '../types';
import { useStore as useSupabaseStore } from '../hooks/useStore';
import { useDebounce } from '../hooks/useDebounce';
import { getStreamingChatResponse, semanticSearchNotes, generateCustomerResponse, getGeneralChatSession, resetGeneralChat } from '../services/geminiService';
import { useMobileView } from '../hooks/useMobileView';
import { useToast } from './ToastContext';
import { useApiKey } from '../hooks/useApiKey';
import { supabase } from '../lib/supabaseClient';

const CHAT_HISTORIES_STORAGE_KEY = 'wesai-chat-histories';

const buildTree = (notes: Note[], collections: Collection[]): TreeNode[] => {
    const noteMap = new Map(notes.map(note => [note.id, { ...note, children: [] as TreeNode[] }]));
    const collectionMap = new Map(collections.map(c => [c.id, { ...c, type: 'collection' as const, children: [] as TreeNode[] }]));
    
    const tree: TreeNode[] = [];
    
    const allItemsMap: Map<string, TreeNode> = new Map<string, TreeNode>([...noteMap.entries(), ...collectionMap.entries()]);

    allItemsMap.forEach(item => {
        if (item.parentId === null) {
            tree.push(item);
        } else {
            const parent = collectionMap.get(item.parentId);
            if (parent) {
                parent.children.push(item);
            } else {
                tree.push(item);
            }
        }
    });

    const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
            const aIsCollection = 'type' in a && a.type === 'collection';
            const bIsCollection = 'type' in b && b.type === 'collection';

            if (aIsCollection && !bIsCollection) return -1;
            if (!aIsCollection && bIsCollection) return 1;

            const aName = aIsCollection ? (a as Collection).name : (a as Note).title;
            const bName = bIsCollection ? (b as Collection).name : (b as Note).title;
            return aName.localeCompare(bName);
        });

        nodes.forEach(node => {
            if ('children' in node && node.children.length > 0) {
                sortNodes(node.children);
            }
        });
    };
    
    sortNodes(tree);

    return tree;
};


// --- Context Definitions ---

// Auth Context
interface AuthContextType {
    session: AuthSession | null;
    isSessionLoading: boolean;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuthContext must be used within an AppProvider');
    return context;
};

// Store Context
interface StoreContextType extends Omit<ReturnType<typeof useSupabaseStore>, 'deleteNote'> {
    deleteNote: (id: string) => Promise<void>;
    activeNoteId: string | null;
    setActiveNoteId: React.Dispatch<React.SetStateAction<string | null>>;
    activeNote: Note | null;
    favoriteNotes: Note[];
    searchData: { isSearching: boolean; visibleIds: Set<string> | null; matchIds: Set<string> | null; };
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
    onAddNote: (parentId?: string | null, title?: string, content?: string) => Promise<string>;
    onAddNoteFromFile: (title: string, content: string, parentId: string | null) => Promise<string>;
    triggerNoteImport: () => void;
    fileTree: TreeNode[];
    logAiSuggestionEvent: (sourceNoteId: string, suggestedNoteId: string, wasClicked: boolean) => Promise<void>;
}
const StoreContext = createContext<StoreContextType | undefined>(undefined);
export const useStoreContext = () => {
    const context = useContext(StoreContext);
    if (!context) throw new Error('useStoreContext must be used within an AppProvider');
    return context;
};

// Chat Context
interface ChatContextType {
    chatMessages: ChatMessage[];
    chatStatus: 'idle' | 'searching' | 'replying' | 'using_tool';
    chatMode: ChatMode;
    setChatMode: React.Dispatch<React.SetStateAction<ChatMode>>;
    onSendMessage: (query: string, image?: string) => Promise<void>;
    onGenerateServiceResponse: (customerQuery: string, image?: string) => Promise<void>;
    onSendGeneralMessage: (query: string, image?: string) => Promise<void>;
    clearChat: () => void;
}
const ChatContext = createContext<ChatContextType | undefined>(undefined);
export const useChatContext = () => {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChatContext must be used within an AppProvider');
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
    isSidebarCollapsed: boolean;
    toggleSidebarCollapsed: () => void;
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

const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [isSessionLoading, setIsSessionLoading] = useState(true);

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

    const authValue = useMemo(() => ({ session, isSessionLoading }), [session, isSessionLoading]);
    return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
}

const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
    const [view, setView] = useState<'NOTES' | 'CHAT'>('NOTES');
    const isMobileView = useMobileView();
    const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobileView);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
        try {
            return localStorage.getItem('wesai-sidebar-collapsed') === 'true';
        } catch {
            return false;
        }
    });
    const [isAiRateLimited, setIsAiRateLimited] = useState(false);
    const rateLimitTimerRef = useRef<number | null>(null);
    const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [isSmartFolderModalOpen, setIsSmartFolderModalOpen] = useState(false);
    const [smartFolderToEdit, setSmartFolderToEdit] = useState<SmartCollection | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
    const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
    const { apiKey } = useApiKey();

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
        try {
            localStorage.setItem('wesai-sidebar-collapsed', String(isSidebarCollapsed));
        } catch (error) {
            console.error("Failed to save sidebar collapsed state to localStorage", error);
        }
    }, [isSidebarCollapsed]);


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

    const toggleTheme = useCallback(() => setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light')), []);
    const toggleSidebarCollapsed = useCallback(() => setIsSidebarCollapsed(prev => !prev), []);
    const onToggleSidebar = useCallback(() => setIsSidebarOpen(p => !p), []);
    const openSettings = useCallback(() => setIsSettingsOpen(true), []);
    const openSmartFolderModal = useCallback((folder: SmartCollection | null) => { setSmartFolderToEdit(folder); setIsSmartFolderModalOpen(true); }, []);
    const onOpenContextMenu = useCallback((e: React.MouseEvent, items: ContextMenuItem[]) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, items }); }, []);
    const closeWelcomeModal = useCallback(() => { localStorage.setItem('wesai-seen-welcome', 'true'); setIsWelcomeModalOpen(false); }, []);

    const uiValue = useMemo(() => ({
        theme, toggleTheme, view, setView, isMobileView, isSidebarOpen, setIsSidebarOpen,
        onToggleSidebar, isSidebarCollapsed, toggleSidebarCollapsed,
        isAiRateLimited, renamingItemId, setRenamingItemId, isSettingsOpen, setIsSettingsOpen,
        openSettings, isCommandPaletteOpen, setIsCommandPaletteOpen, isSmartFolderModalOpen,
        setIsSmartFolderModalOpen, smartFolderToEdit, openSmartFolderModal, contextMenu,
        setContextMenu, onOpenContextMenu, isWelcomeModalOpen, closeWelcomeModal, isApiKeyMissing: !apiKey
    }), [
        theme, toggleTheme, view, setView, isMobileView, isSidebarOpen, setIsSidebarOpen,
        onToggleSidebar, isSidebarCollapsed, toggleSidebarCollapsed,
        isAiRateLimited, renamingItemId, setRenamingItemId, isSettingsOpen, setIsSettingsOpen,
        openSettings, isCommandPaletteOpen, setIsCommandPaletteOpen, isSmartFolderModalOpen,
        setIsSmartFolderModalOpen, smartFolderToEdit, openSmartFolderModal, contextMenu,
        setContextMenu, onOpenContextMenu, isWelcomeModalOpen, closeWelcomeModal, apiKey
    ]);
    
    return <UIContext.Provider value={uiValue}>{children}</UIContext.Provider>;
}

const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { session } = useAuthContext();
    const store = useSupabaseStore(session?.user);
    const { notes, collections, getNoteById, deleteCollection, deleteNote, deleteSmartCollection, addNote: createNote, addNoteFromFile, loading: isStoreLoading } = store;
    
    const { showToast } = useToast();
    const { setView, isMobileView, setIsSidebarOpen } = useUIContext();

    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
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
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const favoriteNotes = useMemo(() => {
        return notes
            .filter(n => n.isFavorite)
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }, [notes]);

    const searchData = useMemo(() => {
        const isSearching = !!searchTerm.trim() || !!activeSmartCollectionId;
        if (!isSearching) return { isSearching: false, visibleIds: null, matchIds: null };

        const query = activeSmartCollectionId ? store.smartCollections.find(sc => sc.id === activeSmartCollectionId)?.query || '' : searchTerm;
        const currentSearchMode = activeSmartCollectionId ? 'AI' : searchMode;

        const matchIds = new Set<string>();
        
        if (currentSearchMode === 'KEYWORD') {
            const lowercasedQuery = query.toLowerCase();
            notes.forEach(note => {
                if (
                    note.title.toLowerCase().includes(lowercasedQuery) ||
                    note.content.toLowerCase().includes(lowercasedQuery) ||
                    note.tags.some(tag => tag.toLowerCase().includes(lowercasedQuery))
                ) {
                    matchIds.add(note.id);
                }
            });
            collections.forEach(collection => {
                if (collection.name.toLowerCase().includes(lowercasedQuery)) {
                    matchIds.add(collection.id);
                }
            });
        } else if (currentSearchMode === 'AI' && aiSearchResultIds) {
            aiSearchResultIds.forEach(id => matchIds.add(id));
        }

        const visibleIds = new Set<string>(matchIds);
        const itemMap = new Map([...notes, ...collections].map(item => [item.id, item]));

        matchIds.forEach(id => {
            let current = itemMap.get(id);
            while (current && current.parentId) {
                visibleIds.add(current.parentId);
                current = itemMap.get(current.parentId);
            }
        });
        
        return { isSearching, visibleIds, matchIds };

    }, [searchTerm, searchMode, aiSearchResultIds, notes, collections, activeSmartCollectionId, store.smartCollections]);

    const activeNote = useMemo(() => activeNoteId ? getNoteById(activeNoteId) : null, [activeNoteId, getNoteById]);
    const activeSmartCollection = useMemo(() => activeSmartCollectionId ? store.smartCollections.find(sc => sc.id === activeSmartCollectionId) : null, [activeSmartCollectionId, store.smartCollections]);
    
    const notesRef = useRef(notes);
    notesRef.current = notes;
    const collectionsRef = useRef(collections);
    collectionsRef.current = collections;
    
    const structuralNotesDep = useMemo(() => JSON.stringify(
        notes.map(n => ({ id: n.id, parentId: n.parentId, title: n.title })).sort((a, b) => a.id.localeCompare(b.id))
    ), [notes]);

    const structuralCollectionsDep = useMemo(() => JSON.stringify(
        collections.map(c => ({ id: c.id, parentId: c.parentId, name: c.name })).sort((a, b) => a.id.localeCompare(b.id))
    ), [collections]);

    const fileTree = useMemo(() => {
        return buildTree(notesRef.current, collectionsRef.current);
    }, [structuralNotesDep, structuralCollectionsDep]);

    const onAddNote = useCallback(async (parentId: string | null = null, title: string = "Untitled Note", content: string = "") => {
        const newNoteId = await createNote(parentId, title, content);
        setActiveNoteId(newNoteId);
        setView('NOTES');
        if (isMobileView) setIsSidebarOpen(false);
        showToast({ message: `Note "${title}" created!`, type: 'success' });
        return newNoteId;
    }, [createNote, isMobileView, showToast, setActiveNoteId, setView, setIsSidebarOpen]);

    const onAddNoteFromFile = useCallback(async (title: string, content: string, parentId: string | null) => {
        const newNoteId = await addNoteFromFile(title, content, parentId);
        setActiveNoteId(newNoteId);
        setView('NOTES');
        if (isMobileView) setIsSidebarOpen(false);
        showToast({ message: `Imported "${title}"`, type: 'success'});
        return newNoteId;
    }, [addNoteFromFile, isMobileView, showToast, setActiveNoteId, setView, setIsSidebarOpen]);

    const triggerNoteImport = useCallback(() => fileInputRef.current?.click(), []);
    
    const handleFileImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const content = loadEvent.target?.result as string;
                if (content !== null) {
                    onAddNoteFromFile(file.name, content, null);
                }
            };
            reader.readAsText(file);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [onAddNoteFromFile]);

    const handleDeleteNoteConfirm = useCallback(async () => {
        if (noteToDelete) {
            await deleteNote(noteToDelete.id);
            if (activeNoteId === noteToDelete.id) setActiveNoteId(null);
            setNoteToDelete(null);
        }
    }, [noteToDelete, deleteNote, activeNoteId]);

    const handleDeleteCollectionConfirm = useCallback(async () => {
        if (collectionToDelete) {
            const deletedNoteIds = await deleteCollection(collectionToDelete.id);
            if (activeNoteId && deletedNoteIds.includes(activeNoteId)) setActiveNoteId(null);
            setCollectionToDelete(null);
        }
    }, [collectionToDelete, deleteCollection, activeNoteId]);

    const handleDeleteSmartCollectionConfirm = useCallback(async () => {
        if (smartCollectionToDelete) {
            await deleteSmartCollection(smartCollectionToDelete.id);
            setSmartCollectionToDelete(null);
        }
    }, [smartCollectionToDelete, deleteSmartCollection]);

    const handleActivateSmartCollection = useCallback((collection: SmartCollection) => {
        setActiveSmartCollectionId(collection.id);
        const performAiSearch = async () => {
            setIsAiSearching(true);
            setAiSearchError(null);
            setAiSearchResultIds(null);
            try {
                const resultIds = await semanticSearchNotes(collection.query, notes);
                setAiSearchResultIds(resultIds);
            } catch (error) {
                setAiSearchError(error instanceof Error ? error.message : "An unknown AI search error occurred.");
            } finally {
                setIsAiSearching(false);
            }
        };
        performAiSearch();
    }, [notes]);

    const handleSearchTermChange = useCallback((term: string) => {
        if (activeSmartCollectionId) setActiveSmartCollectionId(null);
        setSearchTerm(term);
    }, [activeSmartCollectionId]);

    const handleClearActiveSmartCollection = useCallback(() => {
        setActiveSmartCollectionId(null);
        setSearchTerm('');
    }, []);

    const storeValue = useMemo(() => ({
        ...store, onAddNote, onAddNoteFromFile, triggerNoteImport, fileTree,
        activeNoteId, setActiveNoteId, activeNote, favoriteNotes, searchData, searchTerm,
        handleSearchTermChange, searchMode, setSearchMode, isAiSearching, aiSearchError,
        activeSmartCollection, handleActivateSmartCollection, handleClearActiveSmartCollection,
        noteToDelete, setNoteToDelete, 
        collectionToDelete, setCollectionToDelete,
        smartCollectionToDelete, setSmartCollectionToDelete, handleDeleteNoteConfirm,
        handleDeleteCollectionConfirm, handleDeleteSmartCollectionConfirm,
    }), [
        store, onAddNote, onAddNoteFromFile, triggerNoteImport, fileTree,
        activeNoteId, setActiveNoteId, activeNote, favoriteNotes, searchData, searchTerm,
        handleSearchTermChange, searchMode, setSearchMode, isAiSearching, aiSearchError,
        activeSmartCollection, handleActivateSmartCollection, handleClearActiveSmartCollection,
        noteToDelete, setNoteToDelete, collectionToDelete, setCollectionToDelete,
        smartCollectionToDelete, setSmartCollectionToDelete, handleDeleteNoteConfirm,
        handleDeleteCollectionConfirm, handleDeleteSmartCollectionConfirm,
    ]);

    return (
        <StoreContext.Provider value={storeValue as StoreContextType}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileImport}
                accept=".md,.txt,text/plain,text/markdown"
                className="hidden"
            />
            {children}
        </StoreContext.Provider>
    );
}

const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { 
        notes, getNoteById, onAddNote, deleteNote, activeNoteId, setActiveNoteId, 
        updateNote: updateNoteInStore, collections, ...store 
    } = useStoreContext();
    const { showToast } = useToast();
    
    const [chatMode, setChatMode] = useState<ChatMode>('ASSISTANT');
    const [chatHistories, setChatHistories] = useState<Record<ChatMode, ChatMessage[]>>(() => {
        try {
            const saved = localStorage.getItem(CHAT_HISTORIES_STORAGE_KEY);
            const initial = { ASSISTANT: [], RESPONDER: [], GENERAL: [] };
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    ASSISTANT: Array.isArray(parsed.ASSISTANT) ? parsed.ASSISTANT : [],
                    RESPONDER: Array.isArray(parsed.RESPONDER) ? parsed.RESPONDER : [],
                    GENERAL: Array.isArray(parsed.GENERAL) ? parsed.GENERAL : [],
                };
            }
            return initial;
        } catch {
            return { ASSISTANT: [], RESPONDER: [], GENERAL: [] };
        }
    });

    const [chatError, setChatError] = useState<string | null>(null);
    const [chatStatus, setChatStatus] = useState<'idle' | 'searching' | 'replying' | 'using_tool'>('idle');

    useEffect(() => {
        try {
            localStorage.setItem(CHAT_HISTORIES_STORAGE_KEY, JSON.stringify(chatHistories));
        } catch (error) {
            console.error("Failed to save chat history to localStorage", error);
        }
    }, [chatHistories]);
    
    const onSendMessage = useCallback(async (query: string, image?: string) => {
        setChatError(null);
        const newUserMessage: ChatMessage = { role: 'user', content: query, image };
        setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], newUserMessage] }));
        setChatStatus('searching');
        try {
            const sourceNoteIds = await semanticSearchNotes(query, notes);
            const sourceNotes = sourceNoteIds.map(id => getNoteById(id)).filter((n): n is Note => !!n);
            setChatStatus('replying');
            const stream = await getStreamingChatResponse(query, sourceNotes, image);
            const newAiMessage: ChatMessage = { role: 'ai', content: '', sources: sourceNotes };
            setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], newAiMessage] }));

            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk.text;
                setChatHistories(prev => {
                    const currentModeHistory = [...prev[chatMode]];
                    if (currentModeHistory.length > 0) {
                        const lastMessage = currentModeHistory[currentModeHistory.length - 1];
                        if(lastMessage.role === 'ai') {
                             currentModeHistory[currentModeHistory.length - 1] = { ...lastMessage, content: fullResponse };
                        }
                    }
                    return { ...prev, [chatMode]: currentModeHistory };
                });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setChatError(errorMessage);
            const errorAiMessage: ChatMessage = { role: 'ai', content: `Sorry, I ran into an error: ${errorMessage}` };
            setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], errorAiMessage] }));
        } finally {
            setChatStatus('idle');
        }
    }, [chatMode, getNoteById, notes]);

    const onGenerateServiceResponse = useCallback(async (customerQuery: string, image?: string) => {
        setChatError(null);
        const newUserMessage: ChatMessage = { role: 'user', content: customerQuery, image };
        setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], newUserMessage] }));
        setChatStatus('searching');
        try {
            const sourceNoteIds = await semanticSearchNotes(customerQuery, notes);
            const sourceNotes = sourceNoteIds.map(id => getNoteById(id)).filter((n): n is Note => !!n);
            setChatStatus('replying');
            const responseText = await generateCustomerResponse(customerQuery, sourceNotes, image);
            setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], { role: 'ai', content: responseText, sources: sourceNotes }] }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setChatError(errorMessage);
            setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], { role: 'ai', content: `Sorry, I ran into an error: ${errorMessage}` }] }));
        } finally {
            setChatStatus('idle');
        }
    }, [chatMode, getNoteById, notes]);

    const onSendGeneralMessage = useCallback(async (query: string, image?: string) => {
        setChatError(null);
        const userMessage: ChatMessage = { role: 'user', content: query, image, status: 'processing' };
        setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], userMessage] }));
        let lastTouchedNoteId: string | null = null;

        try {
            const chat = getGeneralChatSession();
            let response = await chat.sendMessage({ message: query });
            
            while (response.functionCalls && response.functionCalls.length > 0) {
                setChatStatus('using_tool');
                const functionResponses = [];
                const pendingToolMessages: ChatMessage[] = response.functionCalls.map(fc => ({
                    role: 'tool',
                    content: { name: fc.name, args: fc.args, status: 'pending' }
                }));
                setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], ...pendingToolMessages] }));

                for (const fc of response.functionCalls) {
                    let result: any;
                    let status: 'complete' | 'error' = 'complete';
                    try {
                        switch (fc.name) {
                            case 'createNote':
                                const title = String(fc.args.title || 'Untitled Note');
                                const content = String(fc.args.content || '');
                                const newNoteId = await onAddNote(null, title, content);
                                result = { success: true, noteId: newNoteId };
                                lastTouchedNoteId = newNoteId;
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
                                    throw new Error("Note not found.");
                                }
                                break;
                            case 'updateNote':
                                const noteIdToUpdate = String(fc.args.noteId || '');
                                const noteToUpdate = getNoteById(noteIdToUpdate);
                                if (noteToUpdate) {
                                    const updatedFields: { title?: string, content?: string } = {};
                                    if (fc.args.title) updatedFields.title = String(fc.args.title);
                                    if (fc.args.content) updatedFields.content = String(fc.args.content);
                                    
                                    if (Object.keys(updatedFields).length > 0) {
                                        await updateNoteInStore(noteIdToUpdate, updatedFields);
                                        result = { success: true, noteId: noteIdToUpdate };
                                        lastTouchedNoteId = noteIdToUpdate;
                                        showToast({ message: `Note "${updatedFields.title || noteToUpdate.title}" updated!`, type: 'success' });
                                    } else {
                                        throw new Error("No fields to update were provided.");
                                    }
                                } else {
                                    throw new Error("Note not found.");
                                }
                                break;
                            case 'deleteNote':
                                const noteIdToDelete = String(fc.args.noteId || '');
                                const noteToDeleteInstance = getNoteById(noteIdToDelete);
                                if (noteToDeleteInstance) {
                                    await deleteNote(noteIdToDelete);
                                    if (activeNoteId === noteIdToDelete) setActiveNoteId(null);
                                    result = { success: true, noteId: noteIdToDelete };
                                    showToast({ message: `Note "${noteToDeleteInstance.title}" moved to trash!`, type: 'success' });
                                } else {
                                    throw new Error("Note not found.");
                                }
                                break;
                             case 'createCollection':
                                const name = String(fc.args.name || 'New Folder');
                                const parentId = fc.args.parentId ? String(fc.args.parentId) : null;
                                const newCollectionId = await store.addCollection(name, parentId);
                                result = { success: true, collectionId: newCollectionId };
                                showToast({ message: `Folder "${name}" created!`, type: 'success' });
                                break;
                            case 'findCollections':
                                const collectionQuery = String(fc.args.query || '').toLowerCase();
                                const foundCollections = collections
                                    .filter(c => c.name.toLowerCase().includes(collectionQuery))
                                    .map(c => ({ id: c.id, name: c.name }));
                                result = { collections: foundCollections };
                                break;
                            case 'moveNoteToCollection':
                                const noteIdToMove = String(fc.args.noteId || '');
                                const collectionId = fc.args.collectionId === null || fc.args.collectionId === 'null' ? null : String(fc.args.collectionId);
                                const noteToMove = getNoteById(noteIdToMove);
                                const collection = collectionId ? store.getCollectionById(collectionId) : { name: 'root' };
                                
                                if (noteToMove && (collection || collectionId === null)) {
                                    await store.moveItem(noteIdToMove, collectionId, 'inside');
                                    result = { success: true };
                                    showToast({ message: `Moved "${noteToMove.title}" to "${collection?.name}"`, type: 'success' });
                                } else {
                                    throw new Error("Note or destination folder not found.");
                                }
                                break;
                            default:
                                throw new Error(`Unknown function: ${fc.name}`);
                        }
                    } catch (toolError) {
                        result = { success: false, error: (toolError as Error).message };
                        status = 'error';
                    }

                    setChatHistories(prev => {
                        const newHistory = [...prev[chatMode]];
                        let lastPendingIndex = -1;
                        for (let i = newHistory.length - 1; i >= 0; i--) {
                            const msg = newHistory[i];
                            const content = msg.content;
                            if (
                                msg.role === 'tool' &&
                                typeof content === 'object' &&
                                content !== null &&
                                'name' in content && content.name === fc.name &&
                                'status' in content && content.status === 'pending'
                            ) {
                                lastPendingIndex = i;
                                break;
                            }
                        }
                        
                        if (lastPendingIndex !== -1) {
                            const msgToUpdate = newHistory[lastPendingIndex];
                            const currentContent = msgToUpdate.content;
                            if (typeof currentContent === 'object' && currentContent !== null) {
                                newHistory[lastPendingIndex] = {
                                    ...msgToUpdate,
                                    content: {
                                        ...currentContent,
                                        status,
                                        result,
                                    }
                                };
                            }
                        }
                        return { ...prev, [chatMode]: newHistory };
                    });
                    functionResponses.push({ id: fc.id, name: fc.name, response: { result }});
                }
                
                const functionResponseParts = functionResponses.map(({ name, response }) => ({
                    functionResponse: { name, response },
                }));
                response = await chat.sendMessage({ message: functionResponseParts });
            }

            if (response.text) {
                setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], { role: 'ai', content: response.text, noteId: lastTouchedNoteId }] }));
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setChatError(errorMessage);
            setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], { role: 'ai', content: `Sorry, I ran into an error: ${errorMessage}` }] }));
        } finally {
            setChatStatus('idle');
            setChatHistories(prev => {
                const newHistory = prev[chatMode].map(msg => msg === userMessage ? { ...msg, status: 'complete' } : msg);
                return { ...prev, [chatMode]: newHistory };
            });
        }
    }, [chatMode, onAddNote, notes, getNoteById, updateNoteInStore, showToast, deleteNote, activeNoteId, store, collections, setActiveNoteId]);

    const clearChat = useCallback(() => {
        setChatHistories(prev => ({ ...prev, [chatMode]: [] }));
        setChatError(null);
        setChatStatus('idle');
        if (chatMode === 'GENERAL') {
            resetGeneralChat();
        }
    }, [chatMode]);
    
    const chatValue = useMemo(() => ({
        chatMessages: chatHistories[chatMode] || [], 
        chatStatus, chatMode, setChatMode, 
        onSendMessage, onGenerateServiceResponse, onSendGeneralMessage, clearChat
    }), [
        chatHistories, chatMode, chatStatus, setChatMode,
        onSendMessage, onGenerateServiceResponse, onSendGeneralMessage, clearChat
    ]);

    return <ChatContext.Provider value={chatValue}>{children}</ChatContext.Provider>;
}

const EditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [editorActions, setEditorActions] = useState<EditorActions | null>(null);

    const registerEditorActions = useCallback((actions: EditorActions) => setEditorActions(actions), []);
    const unregisterEditorActions = useCallback(() => setEditorActions(null), []);

    const editorValue = useMemo(() => ({
        editorActions, registerEditorActions, unregisterEditorActions
    }), [editorActions, registerEditorActions, unregisterEditorActions]);

    return <EditorContext.Provider value={editorValue}>{children}</EditorContext.Provider>;
}


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <AuthProvider>
            <UIProvider>
                <StoreProvider>
                    <ChatProvider>
                        <EditorProvider>
                            {children}
                        </EditorProvider>
                    </ChatProvider>
                </StoreProvider>
            </UIProvider>
        </AuthProvider>
    );
};