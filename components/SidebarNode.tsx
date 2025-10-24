import React, { useState, useRef, useEffect } from 'react';
import { Collection, Note, TreeNode } from '../types';
import { ChevronDownIcon, ChevronRightIcon, DocumentTextIcon, FolderIcon, TrashIcon, PencilSquareIcon, DocumentDuplicateIcon, ClipboardDocumentIcon, GripVerticalIcon } from './Icons';
import { ContextMenuItem } from '../types';
import { useStoreContext, useUIContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import Highlight from './Highlight';
import { useDragAndDrop } from '../hooks/useDragAndDrop';

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
}

const SidebarNode: React.FC<SidebarNodeProps> = ({ 
    node, level, activeNoteId, searchTerm, searchData, onSelectNote, expandedFolders, onToggleFolder, isFocused
}) => {
    const { 
        collections, onAddNote, onAddNoteFromFile, updateCollection, renameNoteTitle, moveItem,
        copyNote, setNoteToDelete, setCollectionToDelete
    } = useStoreContext();
    const { onOpenContextMenu, renamingItemId, setRenamingItemId } = useUIContext();

    const isCollection = 'name' in node;
    const [renameValue, setRenameValue] = useState('');
    
    const { showToast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);
    const nodeRef = useRef<HTMLDivElement>(null);

    const isRenaming = renamingItemId === node.id;
    const name = isCollection ? node.name : node.title;
    const isActive = !isCollection && activeNoteId === node.id;

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

    const { isDragOver, dropPosition, dragAndDropProps } = useDragAndDrop(nodeRef, {
        id: node.id,
        parentId: node.parentId,
        type: isCollection ? 'collection' : 'note',
        onMoveItem: moveItem,
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
                { label: 'Delete Folder', action: () => setCollectionToDelete(collectionAsCollection), icon: <TrashIcon />, isDestructive: true },
            ];
        } else {
            const noteAsNote = node as Note;
            menuItems = [
                { label: 'Rename Note', action: () => setRenamingItemId(node.id), icon: <PencilSquareIcon /> },
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
                { 
                    label: 'Copy as Markdown', 
                    action: () => {
                        navigator.clipboard.writeText(`# ${noteAsNote.title}\n\n${noteAsNote.content}`)
                          .then(() => showToast({ message: 'Copied as Markdown', type: 'success' }))
                          .catch(() => showToast({ message: 'Failed to copy', type: 'error' }));
                    }, 
                    icon: <ClipboardDocumentIcon /> 
                },
                { label: 'Delete Note', action: () => setNoteToDelete(noteAsNote), icon: <TrashIcon />, isDestructive: true },
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

    return (
        <div className="relative">
            {dropPosition === 'top' && <div className="absolute -top-0.5 left-2 right-2 h-0.5 bg-light-primary dark:bg-dark-primary rounded-full z-10" style={{ marginLeft: `${level * 16}px` }} />}
            <div
                ref={nodeRef}
                {...dragAndDropProps}
                onClick={handleNodeClick}
                onDoubleClick={handleDoubleClick}
                onContextMenu={handleContextMenu}
                className={`group flex items-center justify-between w-full text-left rounded-md pr-2 my-0.5 text-sm cursor-grab transition-all duration-150 ${
                    isActive
                        ? 'bg-light-primary/30 dark:bg-dark-primary/30 text-light-primary dark:text-dark-primary font-semibold'
                        : 'hover:bg-light-background dark:hover:bg-dark-background'
                } ${isDragOver ? 'outline-2 outline-dashed outline-light-primary dark:outline-dark-primary bg-light-primary/10 dark:bg-dark-primary/10' : ''}
                  ${isFocused ? 'ring-2 ring-light-primary/50 dark:ring-dark-primary/50' : ''}
                  ${isDimmed ? 'opacity-50' : ''}`}
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
                            <Highlight text={name} highlight={isMatch ? searchTerm : ''} />
                        </span>
                    )}
                </div>
            </div>
            {dropPosition === 'bottom' && <div className="absolute -bottom-0.5 left-2 right-2 h-0.5 bg-light-primary dark:bg-dark-primary rounded-full z-10" style={{ marginLeft: `${level * 16}px` }} />}
            {isCollection && isExpanded && (
                <div>
                    {node.children.length === 0 && !isSearching && (
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
                            searchData={searchData}
                            onSelectNote={onSelectNote}
                            expandedFolders={expandedFolders}
                            onToggleFolder={onToggleFolder}
                            isFocused={isFocused}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default React.memo(SidebarNode);