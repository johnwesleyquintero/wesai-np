
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Note, Collection, SmartCollection, SearchMode } from '../types';
import { useDebounce } from './useDebounce';
import { semanticSearchNotes } from '../services/geminiService';
import { useToast } from '../context/ToastContext';
import { useRecentQueries } from './useRecentQueries';

interface UseSearchLogicProps {
    notes: Note[];
    collections: Collection[];
    smartCollections: SmartCollection[];
    isAiEnabled: boolean;
}

export const useSearchLogic = ({ notes, collections, smartCollections, isAiEnabled }: UseSearchLogicProps) => {
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchMode, setSearchMode] = useState<SearchMode>('KEYWORD');
    const [isAiSearching, setIsAiSearching] = useState(false);
    const [aiSearchError, setAiSearchError] = useState<string | null>(null);
    const [aiSearchResultIds, setAiSearchResultIds] = useState<string[] | null>(null);
    const [activeSmartCollectionId, setActiveSmartCollectionId] = useState<string | null>(null);
    
    const debouncedSearchTerm = useDebounce(searchTerm, 1000);
    const { queries: recentQueries, addQuery: addRecentQuery } = useRecentQueries();

    // Add valid searches to recent history
    useEffect(() => {
        if (debouncedSearchTerm.trim() && !activeSmartCollectionId) {
            addRecentQuery(debouncedSearchTerm.trim());
        }
    }, [debouncedSearchTerm, addRecentQuery, activeSmartCollectionId]);

    // Handle AI Search Execution
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
                    setAiSearchResultIds([]);
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

    // Calculate Visibility Data (The "View" Logic)
    const searchData = useMemo(() => {
        const isSearching = !!searchTerm.trim() || !!activeSmartCollectionId;
        
        if (!isSearching) {
            return { isSearching: false, visibleIds: null, matchIds: null };
        }

        const query = activeSmartCollectionId 
            ? smartCollections.find(sc => sc.id === activeSmartCollectionId)?.query || '' 
            : searchTerm;
            
        const currentSearchMode = activeSmartCollectionId ? 'AI' : searchMode;
        const matchIds = new Set<string>();

        if (currentSearchMode === 'KEYWORD') {
            const lowercasedQuery = query.toLowerCase();
            notes.forEach(note => { 
                if (note.title.toLowerCase().includes(lowercasedQuery) || 
                    note.content.toLowerCase().includes(lowercasedQuery) || 
                    note.tags.some(tag => tag.toLowerCase().includes(lowercasedQuery))) {
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
        
        // Ensure parents of matched items are visible
        matchIds.forEach(id => {
            let current = itemMap.get(id);
            while (current && current.parentId) {
                visibleIds.add(current.parentId);
                current = itemMap.get(current.parentId);
            }
        });

        return { isSearching, visibleIds, matchIds };
    }, [searchTerm, searchMode, aiSearchResultIds, notes, collections, activeSmartCollectionId, smartCollections]);

    // Smart Collection Handlers
    const activeSmartCollection = useMemo(() => 
        activeSmartCollectionId ? smartCollections.find(sc => sc.id === activeSmartCollectionId) : null, 
    [activeSmartCollectionId, smartCollections]);

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

    const handleSearchTermChange = useCallback((term: string) => { 
        if (activeSmartCollectionId) setActiveSmartCollectionId(null); 
        setSearchTerm(term); 
    }, [activeSmartCollectionId]);

    const handleClearActiveSmartCollection = useCallback(() => { 
        setActiveSmartCollectionId(null); 
        setSearchTerm(''); 
    }, []);

    return {
        searchTerm,
        handleSearchTermChange,
        searchMode,
        setSearchMode,
        isAiSearching,
        aiSearchError,
        activeSmartCollection,
        handleActivateSmartCollection,
        handleClearActiveSmartCollection,
        searchData,
        recentQueries
    };
};