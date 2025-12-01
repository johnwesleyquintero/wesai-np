
import React, { useCallback } from 'react';

type NoteState = { title: string; content: string; tags: string[] };

interface UseAutoPairingProps {
    setEditorState: (newStateOrFn: NoteState | ((prevState: NoteState) => NoteState)) => void;
    desiredCursorPosRef: React.MutableRefObject<number | { start: number; end: number } | null>;
}

export const useAutoPairing = ({ setEditorState, desiredCursorPosRef }: UseAutoPairingProps) => {
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const pairs: { [key: string]: string } = { '(': ')', '[': ']', '{': '}', '"': '"', '*': '*', '_': '_' };
        const textarea = e.currentTarget;
        const { selectionStart, selectionEnd, value } = textarea;

        if (pairs[e.key]) {
            e.preventDefault();
            const char = e.key;
            const closingChar = pairs[char];
            
            if (selectionStart !== selectionEnd) {
                const selectedText = value.substring(selectionStart, selectionEnd);
                setEditorState(prev => ({
                    ...prev,
                    content: `${prev.content.substring(0, selectionStart)}${char}${selectedText}${closingChar}${prev.content.substring(selectionEnd)}`
                }));
                desiredCursorPosRef.current = { start: selectionStart + 1, end: selectionEnd + 1 };
            } else {
                setEditorState(prev => ({
                    ...prev,
                    content: `${prev.content.substring(0, selectionStart)}${char}${closingChar}${prev.content.substring(selectionStart)}`
                }));
                desiredCursorPosRef.current = selectionStart + 1;
            }
        }

        if (e.key === 'Backspace' && selectionStart === selectionEnd) {
            const charBefore = value[selectionStart - 1];
            const charAfter = value[selectionStart];
            if (charBefore && pairs[charBefore] === charAfter) {
                e.preventDefault();
                setEditorState(prev => ({
                    ...prev,
                    content: prev.content.substring(0, selectionStart - 1) + prev.content.substring(selectionStart + 1)
                }));
                desiredCursorPosRef.current = selectionStart - 1;
            }
        }
    }, [setEditorState, desiredCursorPosRef]);

    return { handleKeyDown };
};
