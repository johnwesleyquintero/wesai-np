import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import { useStoreContext } from './context/AppContext';
import { Note, NoteVersion, Collection, SmartCollection } from './types';
import ConfirmationModal from './components/ConfirmationModal';
import { Bars3Icon, PlusIcon, SparklesIcon, ArrowDownTrayIcon, Cog6ToothIcon, LockClosedIcon, RocketLaunchIcon, ServerStackIcon, TrendingUpIcon } from './components/Icons';
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

const NoteEditor = React.lazy(() => import('./components/NoteEditor'));
const ChatView = React.lazy(() => import('./components/ChatView'));
const CommandPalette = React.lazy(() => import('./components/CommandPalette'));
const SettingsModal = React.lazy(() => import('./components/SettingsModal'));
const SmartFolderModal = React.lazy(() => import('./components/SmartFolderModal'));
const WelcomeModal = React.lazy(() => import('./components/WelcomeModal'));
const AnalyticsDashboard = React.lazy(() => import('./components/AnalyticsDashboard'));
const TrendAnalysisDashboard = React.lazy(() => import('./components/TrendAnalysisDashboard'));


const WELCOME_SCREEN_SIDEBAR_WIDTH_KEY = 'wesai-sidebar-width';
const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 500;

const LandingPage: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
    const features = [
        {
            icon: <LockClosedIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
            title: 'Privacy-First Architecture',
            description: 'All data is securely stored and encrypted. Real-time, authenticated subscriptions keep all your devices perfectly in sync.',
        },
        {
            icon: <SparklesIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
            title: 'AI-Powered Intelligence',
            description: 'Leverage a multi-mode assistant, semantic search, and proactive suggestions. Turn your knowledge base into an operational co-pilot.',
        },
        {
            icon: <RocketLaunchIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
            title: 'Productivity Workflow',
            description: 'A full-featured Markdown editor, bi-directional linking, command palette, and full data portability to streamline your process from idea to execution.',
        },
    ];
    
    const principles = [
        {
            icon: <TrendingUpIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
            title: 'Leverage Challenges into Opportunities',
            description: 'Built to turn complex problems into actionable insights and strategic advantages.',
        },
        {
            icon: <Cog6ToothIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
            title: 'Prioritize Competence over Convention',
            description: 'A no-nonsense tool designed for operators who value results and efficiency above all else.',
        },
        {
            icon: <LockClosedIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
            title: 'Build for Strategic Independence',
            description: 'Your data, your systems. This is a sovereign, intelligent tool for turning your ideas into action.',
        }
    ];

    return (
        <div className="w-full min-h-screen bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text">
            <header className="absolute top-0 left-0 right-0 p-4 z-10">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <svg width="32" height="32" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="64" height="64" rx="12" fill="#60a5fa" />
                            <path d="M20 18C20 15.7909 21.7909 14 24 14H44C46.2091 14 48 15.7909 48 18V46C48 48.2091 46.2091 50 44 50H24C21.7909 50 20 48.2091 20 46V18Z" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M24 14V50" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="font-bold text-lg">WesAI Notepad</span>
                    </div>
                    <button onClick={onGetStarted} className="px-4 py-2 text-sm font-semibold rounded-md border border-light-border dark:border-dark-border hover:bg-light-ui dark:hover:bg-dark-ui transition-colors">
                        Launch App
                    </button>
                </div>
            </header>

            <main>
                <section className="pt-32 pb-20 text-center relative overflow-hidden">
                    <div className="absolute inset-0 -z-10 bg-light-ui/30 dark:bg-dark-ui/30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"></div>
                    <div className="container mx-auto px-4">
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-light-text dark:text-dark-text">
                            Your personal knowledge system,<br /> transformed into a powerful operational tool.
                        </h1>
                        <p className="mt-6 max-w-2xl mx-auto text-lg text-light-text/70 dark:text-dark-text/70">
                            A secure, AI-enhanced notepad with real-time cloud sync, featuring a multi-mode Gemini assistant.
                        </p>
                        <div className="mt-8 flex justify-center gap-4">
                            <button onClick={onGetStarted} className="px-8 py-3 bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900 rounded-md text-lg font-semibold hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover transition-transform hover:scale-105">
                                Get Started for Free
                            </button>
                        </div>
                         <div className="mt-16 mx-auto max-w-4xl h-80 bg-zinc-800 rounded-xl shadow-2xl p-4 border border-zinc-700 flex gap-3 animate-fade-in-down">
                            <div className="w-1/4 bg-zinc-900/50 rounded-lg p-2 space-y-2">
                                <div className="h-4 w-3/4 bg-zinc-700 rounded animate-pulse"></div>
                                <div className="h-3 w-1/2 bg-zinc-700 rounded animate-pulse [animation-delay:0.2s]"></div>
                                <div className="h-3 w-5/6 bg-zinc-700 rounded animate-pulse [animation-delay:0.4s]"></div>
                            </div>
                            <div className="w-3/4 bg-zinc-900/50 rounded-lg p-4 space-y-3">
                                <div className="h-6 w-1/2 bg-zinc-700 rounded animate-pulse [animation-delay:0.3s]"></div>
                                <div className="h-4 w-full bg-zinc-700 rounded animate-pulse [animation-delay:0.5s]"></div>
                                <div className="h-4 w-5/6 bg-zinc-700 rounded animate-pulse [animation-delay:0.7s]"></div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-20 bg-light-ui/50 dark:bg-dark-ui/50">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-3 gap-10">
                            {features.map((feature, index) => (
                                <div key={index} className="text-center">
                                    <div className="flex justify-center items-center w-16 h-16 mx-auto mb-4 bg-light-background dark:bg-dark-background rounded-full border border-light-border dark:border-dark-border">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-xl font-bold">{feature.title}</h3>
                                    <p className="mt-2 text-light-text/70 dark:text-dark-text/70">{feature.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
                
                 <section className="py-24 bg-light-background dark:bg-dark-background">
                    <div className="container mx-auto px-4 text-center max-w-4xl">
                        <h2 className="text-3xl font-bold mb-2">Built for Security and Performance</h2>
                        <p className="text-lg text-light-text/70 dark:text-dark-text/70 mb-12">A robust backend for a seamless experience. Built on a foundation of privacy and power.</p>
                        <div className="grid md:grid-cols-2 gap-8 text-left">
                            <div className="bg-light-ui/50 dark:bg-dark-ui/50 p-6 rounded-lg border border-light-border dark:border-dark-border">
                                <ServerStackIcon className="w-8 h-8 mb-3 text-light-primary dark:text-dark-primary" />
                                <h3 className="text-xl font-bold">Secure Cloud Backend</h3>
                                <p className="mt-2 text-light-text/70 dark:text-dark-text/70">Your data is protected with enterprise-grade security and real-time sync, all managed for you. No setup required.</p>
                            </div>
                            <div className="bg-light-ui/50 dark:bg-dark-ui/50 p-6 rounded-lg border border-light-border dark:border-dark-border">
                                <SparklesIcon className="w-8 h-8 mb-3 text-light-primary dark:text-dark-primary" />
                                <h3 className="text-xl font-bold">Your Personal AI with Gemini</h3>
                                <p className="mt-2 text-light-text/70 dark:text-dark-text/70">Connect your own Gemini API key to unlock a powerful multi-mode assistant. Your key is stored locally, ensuring your interactions with the AI remain private.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-24 bg-light-ui/50 dark:bg-dark-ui/50">
                    <div className="container mx-auto px-4 text-center max-w-5xl">
                        <h2 className="text-3xl font-bold mb-12">The Philosophy</h2>
                        <div className="grid md:grid-cols-3 gap-10">
                            {principles.map((principle, index) => (
                                 <div key={index} className="text-center">
                                    <div className="flex justify-center items-center w-16 h-16 mx-auto mb-4 bg-light-background dark:bg-dark-background rounded-full border border-light-border dark:border-dark-border">
                                        {principle.icon}
                                    </div>
                                    <h3 className="text-xl font-bold">{principle.title}</h3>
                                    <p className="mt-2 text-light-text/70 dark:text-dark-text/70">{principle.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="py-20">
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="text-3xl font-bold">Ready to build your second brain?</h2>
                        <p className="mt-4 max-w-2xl mx-auto text-lg text-light-text/70 dark:text-dark-text/70">
                            Take control of your data and unlock the power of AI in your personal knowledge base.
                        </p>
                        <button onClick={onGetStarted} className="mt-8 px-8 py-3 bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900 rounded-md text-lg font-semibold hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover transition-transform hover:scale-105">
                            Launch WesAI Notepad
                        </button>
                    </div>
                </section>
            </main>

            <footer className="py-8 border-t border-light-border dark:border-dark-border">
                <div className="container mx-auto px-4 text-center text-sm text-light-text/60 dark:text-dark-text/60">
                    &copy; {new Date().getFullYear()} WesAI Notepad. All Rights Reserved. Version 1.1.0
                </div>
            </footer>
        </div>
    );
};


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
            case 'NOTES':
            default:
                if (activeNote) {
                    return (
                        <NoteEditor
                            key={activeNote.id}
                            note={activeNote}
                            templates={templates}
                        />
                    );
                }
                return <WelcomeScreen isMobileView={isMobileView} onToggleSidebar={() => setIsSidebarOpen(true)} onAddNote={() => onAddNote()} />;
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