
import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import SidebarResizer from './SidebarResizer';
import ApiKeyIndicator from './ApiKeyIndicator';
import MainView from './MainView';
import ContextMenu from './ContextMenu';
import ModalManager from './ModalManager';
import ConfirmationModal from './ConfirmationModal';
import { useUIContext, useStoreContext } from '../context/AppContext';
import { useOnboarding } from '../hooks/useOnboarding';
import { useSidebarResizer } from '../hooks/useSidebarResizer';

const WELCOME_SCREEN_SIDEBAR_WIDTH_KEY = 'wesai-sidebar-width';
const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 500;

const WorkspaceLayout: React.FC = () => {
    const {
        notes, activeNoteId, setActiveNoteId, onAddNote, activeNote
    } = useStoreContext();

    const {
        isMobileView, setIsSidebarOpen, view,
        contextMenu, setContextMenu,
        isApiKeyMissing,
        isSidebarCollapsed,
        toggleSidebarCollapsed,
        confirmation, hideConfirmation,
        isFocusMode,
    } = useUIContext();
    
    const { onboardingSteps, isOnboardingComplete } = useOnboarding();

    const { sidebarWidth, handleResizeStart } = useSidebarResizer({
        minWidth: MIN_SIDEBAR_WIDTH,
        maxWidth: MAX_SIDEBAR_WIDTH,
        storageKey: WELCOME_SCREEN_SIDEBAR_WIDTH_KEY,
        defaultWidth: 320
    });

    useEffect(() => {
        setIsSidebarOpen(!isMobileView);
    }, [isMobileView, setIsSidebarOpen]);
    
    useEffect(() => {
        if (isFocusMode && !isSidebarCollapsed) {
            toggleSidebarCollapsed();
        }
    }, [isFocusMode, isSidebarCollapsed, toggleSidebarCollapsed]);
    
    // Safety check: if the active note ID exists but isn't in the list (e.g. deleted), clear it.
    useEffect(() => {
        if (activeNoteId && !notes.some(n => n.id === activeNoteId)) {
            setActiveNoteId(null);
        }
    }, [notes, activeNoteId, setActiveNoteId]);
    
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
                <MainView 
                    view={view}
                    activeNote={activeNote}
                    isMobileView={isMobileView}
                    setIsSidebarOpen={setIsSidebarOpen}
                    onAddNote={onAddNote}
                    isSidebarCollapsed={isSidebarCollapsed}
                    toggleSidebarCollapsed={toggleSidebarCollapsed}
                />
            </main>

            {contextMenu && <ContextMenu {...contextMenu} onClose={() => setContextMenu(null)} />}

            <ModalManager />

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
};

export default WorkspaceLayout;
