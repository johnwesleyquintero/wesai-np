import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Note, Collection, SmartCollection, SearchMode, TreeNode } from '../types';
import { useStore as useSupabaseStore } from './useStore';
import { useDebounce } from './useDebounce';
import { semanticSearchNotes } from '../services/geminiService';
import { useAuthContext, useUIContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

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


export const useStoreProviderLogic = () => {
    const { session } = useAuthContext();
    const store = useSupabaseStore(session?.user);
    const { notes, collections, getNoteById, deleteCollection, deleteNote, deleteSmartCollection, addNote: createNote, addNoteFromFile } = store;
    
    const { showToast } = useToast();
    const { setView, isMobileView, setIsSidebarOpen, hideConfirmation } = useUIContext();

    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchMode, setSearchMode] = useState<SearchMode>('KEYWORD');
    const [isAiSearching, setIsAiSearching] = useState(false);
    const [aiSearchError, setAiSearchError] = useState<string | null>(null);
    const [aiSearchResultIds, setAiSearchResultIds] = useState<string[] | null>(null);
    const [activeSmartCollectionId, setActiveSmartCollectionId] = useState<string | null>(null);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

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

    const handleDeleteNoteConfirm = useCallback(async (note: Note) => {
        await deleteNote(note.id);
        if (activeNoteId === note.id) setActiveNoteId(null);
        hideConfirmation();
    }, [deleteNote, activeNoteId, hideConfirmation]);

    const handleDeleteCollectionConfirm = useCallback(async (collection: Collection) => {
        const deletedNoteIds = await deleteCollection(collection.id);
        if (activeNoteId && deletedNoteIds.includes(activeNoteId)) setActiveNoteId(null);
        hideConfirmation();
    }, [deleteCollection, activeNoteId, hideConfirmation]);

    const handleDeleteSmartCollectionConfirm = useCallback(async (smartCollection: SmartCollection) => {
        await deleteSmartCollection(smartCollection.id);
        hideConfirmation();
    }, [deleteSmartCollection, hideConfirmation]);

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
        ...store, onAddNote, onAddNoteFromFile, fileTree,
        activeNoteId, setActiveNoteId, activeNote, favoriteNotes, searchData, searchTerm,
        handleSearchTermChange, searchMode, setSearchMode, isAiSearching, aiSearchError,
        activeSmartCollection, handleActivateSmartCollection, handleClearActiveSmartCollection,
        handleDeleteNoteConfirm, handleDeleteCollectionConfirm, handleDeleteSmartCollectionConfirm,
    }), [
        store, onAddNote, onAddNoteFromFile, fileTree,
        activeNoteId, setActiveNoteId, activeNote, favoriteNotes, searchData, searchTerm,
        handleSearchTermChange, searchMode, setSearchMode, isAiSearching, aiSearchError,
        activeSmartCollection, handleActivateSmartCollection, handleClearActiveSmartCollection,
        handleDeleteNoteConfirm, handleDeleteCollectionConfirm, handleDeleteSmartCollectionConfirm,
    ]);
    
    return storeValue;
}