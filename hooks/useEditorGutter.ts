
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getCursorPositionRect, getLineInfoForPosition } from '../lib/editorDOMUtils';

interface UseEditorGutterProps {
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    editorPaneRef: React.RefObject<HTMLDivElement>;
    cursorMeasureRef: React.RefObject<HTMLPreElement>;
    content: string;
    viewMode: 'edit' | 'preview';
    gutterMenu: any;
    isEffectivelyReadOnly: boolean;
    isAiEnabled: boolean;
    isApiKeyMissing: boolean;
}

export const useEditorGutter = ({
    textareaRef,
    editorPaneRef,
    cursorMeasureRef,
    content,
    viewMode,
    gutterMenu,
    isEffectivelyReadOnly,
    isAiEnabled,
    isApiKeyMissing
}: UseEditorGutterProps) => {
    const [paragraphGutterTarget, setParagraphGutterTarget] = useState<{ start: number; rect: DOMRect } | null>(null);
    const isScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<number | null>(null);

    const updateGutterState = useCallback(() => {
        if (isScrollingRef.current) return;
        
        const textarea = textareaRef.current;
        if (!textarea || viewMode !== 'edit' || gutterMenu) {
            setParagraphGutterTarget(current => current ? null : current);
            return;
        }

        const { selectionStart } = textarea;
        const { text, start } = getLineInfoForPosition(content, selectionStart);
        
        const shouldShow = text && !isEffectivelyReadOnly && isAiEnabled && !isApiKeyMissing;

        if (shouldShow) {
            const measureRef = cursorMeasureRef.current;
            if (measureRef) {
                const rect = getCursorPositionRect(textarea, start, measureRef, content);
                setParagraphGutterTarget(current => {
                    if (current?.start !== start) return { start, rect };
                    return current;
                });
            }
        } else {
            setParagraphGutterTarget(null);
        }
    }, [content, viewMode, gutterMenu, isEffectivelyReadOnly, isAiEnabled, isApiKeyMissing, textareaRef, cursorMeasureRef]);

    // Handle Scroll Events
    useEffect(() => {
        const pane = editorPaneRef.current;
        const handleScroll = () => {
            isScrollingRef.current = true;
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = window.setTimeout(() => {
                isScrollingRef.current = false;
                updateGutterState();
            }, 150);
        };
        pane?.addEventListener('scroll', handleScroll);
        return () => pane?.removeEventListener('scroll', handleScroll);
    }, [updateGutterState, editorPaneRef]);

    // Initial update
    useEffect(() => {
        updateGutterState();
    }, [updateGutterState]);

    // Clear target on unmount or specific changes
    useEffect(() => {
        return () => setParagraphGutterTarget(null);
    }, [viewMode]);

    return { paragraphGutterTarget, setParagraphGutterTarget };
};