import React, { useEffect, useRef, useState } from 'react';
import { Note } from '../types';
import { ConfirmationOptions } from '../types';

interface UseNoteSyncProps<T> {
    note: Note;
    editorState: T;
    latestEditorStateRef: React.MutableRefObject<T>;
    setPresent: (state: T) => void;
    resetEditorState: (state: T) => void;
    areStatesEqual: (a: T, b: T) => boolean;
    showConfirmation: (options: ConfirmationOptions) => void;
    hideConfirmation: () => void;
    showToast: (options: { message: string; type: 'info' | 'success' | 'error' }) => void;
    stateWhenLastSavedRef: React.MutableRefObject<T | null>;
}

export const useNoteSync = <T>({
    note,
    editorState,
    latestEditorStateRef,
    setPresent,
    resetEditorState,
    areStatesEqual,
    showConfirmation,
    hideConfirmation,
    showToast,
    stateWhenLastSavedRef
}: UseNoteSyncProps<T>) => {
    const prevNoteRef = useRef(note);
    const [lastWarnedTimestamp, setLastWarnedTimestamp] = useState<string | null>(null);

    useEffect(() => {
        // Reset warnings if we switch notes
        if (note.id !== prevNoteRef.current.id) {
            prevNoteRef.current = note;
            setLastWarnedTimestamp(null);
            return;
        }
    
        // Check if the note has been updated externally
        if (note.updatedAt !== prevNoteRef.current.updatedAt) {
            // Check if the update was caused by us saving just now
            const isSelfUpdate = stateWhenLastSavedRef.current !== null && areStatesEqual(stateWhenLastSavedRef.current, {
                title: note.title,
                content: note.content,
                tags: note.tags,
            } as unknown as T);

            if (isSelfUpdate) {
                // It was us, acknowledge and clear the ref
                stateWhenLastSavedRef.current = null;
                setLastWarnedTimestamp(null);
                prevNoteRef.current = note;
                return;
            }
    
            // It was an external update. Do we have unsaved local changes?
            // We compare our current live state (latestEditorStateRef) vs what the previous note state was
            const hasLocalChanges = !areStatesEqual(latestEditorStateRef.current, {
                title: prevNoteRef.current.title,
                content: prevNoteRef.current.content,
                tags: prevNoteRef.current.tags,
            } as unknown as T);
    
            if (hasLocalChanges) {
                // Conflict: We have local edits, but cloud has new data.
                if (lastWarnedTimestamp !== note.updatedAt) {
                    showConfirmation({
                        title: "Sync Conflict",
                        message: "This note was updated on another device. You can discard your local changes to load the latest version, or cancel to manually copy your work.",
                        confirmText: "Reload & Discard",
                        confirmClass: "bg-red-600 hover:bg-red-700",
                        onConfirm: () => {
                            // User chose to overwrite local changes with cloud version
                            resetEditorState({ 
                                title: note.title, 
                                content: note.content, 
                                tags: note.tags 
                            } as unknown as T);
                            setLastWarnedTimestamp(null);
                            hideConfirmation();
                        },
                    });
                    setLastWarnedTimestamp(note.updatedAt);
                }
            } else {
                // No local changes, safe to auto-update
                setPresent({ 
                    title: note.title, 
                    content: note.content, 
                    tags: note.tags 
                } as unknown as T);
                setLastWarnedTimestamp(null);
                showToast({
                    message: `"${note.title}" was synced from an external change.`,
                    type: 'info',
                });
            }
        }
        prevNoteRef.current = note;
    }, [
        note, 
        resetEditorState, 
        showToast, 
        lastWarnedTimestamp, 
        showConfirmation, 
        hideConfirmation, 
        setPresent,
        areStatesEqual,
        latestEditorStateRef,
        stateWhenLastSavedRef
    ]);
};