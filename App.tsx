import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import { useStoreContext } from './context/AppContext';
import { Note, NoteVersion, Collection, SmartCollection } from './types';
import ConfirmationModal from './components/ConfirmationModal';
import { Bars3Icon, PlusIcon, SparklesIcon, ArrowDownTrayIcon, Cog6ToothIcon } from './components/Icons';
import { AppProvider, useUIContext, useAuthContext } from './context/AppContext';
import ContextMenu from './components/ContextMenu';
import { ToastProvider, useToast } from './context/ToastContext';
import SidebarResizer from './components/SidebarResizer';
import SuspenseLoader from './components/SuspenseLoader';
import Auth from './components/Auth';
import { isSupabaseConfigured } from './lib/supabaseClient';
import NoteEditorSkeleton from './components/NoteEditorSkeleton';
import ChatViewSkeleton from './components/ChatViewSkeleton';
import ApiKeyIndicator from './components/ApiKeyIndicator';

const NoteEditor = React.lazy(() => import('./components/NoteEditor'));
const ChatView = React.lazy(() => import('./components/ChatView'));
const CommandPalette = React.lazy(() => import('./components/CommandPalette'));
const SettingsModal = React.lazy(() => import('./components/SettingsModal'));
const SmartFolderModal = React.lazy(() => import('./components/SmartFolderModal'));
const WelcomeModal = React.lazy(() => import('./components/WelcomeModal'));


const WELCOME_SCREEN_SIDEBAR_WIDTH_KEY = 'wesai-sidebar-width';
const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 500;

const WelcomeScreen: React.FC<{
    onToggleSidebar?: () => void;
    isMobileView?: boolean;
    onAddNote: () => void;
}> = ({ onToggleSidebar, isMobileView, onAddNote }) => {
    const { triggerNoteImport } = useStoreContext();
    const { setView, openSettings } = useUIContext();

    return (
        <div className="flex flex-col h-full">
            {isMobileView && (
                <header className="flex items-center p-4 border-b border-light-border dark:border-dark-border flex-shrink-0">
                    <button onClick={onToggleSidebar} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">
                        <Bars3Icon />
                    </button>
                </header>
            )}
            <div className="flex flex-col items-center justify-center h-full text-center text-light-text/60 dark:text-dark-text/60 p-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002 2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">WesAI Notepad</h2>
                <p className="mb-6">Select a note to start, or create a new one.</p>
                <button onClick={onAddNote} className="flex items-center justify-center bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900 rounded-md py-2 px-6 text-base font-semibold hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover">
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Create New Note
                </button>

                <div className="mt-12 w-full max-w-2xl">
                    <h3 className="text-sm font-semibold uppercase text-light-text/50 dark:text-dark-text/50 tracking-wider mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div onClick={() => setView('CHAT')} className="bg-light-ui/50 dark:bg-dark-ui/50 p-4 rounded-lg text-left cursor-pointer hover:bg-light-ui dark:hover:bg-dark-ui transition-colors">
                            <SparklesIcon className="w-6 h-6 mb-2 text-light-primary dark:text-dark-primary" />
                            <h4 className="font-semibold text-light-text dark:text-dark-text">Explore AI Chat</h4>
                            <p className="text-xs mt-1">Ask questions and generate content.</p>
                        </div>
                        <div onClick={triggerNoteImport} className="bg-light-ui/50 dark:bg-dark-ui/50 p-4 rounded-lg text-left cursor-pointer hover:bg-light-ui dark:hover:bg-dark-ui transition-colors">
                            <ArrowDownTrayIcon className="w-6 h-6 mb-2" />
                            <h4 className="font-semibold text-light-text dark:text-dark-text">Import from File</h4>
                            <p className="text-xs mt-1">Create a note from a `.md` or `.txt` file.</p>
                        </div>
                        <div onClick={openSettings} className="bg-light-ui/50 dark:bg-dark-ui/50 p-4 rounded-lg text-left cursor-pointer hover:bg-light-ui dark:hover:bg-dark-ui transition-colors">
                            <Cog6ToothIcon className="w-6 h-6 mb-2" />
                            <h4 className="font-semibold text-light-text dark:text-dark-text">Check Settings</h4>
                            <p className="text-xs mt-1">Add your Gemini API key for AI features.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ConfigurationError: React.FC = () => (
    <div className="flex items-center justify-center h-screen w-screen bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text">
        <div className="w-full max-w-lg p-8 text-center bg-light-ui dark:bg-dark-ui rounded-xl shadow-lg">
             <h2 className="text-2xl font-bold text-red-500 mb-4">Configuration Required</h2>
             <p className="mb-2">
                 Welcome to WesAI Notepad! To get started, you need to connect to your Supabase project.
             </p>
             <p className="mb-4">
                 Please open the file:
                 <br />
                 <code className="bg-light-background dark:bg-dark-background px-2 py-1 rounded-md my-2 inline-block font-mono">
                    lib/supabaseClient.ts
                 </code>
                 <br />
                 and replace the placeholder values with your project's URL and public anonymous key.
             </p>
             <a 
                href="https://supabase.com/dashboard/project/_/settings/api" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm text-light-primary dark:text-dark-primary underline"
             >
                 Find your keys in Supabase Settings &rarr; API
             </a>
        </div>
    </div>
);

function AppContent() {
    const {
        notes, collections, activeNoteId, setActiveNoteId, onAddNote,
        noteToDelete, setNoteToDelete,
        collectionToDelete, setCollectionToDelete,
        smartCollectionToDelete, setSmartCollectionToDelete, handleDeleteCollectionConfirm,
        handleDeleteNoteConfirm, handleDeleteSmartCollectionConfirm,
        searchData, favoriteNotes, searchTerm, handleSearchTermChange, searchMode,
        setSearchMode, isAiSearching, aiSearchError, activeSmartCollection,
        handleActivateSmartCollection, handleClearActiveSmartCollection, addSmartCollection, updateSmartCollection, templates,
        restoreNoteVersion
    } = useStoreContext();

    const {
        isMobileView, isSidebarOpen, setIsSidebarOpen, view, setView,
        isSettingsOpen, setIsSettingsOpen, isCommandPaletteOpen, setIsCommandPaletteOpen,
        isSmartFolderModalOpen, setIsSmartFolderModalOpen, smartFolderToEdit, openSmartFolderModal,
        isWelcomeModalOpen, closeWelcomeModal,
        contextMenu, setContextMenu,
        isApiKeyMissing,
        isSidebarCollapsed, toggleSidebarCollapsed,
    } = useUIContext();

    const isResizing = useRef(false);

    const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
        const savedWidth = localStorage.getItem(WELCOME_SCREEN_SIDEBAR_WIDTH_KEY);
        return savedWidth ? parseInt(savedWidth, 10) : 320;
    });

    useEffect(() => {
        setIsSidebarOpen(!isMobileView);
    }, [isMobileView, setIsSidebarOpen]);

    useEffect(() => {
        localStorage.setItem(WELCOME_SCREEN_SIDEBAR_WIDTH_KEY, String(sidebarWidth));
    }, [sidebarWidth]);

    const handleSelectNote = useCallback((id: string) => {
        setActiveNoteId(id);
        setView('NOTES');
        if (isMobileView) {
            setIsSidebarOpen(false);
        }
    }, [isMobileView, setActiveNoteId, setIsSidebarOpen, setView]);
    
    const activeNote = useMemo(() => {
        if (!activeNoteId) return null;
        return notes.find(n => n.id === activeNoteId) || null;
    }, [activeNoteId, notes]);
    
    const isCollectionToDeleteEmpty = useMemo(() => {
        if (!collectionToDelete) return false;
        // A folder is empty if no note or other folder has it as a parent.
        const hasChildren = notes.some(n => n.parentId === collectionToDelete.id) || collections.some(c => c.parentId === collectionToDelete.id);
        return !hasChildren;
    }, [collectionToDelete, notes, collections]);

    useEffect(() => {
        if (activeNoteId && !notes.some(n => n.id === activeNoteId)) {
            setActiveNoteId(null);
        }
    }, [notes, activeNoteId, setActiveNoteId]);

    const handleRestoreVersion = (noteId: string, version: NoteVersion) => {
        restoreNoteVersion(noteId, version);
    };

    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        isResizing.current = true;

        const handleMouseMove = (e: MouseEvent) => {
            if (isResizing.current) {
                let newWidth = e.clientX;
                if (newWidth < MIN_SIDEBAR_WIDTH) newWidth = MIN_SIDEBAR_WIDTH;
                if (newWidth > MAX_SIDEBAR_WIDTH) newWidth = MAX_SIDEBAR_WIDTH;
                setSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            isResizing.current = false;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };

        document.body.style.cursor = 'col-resize';
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, []);
    
    const handleSaveSmartFolder = (data: Omit<SmartCollection, 'id'>) => {
        if (smartFolderToEdit) {
            updateSmartCollection(smartFolderToEdit.id, data);
        } else {
            addSmartCollection(data.name, data.query);
        }
        setIsSmartFolderModalOpen(false);
    };


    const renderMainView = () => {
        if (view === 'CHAT') {
            return <ChatView />;
        }

        if (activeNote) {
            return (
                <NoteEditor
                    key={activeNote.id}
                    note={activeNote}
                    onRestoreVersion={handleRestoreVersion}
                    templates={templates}
                />
            );
        }

        return <WelcomeScreen isMobileView={isMobileView} onToggleSidebar={() => setIsSidebarOpen(true)} onAddNote={() => onAddNote()} />;
    };
    
    const suspenseFallback = view === 'CHAT' ? <ChatViewSkeleton /> : <NoteEditorSkeleton />;

    return (
        <div className={`flex h-screen w-screen font-sans text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background overflow-hidden ${isSidebarOpen && isMobileView ? 'fixed' : ''}`}>
            <Sidebar
                favoriteNotes={favoriteNotes}
                searchData={searchData}
                activeNoteId={activeNoteId}
                searchTerm={searchTerm}
                setSearchTerm={handleSearchTermChange}
                searchMode={searchMode}
                setSearchMode={setSearchMode}
                isAiSearching={isAiSearching}
                aiSearchError={aiSearchError}
                width={sidebarWidth}
                activeSmartCollection={activeSmartCollection}
                onActivateSmartCollection={handleActivateSmartCollection}
                onClearActiveSmartCollection={handleClearActiveSmartCollection}
                onSelectNote={handleSelectNote}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapsed={toggleSidebarCollapsed}
            />
            {!isMobileView && !isSidebarCollapsed && <SidebarResizer onResizeStart={handleResizeStart} />}
            <main className="flex-1 flex flex-col h-full min-w-0">
                {isApiKeyMissing && <ApiKeyIndicator />}
                <Suspense fallback={suspenseFallback}>
                    {renderMainView()}
                </Suspense>
            </main>

            {contextMenu && <ContextMenu {...contextMenu} onClose={() => setContextMenu(null)} />}

            <Suspense fallback={<div />}>
                <CommandPalette
                    isOpen={isCommandPaletteOpen}
                    onClose={() => setIsCommandPaletteOpen(false)}
                />

                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                />

                <SmartFolderModal
                    isOpen={isSmartFolderModalOpen}
                    onClose={() => setIsSmartFolderModalOpen(false)}
                    folderToEdit={smartFolderToEdit}
                    onSave={handleSaveSmartFolder}
                />

                <WelcomeModal isOpen={isWelcomeModalOpen} onClose={closeWelcomeModal} />
            </Suspense>


            <ConfirmationModal
                isOpen={!!noteToDelete}
                onClose={() => setNoteToDelete(null)}
                onConfirm={handleDeleteNoteConfirm}
                title="Delete Note"
                message={`Are you sure you want to permanently delete "${noteToDelete?.title}"? This action cannot be undone.`}
                confirmText="Delete"
            />
            
            <ConfirmationModal
                isOpen={!!collectionToDelete}
                onClose={() => setCollectionToDelete(null)}
                onConfirm={handleDeleteCollectionConfirm}
                title="Delete Folder"
                message={
                    isCollectionToDeleteEmpty
                        ? `Are you sure you want to delete the empty folder "${collectionToDelete?.name}"? This action cannot be undone.`
                        : `Are you sure you want to delete the folder "${collectionToDelete?.name}"? All notes and folders inside it will also be permanently deleted. This action cannot be undone.`
                }
                confirmationRequiredText={isCollectionToDeleteEmpty ? undefined : collectionToDelete?.name}
            />

            <ConfirmationModal
                isOpen={!!smartCollectionToDelete}
                onClose={() => setSmartCollectionToDelete(null)}
                onConfirm={handleDeleteSmartCollectionConfirm}
                title="Delete Smart Folder"
                message={`Are you sure you want to delete the smart folder "${smartCollectionToDelete?.name}"? This will not delete any notes.`}
            />
        </div>
    );
}


function AppContainer() {
    const { session, isSessionLoading } = useAuthContext();

    if (isSessionLoading) {
        return <SuspenseLoader />;
    }

    if (!session) {
        return <Auth />;
    }

    return <AppContent />;
}

export default function App() {
    if (!isSupabaseConfigured) {
        return <ConfigurationError />;
    }
    
    return (
        <ToastProvider>
            <AppProvider>
                <AppContainer />
            </AppProvider>
        </ToastProvider>
    );
}