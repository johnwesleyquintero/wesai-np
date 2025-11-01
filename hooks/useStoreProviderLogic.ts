import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Note, Collection, SmartCollection, SearchMode, TreeNode } from '../types';
import { useStore as useSupabaseStore } from './useStore';
import { useDebounce } from './useDebounce';
import { semanticSearchNotes } from '../services/geminiService';
import { useAuthContext, useUIContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useLocalNotes } from './useLocalNotes';
import { useRecentQueries } from './useRecentQueries';

const buildTree = (notes: Note[], collections: Collection[]): TreeNode[] => {
    const noteMap = new Map(notes.map(note => [note.id, { ...note, children: [] as TreeNode[] }]));
    const collectionMap = new Map(collections.map(c => [c.id, { ...c, type: 'collection' as const, children: [] as TreeNode[] }]));
    const tree: TreeNode[] = [];
    const allItemsMap: Map<string, TreeNode> = new Map([...noteMap, ...collectionMap] as [string, TreeNode][]);
    allItemsMap.forEach(item => {
        if (item.parentId === null) tree.push(item);
        else {
            const parent = collectionMap.get(item.parentId);
            if (parent) parent.children.push(item);
            else tree.push(item);
        }
    });
    const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
            const aIsCollection = 'type' in a && a.type === 'collection';
            const bIsCollection = 'type' in b && b.type === 'collection';
            if (aIsCollection && !bIsCollection) return -1;
            if (!aIsCollection && bIsCollection) return 1;
            const aName = aIsCollection ? (a as any).name : (a as any).title;
            const bName = bIsCollection ? (b as any).name : (b as any).title;
            return aName.localeCompare(bName, undefined, { sensitivity: 'base' });
        });
        nodes.forEach(node => {
            if ('children' in node && node.children.length > 0) sortNodes(node.children);
        });
    };
    sortNodes(tree);
    return tree;
};


export const useStoreProviderLogic = () => {
    const { session } = useAuthContext();
    const { isDemoMode, setView, isMobileView, setIsSidebarOpen, hideConfirmation, isAiEnabled } = useUIContext();
    const { showToast } = useToast();
    
    const supabaseStore = useSupabaseStore(session?.user);
    const localStore = useLocalNotes();
    const store = isDemoMode ? localStore : supabaseStore;

    const { notes, collections, getNoteById, deleteCollection, deleteNote, deleteSmartCollection, addNote: createNote, addNoteFromFile } = store;

    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchMode, setSearchMode] = useState<SearchMode>('KEYWORD');
    const [isAiSearching, setIsAiSearching] = useState(false);
    const [aiSearchError, setAiSearchError] = useState<string | null>(null);
    const [aiSearchResultIds, setAiSearchResultIds] = useState<string[] | null>(null);
    const [activeSmartCollectionId, setActiveSmartCollectionId] = useState<string | null>(null);
    const debouncedSearchTerm = useDebounce(searchTerm, 1000);
    const { queries: recentQueries, addQuery: addRecentQuery } = useRecentQueries();


    useEffect(() => {
        if (isDemoMode && notes.length > 0 && !activeNoteId) {
            setActiveNoteId(notes[0].id);
        }
    }, [isDemoMode, notes, activeNoteId]);

    useEffect(() => {
        if (debouncedSearchTerm.trim() && !activeSmartCollectionId) {
            addRecentQuery(debouncedSearchTerm.trim());
        }
    }, [debouncedSearchTerm, addRecentQuery, activeSmartCollectionId]);
    
    useEffect(() => {
        if (searchMode === 'AI' && debouncedSearchTerm.trim() && isAiEnabled) {
            const performAiSearch = async () => {
                setIsAiSearching(true);
                setAiSearchError(null);
                setAiSearchResultIds(null);
                try {
                    const resultIds = await semanticSearchNotes(debouncedSearchTerm, notes);
                    setAiSearchResultIds(resultIds);
                } catch (error) {
                    const message = error instanceof Error ? error.message : "An unknown AI search error occurred.";
                    showToast({ message, type: 'error' });
                    setAiSearchResultIds([]); // Clear results on error
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
    }, [debouncedSearchTerm, searchMode, notes, isAiEnabled, showToast]);
    
    const favoriteNotes = useMemo(() => notes.filter(n => n.isFavorite).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [notes]);

    const fileTree = useMemo(() => buildTree(notes, collections), [notes, collections]);

    const searchData = useMemo(() => {
        const isSearching = !!searchTerm.trim() || !!activeSmartCollectionId;
        if (!isSearching) return { isSearching: false, visibleIds: null, matchIds: null };
        const query = activeSmartCollectionId ? store.smartCollections.find(sc => sc.id === activeSmartCollectionId)?.query || '' : searchTerm;
        const currentSearchMode = activeSmartCollectionId ? 'AI' : searchMode;
        const matchIds = new Set<string>();
        if (currentSearchMode === 'KEYWORD') {
            const lowercasedQuery = query.toLowerCase();
            notes.forEach(note => { if (note.title.toLowerCase().includes(lowercasedQuery) || note.content.toLowerCase().includes(lowercasedQuery) || note.tags.some(tag => tag.toLowerCase().includes(lowercasedQuery))) matchIds.add(note.id); });
            collections.forEach(collection => { if (collection.name.toLowerCase().includes(lowercasedQuery)) matchIds.add(collection.id); });
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

    const handleDeleteNoteConfirm = useCallback(async (note: Note) => { await deleteNote(note.id); if (activeNoteId === note.id) setActiveNoteId(null); hideConfirmation(); }, [deleteNote, activeNoteId, hideConfirmation]);
    const handleDeleteCollectionConfirm = useCallback(async (collection: any) => { await deleteCollection(collection.id); hideConfirmation(); }, [deleteCollection, hideConfirmation]);
    const handleDeleteSmartCollectionConfirm = useCallback(async (smartCollection: SmartCollection) => { await deleteSmartCollection(smartCollection.id); hideConfirmation(); }, [deleteSmartCollection, hideConfirmation]);
    const handleActivateSmartCollection = useCallback((collection: SmartCollection) => {
        if (!isAiEnabled) {
            showToast({ message: "AI features are disabled in settings.", type: "error" });
            return;
        }
        setActiveSmartCollectionId(collection.id);
        const performAiSearch = async () => {
            setIsAiSearching(true);
            setAiSearchError(null);
            setAiSearchResultIds(null);
            try {
                const resultIds = await semanticSearchNotes(collection.query, notes);
                setAiSearchResultIds(resultIds);
            } catch (error) {
                const message = error instanceof Error ? error.message : "An unknown AI search error occurred.";
                showToast({ message, type: 'error' });
            } finally { setIsAiSearching(false); }
        };
        performAiSearch();
    }, [notes, isAiEnabled, showToast]);
    const handleSearchTermChange = useCallback((term: string) => { if (activeSmartCollectionId) setActiveSmartCollectionId(null); setSearchTerm(term); }, [activeSmartCollectionId]);
    const handleClearActiveSmartCollection = useCallback(() => { setActiveSmartCollectionId(null); setSearchTerm(''); }, []);

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