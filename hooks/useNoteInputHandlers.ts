
import React, { useCallback } from 'react';
import { uploadImage, getPublicUrl } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { AuthSession } from '../types';
import { NoteEditorAction } from './useNoteEditorReducer';

type NoteState = { title: string; content: string; tags: string[] };

interface UseNoteInputHandlersProps {
    editorState: NoteState;
    setEditorState: (newStateOrFn: NoteState | ((prevState: NoteState) => NoteState)) => void;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    dispatch: React.Dispatch<NoteEditorAction>;
    noteId: string;
    session: AuthSession | null;
    isEffectivelyReadOnly: boolean;
    desiredCursorPosRef: React.MutableRefObject<number | { start: number; end: number } | null>;
}

export const useNoteInputHandlers = ({
    editorState,
    setEditorState,
    textareaRef,
    dispatch,
    noteId,
    session,
    isEffectivelyReadOnly,
    desiredCursorPosRef
}: UseNoteInputHandlersProps) => {
    const { showToast } = useToast();

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        dispatch({ type: 'SET_DRAG_OVER', payload: false });
        if (isEffectivelyReadOnly || !session?.user) return;

        const file = e.dataTransfer.files[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                showToast({ message: 'Uploading image...', type: 'info' });
                uploadImage(session.user.id, noteId, file).then(path => {
                    const publicUrl = getPublicUrl(path);
                    const markdownImage = `\n![${file.name}](${publicUrl})\n`;
                    const { selectionStart } = textareaRef.current!;
                    setEditorState(prev => ({
                        ...prev,
                        content: prev.content.slice(0, selectionStart) + markdownImage + prev.content.slice(selectionStart)
                    }));
                    showToast({ message: 'Image uploaded successfully!', type: 'success' });
                }).catch(err => showToast({ message: err.message || 'Failed to upload image.', type: 'error' }));
            } else if (file.type.startsWith('text/') || file.name.endsWith('.md')) {
                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                    const textContent = loadEvent.target?.result;
                    if (typeof textContent === 'string') {
                        const { selectionStart } = textareaRef.current!;
                        setEditorState(prev => ({
                            ...prev,
                            content: prev.content.slice(0, selectionStart) + `\n\n${textContent}\n\n` + prev.content.slice(selectionStart)
                        }));
                    }
                };
                reader.readAsText(file);
            }
        }
    }, [dispatch, isEffectivelyReadOnly, session, noteId, showToast, setEditorState, textareaRef]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!isEffectivelyReadOnly) {
            dispatch({ type: 'SET_DRAG_OVER', payload: true });
        }
    }, [isEffectivelyReadOnly, dispatch]);

    const handleDragLeave = useCallback(() => {
        dispatch({ type: 'SET_DRAG_OVER', payload: false });
    }, [dispatch]);

    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
        if (isEffectivelyReadOnly || !session?.user) return;
        const items = e.clipboardData?.items;
        if (!items) return;

        const imageItem = (Array.from(items) as DataTransferItem[]).find((item) => item.type.startsWith('image/'));

        if (imageItem) {
            e.preventDefault();
            const file = imageItem.getAsFile();
            if (file) {
                showToast({ message: 'Uploading image from clipboard...', type: 'info' });
                uploadImage(session.user.id, noteId, file).then(path => {
                    const publicUrl = getPublicUrl(path);
                    const markdownImage = `\n![Pasted image](${publicUrl})\n`;
                    const textarea = textareaRef.current;
                    if (textarea) {
                        const { selectionStart, selectionEnd } = textarea;
                        setEditorState(prev => {
                            const newContent = prev.content.slice(0, selectionStart) + markdownImage + prev.content.slice(selectionEnd);
                            return { ...prev, content: newContent };
                        });

                        const newCursorPos = selectionStart + markdownImage.length;
                        desiredCursorPosRef.current = newCursorPos;

                        showToast({ message: 'Image uploaded successfully!', type: 'success' });
                    }
                }).catch(err => showToast({ message: err.message || 'Failed to upload pasted image.', type: 'error' }));
            }
        }
    }, [isEffectivelyReadOnly, session, noteId, showToast, setEditorState, textareaRef, desiredCursorPosRef]);

    return {
        handleDrop,
        handleDragOver,
        handleDragLeave,
        handlePaste
    };
};
