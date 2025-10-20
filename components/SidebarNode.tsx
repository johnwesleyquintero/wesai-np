import React, { useState, useRef, useEffect } from 'react';
import { Note, Collection } from '../types';
import { ChevronDownIcon, ChevronRightIcon, DocumentTextIcon, FolderIcon, TrashIcon, PencilSquareIcon, DocumentDuplicateIcon } from './Icons';
import { ContextMenuItem } from './ContextMenu';
import { useAppContext } from '../context/AppContext';

export type TreeNode = (Note | (Collection & { type: 'collection' })) & {
    children: TreeNode[];
};

interface SidebarNodeProps {
    node: TreeNode;
    level: number;
    activeNoteId: string | null;
    collections: Collection[];
    onSelectNote: (id: string) => void;
    onDeleteCollection: (collection: Collection) => void;
    onUpdateCollection: (id: string, updatedFields: Partial<Omit<Collection, 'id'>>) => void;
    onRenameNote: (id: string, newTitle: string) => void;
    onMoveItem: (itemId: string, newParentId: string | null) => void;
    onOpenContextMenu: (e: React.MouseEvent, items: ContextMenuItem[]) => void;
    renamingItemId: string | null;
    setRenamingItemId: (id: string | null) => void;
}

const SidebarNode: React.FC<SidebarNodeProps> = ({ 
    node, level, activeNoteId, collections, onSelectNote, onDeleteCollection, 
    onUpdateCollection, onRenameNote, onMoveItem, onOpenContextMenu, renamingItemId, setRenamingItemId 
}) => {
    const isCollection = 'name' in node;
    const [isExpanded, setIsExpanded] = useState(true);
    const [renameValue, setRenameValue] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    
    const { onCopyNote, onDeleteNote } = useAppContext();
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
                { label: 'Rename Folder', action: () => setRenamingItemId(node.id), icon: <PencilSquareIcon /> },
                // Future actions: New Note in Folder, New Subfolder
                { label: 'Delete Folder', action: () => onDeleteCollection(node), icon: <TrashIcon />, isDestructive: true },
            ];
        } else {
            menuItems = [
                { label: 'Rename Note', action: () => setRenamingItemId(node.id), icon: <PencilSquareIcon /> },
                { label: 'Copy Note', action: () => onCopyNote(node.id), icon: <DocumentDuplicateIcon /> },
                { label: 'Delete Note', action: () => onDeleteNote(node), icon: <TrashIcon />, isDestructive: true },
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
             draggable={!isRenaming}
             onDragStart={handleDragStart}
             onDragOver={handleDragOver}
             onDragLeave={handleDragLeave}
             onDrop={handleDrop}
             onContextMenu={handleContextMenu}
        >
            <div
                onClick={handleNodeClick}
                onDoubleClick={handleDoubleClick}
                className={`group flex items-center justify-between w-full text-left rounded-md px-2 py-1.5 my-0.5 text-sm cursor-pointer transition-all duration-150 ${
                    isActive
                        ? 'bg-light-primary/30 dark:bg-dark-primary/30 text-light-primary dark:text-dark-primary font-semibold'
                        : 'hover:bg-light-background dark:hover:bg-dark-background'
                } ${isDragOver ? 'outline-2 outline-dashed outline-light-primary dark:outline-dark-primary bg-light-primary/10 dark:bg-dark-primary/10' : ''}`}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
            >
                <div className="flex items-center truncate">
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