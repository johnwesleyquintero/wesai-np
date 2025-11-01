import { useState, useEffect, useRef } from 'react';
import { SpellingError } from '../types';
import { useDebounce } from './useDebounce';
import { findMisspelledWords, getSpellingSuggestions } from '../services/geminiService';

export type ActiveSpellingError = { error: SpellingError; rect: DOMRect };

export const useSpellcheck = (content: string, isDisabled: boolean) => {
    const [spellingErrors, setSpellingErrors] = useState<SpellingError[]>([]);
    const [isCheckingSpelling, setIsCheckingSpelling] = useState(false);
    const [activeSpellingError, setActiveSpellingError] = useState<ActiveSpellingError | null>(null);
    const [spellingSuggestions, setSpellingSuggestions] = useState<string[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [suggestionError, setSuggestionError] = useState<string | null>(null);

    const debouncedContentForSpelling = useDebounce(content, 1500);
    const spellingCheckIdRef = useRef(0);
    const lastAnalyzedContentForSpellingRef = useRef<string|null>(null);

    useEffect(() => {
        // When content changes, invalidate old errors immediately
        // to prevent highlights on incorrect positions.
        setSpellingErrors([]);
        setActiveSpellingError(null);
    }, [content]);

    // Debounced spell check
    useEffect(() => {
        if (isDisabled) {
            setSpellingErrors([]);
            return;
        }
        
        const contentForSpelling = debouncedContentForSpelling;
        if (contentForSpelling && contentForSpelling !== lastAnalyzedContentForSpellingRef.current) {
            const currentCheckId = ++spellingCheckIdRef.current;
            setIsCheckingSpelling(true);
            findMisspelledWords(contentForSpelling)
                .then(errors => {
                    if (currentCheckId === spellingCheckIdRef.current) {
                        lastAnalyzedContentForSpellingRef.current = contentForSpelling;
                        setSpellingErrors(errors);
                    }
                })
                .catch(err => {
                    // Gracefully handle API errors for spellchecking without showing a toast,
                    // as it could be too noisy for the user. A console warning is sufficient.
                    if (currentCheckId === spellingCheckIdRef.current) {
                        console.warn('Spellcheck analysis failed:', err);
                        setSpellingErrors([]); // Ensure no stale errors are shown
                    }
                })
                .finally(() => {
                    if (currentCheckId === spellingCheckIdRef.current) {
                        setIsCheckingSpelling(false);
                    }
                });
        } else if (!contentForSpelling) {
             setSpellingErrors([]);
        }
    }, [debouncedContentForSpelling, isDisabled]);

    // Fetch suggestions when an error is activated
    useEffect(() => {
        if (!activeSpellingError) return;
        setIsLoadingSuggestions(true);
        setSuggestionError(null);
        getSpellingSuggestions(activeSpellingError.error.word)
            .then(setSpellingSuggestions)
            .catch(err => setSuggestionError(err.message))
            .finally(() => setIsLoadingSuggestions(false));
    }, [activeSpellingError]);

    return {
        spellingErrors,
        isCheckingSpelling,
        activeSpellingError,
        setActiveSpellingError,
        spellingSuggestions,
        isLoadingSuggestions,
        suggestionError,
    };
};
