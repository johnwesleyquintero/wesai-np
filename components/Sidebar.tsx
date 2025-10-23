import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Note, SearchMode, SmartCollection, Collection, TreeNode } from '../types';
import NoteCard from './NoteCard';
import {
    PencilSquareIcon, Cog6ToothIcon, SunIcon, MoonIcon, XMarkIcon, MagnifyingGlassIcon, SparklesIcon,
    PlusIcon, FolderPlusIcon, BrainIcon, StarIcon, ChevronDownIcon, ChevronRightIcon,
    ChevronDoubleLeftIcon, FolderIcon,
    TrashIcon
} from './Icons';
import SidebarNode from './SidebarNode';
import Highlight from './Highlight';
import { useStoreContext, useUIContext } from '../context/AppContext';
import { useDragAndDrop } from '../hooks/useDragAndDrop';

interface SidebarProps {
    width: number;
    isCollapsed: boolean;
    onToggleCollapsed: () => void;
}

const FooterButton: React.FC<{
    onClick?: () => void;
    tooltip: string;
    children: React.ReactNode;
    isActive?: boolean;
    className?: string;
    hasIndicator?: boolean;
}> = ({ onClick, tooltip, children, isActive = false, className = '', hasIndicator = false }) => (
    <div className="relative group">
        <button
            onClick={onClick}
            className={`p-2 rounded-md transition-colors text-light-text/70 dark:text-dark-text/70 hover:text-light-text dark:hover:text-dark-text ${className} ${
                isActive
                    ? 'bg-light-primary/20 dark:bg-dark-primary/20 !text-light-primary dark:!text-dark-primary'
                    : 'hover:bg-light-background dark:hover:bg-dark-background'
            }`}
             aria-label={tooltip}
        >
            {children}
            {hasIndicator && <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-yellow-400 rounded-full border-2 border-light-ui dark:border-dark-ui"></div>}
        </button>
        <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 dark:bg-zinc-700 text-white dark:text-dark-text text-xs font-semibold rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {tooltip}
            <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-zinc-800 dark:border-r-zinc-700" />
        </div>
    </div>
);

const CollapsibleSection: React.FC<{
    title: string;
    count?: number;
    actions?: React.ReactNode;
    children: React.ReactNode;
    defaultExpanded?: boolean;
}> = ({ title, count, actions, children, defaultExpanded = true }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className="py-1">
            <div className="flex justify-between items-center mb-1 px-2 group h-8">
                <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center text-xs font-semibold text-light-text/60 dark:text-dark-text/60 w-full hover:text-light-text dark:hover:text-dark-text transition-colors">
                    {isExpanded ? <ChevronDownIcon className="w-4 h-4 mr-1" /> : <ChevronRightIcon className="w-4 h-4 mr-1" />}
                    <h3 className="uppercase tracking-wider">{title}</h3>
                    {typeof count !== 'undefined' && <span className="ml-2 text-light-text/50 dark:text-dark-text/50">({count})</span>}
                </button>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {actions}
                </div>
            </div>
            {isExpanded && <div className="pl-1 pr-2">{children}</div>}
        </div>
    );
};

const COLLAPSED_WIDTH = 56;

const Sidebar: React.FC<SidebarProps> = ({
    width, isCollapsed, onToggleCollapsed
}) => {
    const {
        collections, smartCollections, onAddNote, addCollection, moveItem,
        deleteSmartCollection, onAddNoteFromFile, 
        setNoteToDelete, fileTree, notes, favoriteNotes, searchData, activeNoteId,
        searchTerm, handleSearchTermChange: setSearchTerm, searchMode, setSearchMode,
        isAiSearching, aiSearchError, activeSmartCollection,
        handleActivateSmartCollection: onActivateSmartCollection,
        handleClearActiveSmartCollection: onClearActiveSmartCollection,
        setActiveNoteId
    } = useStoreContext();
    
    const {
        theme, toggleTheme, isMobileView, isSidebarOpen, setIsSidebarOpen, view, setView,
        isAiRateLimited, openSmartFolderModal, onOpenContextMenu, openSettings, isApiKeyMissing,
    } = useUIContext();
    
    const rootDropRef = useRef<HTMLDivElement>(null);
    const { isFileOver: isRootFileOver, dragAndDropProps: rootDragAndDropProps } = useDragAndDrop(rootDropRef, {
        id: null,
        type: 'root',
        onMoveItem: moveItem,
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

    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

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
            { label: 'Delete Note', action: () => setNoteToDelete(note), isDestructive: true, icon: <TrashIcon /> },
        ]);
    };
    
    const renderFavorites = () => (
        <CollapsibleSection title="Favorites" count={favoriteNotes.length}>
             {favoriteNotes.length > 0 ? (
                favoriteNotes.map(note => (
                    <NoteCard
                        key={note.id}
                        note={note}
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
            {smartCollections.map(sc => (
                <div key={sc.id} 
                    className={`group flex items-center justify-between w-full text-left rounded-md px-2 py-1.5 my-0.5 text-sm cursor-pointer hover:bg-light-background dark:hover:bg-dark-background`}
                     onClick={() => onActivateSmartCollection(sc)}
                     onContextMenu={(e) => onOpenContextMenu(e, [
                         { label: 'Edit Smart Folder', action: () => openSmartFolderModal(sc), icon: <PencilSquareIcon /> },
                         { label: 'Delete Smart Folder', action: () => deleteSmartCollection(sc.id), isDestructive: true, icon: <TrashIcon /> },
                     ])}
                >
                     <div className="flex items-center truncate">
                        <BrainIcon className="w-4 h-4 mr-2 flex-shrink-0 text-light-primary dark:text-dark-primary" />
                        <span className="truncate">{sc.name}</span>
                    </div>
                </div>
            ))}
        </CollapsibleSection>
    );
    
    const renderContent = () => {
        const { isSearching, visibleIds } = searchData;

        if (isSearching && visibleIds?.size === 0) {
            return (
                <div className="text-center px-4 py-8 text-sm text-light-text/60 dark:text-dark-text/60">
                    {isAiSearching && 'AI is searching...'}
                    {!isAiSearching && searchTerm && (
                        <>
                            <p className="font-semibold">No results for "{searchTerm}"</p>
                            <p className="mt-1">Try a different keyword or use AI Search for conceptual matches.</p>
                        </>
                    )}
                </div>
            );
        }
        
        return (
            <div
                ref={rootDropRef}
                {...rootDragAndDropProps}
                className={`transition-colors p-1 rounded-md min-h-[10rem] ${isRootFileOver ? 'bg-light-primary/10' : ''}`}
            >
                {renderFavorites()}
                {renderSmartCollections()}
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
        );
    };

    const ExpandedView = () => (
        <>
            <div className="p-4 flex-shrink-0 border-b border-light-border dark:border-dark-border">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-bold">WesAI Notepad</h1>
                    {!isMobileView ? (
                        <button onClick={onToggleCollapsed} className="p-2 -mr-2 rounded-md hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover" aria-label="Collapse sidebar">
                            <ChevronDoubleLeftIcon />
                        </button>
                    ) : (
                         <button onClick={() => setIsSidebarOpen(false)} className="p-2 -mr-2 rounded-md hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover" aria-label="Close sidebar">
                            <XMarkIcon />
                        </button>
                    )}
                </div>
                <div className="flex space-x-2">
                    <button onClick={() => onAddNote()} className="flex-1 flex items-center justify-center bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900 rounded-md py-2 text-sm font-semibold hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover">
                        <PencilSquareIcon className="w-4 h-4 mr-2" />
                        New Note
                    </button>
                </div>
            </div>
            
            <div className="px-4 py-3 border-b border-light-border dark:border-dark-border flex-shrink-0">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search notes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-light-background dark:bg-dark-background rounded-md border border-light-border dark:border-dark-border focus:ring-1 focus:ring-light-primary focus:outline-none"
                    />
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-text/50 dark:text-dark-text/50" />
                </div>
                <div className="flex items-center mt-2 text-xs">
                     <button
                        onClick={() => setSearchMode('KEYWORD')}
                        className={`px-3 py-1 rounded-l-md ${searchMode === 'KEYWORD' ? 'bg-light-primary/80 text-white dark:bg-dark-primary/80 dark:text-zinc-900' : 'bg-light-background dark:bg-dark-background'}`}
                    >
                        Keyword
                    </button>
                    <button
                        onClick={() => setSearchMode('AI')}
                        className={`px-3 py-1 rounded-r-md flex items-center ${searchMode === 'AI' ? 'bg-light-primary/80 text-white dark:bg-dark-primary/80 dark:text-zinc-900' : 'bg-light-background dark:bg-dark-background'}`}
                        disabled={isAiRateLimited}
                    >
                        <SparklesIcon className="w-3 h-3 mr-1" />
                        AI Search
                    </button>
                     {isAiRateLimited && <span className="text-red-500 ml-2 text-xs">Paused</span>}
                </div>
                 {aiSearchError && <p className="text-red-500 text-xs mt-1">{aiSearchError}</p>}
            </div>

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
                    
                    {renderContent()}
                </div>
            </div>

            <div className="p-2 flex-shrink-0 border-t border-light-border dark:border-dark-border">
                <div className="flex justify-end items-center space-x-1">
                    <FooterButton
                        onClick={() => setView('CHAT')}
                        tooltip="Ask AI"
                        isActive={view === 'CHAT'}
                    >
                        <SparklesIcon />
                    </FooterButton>

                    <FooterButton
                        onClick={toggleTheme}
                        tooltip={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                    >
                        {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                    </FooterButton>

                    <FooterButton
                        onClick={openSettings}
                        tooltip="Settings"
                        hasIndicator={isApiKeyMissing}
                    >
                        <Cog6ToothIcon />
                    </FooterButton>
                </div>
            </div>
        </>
    );
    
    const CollapsedView = () => (
      <div className="flex flex-col h-full items-center p-2 overflow-hidden">
        {/* Logo at top */}
        <div className="mb-4 flex-shrink-0 pt-2">
            <svg width="32" height="32" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="64" height="64" rx="12" fill="#60a5fa"/>
              <path d="M20 18C20 15.7909 21.7909 14 24 14H44C46.2091 14 48 15.7909 48 18V46C48 48.2091 46.2091 50 44 50H24C21.7909 50 20 48.2091 20 46V18Z" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M24 14V50" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        </div>

        {/* Main actions */}
        <div className="flex flex-col space-y-2 flex-grow">
          <FooterButton onClick={() => onAddNote()} tooltip="New Note">
            <PlusIcon />
          </FooterButton>
          <FooterButton onClick={onToggleCollapsed} tooltip="Explorer">
            <FolderIcon />
          </FooterButton>
          <FooterButton onClick={onToggleCollapsed} tooltip="Search">
            <MagnifyingGlassIcon />
          </FooterButton>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col space-y-1 flex-shrink-0">
          <FooterButton onClick={() => setView('CHAT')} tooltip="Ask AI" isActive={view === 'CHAT'}>
            <SparklesIcon />
          </FooterButton>
          <FooterButton onClick={toggleTheme} tooltip={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}>
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </FooterButton>
          <FooterButton onClick={openSettings} tooltip="Settings" hasIndicator={isApiKeyMissing}>
            <Cog6ToothIcon />
          </FooterButton>
        </div>
      </div>
    );

    return (
        <aside 
            className={`absolute md:relative z-30 flex flex-col h-full bg-light-ui dark:bg-dark-ui border-r border-light-border dark:border-dark-border transform transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex-shrink-0`}
            style={{ width: isMobileView ? '20rem' : isCollapsed ? `${COLLAPSED_WIDTH}px` : `${width}px` }}
        >
           {isCollapsed && !isMobileView ? <CollapsedView /> : <ExpandedView />}
        </aside>
    );
};

export default Sidebar;