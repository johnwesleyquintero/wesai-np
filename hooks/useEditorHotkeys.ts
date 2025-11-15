import React, { useEffect } from 'react';

interface UseEditorHotkeysProps {
    undo: () => void;
    redo: () => void;
    isModalOpen: boolean;
    editorElements: React.RefObject<HTMLElement>[];
}

/**
 * A hook to manage global undo/redo hotkeys for the editor.
 * It's context-aware and won't trigger if a modal is open or if focus is on a non-editor input.
 */
export const useEditorHotkeys = ({
    undo,
    redo,
    isModalOpen,
    editorElements,
}: UseEditorHotkeysProps) => {
    useEffect(() => {
        const handleGlobalKeyDown = (event: KeyboardEvent) => {
            // 1. If any modal is open, bail. The `isModalOpen` prop covers all cases, including confirmation dialogs.
            if (isModalOpen) {
                return;
            }
            
            // 2. Check the event target. If it's an input-like element that is NOT one of our registered editor fields, bail.
            const target = event.target as HTMLElement;
            const isGenericInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
            const isOurEditorField = editorElements.some(ref => ref.current === target);
            
            if (isGenericInput && !isOurEditorField) {
                return;
            }
    
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modKey = isMac ? event.metaKey : event.ctrlKey;
            
            if (modKey && event.key.toLowerCase() === 'z') {
                event.preventDefault(); 
                if (event.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            } else if (modKey && event.key.toLowerCase() === 'y') {
                event.preventDefault();
                redo();
            }
        };
        
        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }, [undo, redo, isModalOpen, editorElements]);
};
