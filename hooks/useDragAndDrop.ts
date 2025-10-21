import React, { useState, useCallback } from 'react';
import { Collection } from '../types';

interface DragData {
    id: string;
    type: 'note' | 'collection';
    parentId: string | null;
}

interface UseDragAndDropOptions {
    id: string | null;
    parentId?: string | null;
    type: 'note' | 'collection' | 'root';
    onMoveItem: (draggedItemId: string, targetItemId: string | null, position: 'top' | 'bottom' | 'inside') => void;
    onDropFile?: (file: File, parentId: string | null) => void;
    collections?: Collection[];
    isDisabled?: boolean;
}

export const useDragAndDrop = (
    ref: React.RefObject<HTMLElement>,
    { id, parentId, type, onMoveItem, onDropFile, collections = [], isDisabled = false }: UseDragAndDropOptions
) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null);
    const [isFileOver, setIsFileOver] = useState(false);

    const resetState = useCallback(() => {
        setIsDragOver(false);
        setDropPosition(null);
        setIsFileOver(false);
    }, []);

    const handleDragStart = useCallback((e: React.DragEvent) => {
        e.stopPropagation();
        e.dataTransfer.setData('application/json', JSON.stringify({ id, type, parentId }));
        e.dataTransfer.effectAllowed = 'move';
    }, [id, type, parentId]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isDisabled) return;

        // Prioritize internal item drag over file drag
        if (e.dataTransfer.types.includes('application/json')) {
            setIsFileOver(false); // Ensure file state is off
            try {
                const data: DragData = JSON.parse(e.dataTransfer.getData('application/json'));
                if (!data.id || data.id === id) return; // Can't drop on self

                // Circular dependency check
                if (data.type === 'collection' && type === 'collection') {
                    let currentParentId = id;
                    while (currentParentId) {
                        if (currentParentId === data.id) return;
                        currentParentId = collections.find(c => c.id === currentParentId)?.parentId || null;
                    }
                }

                const targetRect = ref.current?.getBoundingClientRect();
                if (!targetRect) return;

                if (type === 'collection') {
                    const dropZoneThreshold = targetRect.height * 0.25;
                    if (e.clientY < targetRect.top + dropZoneThreshold) {
                        setDropPosition('top');
                        setIsDragOver(false);
                    } else if (e.clientY > targetRect.bottom - dropZoneThreshold) {
                        setDropPosition('bottom');
                        setIsDragOver(false);
                    } else {
                        setDropPosition(null);
                        setIsDragOver(true);
                    }
                } else if (type === 'note') {
                    const verticalMidpoint = targetRect.top + targetRect.height / 2;
                    setDropPosition(e.clientY < verticalMidpoint ? 'top' : 'bottom');
                    setIsDragOver(false);
                } else { // root
                    setIsDragOver(true);
                    setDropPosition(null);
                }
            } catch (error) {
                // Ignore if data is not the expected JSON format.
            }
        } else if (e.dataTransfer.types.includes('Files')) {
            // --- Handle File Drag ---
            if (onDropFile && (type === 'collection' || type === 'root')) {
                setIsFileOver(true);
            }
        }
    }, [id, type, isDisabled, collections, onDropFile, ref]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const rect = ref.current?.getBoundingClientRect();
        if (rect && (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom)) {
            return; // Still inside the element
        }
        resetState();
    }, [ref, resetState]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (isDisabled) {
            resetState();
            return;
        }

        // --- Handle Item Drop FIRST ---
        // To prevent issues in browsers that add "Files" to internal drags,
        // we explicitly check for our custom data format first.
        const jsonData = e.dataTransfer.getData('application/json');
        if (jsonData) {
            try {
                const data: DragData = JSON.parse(jsonData);
                if (data && data.id) {
                    const targetId = type === 'root' ? null : id;
                    if (isDragOver) {
                        onMoveItem(data.id, targetId, 'inside');
                    } else if (dropPosition) {
                        onMoveItem(data.id, targetId, dropPosition);
                    }
                }
            } catch (err) {
                 console.error("Failed to parse internal drag data:", err);
            }
        } 
        // --- Handle File Drop as a fallback ---
        else if (onDropFile && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const validFiles = (Array.from(e.dataTransfer.files) as File[]).filter((f) => f.type === 'text/plain' || f.name.endsWith('.md') || f.type === 'text/markdown');
            if (validFiles.length > 0) {
                validFiles.forEach(file => onDropFile(file, id));
            }
        }
    
        resetState();
    }, [id, type, isDisabled, isDragOver, dropPosition, onMoveItem, onDropFile, resetState]);


    const dragAndDropProps = {
        draggable: !isDisabled,
        onDragStart: handleDragStart,
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop,
    };

    return { isDragOver, isFileOver, dropPosition, dragAndDropProps };
};