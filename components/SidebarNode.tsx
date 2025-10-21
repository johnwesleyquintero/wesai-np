import React, { useState, useRef, useEffect } from 'react';
import { Note } from '../types';
import { ChevronDownIcon, ChevronRightIcon, DocumentTextIcon, FolderIcon, TrashIcon, PencilSquareIcon, DocumentDuplicateIcon, ClipboardDocumentIcon, GripVerticalIcon } from './Icons';
import { ContextMenuItem } from './ContextMenu';
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

    // --- Drag and Drop Handlers ---
    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        e.dataTransfer.setData('application/json', JSON.stringify({ id: node.id, type: isCollection ? 'collection' : 'note', parentId: node.parentId }));
        e.dataTransfer.effectAllowed = 'move';
    
        const dragGhost = document.createElement('div');
        const iconSvg = isCollection 
            ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>`;
        
        dragGhost.style.cssText = 'position: absolute; top: -1000px; padding: 8px 12px; background-color: #3f3f46; color: #f5f5f4; border-radius: 8px; display: flex; align-items: center; gap: 8px; font-family: sans-serif; font-size: 14px;';
        dragGhost.innerHTML = `${iconSvg} <span>${name}</span>`;

        document.body.appendChild(dragGhost);
        e.dataTransfer.setDragImage(dragGhost, -10, 15);
    
        // Clean up the ghost element after the drag operation has started
        setTimeout(() => {
            document.body.removeChild(dragGhost);
        }, 0);
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
                            searchTerm={searchTerm}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default SidebarNode;