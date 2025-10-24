import { useCallback } from 'react';
import { performInlineEdit, summarizeAndExtractActions, enhanceText, InlineAction } from '../services/geminiService';
import { NoteEditorUIState, NoteEditorAction } from './useNoteEditorReducer';

type EditorState = { title: string; content: string; tags: string[] };
type Dispatch = React.Dispatch<NoteEditorAction>;

export const useAiActions = (
    editorState: EditorState,
    setEditorState: (newState: EditorState, options?: { addToHistory: boolean }) => void,
    dispatch: Dispatch
) => {
    const applyAiActionToFullNote = useCallback(async (action: InlineAction) => {
        dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: `Applying: ${action}...` });
        dispatch({ type: 'SET_AI_ACTION_ERROR', payload: null });
        try {
            const newContent = await performInlineEdit(editorState.content, action);
            setEditorState({ ...editorState, content: newContent });
        } catch (error) {
            dispatch({ type: 'SET_AI_ACTION_ERROR', payload: error instanceof Error ? error.message : 'An unknown error occurred.' });
        } finally {
            dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: null });
        }
    }, [editorState, setEditorState, dispatch]);
    
    const summarizeAndFindActionForFullNote = useCallback(async () => {
        dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: 'Summarizing...' });
        dispatch({ type: 'SET_AI_ACTION_ERROR', payload: null });
        try {
            const { summary, actionItems } = await summarizeAndExtractActions(editorState.content);
            let formattedSummary = '';
            if (summary) formattedSummary += `### ✨ AI Summary\n\n${summary}\n\n`;
            if (actionItems && actionItems.length > 0) formattedSummary += `### ✅ Action Items\n\n${actionItems.map(item => `- [ ] ${item}`).join('\n')}\n\n`;
            if (formattedSummary) {
                const newContent = `---\n\n${formattedSummary}---\n\n${editorState.content}`;
                setEditorState({ ...editorState, content: newContent });
            }
        } catch (error) {
            dispatch({ type: 'SET_AI_ACTION_ERROR', payload: error instanceof Error ? error.message : 'An unknown error occurred.' });
        } finally {
            dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: null });
        }
    }, [editorState, setEditorState, dispatch]);

    const handleEnhanceNote = useCallback(async (tone: string) => {
        if (!tone.trim()) return;
        dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: `Enhancing text with ${tone} tone...` });
        dispatch({ type: 'SET_AI_ACTION_ERROR', payload: null });
        try {
            const enhancedContent = await enhanceText(editorState.content, tone);
            setEditorState({ ...editorState, content: enhancedContent });
        } catch (error) {
            dispatch({ type: 'SET_AI_ACTION_ERROR', payload: error instanceof Error ? error.message : 'An unknown error occurred.' });
        } finally {
            dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: null });
        }
    }, [editorState, setEditorState, dispatch]);

    const handleInlineAiAction = useCallback(async (action: InlineAction, selection: NonNullable<NoteEditorUIState['selection']>) => {
        dispatch({ type: 'SET_AI_ACTION_LOADING', payload: true });
        dispatch({ type: 'SET_AI_ACTION_ERROR', payload: null });
        try {
            const newText = await performInlineEdit(selection.text, action);
            const currentContent = editorState.content;
            const updatedContent = currentContent.substring(0, selection.start) + newText + currentContent.substring(selection.end);
            setEditorState({ ...editorState, content: updatedContent });
            // Returning the new cursor position for the component to handle
            return selection.start + newText.length;
        } catch (error) {
            dispatch({ type: 'SET_AI_ACTION_ERROR', payload: error instanceof Error ? error.message : 'An unknown error occurred.' });
            return null;
        } finally {
            dispatch({ type: 'SET_AI_ACTION_LOADING', payload: false });
        }
    }, [editorState, setEditorState, dispatch]);

    return {
        applyAiActionToFullNote,
        summarizeAndFindActionForFullNote,
        handleEnhanceNote,
        handleInlineAiAction,
    };
};
