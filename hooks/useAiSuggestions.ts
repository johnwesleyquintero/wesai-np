import { useState, useEffect, useRef, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import { suggestTags, suggestTitle } from '../services/geminiService';

type EditorState = { title: string; content: string; tags: string[] };

const MIN_CONTENT_LENGTH_FOR_SUGGESTIONS = 50;

export const useAiSuggestions = (
    editorState: EditorState,
    isAiRateLimited: boolean
) => {
    const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
    const [isSuggestingTags, setIsSuggestingTags] = useState(false);
    const [tagSuggestionError, setTagSuggestionError] = useState<string | null>(null);
    const [suggestedTitle, setSuggestedTitle] = useState<string | null>(null);
    const [isSuggestingTitle, setIsSuggestingTitle] = useState(false);
    const [titleSuggestionError, setTitleSuggestionError] = useState<string | null>(null);

    const lastAnalyzedContentForTagsRef = useRef<string | null>(null);
    const lastAnalyzedContentForTitleRef = useRef<string | null>(null);
    const tagSuggestionIdRef = useRef(0);
    const titleSuggestionIdRef = useRef(0);
    
    const debouncedEditorState = useDebounce(editorState, 5000);

    // Effect for automatic suggestions on debounced state change
    useEffect(() => {
        if (isAiRateLimited) return;
        
        const contentForAnalysis = debouncedEditorState.content;
        if (contentForAnalysis.length >= MIN_CONTENT_LENGTH_FOR_SUGGESTIONS) {
            const isGenericTitle = debouncedEditorState.title.trim().toLowerCase() === 'untitled note';
            
            if (isGenericTitle && contentForAnalysis !== lastAnalyzedContentForTitleRef.current) {
                // Call the manual trigger function
                suggestTitleForFullNote(contentForAnalysis);
            } else if (!isGenericTitle) {
                setSuggestedTitle(null);
            }
            
            if (contentForAnalysis !== lastAnalyzedContentForTagsRef.current && debouncedEditorState.tags.length === 0) {
                 // Call the manual trigger function
                suggestTagsForFullNote(debouncedEditorState.title, contentForAnalysis);
            }
        }
    }, [debouncedEditorState, isAiRateLimited]);

    const suggestTagsForFullNote = useCallback((title: string, content: string) => {
        const currentSuggestionId = ++tagSuggestionIdRef.current;
        lastAnalyzedContentForTagsRef.current = content;

        setIsSuggestingTags(true);
        setTagSuggestionError(null);
        setSuggestedTags([]);

        suggestTags(title, content).then(tags => {
            if (currentSuggestionId === tagSuggestionIdRef.current) {
                const newSuggestions = tags.filter(tag => !editorState.tags.includes(tag));
                setSuggestedTags(newSuggestions);
            }
        }).catch(err => {
            if (currentSuggestionId === tagSuggestionIdRef.current) setTagSuggestionError(err.message);
        }).finally(() => {
            if (currentSuggestionId === tagSuggestionIdRef.current) setIsSuggestingTags(false);
        });
    }, [editorState.tags]);

    const suggestTitleForFullNote = useCallback((content: string) => {
        const currentSuggestionId = ++titleSuggestionIdRef.current;
        lastAnalyzedContentForTitleRef.current = content;

        setIsSuggestingTitle(true);
        setTitleSuggestionError(null);
        setSuggestedTitle(null);

        suggestTitle(content).then(title => {
            if (currentSuggestionId === titleSuggestionIdRef.current && title) setSuggestedTitle(title);
        }).catch(err => {
            if (currentSuggestionId === titleSuggestionIdRef.current) setTitleSuggestionError(err.message);
        }).finally(() => {
            if (currentSuggestionId === titleSuggestionIdRef.current) setIsSuggestingTitle(false);
        });
    }, []);

    // Function to reset state for a new note
    const resetAiSuggestions = useCallback(() => {
        setSuggestedTags([]);
        setTagSuggestionError(null);
        setSuggestedTitle(null);
        setTitleSuggestionError(null);
        tagSuggestionIdRef.current += 1;
        titleSuggestionIdRef.current += 1;
        lastAnalyzedContentForTagsRef.current = null;
        lastAnalyzedContentForTitleRef.current = null;
    }, []);

    return {
        suggestedTags, isSuggestingTags, tagSuggestionError,
        suggestedTitle, isSuggestingTitle, titleSuggestionError,
        setSuggestedTags, setSuggestedTitle, setTitleSuggestionError,
        suggestTagsForFullNote, suggestTitleForFullNote, resetAiSuggestions,
    };
};
