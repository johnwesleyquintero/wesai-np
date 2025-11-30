import React, { Suspense, useMemo } from 'react';
import { ViewState, Note } from '../types';
import SuspenseLoader from './SuspenseLoader';
import NoteEditorSkeleton from './NoteEditorSkeleton';
import ChatViewSkeleton from './ChatViewSkeleton';
import AnalyticsDashboardSkeleton from './AnalyticsDashboardSkeleton';
import TrendAnalysisDashboardSkeleton from './TrendAnalysisDashboardSkeleton';
import GraphViewSkeleton from './GraphViewSkeleton';
import WelcomeScreen from './WelcomeScreen';

const NoteEditor = React.lazy(() => import('./NoteEditor'));
const ChatView = React.lazy(() => import('./ChatView'));
const AnalyticsDashboard = React.lazy(() => import('./AnalyticsDashboard'));
const TrendAnalysisDashboard = React.lazy(() => import('./TrendAnalysisDashboard'));
const GraphView = React.lazy(() => import('./GraphView'));

interface MainViewProps {
    view: ViewState;
    activeNote: Note | null;
    isMobileView: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
    onAddNote: () => void;
    isSidebarCollapsed: boolean;
    toggleSidebarCollapsed: () => void;
}

const MainView: React.FC<MainViewProps> = ({
    view,
    activeNote,
    isMobileView,
    setIsSidebarOpen,
    onAddNote,
    isSidebarCollapsed,
    toggleSidebarCollapsed
}) => {
    
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
                    onAddNote={onAddNote}
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
        <Suspense fallback={suspenseFallback}>
            {renderMainView()}
        </Suspense>
    );
};

export default MainView;
