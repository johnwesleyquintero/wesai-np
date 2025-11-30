
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Note, TreeNode, Collection } from '../../types';
import SidebarNode from '../SidebarNode';
import CollapsibleSection from './CollapsibleSection';
import { useStoreContext, useUIContext } from '../../context/AppContext';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { useToast } from '../../context/ToastContext';
import { getVisibleNodes } from '../../lib/treeUtils';
import { useSidebarNavigation } from '../../hooks/useSidebarNavigation';
import { SparklesIcon, ArrowDownTrayIcon, FolderPlusIcon, TrashIcon, BrainIcon, XMarkIcon } from '../Icons';
import { FavoritesList, SmartFolderList } from './SidebarLists';

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

    const visibleNodeIds = useMemo(() => 
        getVisibleNodes(fileTree, searchData, expandedFolders), 
    [fileTree, searchData, expandedFolders]);

    const { handleKeyDown } = useSidebarNavigation({
        visibleNodeIds,
        collections,
        expandedFolders,
        setExpandedFolders,
        onSelectNote,
        activeNoteId
    });
    
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

    const handleDeleteSmartCollection = (sc: any) => {
        showConfirmation({
            title: "Delete Smart Folder",
            message: `Are you sure you want to delete the smart folder "${sc.name}"? This will not delete any notes. To confirm, please type "${sc.name}".`,
            onConfirm: () => handleDeleteSmartCollectionConfirm(sc),
            confirmationRequiredText: sc.name,
        });
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
                    
                    <FavoritesList
                        favoriteNotes={favoriteNotes}
                        activeNoteId={activeNoteId}
                        searchTerm={searchTerm}
                        onSelectNote={onSelectNote}
                        onContextMenu={handleNoteCardContextMenu}
                    />

                    {isAiEnabled && (
                        <SmartFolderList
                            smartCollections={smartCollections}
                            onOpenModal={openSmartFolderModal}
                            onActivate={onActivateSmartCollection}
                            onDelete={handleDeleteSmartCollection}
                            onContextMenu={onOpenContextMenu}
                        />
                    )}

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
                                    isFocused={false} 
                                    isActivePath={activeNotePath.has(node.id)}
                                    activeNotePath={activeNotePath}
                                    focusedNodeId={null} 
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
