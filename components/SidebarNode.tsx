import React, { useState, useRef, useEffect } from 'react';
import { Note } from '../types';
import { ChevronDownIcon, ChevronRightIcon, DocumentTextIcon, FolderIcon, TrashIcon, PencilSquareIcon, DocumentDuplicateIcon, ClipboardDocumentIcon, GripVerticalIcon } from './Icons';
import { ContextMenuItem } from '../types';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import Highlight from './Highlight';

export type TreeNode = (Note | (import('../types').Collection & { type: 'collection' })) & {
    children: TreeNode[];
};

interface SidebarNodeProps {
    node: TreeNode;
    level: number;
    activeNoteId: string | null;
    searchTerm: string;
}

const SidebarNode: React.FC<SidebarNodeProps> = ({ 
    node, level, activeNoteId, searchTerm
}) => {
    const { 
        collections, onSelectNote, onAddNote, onDeleteCollection, onUpdateCollection, onRenameNote, onMoveItem,
        onOpenContextMenu, renamingItemId, setRenamingItemId, onCopyNote, onDeleteNote
    } = useAppContext();

    const isCollection = 'name' in node;
    const [isExpanded, setIsExpanded] = useState(true);
    const [renameValue, setRenameValue] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null);
    
    const { showToast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);

    const isRenaming = renamingItemId === node.id;
    const name = isCollection ? node.name : node.title;
    const isActive = !isCollection && activeNoteId === node.id;

    useEffect(() => {
        if (isRenaming) {
            setRenameValue(name);
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isRenaming, name]);

    const handleNodeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isCollection) {
            setIsExpanded(prev => !prev);
        } else {
            onSelectNote(node.id);
        }
    };
    
    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isCollection) {
             onDeleteCollection(node);
        }
    };
    
    const handleContextMenu = (e: React.MouseEvent) => {
        let menuItems: ContextMenuItem[] = [];
        if (isCollection) {
            menuItems = [
                { label: 'New Note in Folder', action: () => onAddNote(node.id), icon: <PencilSquareIcon /> },
                { label: 'Rename Folder', action: () => setRenamingItemId(node.id), icon: <PencilSquareIcon /> },
                { label: 'Delete Folder', action: () => onDeleteCollection(node), icon: <TrashIcon />, isDestructive: true },
            ];
        } else {
            const noteAsNote = node as Note;
            menuItems = [
                { label: 'Rename Note', action: () => setRenamingItemId(node.id), icon: <PencilSquareIcon /> },
                { label: 'Copy Note', action: () => onCopyNote(node.id), icon: <DocumentDuplicateIcon /> },
                { 
                    label: 'Copy as Markdown', 
                    action: () => {
                        navigator.clipboard.writeText(`# ${noteAsNote.title}\n\n${noteAsNote.content}`)
                          .then(() => showToast({ message: 'Copied as Markdown', type: 'success' }))
                          .catch(() => showToast({ message: 'Failed to copy', type: 'error' }));
                    }, 
                    icon: <ClipboardDocumentIcon /> 
                },
                { label: 'Delete Note', action: () => onDeleteNote(noteAsNote), icon: <TrashIcon />, isDestructive: true },
            ];
        }
        onOpenContextMenu(e, menuItems);
    };

    const handleDoubleClick = () => {
        setRenamingItemId(node.id);
    };

    const handleRename = () => {
        if (renameValue.trim() && renameValue.trim() !== name) {
            if (isCollection) {
                onUpdateCollection(node.id, { name: renameValue.trim() });
            } else {
                onRenameNote(node.id, renameValue.trim());
            }
        }
        setRenamingItemId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleRename();
        } else if (e.key === 'Escape') {
            setRenamingItemId(null);
        }
    };

    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        e.dataTransfer.setData('application/json', JSON.stringify({ id: node.id, type: isCollection ? 'collection' : 'note', parentId: node.parentId }));
        e.dataTransfer.effectAllowed = 'move';
    };
    
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.id === node.id) return; // Can't drop on self

            if (data.type === 'collection') {
                let currentParentId = node.id;
                while (currentParentId) {
                    if (currentParentId === data.id) {
                        return; // Invalid move: dropping folder into its own descendant
                    }
                    const parent = collections.find(c => c.id === currentParentId);
                    currentParentId = parent ? parent.parentId : null;
                }
            }
            
            const targetRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const verticalMidpoint = targetRect.top + targetRect.height / 2;

            if (isCollection) {
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
            } else { // It's a note
                setDropPosition(e.clientY < verticalMidpoint ? 'top' : 'bottom');
                setIsDragOver(false);
            }
        } catch (error) {}
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        setDropPosition(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.id) {
                if (isDragOver) {
                    onMoveItem(data.id, node.id, 'inside');
                } else if (dropPosition) {
                    onMoveItem(data.id, node.id, dropPosition);
                }
            }
        } catch (err) {
            console.error("Drop failed", err);
        } finally {
            setIsDragOver(false);
            setDropPosition(null);
        }
    };


    return (
        <div className="relative">
            {dropPosition === 'top' && <div className="absolute -top-0.5 left-2 right-2 h-0.5 bg-light-primary dark:bg-dark-primary rounded-full z-10" style={{ marginLeft: `${level * 16}px` }} />}
            <div
                onClick={handleNodeClick}
                onDoubleClick={handleDoubleClick}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onContextMenu={handleContextMenu}
                draggable={!isRenaming}
                className={`group flex items-center justify-between w-full text-left rounded-md pr-2 my-0.5 text-sm cursor-grab transition-all duration-150 ${
                    isActive
                        ? 'bg-light-primary/30 dark:bg-dark-primary/30 text-light-primary dark:text-dark-primary font-semibold'
                        : 'hover:bg-light-background dark:hover:bg-dark-background'
                } ${isDragOver ? 'outline-2 outline-dashed outline-light-primary dark:outline-dark-primary bg-light-primary/10 dark:bg-dark-primary/10' : ''}`}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
            >
                <div className="flex items-center truncate py-1.5">
                    <div 
                        className="opacity-0 group-hover:opacity-60 transition-opacity -ml-2 mr-1 p-0.5 rounded"
                        onClick={(e) => e.stopPropagation()}
                    >
                       <GripVerticalIcon className="w-4 h-4" />
                    </div>
                    {isCollection ? (
                        <>
                            {isExpanded ? <ChevronDownIcon className="w-4 h-4 mr-1 flex-shrink-0" /> : <ChevronRightIcon className="w-4 h-4 mr-1 flex-shrink-0" />}
                            <FolderIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                        </>
                    ) : (
                        <DocumentTextIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                    )}
                    {isRenaming ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={handleRename}
                            onKeyDown={handleKeyDown}
                            className="bg-light-background dark:bg-dark-background text-sm p-0.5 rounded-sm outline-none ring-1 ring-light-primary w-full"
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="truncate">
                            <Highlight text={name} highlight={searchTerm} />
                        </span>
                    )}
                </div>
                 {isCollection && !isRenaming && (
                    <button onClick={handleDeleteClick} className="p-1 rounded hover:bg-red-500/20 text-light-text/60 dark:text-dark-text/60 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
            {dropPosition === 'bottom' && <div className="absolute -bottom-0.5 left-2 right-2 h-0.5 bg-light-primary dark:bg-dark-primary rounded-full z-10" style={{ marginLeft: `${level * 16}px` }} />}
            {isCollection && isExpanded && (
                <div>
                    {node.children.length === 0 && (
                        <p style={{ paddingLeft: `${(level + 1) * 16 + 28}px` }} className="py-1.5 text-xs text-light-text/50 dark:text-dark-text/50">
                           Empty folder
                        </p>
                    )}
                    {node.children.map(childNode => (
                        <SidebarNode
                            key={childNode.id}
                            node={childNode}
                            level={level + 1}
                            activeNoteId={activeNoteId}
                            searchTerm={searchTerm}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default SidebarNode;