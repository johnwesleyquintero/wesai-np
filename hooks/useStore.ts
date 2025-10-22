import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Note, Collection, SmartCollection, Template, AuthSession, NoteVersion, ChatMessage } from '../types';
import { useToast } from '../context/ToastContext';
import { getStreamingChatResponse, generateCustomerResponse, getGeneralChatSession, resetGeneralChat } from '../services/geminiService';
import { PostgrestError } from '@supabase/supabase-js';

export interface UseStoreReturn {
    // State
    notes: Note[];
    collections: Collection[];
    smartCollections: SmartCollection[];
    templates: Template[];
    activeNote: Note | null;
    isLoading: boolean;
    session: AuthSession | null;
    chatMessages: ChatMessage[];
    chatStatus: 'idle' | 'searching' | 'replying' | 'using_tool';
    
    // Actions
    onAddNote: (parentId?: string | null, title?: string, content?: string) => Promise<string | undefined>;
    updateNote: (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'tags'>>) => void;
    deleteNote: (id: string) => void;
    deleteNotes: (ids: string[]) => void;
    toggleFavorite: (id: string) => void;
    togglePinned: (id: string) => void;
    onAddCollection: (parentId: string | null) => void;
    updateCollection: (id: string, updates: Partial<Collection>) => void;
    deleteCollection: (id: string) => void;
    onAddSmartCollection: () => void;
    updateSmartCollection: (id: string, updates: Partial<SmartCollection>) => void;
    deleteSmartCollection: (id: string) => void;
    onMoveItem: (draggedId: string, targetId: string | null, position: 'top' | 'bottom' | 'inside') => void;
    setActiveNoteId: (id: string | null) => void;
    onRestoreVersion: (noteId: string, version: NoteVersion) => void;
    getNoteById: (id: string) => Note | undefined;

    // Templates
    addTemplate: (title: string, content: string) => void;
    updateTemplate: (id: string, updates: Partial<Omit<Template, 'id'>>) => void;
    deleteTemplate: (id: string) => void;

    // Chat
    onSendMessage: (query: string, image?: string | null) => void;
    onGenerateServiceResponse: (customerQuery: string, image?: string | null) => void;
    onSendGeneralMessage: (prompt: string, image?: string | null) => void;
    clearChat: () => void;
    
    // Bulk Actions
    selectedNoteIds: string[];
    bulkSelect: (noteId: string, type: 'single' | 'ctrl' | 'shift') => void;
    clearBulkSelect: () => void;
    notesToDelete: Note[] | null;
    setNotesToDelete: (notes: Note[] | null) => void;
    moveNotes: (noteIds: string[], collectionId: string | null) => void;
    addTagsToNotes: (noteIds: string[], tags: string[]) => void;
    
    // Data Import/Export
    importData: (data: any) => Promise<void>;
}


export const useStore = (): UseStoreReturn => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [smartCollections, setSmartCollections] = useState<SmartCollection[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [session, setSession] = useState<AuthSession | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatStatus, setChatStatus] = useState<'idle' | 'searching' | 'replying' | 'using_tool'>('idle');
    const { showToast } = useToast();
    
    const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
    const [notesToDelete, setNotesToDelete] = useState<Note[] | null>(null);
    const lastClickedIdRef = useRef<string | null>(null);
    
    const handleDbError = useCallback((error: PostgrestError, context: string) => {
        console.error(`Error in ${context}:`, error);
        showToast({ message: `Database error: ${error.message}`, type: 'error' });
    }, [showToast]);

    // --- Data Fetching ---
    const fetchData = useCallback(async (userId: string) => {
        setIsLoading(true);
        try {
            const [notesRes, collectionsRes, smartCollectionsRes, templatesRes] = await Promise.all([
                supabase.from('notes').select('*').eq('user_id', userId),
                supabase.from('collections').select('*').eq('user_id', userId),
                supabase.from('smart_collections').select('*').eq('user_id', userId),
                supabase.from('templates').select('*').eq('user_id', userId)
            ]);

            if (notesRes.error) throw notesRes.error;
            if (collectionsRes.error) throw collectionsRes.error;
            if (smartCollectionsRes.error) throw smartCollectionsRes.error;
            if (templatesRes.error) throw templatesRes.error;

            setNotes(notesRes.data as Note[]);
            setCollections(collectionsRes.data as Collection[]);
            setSmartCollections(smartCollectionsRes.data as SmartCollection[]);
            setTemplates(templatesRes.data as Template[]);
            
        } catch (error) {
            handleDbError(error as PostgrestError, 'initial data fetch');
        } finally {
            setIsLoading(false);
        }
    }, [handleDbError]);

    // --- Auth ---
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                fetchData(session.user.id);
            } else {
                // Clear data on logout
                setNotes([]);
                setCollections([]);
                setSmartCollections([]);
                setTemplates([]);
                setIsLoading(false);
                resetGeneralChat();
            }
        });
        return () => subscription.unsubscribe();
    }, [fetchData]);

    const getNoteById = useCallback((id: string) => notes.find(n => n.id === id), [notes]);
    const activeNote = activeNoteId ? notes.find(n => n.id === activeNoteId) ?? null : null;

    // --- Notes ---
    const onAddNote = async (parentId: string | null = null, title = 'Untitled Note', content = '') => {
        const userId = session?.user?.id;
        if (!userId) return;
        const newNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'history'> = {
            userId,
            title,
            content,
            isFavorite: false,
            isPinned: false,
            tags: [],
            parentId
        };
        const { data, error } = await supabase.from('notes').insert(newNote).select().single();
        if (error) {
            handleDbError(error, 'adding note');
            return;
        }
        if (data) {
            setNotes(prev => [...prev, data as Note]);
            setActiveNoteId(data.id);
            showToast({message: "Note created!", type: "success"});
            return data.id;
        }
    };

    const updateNote = useCallback(async (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'tags'>>) => {
        const originalNote = notes.find(n => n.id === id);
        if (!originalNote) return;
        
        // Don't save if nothing changed
        if (updates.title === originalNote.title && updates.content === originalNote.content && JSON.stringify(updates.tags) === JSON.stringify(originalNote.tags)) {
             return;
        }

        const currentVersion: NoteVersion = {
            savedAt: originalNote.updatedAt,
            title: originalNote.title,
            content: originalNote.content,
            tags: originalNote.tags
        };

        const newHistory = [currentVersion, ...(originalNote.history || [])].slice(0, 20); // Keep last 20 versions

        const { data, error } = await supabase.from('notes').update({ ...updates, history: newHistory, updatedAt: new Date().toISOString() }).eq('id', id).select().single();
        if (error) {
            handleDbError(error, 'updating note');
            // Revert optimistic update on error
            setNotes(currentNotes => currentNotes.map(n => n.id === id ? originalNote : n));
        } else if (data) {
             setNotes(currentNotes => currentNotes.map(n => n.id === id ? data as Note : n));
        }
    }, [notes, handleDbError]);
    
    const deleteNote = useCallback(async (id: string) => {
        setNotes(prev => prev.filter(n => n.id !== id));
        if (activeNoteId === id) setActiveNoteId(null);
        
        const { error } = await supabase.from('notes').delete().eq('id', id);
        if (error) {
            handleDbError(error, 'deleting note');
            // Note: Re-fetching might be a good strategy here to ensure consistency
        }
    }, [activeNoteId, handleDbError]);

    const deleteNotes = useCallback(async (ids: string[]) => {
        setNotes(prev => prev.filter(n => !ids.includes(n.id)));
        if (activeNoteId && ids.includes(activeNoteId)) setActiveNoteId(null);
        setSelectedNoteIds(prev => prev.filter(id => !ids.includes(id)));

        const { error } = await supabase.from('notes').delete().in('id', ids);
        if (error) handleDbError(error, 'deleting notes');
    }, [activeNoteId, handleDbError]);

    const toggleFavorite = useCallback(async (id: string) => {
        const note = notes.find(n => n.id === id);
        if (!note) return;
        const updatedNote = { ...note, isFavorite: !note.isFavorite };
        setNotes(prev => prev.map(n => n.id === id ? updatedNote : n));
        const { error } = await supabase.from('notes').update({ isFavorite: !note.isFavorite }).eq('id', id);
        if (error) handleDbError(error, 'toggling favorite');
    }, [notes, handleDbError]);
    
    const togglePinned = useCallback(async (id: string) => {
        const note = notes.find(n => n.id === id);
        if (!note) return;
        const updatedNote = { ...note, isPinned: !note.isPinned };
        setNotes(prev => prev.map(n => n.id === id ? updatedNote : n));
        const { error } = await supabase.from('notes').update({ isPinned: !note.isPinned }).eq('id', id);
        if (error) handleDbError(error, 'toggling pin');
    }, [notes, handleDbError]);

    const onRestoreVersion = useCallback(async (noteId: string, version: NoteVersion) => {
        const updates = { title: version.title, content: version.content, tags: version.tags };
        updateNote(noteId, updates);
    }, [updateNote]);
    
    // --- Collections ---
    const onAddCollection = async (parentId: string | null) => {
        const name = prompt('Enter new folder name:');
        if (!name || !session?.user?.id) return;
        const newCollection = { name, parentId, userId: session.user.id };
        const { data, error } = await supabase.from('collections').insert(newCollection).select().single();
        if (error) handleDbError(error, 'adding collection');
        else if (data) setCollections(prev => [...prev, data as Collection]);
    };
    const updateCollection = async (id: string, updates: Partial<Collection>) => {
        const { data, error } = await supabase.from('collections').update(updates).eq('id', id).select().single();
        if (error) handleDbError(error, 'updating collection');
        else if (data) setCollections(prev => prev.map(c => c.id === id ? data as Collection : c));
    };
    const deleteCollection = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this folder? All notes inside will be moved to the root.')) return;
        
        // Move child notes to root
        const notesToMove = notes.filter(n => n.parentId === id);
        if(notesToMove.length > 0) {
            const updates = notesToMove.map(n => supabase.from('notes').update({ parentId: null }).eq('id', n.id));
            await Promise.all(updates);
            setNotes(prev => prev.map(n => n.parentId === id ? {...n, parentId: null} : n));
        }

        const { error } = await supabase.from('collections').delete().eq('id', id);
        if (error) handleDbError(error, 'deleting collection');
        else setCollections(prev => prev.filter(c => c.id !== id));
    };
    
    // --- Smart Collections ---
    const [smartCollectionToEdit, setSmartCollectionToEdit] = useState<SmartCollection | null>(null);
    const onAddSmartCollection = () => setSmartCollectionToEdit({id: '', name: '', query: ''}); // Use a dummy object to open modal for creation
    const updateSmartCollection = async (id: string, updates: Partial<SmartCollection>) => {
        if (id) { // Editing existing
            const { data, error } = await supabase.from('smart_collections').update(updates).eq('id', id).select().single();
            if (error) handleDbError(error, 'updating smart collection');
            else if (data) setSmartCollections(prev => prev.map(sc => sc.id === id ? data as SmartCollection : sc));
        } else { // Creating new
             const { data, error } = await supabase.from('smart_collections').insert({ ...updates, userId: session?.user?.id }).select().single();
            if (error) handleDbError(error, 'adding smart collection');
            else if (data) setSmartCollections(prev => [...prev, data as SmartCollection]);
        }
    };
     const deleteSmartCollection = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this smart folder?')) return;
        const { error } = await supabase.from('smart_collections').delete().eq('id', id);
        if (error) handleDbError(error, 'deleting smart collection');
        else setSmartCollections(prev => prev.filter(sc => sc.id !== id));
    };


    // --- Drag and Drop ---
    const onMoveItem = async (draggedId: string, targetId: string | null, position: 'top' | 'bottom' | 'inside') => {
        // This is a complex operation. We need to handle moving notes and collections.
        // For simplicity, this example only handles moving notes into collections.
        const draggedItem = notes.find(n => n.id === draggedId) || collections.find(c => c.id === draggedId);
        if (!draggedItem) return;
        
        let newParentId: string | null;
        if (position === 'inside') {
            newParentId = targetId;
        } else {
            const targetItem = notes.find(n => n.id === targetId) || collections.find(c => c.id === targetId);
            newParentId = targetItem?.parentId ?? null;
        }

        const tableName = 'content' in draggedItem ? 'notes' : 'collections';
        
        const { error } = await supabase.from(tableName).update({ parentId: newParentId }).eq('id', draggedId);
        if (error) {
            handleDbError(error, 'moving item');
        } else {
            if (tableName === 'notes') {
                setNotes(prev => prev.map(n => n.id === draggedId ? { ...n, parentId: newParentId } : n));
            } else {
                 setCollections(prev => prev.map(c => c.id === draggedId ? { ...c, parentId: newParentId } : c));
            }
        }
    };
    
    // --- Templates ---
    const addTemplate = async (title: string, content: string) => {
        if (!session?.user?.id) return;
        const { data, error } = await supabase.from('templates').insert({ title, content, userId: session.user.id }).select().single();
        if (error) handleDbError(error, 'adding template');
        else if (data) setTemplates(p => [...p, data as Template]);
    };
    const updateTemplate = async (id: string, updates: Partial<Omit<Template, 'id'>>) => {
        const { data, error } = await supabase.from('templates').update(updates).eq('id', id).select().single();
        if (error) handleDbError(error, 'updating template');
        else if (data) setTemplates(p => p.map(t => t.id === id ? data as Template : t));
    };
    const deleteTemplate = async (id: string) => {
        const { error } = await supabase.from('templates').delete().eq('id', id);
        if (error) handleDbError(error, 'deleting template');
        else setTemplates(p => p.filter(t => t.id !== id));
    };

    // --- Chat ---
    const clearChat = () => {
        setChatMessages([]);
        resetGeneralChat();
    };

    const onSendMessage = async (query: string, image?: string | null) => {
        setChatMessages(prev => [...prev, { role: 'user', content: query, image }]);
        setChatStatus('searching');
        try {
            // This is a simplified search. A real implementation would use semantic search.
            const lowerQuery = query.toLowerCase();
            const contextNotes = notes.filter(n => n.title.toLowerCase().includes(lowerQuery) || n.content.toLowerCase().includes(lowerQuery)).slice(0, 5);
            
            setChatStatus('replying');
            const stream = await getStreamingChatResponse(query, contextNotes, image);
            
            let fullResponse = '';
            let aiMessage: ChatMessage = { role: 'ai', content: '', sources: contextNotes };
            setChatMessages(prev => [...prev, aiMessage]);

            for await (const chunk of stream) {
                fullResponse += chunk.text;
                setChatMessages(prev => prev.map((msg, index) =>
                    index === prev.length - 1 ? { ...msg, content: fullResponse } : msg
                ));
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "An unknown error occurred.";
            setChatMessages(prev => [...prev, { role: 'ai', content: `Error: ${message}` }]);
        } finally {
            setChatStatus('idle');
        }
    };

    const onGenerateServiceResponse = async (customerQuery: string, image?: string | null) => {
        setChatMessages(prev => [...prev, { role: 'user', content: customerQuery, image }]);
        setChatStatus('searching');
        try {
            const lowerQuery = customerQuery.toLowerCase();
            const contextNotes = notes.filter(n => n.title.toLowerCase().includes(lowerQuery) || n.content.toLowerCase().includes(lowerQuery)).slice(0, 5);
            setChatStatus('replying');
            const response = await generateCustomerResponse(customerQuery, contextNotes, image);
            setChatMessages(prev => [...prev, { role: 'ai', content: response, sources: contextNotes }]);
        } catch (error) {
            const message = error instanceof Error ? error.message : "An unknown error occurred.";
            setChatMessages(prev => [...prev, { role: 'ai', content: `Error: ${message}` }]);
        } finally {
            setChatStatus('idle');
        }
    };
    
    // This is a very simplified tool use implementation
    const handleToolCall = async (toolCall: any) => {
        // In a real app, you'd have a mapping of tool names to functions
        const { name, args } = toolCall;
        let result: any = { error: `Tool "${name}" not found.` };
        
        try {
            if (name === 'createNote') {
                const noteId = await onAddNote(null, args.title, args.content);
                result = { success: true, noteId };
            } else if (name === 'findNotes') {
                result = notes
                    .filter(n => n.title.toLowerCase().includes(args.query.toLowerCase()) || n.content.toLowerCase().includes(args.query.toLowerCase()))
                    .map(n => ({ id: n.id, title: n.title }));
            }
            // ... add other tool handlers here
        } catch (e) {
            result = { error: `Tool "${name}" failed to execute.`, details: (e as Error).message };
        }
        
        return { name, response: { result } };
    };

    const onSendGeneralMessage = async (prompt: string, image?: string | null) => {
        const userMessage: ChatMessage = { role: 'user', content: prompt, image, status: 'complete' };
        setChatMessages(prev => [...prev, userMessage]);
        setChatStatus('replying');

        try {
            const chat = getGeneralChatSession();
            let response = await chat.sendMessage({ message: prompt });
            
            while (response.functionCalls && response.functionCalls.length > 0) {
                 const toolCalls = response.functionCalls;
                 setChatMessages(prev => [...prev, { role: 'tool', content: { name: toolCalls[0].name, args: toolCalls[0].args, status: 'pending' }}]);
                 setChatStatus('using_tool');
                 
                 const toolResponses = await Promise.all(toolCalls.map(handleToolCall));

                 setChatMessages(prev => prev.map((msg, i) => i === prev.length - 1 ? { role: 'tool', content: { name: toolCalls[0].name, args: toolCalls[0].args, status: 'complete', result: toolResponses[0].response.result } } : msg));
                 setChatStatus('replying');

                 response = await chat.sendMessage({ tool_responses: toolResponses });
            }

            setChatMessages(prev => [...prev, { role: 'ai', content: response.text }]);

        } catch (error) {
            const message = error instanceof Error ? error.message : "An unknown error occurred.";
            setChatMessages(prev => [...prev, { role: 'ai', content: `Error: ${message}` }]);
        } finally {
            setChatStatus('idle');
        }
    };
    
    // --- Bulk Actions ---
    const bulkSelect = (noteId: string, type: 'single' | 'ctrl' | 'shift') => {
        const orderedNotes = notes; // In a real app, this should be the currently visible, ordered list of notes
        if (type === 'single') {
            setSelectedNoteIds([noteId]);
        } else if (type === 'ctrl') {
            setSelectedNoteIds(prev => prev.includes(noteId) ? prev.filter(id => id !== noteId) : [...prev, noteId]);
        } else if (type === 'shift' && lastClickedIdRef.current) {
             const lastIndex = orderedNotes.findIndex(n => n.id === lastClickedIdRef.current);
             const currentIndex = orderedNotes.findIndex(n => n.id === noteId);
             if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex);
                const end = Math.max(lastIndex, currentIndex);
                const idsToSelect = orderedNotes.slice(start, end + 1).map(n => n.id);
                setSelectedNoteIds(idsToSelect);
             }
        }
        lastClickedIdRef.current = noteId;
    };
    
    const clearBulkSelect = () => setSelectedNoteIds([]);
    
    const moveNotes = async (noteIds: string[], collectionId: string | null) => {
        const updates = noteIds.map(id => supabase.from('notes').update({ parentId: collectionId }).eq('id', id));
        const results = await Promise.all(updates);
        const error = results.find(r => r.error);

        if (error) {
            handleDbError(error.error, 'moving notes');
        } else {
            setNotes(prev => prev.map(n => noteIds.includes(n.id) ? { ...n, parentId: collectionId } : n));
            clearBulkSelect();
            showToast({ message: `${noteIds.length} note(s) moved.`, type: 'success' });
        }
    };
    
    const addTagsToNotes = async (noteIds: string[], tagsToAdd: string[]) => {
        const notesToUpdate = notes.filter(n => noteIds.includes(n.id));
        const updates = notesToUpdate.map(note => {
            const newTags = [...new Set([...note.tags, ...tagsToAdd])];
            return supabase.from('notes').update({ tags: newTags }).eq('id', note.id);
        });
        const results = await Promise.all(updates);
        const error = results.find(r => r.error);

        if (error) {
             handleDbError(error.error, 'adding tags');
        } else {
            setNotes(prev => prev.map(n => {
                if (noteIds.includes(n.id)) {
                    return { ...n, tags: [...new Set([...n.tags, ...tagsToAdd])] };
                }
                return n;
            }));
            clearBulkSelect();
            showToast({ message: `Tags added to ${noteIds.length} note(s).`, type: 'success' });
        }
    };
    
    // --- Import / Export ---
    const importData = async (data: any) => {
        const userId = session?.user?.id;
        if (!userId) throw new Error("User not authenticated.");
        
        // This is a simple "delete all and insert" strategy.
        // A more robust solution would handle conflicts.
        await supabase.from('notes').delete().eq('user_id', userId);
        await supabase.from('collections').delete().eq('user_id', userId);
        await supabase.from('smart_collections').delete().eq('user_id', userId);
        await supabase.from('templates').delete().eq('user_id', userId);
        
        const { error: noteError } = await supabase.from('notes').insert(data.notes.map((n: any) => ({...n, userId})));
        if (noteError) throw noteError;
        const { error: collectionError } = await supabase.from('collections').insert(data.collections.map((c: any) => ({...c, userId})));
        if (collectionError) throw collectionError;
        const { error: smartCollectionError } = await supabase.from('smart_collections').insert(data.smartCollections.map((sc: any) => ({...sc, userId})));
        if (smartCollectionError) throw smartCollectionError;
        const { error: templateError } = await supabase.from('templates').insert(data.templates.map((t: any) => ({...t, userId})));
        if (templateError) throw templateError;
    };


    return {
        notes, collections, smartCollections, templates, activeNote, isLoading, session, chatMessages, chatStatus,
        onAddNote, updateNote, deleteNote, deleteNotes, toggleFavorite, togglePinned, onAddCollection, updateCollection, deleteCollection,
        onAddSmartCollection, updateSmartCollection, deleteSmartCollection, onMoveItem,
        setActiveNoteId, onRestoreVersion, getNoteById,
        addTemplate, updateTemplate, deleteTemplate,
        onSendMessage, onGenerateServiceResponse, onSendGeneralMessage, clearChat,
        selectedNoteIds, bulkSelect, clearBulkSelect, notesToDelete, setNotesToDelete,
        moveNotes, addTagsToNotes,
        importData
    };
};