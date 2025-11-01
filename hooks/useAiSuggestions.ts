import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDebounce } from './useDebounce';
import { suggestTags, suggestTitle, suggestTitleAndTags } from '../services/geminiService';
import { useToast } from '../context/ToastContext';

type EditorState = { title: string; content: string; tags: string[] };

const MIN_CONTENT_LENGTH_FOR_SUGGESTIONS = 50;

export const useAiSuggestions = (
    editorState: EditorState,
    isDisabled: boolean
) => {
    const { showToast } = useToast();
    const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
    const [isSuggestingTags, setIsSuggestingTags] = useState(false);
    const [suggestedTitle, setSuggestedTitle] = useState<string | null>(null);
    const [isSuggestingTitle, setIsSuggestingTitle] = useState(false);

    const lastAnalyzedContentForTagsRef = useRef<string | null>(null);
    const lastAnalyzedContentForTitleRef = useRef<string | null>(null);
    const tagSuggestionIdRef = useRef(0);
    const titleSuggestionIdRef = useRef(0);
    
    const debouncedValue = useDebounce(JSON.stringify(editorState), 2000);
    const debouncedEditorState = useMemo(() => JSON.parse(debouncedValue), [debouncedValue]);

    const suggestTagsForFullNote = useCallback((title: string, content: string) => {
        if (isDisabled) return;
        const currentSuggestionId = ++tagSuggestionIdRef.current;
        lastAnalyzedContentForTagsRef.current = content;

        setIsSuggestingTags(true);
        setSuggestedTags([]);

        suggestTags(title, content).then(tags => {
            if (currentSuggestionId === tagSuggestionIdRef.current) {
                const newSuggestions = tags.filter(tag => !editorState.tags.includes(tag));
                setSuggestedTags(newSuggestions);
            }
        }).catch(err => {
            if (currentSuggestionId === tagSuggestionIdRef.current) {
                const message = err.message || 'Failed to suggest tags.';
                showToast({ message, type: 'error' });
            }
        }).finally(() => {
            if (currentSuggestionId === tagSuggestionIdRef.current) setIsSuggestingTags(false);
        });
    }, [editorState.tags, showToast, isDisabled]);

    const suggestTitleForFullNote = useCallback((content: string) => {
        if (isDisabled) return;
        const currentSuggestionId = ++titleSuggestionIdRef.current;
        lastAnalyzedContentForTitleRef.current = content;

        setIsSuggestingTitle(true);
        setSuggestedTitle(null);

        suggestTitle(content).then(title => {
            if (currentSuggestionId === titleSuggestionIdRef.current && title) setSuggestedTitle(title);
        }).catch(err => {
            if (currentSuggestionId === titleSuggestionIdRef.current) {
                 const message = err.message || 'Failed to suggest a title.';
                 showToast({ message, type: 'error' });
            }
        }).finally(() => {
            if (currentSuggestionId === titleSuggestionIdRef.current) setIsSuggestingTitle(false);
        });
    }, [showToast, isDisabled]);

    // Effect for automatic suggestions on debounced state change
    useEffect(() => {
        if (isDisabled) return;
        
        const contentForAnalysis = debouncedEditorState.content;
        if (contentForAnalysis.length < MIN_CONTENT_LENGTH_FOR_SUGGESTIONS) {
            return;
        }

        const isGenericTitle = debouncedEditorState.title.trim().toLowerCase() === 'untitled note';
        const hasNoTags = debouncedEditorState.tags.length === 0;
        
        const needsTitle = isGenericTitle && contentForAnalysis !== lastAnalyzedContentForTitleRef.current;
        const needsTags = hasNoTags && contentForAnalysis !== lastAnalyzedContentForTagsRef.current;

        if (!needsTitle && !needsTags) {
            if (!isGenericTitle) {
                setSuggestedTitle(null);
            }
            return;
        }

        const currentSuggestionId = ++tagSuggestionIdRef.current; // Use one ref for both
        titleSuggestionIdRef.current = currentSuggestionId;

        if (needsTitle && needsTags) {
            // Combined call
            lastAnalyzedContentForTitleRef.current = contentForAnalysis;
            lastAnalyzedContentForTagsRef.current = contentForAnalysis;
            setIsSuggestingTitle(true);
            setIsSuggestingTags(true);
            
            suggestTitleAndTags(contentForAnalysis).then(({ title, tags }) => {
                if (currentSuggestionId === titleSuggestionIdRef.current) {
                    setSuggestedTitle(title);
                    const newTagSuggestions = tags.filter(tag => !editorState.tags.includes(tag));
                    setSuggestedTags(newTagSuggestions);
                }
            }).catch(err => {
                if (currentSuggestionId === titleSuggestionIdRef.current) {
                    const message = err.message || 'Failed to generate suggestions.';
                    showToast({ message, type: 'error' });
                }
            }).finally(() => {
                if (currentSuggestionId === titleSuggestionIdRef.current) {
                    setIsSuggestingTitle(false);
                    setIsSuggestingTags(false);
                }
            });
        } else if (needsTitle) {
            suggestTitleForFullNote(contentForAnalysis);
        } else if (needsTags) {
            suggestTagsForFullNote(debouncedEditorState.title, contentForAnalysis);
        }

    }, [debouncedEditorState, isDisabled, editorState.tags, suggestTitleForFullNote, suggestTagsForFullNote, showToast]);

    // Function to reset state for a new note
    const resetAiSuggestions = useCallback(() => {
        setSuggestedTags([]);
        setSuggestedTitle(null);
        tagSuggestionIdRef.current += 1;
        titleSuggestionIdRef.current += 1;
        lastAnalyzedContentForTagsRef.current = null;
        lastAnalyzedContentForTitleRef.current = null;
    }, []);

    return {
        suggestedTags, isSuggestingTags,
        suggestedTitle, isSuggestingTitle,
        setSuggestedTags, setSuggestedTitle,
        suggestTagsForFullNote, suggestTitleForFullNote, resetAiSuggestions,
    };
};