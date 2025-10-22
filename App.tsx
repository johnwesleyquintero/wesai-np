import React, { Suspense } from 'react';
import { AppContextProvider, useStoreContext, useUIContext } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import NoteEditor from './components/NoteEditor';
import ChatView from './components/ChatView';
import SettingsModal from './components/SettingsModal';
import CommandPalette from './components/CommandPalette';
import ConfirmationModal from './components/ConfirmationModal';
import { Template } from './types';
import NoteEditorSkeleton from './components/NoteEditorSkeleton';
import ApiKeyIndicator from './components/ApiKeyIndicator';
import { useApiKey } from './hooks/useApiKey';
import WelcomeModal from './components/WelcomeModal';
import ChatViewSkeleton from './components/ChatViewSkeleton';
import { isSupabaseConfigured } from './lib/supabaseClient';

const WELCOME_MODAL_SEEN_KEY = 'wesai-welcome-modal-seen';

const MainApp: React.FC = () => {
    const { 
        activeNote, onRestoreVersion, templates, notesToDelete, setNotesToDelete, deleteNotes, isLoading
    } = useStoreContext();
    const { 
        view, isSettingsOpen, closeSettings, isCommandPaletteOpen, closeCommandPalette, isMobileView, isSidebarOpen 
    } = useUIContext();
    const { apiKey } = useApiKey();
    const [isWelcomeModalOpen, setIsWelcomeModalOpen] = React.useState(false);

    React.useEffect(() => {
        try {
            const seen = localStorage.getItem(WELCOME_MODAL_SEEN_KEY);
            if (!seen) {
                setIsWelcomeModalOpen(true);
                localStorage.setItem(WELCOME_MODAL_SEEN_KEY, 'true');
            }
        } catch (e) {
            console.error("Could not access localStorage for welcome modal.", e);
        }
    }, []);

    const handleCloseWelcomeModal = () => setIsWelcomeModalOpen(false);

    return (
        <div className="flex h-screen w-screen bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text font-sans">
            <Sidebar />
            <main className={`flex-1 flex flex-col transition-all duration-300 ${isMobileView && isSidebarOpen ? 'ml-72' : 'ml-0 md:ml-72'}`}>
                {!apiKey && <ApiKeyIndicator />}
                {isLoading ? (
                    view === 'NOTES' ? <NoteEditorSkeleton /> : <ChatViewSkeleton />
                ) : view === 'NOTES' ? (
                    activeNote ? (
                        <NoteEditor
                            key={activeNote.id}
                            note={activeNote}
                            onRestoreVersion={onRestoreVersion}
                            templates={templates as Template[]}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-light-text/60 dark:text-dark-text/60">
                            Select a note to start editing or create a new one.
                        </div>
                    )
                ) : (
                     <Suspense fallback={<ChatViewSkeleton />}>
                        <ChatView />
                     </Suspense>
                )}
            </main>
            <SettingsModal isOpen={isSettingsOpen} onClose={closeSettings} />
            <CommandPalette isOpen={isCommandPaletteOpen} onClose={closeCommandPalette} />
            <WelcomeModal isOpen={isWelcomeModalOpen} onClose={handleCloseWelcomeModal} />
            {notesToDelete && (
                <ConfirmationModal
                    isOpen={!!notesToDelete}
                    onClose={() => setNotesToDelete(null)}
                    onConfirm={() => {
                        if (notesToDelete) {
                            deleteNotes(notesToDelete.map(n => n.id));
                            setNotesToDelete(null);
                        }
                    }}
                    title={notesToDelete.length > 1 ? `Delete ${notesToDelete.length} Notes?` : `Delete Note: "${notesToDelete[0]?.title}"?`}
                    message="This action cannot be undone. The notes will be permanently deleted."
                />
            )}
        </div>
    );
};

const ConfigScreen = () => (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-red-50 dark:bg-red-900/50 text-red-800 dark:text-red-200 p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Configuration Needed</h1>
        <p className="max-w-xl">
            Welcome to WesAI Notepad! To get started, you need to configure your Supabase connection details. Please open the file 
            <code className="bg-red-200 dark:bg-red-800/50 p-1 rounded mx-1">src/lib/supabaseClient.ts</code> 
            and replace the placeholder values for <code className="bg-red-200 dark:bg-red-800/50 p-1 rounded mx-1">supabaseUrl</code> and 
            <code className="bg-red-200 dark:bg-red-800/50 p-1 rounded mx-1">supabaseAnonKey</code> with your own Supabase project credentials.
        </p>
    </div>
)


const App: React.FC = () => {
    if (!isSupabaseConfigured) {
        return <ConfigScreen />;
    }
    
    return (
        <ToastProvider>
            <AppContextProvider>
                <AuthWrapper />
            </AppContextProvider>
        </ToastProvider>
    );
};

const AuthWrapper: React.FC = () => {
    const { session } = useStoreContext();
    return session ? <MainApp /> : <Auth />;
}

export default App;