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
import { useOnboarding } from './hooks/useOnboarding';

const NoteEditor = React.lazy(() => import('./components/NoteEditor'));
const ChatView = React.lazy(() => import('./components/ChatView'));
const CommandPalette = React.lazy(() => import('./components/CommandPalette'));
const SettingsModal = React.lazy(() => import('./components/SettingsModal'));
const SmartFolderModal = React.lazy(() => import('./components/SmartFolderModal'));
const WelcomeModal = React.lazy(() => import('./components/WelcomeModal'));
const AnalyticsDashboard = React.lazy(() => import('./components/AnalyticsDashboard'));
const TrendAnalysisDashboard = React.lazy(() => import('./components/TrendAnalysisDashboard'));
const GraphView = React.lazy(() => import('./components/GraphView'));
const CoachMark = React.lazy(() => import('./components/CoachMark'));
// FIX: Import HelpModal to be rendered.
const HelpModal = React.lazy(() => import('./components/HelpModal'));


const WELCOME_SCREEN_SIDEBAR_WIDTH_KEY = 'wesai-sidebar-width';
const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 500;

function AppContent() {
    const {
        notes, activeNoteId, setActiveNoteId, onAddNote,
        addSmartCollection, updateSmartCollection,
    } = useStoreContext();

    const {
        isMobileView, setIsSidebarOpen, view, setView,
        isSettingsOpen, setIsSettingsOpen, initialSettingsTab,
        isCommandPaletteOpen, setIsCommandPaletteOpen,
        isSmartFolderModalOpen, setIsSmartFolderModalOpen, smartFolderToEdit, initialSmartFolderQuery,
        isWelcomeModalOpen, closeWelcomeModal,
        contextMenu, setContextMenu,
        isApiKeyMissing,
        isSidebarCollapsed,
        toggleSidebarCollapsed,
        confirmation, hideConfirmation,
        isFocusMode,
        isHelpOpen, setIsHelpOpen, // FIX: Get HelpModal state from UI context.
    } = useUIContext();
    
    const { onboardingSteps, isOnboardingComplete, activeCoachMark, dismissCoachMark } = useOnboarding();
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
    
    useEffect(() => {
        if (isFocusMode && !isSidebarCollapsed) {
            toggleSidebarCollapsed();
        }
    }, [isFocusMode, isSidebarCollapsed, toggleSidebarCollapsed]);
    
    const activeNote = useMemo(() => {
        if (!activeNoteId) return null;
        return notes.find(n => n.id === activeNoteId) || null;
    }, [activeNoteId, notes]);
    
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
            <Sidebar
                width={sidebarWidth}
                onboardingSteps={onboardingSteps}
                isOnboardingComplete={isOnboardingComplete}
            />
            {!isMobileView && <SidebarResizer onResizeStart={handleResizeStart} />}
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
                    initialTab={initialSettingsTab}
                />

                <SmartFolderModal
                    isOpen={isSmartFolderModalOpen}
                    onClose={() => setIsSmartFolderModalOpen(false)}
                    folderToEdit={smartFolderToEdit}
                    initialQuery={initialSmartFolderQuery}
                    onSave={handleSaveSmartFolder}
                />

                <WelcomeModal isOpen={isWelcomeModalOpen} onClose={closeWelcomeModal} />

                {/* FIX: Render the HelpModal component. */}
                <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
                
                {activeCoachMark && (
                    <CoachMark
                        key={activeCoachMark.id}
                        targetSelector={activeCoachMark.targetSelector}
                        title={activeCoachMark.title}
                        content={activeCoachMark.content}
                        onDismiss={dismissCoachMark}
                    />
                )}
            </Suspense>

            <ConfirmationModal
                isOpen={confirmation.isOpen}
                onClose={hideConfirmation}
                onConfirm={confirmation.onConfirm}
                title={confirmation.title}
                message={confirmation.message}
                confirmText={confirmation.confirmText}
                confirmClass={confirmation.confirmClass}
                confirmationRequiredText={confirmation.confirmationRequiredText}
            />
        </div>
    );
}


function AppContainer() {
    const { session, isSessionLoading } = useAuthContext();
    const { isDemoMode, setIsDemoMode } = useUIContext();
    const [showAuth, setShowAuth] = useState(false);

    useEffect(() => {
        if (session) {
            setupStorageBucket();
        }
    }, [session]);

    if (isSessionLoading) {
        return <SuspenseLoader />;
    }

    if (!session && !isDemoMode) {
        if (showAuth) {
            return <Auth onBack={() => setShowAuth(false)} onEnterDemo={() => setIsDemoMode(true)} />;
        }
        return <LandingPage onGetStarted={() => setShowAuth(true)} onEnterDemo={() => setIsDemoMode(true)} />;
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
