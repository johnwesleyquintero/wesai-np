
import React, { useState, useEffect } from 'react';
import { Collection } from '../types';

interface UseSidebarNavigationProps {
    visibleNodeIds: string[];
    collections: Collection[];
    expandedFolders: Record<string, boolean>;
    setExpandedFolders: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    onSelectNote: (id: string) => void;
    activeNoteId: string | null;
}

export const useSidebarNavigation = ({
    visibleNodeIds,
    collections,
    expandedFolders,
    setExpandedFolders,
    onSelectNote,
    activeNoteId
}: UseSidebarNavigationProps) => {
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

    // Sync focused node with active note or first visible item
    useEffect(() => {
        if (focusedNodeId && !visibleNodeIds.includes(focusedNodeId)) {
            setFocusedNodeId(null);
        }
        if (!activeNoteId && !focusedNodeId && visibleNodeIds.length > 0) {
            setFocusedNodeId(visibleNodeIds[0]);
        }
        if (activeNoteId && focusedNodeId !== activeNoteId) {
            setFocusedNodeId(activeNoteId);
        }
    }, [visibleNodeIds, activeNoteId, focusedNodeId]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const currentIndex = focusedNodeId ? visibleNodeIds.indexOf(focusedNodeId) : -1;
            const nextIndex = e.key === 'ArrowDown'
                ? (currentIndex + 1) % visibleNodeIds.length
                : (currentIndex - 1 + visibleNodeIds.length) % visibleNodeIds.length;
            setFocusedNodeId(visibleNodeIds[nextIndex]);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedNodeId) {
                const node = collections.find(c => c.id === focusedNodeId);
                if (node) {
                    setExpandedFolders(prev => ({ ...prev, [focusedNodeId]: !(prev[focusedNodeId] ?? true) }));
                } else {
                    onSelectNote(focusedNodeId);
                }
            }
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            if (focusedNodeId) {
                const isCollection = collections.some(c => c.id === focusedNodeId);
                if (isCollection) {
                    const isExpanded = expandedFolders[focusedNodeId] ?? true;
                    if (e.key === 'ArrowRight' && !isExpanded) {
                        setExpandedFolders(prev => ({ ...prev, [focusedNodeId]: true }));
                    } else if (e.key === 'ArrowLeft' && isExpanded) {
                        setExpandedFolders(prev => ({ ...prev, [focusedNodeId]: false }));
                    }
                }
            }
        }
    };

    return { focusedNodeId, setFocusedNodeId, handleKeyDown };
};
