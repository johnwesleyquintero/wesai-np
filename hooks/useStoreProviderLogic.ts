
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Note, Collection, SmartCollection } from '../types';
import { useStore as useSupabaseStore } from './useStore';
import { useAuthContext, useUIContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useLocalNotes } from './useLocalNotes';
import { buildTree } from '../lib/treeUtils';
import { useSearchLogic } from './useSearchLogic';

export const useStoreProviderLogic = () => {
    const { session } = useAuthContext();
    const { isDemoMode, setView, isMobileView, setIsSidebarOpen, hideConfirmation, isAiEnabled } = useUIContext();
    const { showToast } = useToast();
    
    const supabaseStore = useSupabaseStore(session?.user);
    const localStore = useLocalNotes();
    const store = isDemoMode ? localStore : supabaseStore;

    const { notes, collections, getNoteById, deleteCollection, deleteNote, deleteSmartCollection, addNote: createNote, addNoteFromFile, smartCollections } = store;

    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

    // --- Search Logic Integration ---
    const {
        searchTerm, handleSearchTermChange, searchMode, setSearchMode,
        isAiSearching, aiSearchError, activeSmartCollection,
        handleActivateSmartCollection, handleClearActiveSmartCollection,
        searchData, recentQueries
    } = useSearchLogic({ 
        notes, 
        collections, 
        smartCollections, 
        isAiEnabled 
    });

    useEffect(() => {
        if (isDemoMode && notes.length > 0 && !activeNoteId) {
            setActiveNoteId(notes[0].id);
        }
    }, [isDemoMode, notes, activeNoteId]);

    const favoriteNotes = useMemo(() => notes.filter(n => n.isFavorite).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [notes]);

    const fileTree = useMemo(() => buildTree(notes, collections), [notes, collections]);

    const activeNote = useMemo(() => activeNoteId ? getNoteById(activeNoteId) : null, [activeNoteId, getNoteById]);
    
    const activeNotePath = useMemo(() => {
        const path = new Set<string>();
        if (!activeNoteId) return path;
        
        const allItemsMap = new Map<string, Note | Collection>();
        notes.forEach(note => allItemsMap.set(note.id, note));
        collections.forEach(collection => allItemsMap.set(collection.id, collection));
    
        let current = allItemsMap.get(activeNoteId);
        if (current) {
            path.add(current.id);
            while (current.parentId) {
                path.add(current.parentId);
                current = allItemsMap.get(current.parentId);
                if (!current) break;
            }
        }
        return path;
    }, [activeNoteId, notes, collections]);

    const onAddNote = useCallback(async (parentId: string | null = null, title: string = "Untitled Note", content: string = "") => {
        const newNoteId = await createNote(parentId, title, content);
        setActiveNoteId(newNoteId);
        setView('NOTES');
        if (isMobileView) setIsSidebarOpen(false);
        showToast({ message: `Note "${title}" created!`, type: 'success' });
        return newNoteId;
    }, [createNote, isMobileView, showToast, setView, setIsSidebarOpen]);

    const onAddNoteFromFile = useCallback(async (title: string, content: string, parentId: string | null) => {
        const newNoteId = await addNoteFromFile(title, content, parentId);
        setActiveNoteId(newNoteId);
        setView('NOTES');
        if (isMobileView) setIsSidebarOpen(false);
        showToast({ message: `Imported "${title}"`, type: 'success'});
        return newNoteId;
    }, [addNoteFromFile, isMobileView, showToast, setView, setIsSidebarOpen]);

    const handleDeleteNoteConfirm = useCallback(async (note: Note) => {
        try {
            await deleteNote(note.id);
            if (activeNoteId === note.id) setActiveNoteId(null);
        } finally {
            hideConfirmation();
        }
    }, [deleteNote, activeNoteId, hideConfirmation]);

    const handleDeleteCollectionConfirm = useCallback(async (collection: any) => {
        try {
            await deleteCollection(collection.id);
        } finally {
            hideConfirmation();
        }
    }, [deleteCollection, hideConfirmation]);
    
    const handleDeleteSmartCollectionConfirm = useCallback(async (smartCollection: SmartCollection) => {
        try {
            await deleteSmartCollection(smartCollection.id);
        } finally {
            hideConfirmation();
        }
    }, [deleteSmartCollection, hideConfirmation]);

    return useMemo(() => ({
        ...store, onAddNote, onAddNoteFromFile, fileTree,
        activeNoteId, setActiveNoteId, activeNote, favoriteNotes, searchData, searchTerm,
        handleSearchTermChange, searchMode, setSearchMode, isAiSearching, aiSearchError,
        activeSmartCollection, handleActivateSmartCollection, handleClearActiveSmartCollection,
        handleDeleteNoteConfirm, handleDeleteCollectionConfirm, handleDeleteSmartCollectionConfirm,
        recentQueries,
        activeNotePath,
    }), [
        store, onAddNote, onAddNoteFromFile, fileTree,
        activeNoteId, activeNote, favoriteNotes, searchData, searchTerm,
        handleSearchTermChange, searchMode, isAiSearching, aiSearchError,
        activeSmartCollection, handleActivateSmartCollection, handleClearActiveSmartCollection,
        handleDeleteNoteConfirm, handleDeleteCollectionConfirm, handleDeleteSmartCollectionConfirm,
        recentQueries,
        activeNotePath,
    ]);
};