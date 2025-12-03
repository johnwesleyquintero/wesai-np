
import React, { useEffect } from 'react';
import { Note, NoteVersion, NoteState } from '../types';
import { NoteEditorAction } from './useNoteEditorReducer';
import { ActiveSpellingError } from './useSpellcheck';
import { areNoteStatesEqual } from '../lib/dataUtils';

interface UseNoteEditorLifecycleProps {
    note: Note;
    editorState: NoteState;
    dispatch: React.Dispatch<NoteEditorAction>;
    saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
    previewVersion: NoteVersion | null;
    // Callbacks for initialization
    resetAiSuggestions: () => void;
    setActiveSpellingError: (error: ActiveSpellingError | null) => void;
    setParagraphGutterTarget: (target: any) => void;
    hasAutoTitledRef: React.MutableRefObject<boolean>;
    titleInputRef: React.RefObject<HTMLInputElement>;
}

/**
 * Encapsulates the lifecycle events of the NoteEditor:
 * 1. Initialization when a new note is selected.
 * 2. Dirty state checking (unsaved changes).
 * 
 * NOTE: Auto-save on unmount has been disabled to allow manual control.
 * Drafts persist in sessionStorage via useUndoableState.
 */
export const useNoteEditorLifecycle = ({
    note,
    editorState,
    dispatch,
    saveStatus,
    previewVersion,
    resetAiSuggestions,
    setActiveSpellingError,
    setParagraphGutterTarget,
    hasAutoTitledRef,
    titleInputRef,
}: UseNoteEditorLifecycleProps) => {

    // --- 1. Initialization & Reset ---
    useEffect(() => {
        // Reset local UI state when the note changes
        dispatch({ type: 'RESET_STATE_FOR_NEW_NOTE' });
        resetAiSuggestions();
        setActiveSpellingError(null);
        hasAutoTitledRef.current = false;
        setParagraphGutterTarget(null);
        
        // Auto-focus title for new, empty notes
        if (note.title === 'Untitled Note' && note.content === '') {
            dispatch({ type: 'SET_VIEW_MODE', payload: 'edit' });
            setTimeout(() => titleInputRef.current?.focus(), 100);
        }
    }, [note.id, dispatch, resetAiSuggestions, setActiveSpellingError, setParagraphGutterTarget, note.title, note.content, titleInputRef, hasAutoTitledRef]);

    // --- 2. Dirty State Check ---
    useEffect(() => {
        if (previewVersion) return;

        const isLiveDirty = !areNoteStatesEqual(editorState, {
            title: note.title,
            content: note.content,
            tags: note.tags,
        });

        if (isLiveDirty) {
            if (saveStatus === 'saved') {
                dispatch({ type: 'SET_SAVE_STATUS', payload: 'unsaved' });
            }
        } else {
            if (saveStatus !== 'saved') {
                dispatch({ type: 'SET_SAVE_STATUS', payload: 'saved' });
            }
        }
    }, [editorState, note.title, note.content, note.tags, previewVersion, saveStatus, dispatch]);
};
