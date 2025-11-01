import React, { useCallback } from 'react';
import { performInlineEdit, summarizeAndExtractActions, enhanceText } from '../services/geminiService';
import { NoteEditorUIState, NoteEditorAction } from './useNoteEditorReducer';
import type { InlineAction } from '../types';
import { useToast } from '../context/ToastContext';

type EditorState = { title: string; content: string; tags: string[] };
type Dispatch = React.Dispatch<NoteEditorAction>;

export const useAiActions = (
    editorState: EditorState,
    setEditorState: (newState: EditorState) => void,
    dispatch: Dispatch
) => {
    const { showToast } = useToast();
    
    const applyAiActionToFullNote = useCallback(async (action: InlineAction) => {
        dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: `Applying: ${action}...` });
        try {
            const newContent = await performInlineEdit(editorState.content, action);
            setEditorState({ ...editorState, content: newContent });
        } catch (error) {
            showToast({ message: error instanceof Error ? error.message : 'An unknown error occurred.', type: 'error' });
        } finally {
            dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: null });
        }
    }, [editorState, setEditorState, dispatch, showToast]);
    
    const summarizeAndFindActionForFullNote = useCallback(async () => {
        dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: 'Summarizing...' });
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
            showToast({ message: error instanceof Error ? error.message : 'An unknown error occurred.', type: 'error' });
        } finally {
            dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: null });
        }
    }, [editorState, setEditorState, dispatch, showToast]);

    const handleEnhanceNote = useCallback(async (tone: string) => {
        if (!tone.trim()) return;
        dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: `Enhancing text with ${tone} tone...` });
        try {
            const enhancedContent = await enhanceText(editorState.content, tone);
            setEditorState({ ...editorState, content: enhancedContent });
        } catch (error) {
            showToast({ message: error instanceof Error ? error.message : 'An unknown error occurred.', type: 'error' });
        } finally {
            dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: null });
        }
    }, [editorState, setEditorState, dispatch, showToast]);

    const handleInlineAiAction = useCallback(async (action: InlineAction, selection: NonNullable<NoteEditorUIState['selection']>) => {
        dispatch({ type: 'SET_AI_ACTION_LOADING', payload: true });
        try {
            const newText = await performInlineEdit(selection.text, action);
            const currentContent = editorState.content;
            const updatedContent = currentContent.substring(0, selection.start) + newText + currentContent.substring(selection.end);
            setEditorState({ ...editorState, content: updatedContent });
            // Returning the new cursor position for the component to handle
            return selection.start + newText.length;
        } catch (error) {
            showToast({ message: error instanceof Error ? error.message : 'An unknown error occurred.', type: 'error' });
            return null;
        } finally {
            dispatch({ type: 'SET_AI_ACTION_LOADING', payload: false });
        }
    }, [editorState, setEditorState, dispatch, showToast]);

    const handleParagraphAiAction = useCallback(async (action: InlineAction, selection: { start: number; end: number }) => {
        dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: `Applying: ${action}...` });
        try {
            const paragraphText = editorState.content.substring(selection.start, selection.end);
            if (!paragraphText.trim()) return;

            const newText = await performInlineEdit(paragraphText, action);
            const newContent = editorState.content.substring(0, selection.start) + newText + editorState.content.substring(selection.end);
            setEditorState({ ...editorState, content: newContent });
        } catch (error) {
            showToast({ message: error instanceof Error ? error.message : 'An unknown error occurred.', type: 'error' });
        } finally {
            dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: null });
        }
    }, [editorState, setEditorState, dispatch, showToast]);

    return {
        applyAiActionToFullNote,
        summarizeAndFindActionForFullNote,
        handleEnhanceNote,
        handleInlineAiAction,
        handleParagraphAiAction,
    };
};