import React, { useCallback } from 'react';
import { getCursorPositionRect } from '../lib/editorDOMUtils';
import { NoteEditorAction } from './useNoteEditorReducer';

interface UseEditorTriggerDetectionProps {
    dispatch: React.Dispatch<NoteEditorAction>;
    cursorMeasureRef: React.RefObject<HTMLPreElement>;
}

export const useEditorTriggerDetection = ({ dispatch, cursorMeasureRef }: UseEditorTriggerDetectionProps) => {
    const detectTriggers = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value, selectionStart } = e.target;
        
        // Reset UI states that should close on typing
        dispatch({ type: 'SET_SELECTION', payload: null });
        dispatch({ type: 'SET_GUTTER_MENU', payload: null });

        const textBeforeCursor = value.substring(0, selectionStart);
        const slashMatch = textBeforeCursor.match(/(?:\s|^)\/([\w-]*)$/);
        const linkerMatch = textBeforeCursor.match(/\[\[([^\[\]]*)$/);

        const measureRef = cursorMeasureRef.current;

        if (slashMatch && measureRef) {
            const query = slashMatch[1];
            const rect = getCursorPositionRect(e.target, selectionStart, measureRef, value);
            const range = { start: selectionStart - query.length - 1, end: selectionStart };
            dispatch({ type: 'SET_SLASH_COMMAND', payload: { query, position: { top: rect.bottom, left: rect.left }, range } });
        } else if (linkerMatch && measureRef) {
            const rect = getCursorPositionRect(e.target, selectionStart, measureRef, value);
            dispatch({ type: 'SET_NOTE_LINKER', payload: { query: linkerMatch[1], position: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX } } });
        } else {
            // Optimistically clear these states if no match is found
            dispatch({ type: 'SET_SLASH_COMMAND', payload: null });
            dispatch({ type: 'SET_NOTE_LINKER', payload: null });
        }
    }, [dispatch, cursorMeasureRef]);

    return { detectTriggers };
};