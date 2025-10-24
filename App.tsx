

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import { useStoreContext } from './context/AppContext';
import { Note, NoteVersion, Collection, SmartCollection } from './types';
import ConfirmationModal from './components/ConfirmationModal';
import { AppProvider, useUIContext, useAuthContext } from './context/AppContext';
import ContextMenu from './components/ContextMenu';
import { ToastProvider, useToast } from './context/ToastContext';
import SidebarResizer from './components/SidebarResizer';
import SuspenseLoader from './components/SuspenseLoader';
import Auth from './components/Auth';
import { setupStorageBucket } from './lib/supabaseClient';
import NoteEditorSkeleton from './components/NoteEditorSkeleton';
import ChatViewSkeleton from './components/ChatViewSkeleton';
import ApiKeyIndicator from './components/ApiKeyIndicator';
import AnalyticsDashboardSkeleton from './components/AnalyticsDashboardSkeleton';
import TrendAnalysisDashboardSkeleton from './components/TrendAnalysisDashboardSkeleton';
import GraphViewSkeleton from './components/GraphViewSkeleton';
import LandingPage from './components/LandingPage';
import WelcomeScreen from './components/WelcomeScreen';

const NoteEditor = React.lazy(() => import('./components/NoteEditor'));
const ChatView = React.lazy(() => import('./components/ChatView'));
const CommandPalette = React.lazy(() => import('./components/CommandPalette'));
const SettingsModal = React.lazy(() => import('./components/SettingsModal'));
const SmartFolderModal = React.lazy(() => import('./components/SmartFolderModal'));
const WelcomeModal = React.lazy(() => import('./components/WelcomeModal'));
const AnalyticsDashboard = React.lazy(() => import('./components/AnalyticsDashboard'));
const TrendAnalysisDashboard = React.lazy(() => import('./components/TrendAnalysisDashboard'));
const GraphView = React.lazy(() => import('./components/GraphView'));


const WELCOME_SCREEN_SIDEBAR_WIDTH_KEY = 'wesai-sidebar-width';
const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 500;

function AppContent() {
    const {
        notes, collections, activeNoteId, setActiveNoteId, onAddNote,
        noteToDelete, setNoteToDelete,
        collectionToDelete, setCollectionToDelete,
        smartCollectionToDelete, setSmartCollectionToDelete, handleDeleteCollectionConfirm,
        handleDeleteNoteConfirm, handleDeleteSmartCollectionConfirm,
        addSmartCollection, updateSmartCollection, templates, restoreNoteVersion
    } = useStoreContext();

    const {
        isMobileView, setIsSidebarOpen, view, setView,
        isSettingsOpen, setIsSettingsOpen, isCommandPaletteOpen, setIsCommandPaletteOpen,
        isSmartFolderModalOpen, setIsSmartFolderModalOpen, smartFolderToEdit,
        isWelcomeModalOpen, closeWelcomeModal,
        contextMenu, setContextMenu,
        isApiKeyMissing,
        isSidebarCollapsed,
        toggleSidebarCollapsed,
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
        switch (view) {
            case 'CHAT':
                return <ChatView />;
            case 'CTR_ANALYTICS':
                return <AnalyticsDashboard />;
            case 'TREND_ANALYSIS':
                return <TrendAnalysisDashboard />;
            case 'GRAPH':
                return <GraphView />;
            case 'NOTES':
            default:
                if (activeNote) {
                    return (
                        <NoteEditor
                            key={activeNote.id}
                            note={activeNote}
                        />
                    );
                }
                return <WelcomeScreen
                    isMobileView={isMobileView}
                    onToggleSidebar={() => setIsSidebarOpen(true)}
                    onAddNote={() => onAddNote()}
                    isSidebarCollapsed={isSidebarCollapsed}
                    onToggleSidebarCollapsed={toggleSidebarCollapsed}
                />;
        }
    };
    
    const suspenseFallback = useMemo(() => {
        switch (view) {
            case 'CHAT':
                return <ChatViewSkeleton />;
            case 'CTR_ANALYTICS':
                return <AnalyticsDashboardSkeleton />;
            case 'TREND_ANALYSIS':
                return <TrendAnalysisDashboardSkeleton />;
            case 'GRAPH':
                return <GraphViewSkeleton />;
            case 'NOTES':
            default:
                return <NoteEditorSkeleton />;
        }
    }, [view]);

    return (
        <div className="flex h-screen w-screen font-sans text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background overflow-hidden">
            <Sidebar width={sidebarWidth} />
            <SidebarResizer onResizeStart={handleResizeStart} />
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
    const [showAuth, setShowAuth] = useState(false);

    useEffect(() => {
        if (session) {
            setupStorageBucket();
        }
    }, [session]);

    if (isSessionLoading) {
        return <SuspenseLoader />;
    }

    if (!session) {
        if (showAuth) {
            return <Auth onBack={() => setShowAuth(false)} />;
        }
        return <LandingPage onGetStarted={() => setShowAuth(true)} />;
    }

    return <AppContent />;
}

export default function App() {
    return (
        <ToastProvider>
            <AppProvider>
                <AppContainer />
            </AppProvider>
        </ToastProvider>
    );
}