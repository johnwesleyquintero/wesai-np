import React, { useState, useRef, useEffect } from 'react';
import { Note, Collection } from '../types';
import { ChevronDownIcon, ChevronRightIcon, DocumentTextIcon, FolderIcon, TrashIcon, PencilSquareIcon, DocumentDuplicateIcon, ClipboardDocumentIcon, GripVerticalIcon } from './Icons';
import { ContextMenuItem } from './ContextMenu';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

export type TreeNode = (Note | (Collection & { type: 'collection' })) & {
    children: TreeNode[];
};

interface SidebarNodeProps {
    node: TreeNode;
    level: number;
    activeNoteId: string | null;
    collections: Collection[];
    onSelectNote: (id: string) => void;
    onAddNote: (parentId: string | null) => void;
    onDeleteCollection: (collection: Collection) => void;
    onUpdateCollection: (id: string, updatedFields: Partial<Omit<Collection, 'id'>>) => void;
    onRenameNote: (id: string, newTitle: string) => void;
    onMoveItem: (itemId: string, newParentId: string | null) => void;
    onOpenContextMenu: (e: React.MouseEvent, items: ContextMenuItem[]) => void;
    renamingItemId: string | null;
    setRenamingItemId: (id: string | null) => void;
}

const SidebarNode: React.FC<SidebarNodeProps> = ({ 
    node, level, activeNoteId, collections, onSelectNote, onAddNote, onDeleteCollection, 
    onUpdateCollection, onRenameNote, onMoveItem, onOpenContextMenu, renamingItemId, setRenamingItemId 
}) => {
    const isCollection = 'name' in node;
    const [isExpanded, setIsExpanded] = useState(true);
    const [renameValue, setRenameValue] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    
    const { onCopyNote, onDeleteNote } = useAppContext();
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
                // FIX: Changed `note.id` to `node.id` to correctly reference the note object.
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

    // --- Drag and Drop Handlers ---
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

            // Prevent dropping a folder into its own descendant
            if (data.type === 'collection') {
                let currentParentId = isCollection ? node.id : node.parentId;
                while(currentParentId) {
                    if(currentParentId === data.id) {
                        setIsDragOver(false);
                        return;
                    }
                    const parent = collections.find(c => c.id === currentParentId);
                    currentParentId = parent ? parent.parentId : null;
                }
            }

            setIsDragOver(true);
        } catch (error) {
            // Ignore if data is not available (e.g., dragging from outside)
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        const newParentId = isCollection ? node.id : node.parentId;

        if (data.id && data.id !== newParentId) {
            onMoveItem(data.id, newParentId);
        }
    };


    return (
        <div 
             onDragOver={handleDragOver}
             onDragLeave={handleDragLeave}
             onDrop={handleDrop}
             onContextMenu={handleContextMenu}
        >
            <div
                onClick={handleNodeClick}
                onDoubleClick={handleDoubleClick}
                className={`group flex items-center justify-between w-full text-left rounded-md pr-2 my-0.5 text-sm cursor-pointer transition-all duration-150 ${
                    isActive
                        ? 'bg-light-primary/30 dark:bg-dark-primary/30 text-light-primary dark:text-dark-primary font-semibold'
                        : 'hover:bg-light-background dark:hover:bg-dark-background'
                } ${isDragOver ? 'outline-2 outline-dashed outline-light-primary dark:outline-dark-primary bg-light-primary/10 dark:bg-dark-primary/10' : ''}`}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
            >
                <div className="flex items-center truncate py-1.5">
                    <div 
                        draggable={!isRenaming}
                        onDragStart={handleDragStart}
                        className="opacity-0 group-hover:opacity-60 transition-opacity cursor-grab -ml-2 mr-1 p-0.5 rounded"
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
                        <span className="truncate">{name}</span>
                    )}
                </div>
                 {isCollection && !isRenaming && (
                    <button onClick={handleDeleteClick} className="p-1 rounded hover:bg-red-500/20 text-light-text/60 dark:text-dark-text/60 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
            {isCollection && isExpanded && node.children && (
                <div>
                    {node.children.length === 0 && !isDragOver && (
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
                            collections={collections}
                            onSelectNote={onSelectNote}
                            onAddNote={onAddNote}
                            onDeleteCollection={onDeleteCollection}
                            onUpdateCollection={onUpdateCollection}
                            onRenameNote={onRenameNote}
                            onMoveItem={onMoveItem}
                            onOpenContextMenu={onOpenContextMenu}
                            renamingItemId={renamingItemId}
                            setRenamingItemId={setRenamingItemId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default SidebarNode;