
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Collection, Note, TreeNode } from '../../types';
import { ChevronDownIcon, ChevronRightIcon, DocumentTextIcon, FolderIcon, TrashIcon, PencilSquareIcon, DocumentDuplicateIcon, ClipboardDocumentIcon, GripVerticalIcon, LinkIcon, HashtagIcon } from '../Icons';
import { ContextMenuItem } from '../../types';
import { useStoreContext, useUIContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import Highlight from '../Highlight';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';

interface SidebarNodeProps {
    node: TreeNode;
    level: number;
    activeNoteId: string | null;
    searchTerm: string;
    searchData: { isSearching: boolean; visibleIds: Set<string> | null; matchIds: Set<string> | null };
    onSelectNote: (noteId: string) => void;
    expandedFolders: Record<string, boolean>;
    onToggleFolder: (folderId: string) => void;
    isFocused: boolean;
    isActivePath: boolean;
    focusedNodeId: string | null;
    activeNotePath: Set<string>;
}

const SidebarNode: React.FC<SidebarNodeProps> = ({ 
    node, level, activeNoteId, searchTerm, searchData, onSelectNote, expandedFolders, onToggleFolder, isFocused, isActivePath,
    focusedNodeId, activeNotePath
}) => {
    const { 
        collections, onAddNote, onAddNoteFromFile, updateCollection, renameNoteTitle, moveItem,
        copyNote, handleDeleteNoteConfirm, handleDeleteCollectionConfirm, notes
    } = useStoreContext();
    const { onOpenContextMenu, renamingItemId, setRenamingItemId, draggingItemId, setDraggingItemId, showConfirmation } = useUIContext();

    const isCollection = 'name' in node;
    const [renameValue, setRenameValue] = useState('');
    
    const { showToast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);
    const nodeRef = useRef<HTMLDivElement>(null);

    const isRenaming = renamingItemId === node.id;
    const name = isCollection ? node.name : node.title;
    const isActive = !isCollection && activeNoteId === node.id;
    const isDraggingThisNode = draggingItemId === node.id;

    const { isSearching, visibleIds, matchIds } = searchData;
    const isVisible = !isSearching || (visibleIds && visibleIds.has(node.id));
    const isMatch = !!(isSearching && matchIds && matchIds.has(node.id));
    const isDimmed = isSearching && !isMatch;
    const isExpanded = isSearching || (expandedFolders[node.id] ?? true);

    const handleDropFile = (file: File, parentId: string | null) => {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            const content = loadEvent.target?.result as string;
            if (content !== null) {
                onAddNoteFromFile(file.name, content, parentId);
            }
        };
        reader.readAsText(file);
    };

    const handleMoveItem = useCallback(async (draggedItemId: string, targetItemId: string | null, position: 'top' | 'bottom' | 'inside') => {
        try {
            await moveItem(draggedItemId, targetItemId, position);
        } catch (error) {
            console.error("Failed to move item:", error);
            showToast({ message: 'Failed to move item. The change has been reverted.', type: 'error' });
        }
    }, [moveItem, showToast]);

    const { isDragOver, isFileOver, dropPosition, dragAndDropProps } = useDragAndDrop(nodeRef, {
        id: node.id,
        parentId: node.parentId,
        type: isCollection ? 'collection' : 'note',
        onMoveItem: handleMoveItem,
        onDropFile: isCollection ? handleDropFile : undefined,
        collections,
        isDisabled: isRenaming,
    });

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
            onToggleFolder(node.id);
        } else {
            onSelectNote(node.id);
        }
    };
    
    const handleContextMenu = (e: React.MouseEvent) => {
        let menuItems: ContextMenuItem[] = [];
        if (isCollection) {
            const collectionAsCollection = node as Collection;
            menuItems = [
                { label: 'New Note in Folder', action: () => onAddNote(node.id), icon: <PencilSquareIcon /> },
                { label: 'Rename Folder', action: () => setRenamingItemId(node.id), icon: <PencilSquareIcon /> },
                { divider: true },
                { 
                    label: 'Delete Folder', 
                    action: () => {
                        const hasChildren = notes.some(n => n.parentId === collectionAsCollection.id) || collections.some(c => c.parentId === collectionAsCollection.id);
                        showConfirmation({
                            title: 'Delete Folder',
                            message: hasChildren
                                ? `Are you sure you want to delete the folder "${collectionAsCollection.name}"? All notes and folders inside it will also be permanently deleted. This action cannot be undone.`
                                : `Are you sure you want to delete the empty folder "${collectionAsCollection.name}"? This action cannot be undone.`,
                            confirmationRequiredText: hasChildren ? collectionAsCollection.name : undefined,
                            onConfirm: () => handleDeleteCollectionConfirm(collectionAsCollection),
                        });
                    }, 
                    icon: <TrashIcon />, 
                    isDestructive: true 
                },
            ];
        } else {
            const noteAsNote = node as Note;
            
            const generateMoveToMenuItems = (
                targetNote: Note,
                allCollections: Collection[],
                moveItemAction: (draggedItemId: string, targetItemId: string | null, position: 'inside') => void
            ): ContextMenuItem[] => {
                const childrenMap = new Map<string | null, Collection[]>();
                allCollections.forEach(c => {
                    const parent = c.parentId ?? null;
                    if (!childrenMap.has(parent)) childrenMap.set(parent, []);
                    childrenMap.get(parent)!.push(c);
                });
            
                const buildMenu = (parentId: string | null): ContextMenuItem[] => {
                    const children = childrenMap.get(parentId) || [];
                    return children.sort((a, b) => a.name.localeCompare(b.name)).map(collection => ({
                        label: collection.name,
                        action: () => moveItemAction(targetNote.id, collection.id, 'inside'),
                        disabled: targetNote.parentId === collection.id,
                        children: (childrenMap.get(collection.id) || []).length > 0 ? buildMenu(collection.id) : undefined
                    }));
                };
                
                const menu: ContextMenuItem[] = [{
                    label: "Root",
                    icon: <FolderIcon />,
                    action: () => moveItemAction(targetNote.id, null, 'inside'),
                    disabled: targetNote.parentId === null
                }, ...buildMenu(null)];
                
                return menu;
            };

            menuItems = [
                { label: 'Rename Note', action: () => setRenamingItemId(node.id), icon: <PencilSquareIcon /> },
                {
                    label: 'Move to...',
                    icon: <FolderIcon />,
                    children: generateMoveToMenuItems(noteAsNote, collections, handleMoveItem),
                },
                { 
                    label: 'Duplicate Note', 
                    action: () => {
                        copyNote(node.id)
                            .then((newNoteId) => {
                                onSelectNote(newNoteId);
                                showToast({ message: 'Note duplicated successfully!', type: 'success'});
                            })
                            .catch((err) => showToast({ message: `Failed to duplicate note: ${err.message}`, type: 'error'}));
                    }, 
                    icon: <DocumentDuplicateIcon /> 
                },
                { divider: true },
                {
                    label: 'Copy Note ID',
                    action: () => {
                        navigator.clipboard.writeText(noteAsNote.id)
                            .then(() => showToast({ message: 'Note ID copied!', type: 'success' }))
                            .catch(() => showToast({ message: 'Failed to copy ID.', type: 'error' }));
                    },
                    icon: <HashtagIcon />
                },
                { 
                    label: 'Copy Note Link', 
                    action: () => {
                        const linkText = `[[${noteAsNote.id}|${noteAsNote.title}]]`;
                        navigator.clipboard.writeText(linkText)
                            .then(() => showToast({ message: 'Note link copied!', type: 'success' }))
                            .catch(() => showToast({ message: 'Failed to copy link.', type: 'error' }));
                    }, 
                    icon: <LinkIcon /> 
                },
                { 
                    label: 'Copy as Markdown', 
                    action: () => {
                        navigator.clipboard.writeText(`# ${noteAsNote.title}\n\n${noteAsNote.content}`)
                          .then(() => showToast({ message: 'Copied as Markdown', type: 'success' }))
                          .catch(() => showToast({ message: 'Failed to copy', type: 'error' }));
                    }, 
                    icon: <ClipboardDocumentIcon /> 
                },
                { divider: true },
                { 
                    label: 'Delete Note', 
                    action: () => showConfirmation({
                        title: 'Delete Note',
                        message: `Are you sure you want to permanently delete "${noteAsNote.title}"? This action cannot be undone.`,
                        onConfirm: () => handleDeleteNoteConfirm(noteAsNote),
                        confirmText: 'Delete',
                    }), 
                    icon: <TrashIcon />, 
                    isDestructive: true 
                },
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
                updateCollection(node.id, { name: renameValue.trim() });
            } else {
                renameNoteTitle(node.id, renameValue.trim());
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

    if (!isVisible) {
        return null;
    }
    
    const isDropTarget = isDragOver || isFileOver;

    return (
        <div className="relative">
            {dropPosition && <div className={`drop-indicator-pill ${dropPosition === 'top' ? '-top-1' : '-bottom-1'}`} style={{ marginLeft: `${level * 16}px` }} />}
            <div
                ref={nodeRef}
                {...dragAndDropProps}
                onDragStart={(e) => {
                    setDraggingItemId(node.id);
                    dragAndDropProps.onDragStart(e);
                }}
                onDragEnd={() => {
                    setDraggingItemId(null);
                }}
                onClick={handleNodeClick}
                onDoubleClick={handleDoubleClick}
                onContextMenu={handleContextMenu}
                className={`group flex items-center justify-between w-full text-left rounded-md pr-2 my-0.5 text-sm cursor-grab transition-all duration-150 relative ${
                    isActive
                        ? 'bg-light-primary/30 dark:bg-dark-primary/30 text-light-text dark:text-dark-text font-semibold'
                        : 'hover:bg-light-background dark:hover:bg-dark-background'
                } ${isDropTarget ? 'outline-2 outline-dashed outline-light-primary dark:outline-dark-primary bg-light-primary/10 dark:bg-dark-primary/10' : ''}
                  ${isFocused ? 'ring-2 ring-light-primary/50 dark:ring-dark-primary/50' : ''}
                  ${isDimmed ? 'opacity-50' : ''}
                  ${isDraggingThisNode ? 'opacity-40' : ''}`}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
            >
                {isActivePath && !isActive && <div className="active-path-indicator" />}
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
                            <Highlight text={name} highlight={isMatch ? searchTerm : ''} />
                        </span>
                    )}
                </div>
            </div>
            {isCollection && isExpanded && (
                <div>
                    {node.children.length === 0 && !isSearching && (
                        <div style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }} className="flex items-center gap-2 py-1.5 text-xs text-light-text/50 dark:text-dark-text/50">
                           <FolderIcon className="w-4 h-4 opacity-70 flex-shrink-0" />
                           <span>Empty folder</span>
                        </div>
                    )}
                    {node.children.map(childNode => (
                        <SidebarNode
                            key={childNode.id}
                            node={childNode}
                            level={level + 1}
                            activeNoteId={activeNoteId}
                            searchTerm={searchTerm}
                            searchData={searchData}
                            onSelectNote={onSelectNote}
                            expandedFolders={expandedFolders}
                            onToggleFolder={onToggleFolder}
                            isFocused={focusedNodeId === childNode.id}
                            isActivePath={activeNotePath.has(childNode.id)}
                            focusedNodeId={focusedNodeId}
                            activeNotePath={activeNotePath}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default React.memo(SidebarNode);
