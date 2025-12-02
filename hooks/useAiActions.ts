
import React, { useCallback } from 'react';
import { performInlineEdit, summarizeAndExtractActions, enhanceText } from '../services/geminiService';
import { NoteEditorUIState, NoteEditorAction } from './useNoteEditorReducer';
import type { InlineAction } from '../types';
import { toast } from '../lib/toast';

type EditorState = { title: string; content: string; tags: string[] };
type Dispatch = React.Dispatch<NoteEditorAction>;

export const useAiActions = (
    setEditorState: (newStateOrFn: EditorState | ((prevState: EditorState) => EditorState)) => void,
    dispatch: Dispatch
) => {
    
    const applyAiActionToFullNote = useCallback(async (action: InlineAction, content: string) => {
        dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: `Applying: ${action}...` });
        try {
            const newContent = await performInlineEdit(content, action);
            setEditorState(prev => ({ ...prev, content: newContent }));
        } catch (error) {
            toast.error(error);
        } finally {
            dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: null });
        }
    }, [setEditorState, dispatch]);
    
    const summarizeAndFindActionForFullNote = useCallback(async (content: string) => {
        dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: 'Summarizing...' });
        try {
            const { summary, actionItems } = await summarizeAndExtractActions(content);
            let formattedSummary = '';
            if (summary) formattedSummary += `### ✨ AI Summary\n\n${summary}\n\n`;
            if (actionItems && actionItems.length > 0) formattedSummary += `### ✅ Action Items\n\n${actionItems.map(item => `- [ ] ${item}`).join('\n')}\n\n`;
            if (formattedSummary) {
                const newContent = `---\n\n${formattedSummary}---\n\n${content}`;
                setEditorState(prev => ({ ...prev, content: newContent }));
            }
        } catch (error) {
            toast.error(error);
        } finally {
            dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: null });
        }
    }, [setEditorState, dispatch]);

    const handleEnhanceNote = useCallback(async (tone: string, content: string) => {
        if (!tone.trim()) return;
        dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: `Enhancing text with ${tone} tone...` });
        try {
            const enhancedContent = await enhanceText(content, tone);
            setEditorState(prev => ({ ...prev, content: enhancedContent }));
        } catch (error) {
            toast.error(error);
        } finally {
            dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: null });
        }
    }, [setEditorState, dispatch]);

    const handleInlineAiAction = useCallback(async (action: InlineAction, selection: NonNullable<NoteEditorUIState['selection']>) => {
        dispatch({ type: 'SET_AI_ACTION_LOADING', payload: true });
        try {
            const newText = await performInlineEdit(selection.text, action);
            setEditorState(prev => {
                const updatedContent = prev.content.substring(0, selection.start) + newText + prev.content.substring(selection.end);
                return { ...prev, content: updatedContent };
            });
            return selection.start + newText.length;
        } catch (error) {
            toast.error(error);
            return null;
        } finally {
            dispatch({ type: 'SET_AI_ACTION_LOADING', payload: false });
        }
    }, [setEditorState, dispatch]);

    const handleParagraphAiAction = useCallback(async (action: InlineAction, selection: { start: number; end: number }, content: string) => {
        dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: `Applying: ${action}...` });
        try {
            const paragraphText = content.substring(selection.start, selection.end);
            if (!paragraphText.trim()) return;

            const newText = await performInlineEdit(paragraphText, action);
            setEditorState(prev => {
                const newContent = prev.content.substring(0, selection.start) + newText + prev.content.substring(selection.end);
                return { ...prev, content: newContent };
            });
        } catch (error) {
            toast.error(error);
        } finally {
            dispatch({ type: 'SET_FULL_AI_ACTION_LOADING', payload: null });
        }
    }, [setEditorState, dispatch]);

    return {
        applyAiActionToFullNote,
        summarizeAndFindActionForFullNote,
        handleEnhanceNote,
        handleInlineAiAction,
        handleParagraphAiAction,
    };
};
