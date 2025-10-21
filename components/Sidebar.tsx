import React, { useMemo, useState } from 'react';
import { Note, FilterType, SearchMode } from '../types';
import NoteCard from './NoteCard';
import {
    PencilSquareIcon, Cog6ToothIcon, SunIcon, MoonIcon, XMarkIcon, MagnifyingGlassIcon, SparklesIcon,
    PlusIcon, FolderPlusIcon, BrainIcon, TrashIcon
} from './Icons';
import SidebarNode, { TreeNode } from './SidebarNode';
import Highlight from './Highlight';
import { useAppContext } from '../context/AppContext';

interface SidebarProps {
    filteredNotes: Note[];
    activeNoteId: string | null;
    filter: FilterType;
    setFilter: (filter: FilterType) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    searchMode: SearchMode;
    setSearchMode: (mode: SearchMode) => void;
    isAiSearching: boolean;
    aiSearchError: string | null;
    width: number;
}

const buildTree = (notes: Note[], collections: import('../types').Collection[]): TreeNode[] => {
    const noteMap = new Map(notes.map(note => [note.id, { ...note, children: [] as TreeNode[] }]));
    const collectionMap = new Map(collections.map(c => [c.id, { ...c, type: 'collection' as const, children: [] as TreeNode[] }]));
    
    const tree: TreeNode[] = [];
    
    const allItemsMap: Map<string, TreeNode> = new Map<string, TreeNode>([...noteMap.entries(), ...collectionMap.entries()]);

    allItemsMap.forEach(item => {
        if (item.parentId === null) {
            tree.push(item);
        } else {
            const parent = collectionMap.get(item.parentId);
            if (parent) {
                parent.children.push(item);
            } else {
                tree.push(item);
            }
        }
    });

    const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => (a.order || 0) - (b.order || 0));
        nodes.forEach(node => {
            if ('children' in node && node.children.length > 0) {
                sortNodes(node.children);
            }
        });
    };
    
    sortNodes(tree);

    return tree;
};

const FooterButton: React.FC<{
    onClick?: () => void;
    tooltip: string;
    children: React.ReactNode;
    isActive?: boolean;
    className?: string;
}> = ({ onClick, tooltip, children, isActive = false, className = '' }) => (
    <div className="relative group">
        <button
            onClick={onClick}
            className={`p-2 rounded-md transition-colors text-light-text/70 dark:text-dark-text/70 hover:text-light-text dark:hover:text-dark-text ${className} ${
                isActive
                    ? 'bg-light-primary/20 dark:bg-dark-primary/20 !text-light-primary dark:!text-dark-primary'
                    : 'hover:bg-light-ui/60 dark:hover:bg-dark-ui-hover/60'
            }`}
             aria-label={tooltip}
        >
            {children}
        </button>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 dark:bg-zinc-700 text-white dark:text-dark-text text-xs font-semibold rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {tooltip}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-zinc-800 dark:border-t-zinc-700" />
        </div>
    </div>
);

const Sidebar: React.FC<SidebarProps> = ({
    filteredNotes, activeNoteId, filter, setFilter, searchTerm, setSearchTerm, searchMode, setSearchMode, isAiSearching, aiSearchError, width
}) => {
    const {
        notes, collections, smartCollections, onSelectNote, onAddNote, onAddCollection,
        theme, toggleTheme, isMobileView, isSidebarOpen, setIsSidebarOpen, view, onSetView,
        isAiRateLimited, onOpenSmartFolderModal, onDeleteSmartCollection, onMoveItem,
        onOpenContextMenu, openSettings, onAddNoteFromFile
    } = useAppContext();

    const [isRootDragOver, setIsRootDragOver] = useState(false);
    const fileTree = useMemo(() => buildTree(notes, collections), [notes, collections]);
    
    const handleRootDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Check if files are being dragged
        if (e.dataTransfer.types.includes('Files')) {
            setIsRootDragOver(true);
        }
    };

    const handleRootDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsRootDragOver(false);
    };

    const handleRootDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsRootDragOver(false);

        // Handle file drop
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const validFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'text/plain' || f.name.endsWith('.md'));
            validFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                    const content = loadEvent.target?.result as string;
                    if (content) {
                        onAddNoteFromFile(file.name, content, null);
                    }
                };
                reader.readAsText(file);
            });
            return;
        }

        // Handle note/folder reorder drop
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
             if (data.id && data.parentId !== null) { // Only move if it's not already at root
                onMoveItem(data.id, null, 'inside');
            }
        } catch (error) {
            console.error("Failed to parse drag-and-drop data:", error);
        }
    };
    
    const renderSmartCollections = () => (
        <div className="px-2 mt-4">
             <div className="flex justify-between items-center mb-1 px-2">
                <h3 className="text-sm font-semibold text-light-text/60 dark:text-dark-text/60">Smart Folders</h3>
                <button onClick={() => onOpenSmartFolderModal(null)} className="p-1 rounded text-light-text/60 dark:text-dark-text/60 hover:text-light-text dark:hover:text-dark-text hover:bg-light-ui dark:hover:bg-dark-ui" aria-label="Add new smart folder">
                    <PlusIcon className="w-4 h-4" />
                </button>
            </div>
            {smartCollections.map(sc => (
                <div key={sc.id} 
                    className={`group flex items-center justify-between w-full text-left rounded-md px-2 py-1.5 my-0.5 text-sm cursor-pointer hover:bg-light-background dark:hover:bg-dark-background`}
                     onClick={() => { setSearchTerm(sc.query); setSearchMode('AI'); }}
                     onContextMenu={(e) => onOpenContextMenu(e, [
                         { label: 'Edit Smart Folder', action: () => onOpenSmartFolderModal(sc), icon: <PencilSquareIcon /> },
                         { label: 'Delete Smart Folder', action: () => onDeleteSmartCollection(sc), isDestructive: true, icon: <TrashIcon /> },
                     ])}
                >
                     <div className="flex items-center truncate">
                        <BrainIcon className="w-4 h-4 mr-2 flex-shrink-0 text-light-primary dark:text-dark-primary" />
                        <span className="truncate">{sc.name}</span>
                    </div>
                </div>
            ))}
        </div>
    );
    
    const renderFileTree = () => {
        if (fileTree.length === 0 && smartCollections.length === 0 && filter === 'ALL') {
            return (
                <div className="text-center px-4 py-8 text-sm text-light-text/60 dark:text-dark-text/60">
                    <p>Your workspace is empty.</p>
                    <button onClick={() => onAddNote()} className="mt-2 text-light-primary dark:text-dark-primary font-semibold">Create your first note</button>
                </div>
            );
        }

        return (
            <div className="px-2 mt-2">
                 <div className="flex justify-between items-center mb-1 px-2">
                    <h3 className="text-sm font-semibold text-light-text/60 dark:text-dark-text/60">Folders</h3>
                     <button onClick={() => onAddCollection('New Folder', null)} className="p-1 rounded text-light-text/60 dark:text-dark-text/60 hover:text-light-text dark:hover:text-dark-text hover:bg-light-ui dark:hover:bg-dark-ui" aria-label="Add new folder">
                        <FolderPlusIcon className="w-4 h-4" />
                    </button>
                </div>
                {fileTree.map(node => (
                    <SidebarNode 
                        key={node.id} 
                        node={node} 
                        level={0} 
                        activeNoteId={activeNoteId}
                        searchTerm={searchTerm}
                    />
                ))}
            </div>
        );
    };

    const renderFlatList = () => (
        <div className="px-4">
            {filteredNotes.length > 0 ? (
                filteredNotes.map(note => (
                    <NoteCard
                        key={note.id}
                        note={note}
                        isActive={note.id === activeNoteId}
                        onClick={() => onSelectNote(note.id)}
                        searchTerm={searchTerm}
                    />
                ))
            ) : (
                <div className="text-center py-8 text-sm text-light-text/60 dark:text-dark-text/60">
                    {isAiSearching ? 'Searching...' : 'No notes found.'}
                </div>
            )}
        </div>
    );

    return (
        <aside 
            className={`absolute md:relative z-30 flex flex-col h-full bg-light-ui dark:bg-dark-ui border-r border-light-border dark:border-dark-border transition-transform transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex-shrink-0`}
            style={{ width: isMobileView ? '20rem' : `${width}px` }} // 20rem is 320px
        >
            <div className="p-4 flex-shrink-0 border-b border-light-border dark:border-dark-border">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-bold">WesAI Notepad</h1>
                    {isMobileView && (
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

            <div className="flex-1 overflow-y-auto">
                <div className="py-2">
                    <div className="px-4 mb-2">
                        <div className="flex justify-between items-center">
                             <div className="flex space-x-1 bg-light-background dark:bg-dark-background p-1 rounded-lg">
                                <button
                                    onClick={() => setFilter('RECENT')}
                                    className={`px-3 py-1 text-sm rounded-md ${filter === 'RECENT' ? 'bg-white dark:bg-dark-ui-hover shadow-sm' : ''}`}
                                >
                                    Recent
                                </button>
                                <button
                                    onClick={() => setFilter('FAVORITES')}
                                    className={`px-3 py-1 text-sm rounded-md ${filter === 'FAVORITES' ? 'bg-white dark:bg-dark-ui-hover shadow-sm' : ''}`}
                                >
                                    Favorites
                                </button>
                                <button
                                    onClick={() => setFilter('ALL')}
                                    className={`px-3 py-1 text-sm rounded-md ${filter === 'ALL' ? 'bg-white dark:bg-dark-ui-hover shadow-sm' : ''}`}
                                >
                                    All
                                </button>
                            </div>
                        </div>
                    </div>
                    {searchTerm ? renderFlatList() : (
                        filter === 'ALL' ? (
                            <div
                                onDragOver={handleRootDragOver}
                                onDragLeave={handleRootDragLeave}
                                onDrop={handleRootDrop}
                                className={`transition-colors p-1 rounded-md min-h-[10rem] ${isRootDragOver ? 'bg-light-primary/10' : ''}`}
                            >
                               {renderSmartCollections()}
                               {renderFileTree()}
                            </div>
                        ) : renderFlatList()
                    )}
                </div>
            </div>

            <div className="p-2 flex-shrink-0 border-t border-light-border dark:border-dark-border">
                <div className="flex justify-end items-center space-x-1">
                    <FooterButton
                        onClick={() => onSetView('CHAT')}
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
                    >
                        <Cog6ToothIcon />
                    </FooterButton>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;