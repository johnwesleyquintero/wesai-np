import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Note, TreeNode, Collection } from '../../types';
import NoteCard from '../NoteCard';
import {
    PencilSquareIcon, PlusIcon, FolderPlusIcon, BrainIcon, TrashIcon, XMarkIcon,
    ArrowDownTrayIcon, SparklesIcon
} from '../Icons';
import SidebarNode from './SidebarNode';
import CollapsibleSection from './CollapsibleSection';
import { useStoreContext, useUIContext } from '../../context/AppContext';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { useToast } from '../../context/ToastContext';

const EXPANDED_FOLDERS_KEY = 'wesai-sidebar-expanded-folders';

const SidebarContent: React.FC = () => {
    const {
        collections, smartCollections, addCollection, moveItem, onAddNoteFromFile, onAddNote,
        fileTree, notes, favoriteNotes, searchData, activeNoteId,
        searchTerm, isAiSearching,
        handleActivateSmartCollection: onActivateSmartCollection,
        handleClearActiveSmartCollection: onClearActiveSmartCollection,
        setActiveNoteId,
        handleDeleteNoteConfirm, handleDeleteSmartCollectionConfirm,
        activeSmartCollection,
        activeNotePath,
    } = useStoreContext();
    
    const {
        isMobileView, setIsSidebarOpen, setView,
        openSmartFolderModal, onOpenContextMenu, showConfirmation, isAiEnabled
    } = useUIContext();
    const { showToast } = useToast();
    
    const handleMoveItem = useCallback(async (draggedItemId: string, targetItemId: string | null, position: 'top' | 'bottom' | 'inside') => {
        try {
            await moveItem(draggedItemId, targetItemId, position);
        } catch (error) {
            console.error("Failed to move item:", error);
            showToast({ message: 'Failed to move item. The change has been reverted.', type: 'error' });
        }
    }, [moveItem, showToast]);

    const rootDropRef = useRef<HTMLDivElement>(null);
    const { isFileOver: isRootFileOver, dragAndDropProps: rootDragAndDropProps } = useDragAndDrop(rootDropRef, {
        id: null,
        type: 'root',
        onMoveItem: handleMoveItem,
        onDropFile: (file, parentId) => {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const content = loadEvent.target?.result as string;
                if (content !== null) {
                    onAddNoteFromFile(file.name, content, parentId);
                }
            };
            reader.readAsText(file);
        },
    });

    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
        try {
            const saved = localStorage.getItem(EXPANDED_FOLDERS_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

    useEffect(() => {
        try {
            localStorage.setItem(EXPANDED_FOLDERS_KEY, JSON.stringify(expandedFolders));
        } catch (error) {
            console.error("Failed to save expanded folders state:", error);
        }
    }, [expandedFolders]);

    const onSelectNote = useCallback((id: string) => {
        setActiveNoteId(id);
        setView('NOTES');
        if (isMobileView) {
            setIsSidebarOpen(false);
        }
    }, [isMobileView, setActiveNoteId, setIsSidebarOpen, setView]);

    const toggleFolder = useCallback((folderId: string) => {
        setExpandedFolders(prev => ({ ...prev, [folderId]: !(prev[folderId] ?? true) }));
    }, []);

    const getVisibleNodes = useCallback((nodes: TreeNode[]): string[] => {
        let ids: string[] = [];
        for (const node of nodes) {
            if (searchData.isSearching && searchData.visibleIds && !searchData.visibleIds.has(node.id)) {
                continue;
            }
            ids.push(node.id);
            const isCollection = 'name' in node;
            const isExpanded = searchData.isSearching || (expandedFolders[node.id] ?? true);
            if (isCollection && isExpanded) {
                ids = ids.concat(getVisibleNodes(node.children));
            }
        }
        return ids;
    }, [expandedFolders, searchData]);

    const visibleNodeIds = React.useMemo(() => getVisibleNodes(fileTree), [fileTree, getVisibleNodes]);

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
                    toggleFolder(focusedNodeId);
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
    
    const handleNoteCardContextMenu = (e: React.MouseEvent, note: Note) => {
        onOpenContextMenu(e, [
            { 
                label: 'Delete Note', 
                action: () => showConfirmation({
                    title: "Delete Note",
                    message: `Are you sure you want to permanently delete "${note.title}"? This action cannot be undone.`,
                    confirmText: "Delete",
                    onConfirm: () => handleDeleteNoteConfirm(note),
                }), 
                isDestructive: true, 
                icon: <TrashIcon /> 
            },
        ]);
    };

    const renderFavorites = () => (
        <CollapsibleSection title="Favorites" count={favoriteNotes.length}>
             {favoriteNotes.length > 0 ? (
                favoriteNotes.map(note => (
                    <NoteCard
                        key={note.id}
                        id={note.id}
                        title={note.title}
                        content={note.content}
                        updatedAt={note.updatedAt}
                        isFavorite={note.isFavorite}
                        isActive={note.id === activeNoteId}
                        onClick={() => onSelectNote(note.id)}
                        searchTerm={searchTerm}
                        onContextMenu={(e) => handleNoteCardContextMenu(e, note)}
                    />
                ))
            ) : (
                 <p className="px-2 py-1 text-xs text-light-text/50 dark:text-dark-text/50">No favorite notes yet.</p>
            )}
        </CollapsibleSection>
    );
    
    const renderSmartCollections = () => (
         <CollapsibleSection
            title="Smart Folders"
            count={smartCollections.length}
            actions={(
                <button onClick={() => openSmartFolderModal(null)} className="p-1 rounded text-light-text/60 dark:text-dark-text/60 hover:text-light-text dark:hover:text-dark-text hover:bg-light-background dark:hover:bg-dark-background" aria-label="Add new smart folder">
                    <PlusIcon className="w-4 h-4" />
                </button>
            )}
        >
            {smartCollections.length > 0 ? (
                smartCollections.map(sc => (
                    <div key={sc.id} 
                        className={`group flex items-center justify-between w-full text-left rounded-md px-2 py-1.5 my-0.5 text-sm cursor-pointer hover:bg-light-background dark:hover:bg-dark-background`}
                         onClick={() => onActivateSmartCollection(sc)}
                         onContextMenu={(e) => onOpenContextMenu(e, [
                             { label: 'Edit Smart Folder', action: () => openSmartFolderModal(sc), icon: <PencilSquareIcon /> },
                             { 
                                 label: 'Delete Smart Folder', 
                                 action: () => showConfirmation({
                                    title: "Delete Smart Folder",
                                    message: `Are you sure you want to delete the smart folder "${sc.name}"? This will not delete any notes.`,
                                    onConfirm: () => handleDeleteSmartCollectionConfirm(sc),
                                 }), 
                                 isDestructive: true, 
                                 icon: <TrashIcon /> 
                            },
                         ])}
                    >
                         <div className="flex items-center truncate">
                            <BrainIcon className="w-4 h-4 mr-2 flex-shrink-0 text-light-primary dark:text-dark-primary" />
                            <span className="truncate">{sc.name}</span>
                        </div>
                    </div>
                ))
            ) : (
                <p className="px-2 py-1 text-xs text-light-text/50 dark:text-dark-text/50">
                    No smart folders. Click the '+' icon to create one.
                </p>
            )}
        </CollapsibleSection>
    );
    
    const { isSearching, visibleIds } = searchData;

    if (isAiSearching) {
        return (
            <div className="flex items-center justify-center h-full text-sm text-light-text/60 dark:text-dark-text/60">
                <SparklesIcon className="w-4 h-4 mr-2 animate-spin text-light-primary dark:text-dark-primary" />
                AI is searching...
            </div>
        );
    }
    
    if (isSearching && visibleIds?.size === 0) {
        return (
            <div className="text-center px-4 py-8 text-sm text-light-text/60 dark:text-dark-text/60">
                <p className="font-semibold">No results for "{activeSmartCollection ? activeSmartCollection.query : searchTerm}"</p>
                <p className="mt-1">Try a different keyword or use AI Search for conceptual matches.</p>
            </div>
        );
    }

    return (
        <div 
            className="flex-1 overflow-y-auto focus:outline-none"
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            <div className="py-2">
                {activeSmartCollection && (
                    <div className="px-4 mb-2">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-light-primary/10 dark:bg-dark-primary/10 text-sm">
                            <div className="flex items-center gap-2 font-semibold truncate">
                                <BrainIcon className="w-4 h-4 text-light-primary dark:text-dark-primary flex-shrink-0" />
                                <span className="truncate">{activeSmartCollection.name}</span>
                            </div>
                            <button onClick={onClearActiveSmartCollection} className="p-1 rounded-full hover:bg-light-primary/20 dark:hover:bg-dark-primary/20 flex-shrink-0">
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
                
                <div
                    ref={rootDropRef}
                    {...rootDragAndDropProps}
                    className="p-1 rounded-md min-h-[10rem] relative"
                >
                    {isRootFileOver && (
                        <div className="file-drop-overlay">
                            <ArrowDownTrayIcon className="w-6 h-6 mr-2" />
                            Drop to Import
                        </div>
                    )}
                    {renderFavorites()}
                    {isAiEnabled && renderSmartCollections()}
                    <CollapsibleSection
                        title="Folders"
                        count={notes.length}
                        actions={(
                            <button onClick={() => addCollection('New Folder', null)} className="p-1 rounded text-light-text/60 dark:text-dark-text/60 hover:text-light-text dark:hover:text-dark-text hover:bg-light-background dark:hover:bg-dark-background" aria-label="Add new folder">
                                <FolderPlusIcon className="w-4 h-4" />
                            </button>
                        )}
                    >
                        {fileTree.length > 0 ? (
                            fileTree.map(node => (
                                <SidebarNode 
                                    key={node.id} 
                                    node={node} 
                                    level={0} 
                                    activeNoteId={activeNoteId}
                                    searchTerm={searchTerm}
                                    searchData={searchData}
                                    onSelectNote={onSelectNote}
                                    expandedFolders={expandedFolders}
                                    onToggleFolder={toggleFolder}
                                    isFocused={focusedNodeId === node.id}
                                    activeNotePath={activeNotePath}
                                    focusedNodeId={focusedNodeId}
                                />
                            ))
                        ) : (
                             <div className="text-center px-4 py-8 text-sm text-light-text/60 dark:text-dark-text/60">
                                <p>Your workspace is empty.</p>
                                <button onClick={() => onAddNote()} className="mt-2 text-light-primary dark:text-dark-primary font-semibold">Create your first note</button>
                            </div>
                        )}
                    </CollapsibleSection>
                </div>
            </div>
        </div>
    );
};

export default SidebarContent;
