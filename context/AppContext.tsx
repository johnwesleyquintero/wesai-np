import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Note, Template, Collection, SmartCollection, EditorActions, ContextMenuItem, SearchMode, ChatMessage, NoteVersion, AuthSession } from '../types';
import { useStore as useSupabaseStore } from '../hooks/useStore';
import { useDebounce } from '../hooks/useDebounce';
import { getStreamingChatResponse, semanticSearchNotes, generateCustomerResponse, getGeneralChatSession, resetGeneralChat } from '../services/geminiService';
import { useMobileView } from '../hooks/useMobileView';
import { useToast } from './ToastContext';
import { useApiKey } from '../hooks/useApiKey';
import { supabase } from '../lib/supabaseClient';

// Store Context
interface StoreContextType extends Omit<ReturnType<typeof useSupabaseStore>, 'deleteNote'> {
    deleteNote: (id: string) => Promise<void>;
    activeNoteId: string | null;
    setActiveNoteId: React.Dispatch<React.SetStateAction<string | null>>;
    activeNote: Note | null;
    favoriteNotes: Note[];
    searchResults: Note[] | null;
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
    triggerNoteImport: () => void;
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


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // UI State
    const [session, setSession] = useState<AuthSession | null>(null);
    const [isSessionLoading, setIsSessionLoading] = useState(true);
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Store Hook
    const store = useSupabaseStore(session?.user);
    const { 
        notes, collections, getNoteById, deleteCollection, deleteNote, 
        deleteSmartCollection, addNote: createNote, 
        addNoteFromFile, loading: isStoreLoading, updateNote: updateNoteInStore 
    } = store;
    
    const { showToast } = useToast();
    const { apiKey } = useApiKey();

    // Store State
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

    // Chat State
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatError, setChatError] = useState<string | null>(null);
    const [chatStatus, setChatStatus] = useState<'idle' | 'searching' | 'replying' | 'using_tool'>('idle');

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
        const onboardingComplete = localStorage.getItem('wesai-onboarding-complete') === 'true';
    
        // Run only for authenticated users who haven't completed onboarding, after the initial data load, and if they have no notes.
        if (!onboardingComplete && !isStoreLoading && session?.user && notes.length === 0 && collections.length === 0) {
            
            const createOnboardingNotes = async () => {
                try {
                    const secondNoteContent = `# This is a Linked Note\n\nYou've successfully navigated here from the welcome note!\n\nThis demonstrates how you can create a personal wiki or a "second brain" by connecting your thoughts and ideas.\n\nGo back to the welcome note by checking the "Linked Mentions" section at the bottom of this note.`;
                    const secondNoteId = await createNote(null, 'A Linked Note Example', secondNoteContent);
                    
                    const firstNoteContent = `# Welcome to WesAI Notepad, Brother!\n\nThis is your new digital command center. Here's a quick rundown of what you can do.\n\n## Write in Markdown\n\nYou can use Markdown to format your notes.\n\n- Use asterisks for **bold** and *italic* text.\n- Create lists like this one.\n- Use hashtags for headers.\n\n## Create To-Do Lists\n\n- [x] Learn about WesAI Notepad\n- [ ] Build my second brain\n- [ ] Conquer the world\n\n## Link Your Ideas\n\nCreate a network of knowledge by linking notes together. Just type \`[[\` to get started.\n\nHere's a link to another note I created for you: [[${secondNoteId}|A Linked Note Example]]\n\n## Use the AI Assistant\n\nSelect any text to get AI suggestions, or open the AI Chat to ask questions about your notes.\n\nTry this: highlight the text below, and in the popup menu, select **AI Assistant -> Make Shorter**.\n\n> WesAI Notepad is a sophisticated, high-performance software application designed to facilitate the seamless creation, organization, and retrieval of digital notes, leveraging advanced artificial intelligence capabilities to enhance user productivity and streamline complex information management workflows.`;
                    const firstNoteId = await createNote(null, 'Welcome to WesAI Notepad!', firstNoteContent);
                    setActiveNoteId(firstNoteId);
                    localStorage.setItem('wesai-onboarding-complete', 'true');
                } catch (error) {
                    console.error("Failed to create onboarding notes:", error);
                }
            };
    
            createOnboardingNotes();
        }
    }, [isStoreLoading, session, notes, collections, createNote]);

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
    
    const triggerNoteImport = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
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
            // Reset input value to allow importing the same file again
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };


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

    const favoriteNotes = useMemo(() => {
        return notes
            .filter(n => n.isFavorite)
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }, [notes]);

    const searchResults = useMemo(() => {
        if (!searchTerm.trim() && !activeSmartCollectionId) return null;

        const sortedNotes = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

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
        }
        return []; // Return empty array if AI search is pending or fails to find anything
    }, [notes, searchTerm, searchMode, aiSearchResultIds, activeSmartCollectionId]);

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
    const handleActivateSmartCollection = (collection: SmartCollection) => { setSearchTerm(collection.query); setSearchMode('AI'); setActiveSmartCollectionId(collection.id); };
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
        const userMessage: ChatMessage = { role: 'user', content: query, image, status: 'processing' };
        setChatMessages(prev => [...prev, userMessage]);
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
                setChatMessages(prev => [...prev, ...pendingToolMessages]);

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

                    setChatMessages(prev => prev.map(msg => {
                        if (msg.role === 'tool' && typeof msg.content === 'object' && msg.content.name === fc.name && msg.content.status === 'pending') {
                            return { ...msg, content: { ...msg.content, status, result } };
                        }
                        return msg;
                    }));

                    functionResponses.push({ id: fc.id, name: fc.name, response: { result }});
                }
                
                const functionResponseParts = functionResponses.map(({ name, response }) => ({
                    functionResponse: { name, response },
                }));
                response = await chat.sendMessage({ message: functionResponseParts });
            }

            if (response.text) {
                setChatMessages(prev => [...prev, { role: 'ai', content: response.text, noteId: lastTouchedNoteId }]);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setChatError(errorMessage);
            setChatMessages(prev => [...prev, { role: 'ai', content: `Sorry, I ran into an error: ${errorMessage}` }]);
        } finally {
            setChatStatus('idle');
            setChatMessages(prev => prev.map(msg => msg === userMessage ? { ...msg, status: 'complete' } : msg));
        }
    };


    const clearChat = useCallback(() => { setChatMessages([]); setChatError(null); setChatStatus('idle'); resetGeneralChat(); }, []);
    const toggleTheme = () => setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    const toggleSidebarCollapsed = () => setIsSidebarCollapsed(prev => !prev);
    const onToggleSidebar = useCallback(() => setIsSidebarOpen(p => !p), []);
    const openSettings = () => setIsSettingsOpen(true);
    const openSmartFolderModal = (folder: SmartCollection | null) => { setSmartFolderToEdit(folder); setIsSmartFolderModalOpen(true); };
    const onOpenContextMenu = (e: React.MouseEvent, items: ContextMenuItem[]) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, items }); };
    const closeWelcomeModal = () => { localStorage.setItem('wesai-seen-welcome', 'true'); setIsWelcomeModalOpen(false); };
    const registerEditorActions = (actions: EditorActions) => setEditorActions(actions);
    const unregisterEditorActions = () => setEditorActions(null);

    return (
        <StoreContext.Provider value={{
            ...store, onAddNote, onAddNoteFromFile, triggerNoteImport,
            activeNoteId, setActiveNoteId, activeNote, favoriteNotes, searchResults, searchTerm,
            handleSearchTermChange, searchMode, setSearchMode, isAiSearching, aiSearchError,
            activeSmartCollection, handleActivateSmartCollection, handleClearActiveSmartCollection,
            noteToDelete, setNoteToDelete, 
            collectionToDelete, setCollectionToDelete,
            smartCollectionToDelete, setSmartCollectionToDelete, handleDeleteNoteConfirm,
            handleDeleteCollectionConfirm, handleDeleteSmartCollectionConfirm,
            chatMessages, chatStatus, onSendMessage, onGenerateServiceResponse, onSendGeneralMessage, clearChat
        }}>
            <UIContext.Provider value={{
                session, isSessionLoading,
                theme, toggleTheme, view, setView, isMobileView, isSidebarOpen, setIsSidebarOpen,
                onToggleSidebar, isSidebarCollapsed, toggleSidebarCollapsed,
                isAiRateLimited, renamingItemId, setRenamingItemId, isSettingsOpen, setIsSettingsOpen,
                openSettings, isCommandPaletteOpen, setIsCommandPaletteOpen, isSmartFolderModalOpen,
                setIsSmartFolderModalOpen, smartFolderToEdit, openSmartFolderModal, contextMenu,
                setContextMenu, onOpenContextMenu, isWelcomeModalOpen, closeWelcomeModal, isApiKeyMissing: !apiKey,
            }}>
                <EditorContext.Provider value={{ editorActions, registerEditorActions, unregisterEditorActions }}>
                     <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileImport}
                        accept=".md,.txt,text/plain,text/markdown"
                        className="hidden"
                    />
                    {children}
                </EditorContext.Provider>
            </UIContext.Provider>
        </StoreContext.Provider>
    );
};