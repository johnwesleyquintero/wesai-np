import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Note } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import { semanticSearchNotes } from '../services/geminiService';
import { useStoreContext, useUIContext } from '../context/AppContext';
import { SparklesIcon, DocumentTextIcon } from './Icons';

interface RelatedNotesProps {
    note: Note;
}

const MIN_CONTENT_LENGTH_FOR_SUGGESTIONS = 100;

const RelatedNotes: React.FC<RelatedNotesProps> = ({ note }) => {
    const { notes: allNotes, setActiveNoteId, logAiSuggestionEvent } = useStoreContext();
    const { setView, isAiRateLimited } = useUIContext();

    const [relatedNoteIds, setRelatedNoteIds] = useState<string[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const debouncedContent = useDebounce(note.content, 2000);
    const searchIdRef = useRef(0);
    const lastSearchedContentRef = useRef<string | null>(null);
    const loggedImpressionsRef = useRef<string[] | null>(null);

    useEffect(() => {
        // Reset logged impressions when the note changes
        loggedImpressionsRef.current = null;
    }, [note.id]);

    useEffect(() => {
        if (isAiRateLimited) {
            return;
        }

        const contentToSearch = debouncedContent;
        if (contentToSearch.length < MIN_CONTENT_LENGTH_FOR_SUGGESTIONS || contentToSearch === lastSearchedContentRef.current) {
            if (contentToSearch.length < MIN_CONTENT_LENGTH_FOR_SUGGESTIONS) {
                 setRelatedNoteIds(null); // Clear if content becomes too short
            }
            return;
        }

        const fetchRelated = async () => {
            const currentSearchId = ++searchIdRef.current;
            lastSearchedContentRef.current = contentToSearch;
            setIsLoading(true);
            setError(null);
            try {
                const searchQuery = `${note.title}\n${contentToSearch}`;
                const ids = await semanticSearchNotes(searchQuery, allNotes);
                
                if (currentSearchId === searchIdRef.current) {
                    const filteredIds = ids.filter(id => id !== note.id).slice(0, 3);
                    setRelatedNoteIds(filteredIds);
                }
            } catch (err) {
                 if (currentSearchId === searchIdRef.current) {
                    setError(err instanceof Error ? err.message : 'An unknown error occurred.');
                    setRelatedNoteIds([]);
                 }
            } finally {
                 if (currentSearchId === searchIdRef.current) {
                    setIsLoading(false);
                 }
            }
        };

        fetchRelated();
    }, [debouncedContent, note.id, note.title, allNotes, isAiRateLimited]);

    const relatedNotes = useMemo(() => {
        if (!relatedNoteIds) return [];
        const noteMap = new Map(allNotes.map(n => [n.id, n]));
        return relatedNoteIds.map(id => noteMap.get(id)).filter((n): n is Note => !!n);
    }, [relatedNoteIds, allNotes]);

    useEffect(() => {
        // Log impressions only when the list of suggestions actually changes.
        if (relatedNoteIds && relatedNoteIds.length > 0 && JSON.stringify(relatedNoteIds) !== JSON.stringify(loggedImpressionsRef.current)) {
            relatedNoteIds.forEach(suggestedId => {
                logAiSuggestionEvent(note.id, suggestedId, false);
            });
            loggedImpressionsRef.current = relatedNoteIds;
        }
    }, [relatedNoteIds, note.id, logAiSuggestionEvent]);

    const handleSelectNote = (noteId: string) => {
        logAiSuggestionEvent(note.id, noteId, true);
        setActiveNoteId(noteId);
        setView('NOTES');
    };

    if (isLoading) {
        return (
            <div className="mt-8 pt-4 border-t border-light-border dark:border-dark-border animate-pulse">
                <h3 className="text-sm font-semibold text-light-text/80 dark:text-dark-text/80 mb-3 flex items-center">
                    <SparklesIcon className="w-4 h-4 mr-2 text-light-primary dark:text-dark-primary" />
                    Finding Related Notes...
                </h3>
                <div className="space-y-2">
                    <div className="h-10 bg-light-ui dark:bg-dark-ui rounded-md"></div>
                    <div className="h-10 bg-light-ui dark:bg-dark-ui rounded-md"></div>
                </div>
            </div>
        );
    }
    
    if (error) {
         return (
             <div className="mt-8 pt-4 border-t border-light-border dark:border-dark-border">
                <h3 className="text-sm font-semibold text-red-500 mb-2">Could not find related notes.</h3>
                <p className="text-xs text-light-text/60 dark:text-dark-text/60">{error}</p>
             </div>
         )
    }

    if (!relatedNotes || relatedNotes.length === 0) {
        return null;
    }

    return (
        <div className="mt-8 pt-4 border-t border-light-border dark:border-dark-border">
            <h3 className="text-sm font-semibold text-light-text/80 dark:text-dark-text/80 mb-3 flex items-center">
                <SparklesIcon className="w-4 h-4 mr-2 text-light-primary dark:text-dark-primary" />
                AI-Suggested Related Notes
            </h3>
            <div className="space-y-2">
                {relatedNotes.map((relatedNote) => (
                    <button
                        key={relatedNote.id}
                        onClick={() => handleSelectNote(relatedNote.id)}
                        className="w-full text-left p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors flex items-center"
                    >
                        <DocumentTextIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="font-medium text-sm truncate">{relatedNote.title}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default RelatedNotes;