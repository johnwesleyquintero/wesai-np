import React, { useState } from 'react';
import { MagnifyingGlassIcon, SparklesIcon, FolderPlusIcon } from '../Icons';
import { useStoreContext, useUIContext } from '../../context/AppContext';

interface SidebarSearchProps {}

const SidebarSearch: React.FC<SidebarSearchProps> = () => {
    const { 
        searchTerm, handleSearchTermChange: setSearchTerm, searchMode, setSearchMode,
        isAiSearching, aiSearchError, activeSmartCollection, recentQueries,
    } = useStoreContext();
    const { isApiKeyMissing, isAiRateLimited, openSmartFolderModal } = useUIContext();
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    return (
        <div className="px-4 py-3 border-b border-light-border dark:border-dark-border flex-shrink-0">
            <div className="relative">
                <input
                    type="text"
                    placeholder={activeSmartCollection ? activeSmartCollection.query : "Search notes..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    className="w-full pl-9 pr-24 py-2 text-sm bg-light-background dark:bg-dark-background rounded-md border border-light-border dark:border-dark-border focus:ring-1 focus:ring-light-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!!activeSmartCollection}
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-text/50 dark:text-dark-text/50" />
                 {isSearchFocused && !searchTerm && recentQueries && recentQueries.length > 0 && (
                    <div className="absolute top-full mt-2 w-full bg-light-background dark:bg-dark-background rounded-md shadow-lg border border-light-border dark:border-dark-border z-10 py-1">
                        <h4 className="px-3 pt-2 pb-1 text-xs font-semibold text-light-text/60 dark:text-dark-text/60">Recent Searches</h4>
                        {recentQueries.map((query) => (
                            <button
                                key={query}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    setSearchTerm(query);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui truncate"
                            >
                                {query}
                            </button>
                        ))}
                    </div>
                )}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                    {isAiSearching && (
                        <SparklesIcon className="w-4 h-4 text-light-primary dark:text-dark-primary animate-spin" />
                    )}
                    <div className="relative group">
                        <button
                            onClick={() => openSmartFolderModal(null, searchTerm)}
                            disabled={!searchTerm.trim() || !!activeSmartCollection}
                            className="p-1 rounded-md text-light-text/60 dark:text-dark-text/60 hover:bg-light-ui dark:hover:bg-dark-ui disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Save search as smart folder"
                        >
                            <FolderPlusIcon className="w-4 h-4" />
                        </button>
                         <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-800 dark:bg-zinc-700 text-white dark:text-dark-text text-xs font-semibold rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            Save as Smart Folder
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-t-4 border-t-zinc-800 dark:border-t-zinc-700 border-x-4 border-x-transparent" />
                        </div>
                    </div>
                </div>
            </div>
            {!isApiKeyMissing && <div className="flex items-center mt-2 text-xs">
                <div className="flex w-full bg-light-background dark:bg-dark-background p-0.5 rounded-md border border-light-border dark:border-dark-border">
                     <button
                        onClick={() => setSearchMode('KEYWORD')}
                        className={`flex-1 px-2 py-1 text-xs rounded-md transition-colors ${searchMode === 'KEYWORD' ? 'bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900' : 'hover:bg-light-ui dark:hover:bg-dark-ui'}`}
                    >
                        Keyword
                    </button>
                    <button
                        onClick={() => setSearchMode('AI')}
                        className={`flex-1 px-2 py-1 flex items-center justify-center gap-1 text-xs rounded-md transition-colors ${searchMode === 'AI' ? 'bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900' : 'hover:bg-light-ui dark:hover:bg-dark-ui'}`}
                        disabled={isAiRateLimited}
                    >
                        <SparklesIcon className="w-3 h-3" />
                        AI Search
                    </button>
                </div>
                 {isAiRateLimited && <span className="text-red-500 ml-2 text-xs">Paused</span>}
            </div>}
            {aiSearchError && <p className="text-red-500 text-xs mt-1">{aiSearchError}</p>}
        </div>
    );
};

export default SidebarSearch;