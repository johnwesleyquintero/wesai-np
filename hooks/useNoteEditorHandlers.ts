
import React, { useCallback, RefObject } from 'react';
import { Note, Template, NoteVersion } from '../types';
import { useStoreContext, useUIContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { NoteEditorAction } from './useNoteEditorReducer';

type NoteState = { title: string; content: string; tags: string[] };

interface UseNoteEditorHandlersProps {
    note: Note;
    editorState: NoteState;
    setEditorState: (newStateOrFn: NoteState | ((prevState: NoteState) => NoteState)) => void;
    dispatch: React.Dispatch<NoteEditorAction>;
    saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
    stateWhenLastSavedRef: React.MutableRefObject<NoteState | null>;
    setSuggestedTags: React.Dispatch<React.SetStateAction<string[]>>;
    setSuggestedTitle: React.Dispatch<React.SetStateAction<string | null>>;
    hasAutoTitledRef: React.MutableRefObject<boolean>;
    titleInputRef: RefObject<HTMLInputElement>;
    isAiEnabled: boolean;
}

export const useNoteEditorHandlers = ({
    note,
    editorState,
    setEditorState,
    dispatch,
    saveStatus,
    stateWhenLastSavedRef,
    setSuggestedTags,
    setSuggestedTitle,
    hasAutoTitledRef,
    titleInputRef,
    isAiEnabled,
}: UseNoteEditorHandlersProps) => {
    const { updateNote, restoreNoteVersion, addTemplate } = useStoreContext();
    const { showConfirmation, hideConfirmation } = useUIContext();
    const { showToast } = useToast();

    const handleSave = useCallback(async () => {
        if (saveStatus === 'saving' || saveStatus === 'saved') return;
        dispatch({ type: 'SET_SAVE_STATUS', payload: 'saving' });
        stateWhenLastSavedRef.current = editorState;
        try {
            await updateNote(note.id, editorState);
            dispatch({ type: 'SET_SAVE_STATUS', payload: 'saved' });
            showToast({ message: 'Note saved!', type: 'success' });
        } catch (error) {
            console.error("Manual save failed:", error);
            showToast({ message: `Save failed. Your changes are safe here.`, type: 'error' });
            dispatch({ type: 'SET_SAVE_STATUS', payload: 'error' });
        }
    }, [saveStatus, dispatch, stateWhenLastSavedRef, editorState, updateNote, note.id, showToast]);

    const handleRestore = useCallback((version: NoteVersion) => {
        restoreNoteVersion(note.id, version);
        dispatch({ type: 'SET_PREVIEW_VERSION', payload: null });
        dispatch({ type: 'SET_HISTORY_OPEN', payload: false });
        showToast({ message: 'Version restored.', type: 'success' });
    }, [restoreNoteVersion, note.id, dispatch, showToast]);

    const handleCloseHistory = useCallback(() => {
        dispatch({ type: 'SET_PREVIEW_VERSION', payload: null });
        dispatch({ type: 'SET_HISTORY_OPEN', payload: false });
    }, [dispatch]);

    const handleApplyTemplate = useCallback((template: Template) => {
        const apply = () => {
            setEditorState({ title: template.title, content: template.content, tags: [] });
            dispatch({ type: 'SET_VIEW_MODE', payload: 'edit' });
            showToast({ message: 'Template applied.', type: 'success' });
        };

        if (editorState.content.trim() !== '') {
            showConfirmation({
                title: 'Apply Template',
                message: 'Applying a template will replace the current note content. Are you sure?',
                confirmText: 'Apply',
                onConfirm: apply,
            });
        } else {
            apply();
        }
    }, [editorState.content, setEditorState, dispatch, showConfirmation, showToast]);

    const handleSaveAsTemplate = useCallback((title: string) => {
        addTemplate(title, editorState.content)
            .then(() => {
                showToast({ message: `Template "${title}" saved!`, type: 'success' });
            })
            .catch((err) => {
                showToast({ message: `Failed to save template: ${err.message}`, type: 'error' });
            });
    }, [addTemplate, editorState.content, showToast]);

    const handleToggleTask = useCallback((lineNumber: number) => {
        setEditorState(prev => {
            const lines = prev.content.split('\n');
            if (lineNumber >= lines.length) return prev;
            const line = lines[lineNumber];
            const toggledLine = line.includes('[ ]') ? line.replace('[ ]', '[x]') : line.replace(/\[(x|X)\]/, '[ ]');
            lines[lineNumber] = toggledLine;
            const newContent = lines.join('\n');
            return { ...prev, content: newContent };
        });
    }, [setEditorState]);

    const handleAddTag = useCallback((tagToAdd: string) => {
        if (!editorState.tags.includes(tagToAdd)) {
            setEditorState(prev => ({ ...prev, tags: [...prev.tags, tagToAdd] }));
        }
        setSuggestedTags(prev => prev.filter(t => t !== tagToAdd));
    }, [editorState.tags, setEditorState, setSuggestedTags]);

    const handleApplyTitleSuggestion = useCallback((title: string) => {
        setEditorState(prev => ({ ...prev, title }));
        setSuggestedTitle(null);
    }, [setEditorState, setSuggestedTitle]);

    const handleContentBlur = useCallback(() => {
        if (isAiEnabled && !hasAutoTitledRef.current && editorState.title === 'Untitled Note' && editorState.content.trim()) {
            const firstLine = editorState.content.split('\n')[0].trim().replace(/^#+\s*/, '');
            if (firstLine) {
                const newTitle = firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;
                setEditorState(prev => ({ ...prev, title: newTitle }));
                hasAutoTitledRef.current = true;
            }
        }
    }, [isAiEnabled, hasAutoTitledRef, editorState.title, editorState.content, setEditorState]);

    return {
        handleSave,
        handleRestore,
        handleCloseHistory,
        handleApplyTemplate,
        handleSaveAsTemplate,
        handleToggleTask,
        handleAddTag,
        handleApplyTitleSuggestion,
        handleContentBlur
    };
};
