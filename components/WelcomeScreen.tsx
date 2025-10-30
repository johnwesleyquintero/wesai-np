import React from 'react';
import { Bars3Icon, PlusIcon, SparklesIcon, ArrowDownTrayIcon, Cog6ToothIcon } from './Icons';
import { useStoreContext } from '../context/AppContext';
import { useUIContext } from '../context/AppContext';

const WelcomeScreen: React.FC<{
    onToggleSidebar?: () => void;
    isMobileView?: boolean;
    onAddNote: () => void;
    isSidebarCollapsed?: boolean;
    onToggleSidebarCollapsed?: () => void;
}> = ({ onToggleSidebar, isMobileView, onAddNote, isSidebarCollapsed, onToggleSidebarCollapsed }) => {
    const { onAddNoteFromFile } = useStoreContext();
    const { setView, openSettings, isAiEnabled } = useUIContext();

    const triggerNoteImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.md,.txt,text/plain,text/markdown';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                    const content = loadEvent.target?.result as string;
                    if (content !== null) {
                        onAddNoteFromFile(file.name, content, null);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    const showHeader = isMobileView || isSidebarCollapsed;
    const handleHeaderButtonClick = isMobileView ? onToggleSidebar : onToggleSidebarCollapsed;

    return (
        <div className="flex flex-col h-full">
            {showHeader && (
                <header className="flex items-center p-4 border-b border-light-border dark:border-dark-border flex-shrink-0">
                    <button onClick={handleHeaderButtonClick} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">
                        <Bars3Icon />
                    </button>
                </header>
            )}
            <div className="flex flex-col items-center justify-center h-full text-center text-light-text/60 dark:text-dark-text/60 p-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002 2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">WesCore</h2>
                <p className="mb-6">Select a note to start, or create a new one.</p>
                <button onClick={onAddNote} className="flex items-center justify-center bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900 rounded-md py-2 px-6 text-base font-semibold hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover">
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Create New Note
                </button>

                <div className="mt-12 w-full max-w-2xl">
                    <h3 className="text-sm font-semibold uppercase text-light-text/50 dark:text-dark-text/50 tracking-wider mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {isAiEnabled && (
                            <div onClick={() => setView('CHAT')} className="bg-light-ui/50 dark:bg-dark-ui/50 p-4 rounded-lg text-left cursor-pointer hover:bg-light-ui dark:hover:bg-dark-ui transition-colors">
                                <SparklesIcon className="w-6 h-6 mb-2 text-light-primary dark:text-dark-primary" />
                                <h4 className="font-semibold text-light-text dark:text-dark-text">Explore AI Chat</h4>
                                <p className="text-xs mt-1">Ask questions and generate content.</p>
                            </div>
                        )}
                        <div onClick={triggerNoteImport} className="bg-light-ui/50 dark:bg-dark-ui/50 p-4 rounded-lg text-left cursor-pointer hover:bg-light-ui dark:hover:bg-dark-ui transition-colors">
                            <ArrowDownTrayIcon className="w-6 h-6 mb-2" />
                            <h4 className="font-semibold text-light-text dark:text-dark-text">Import from File</h4>
                            <p className="text-xs mt-1">Create a note from a `.md` or `.txt` file.</p>
                        </div>
                        <div onClick={() => openSettings('general')} className="bg-light-ui/50 dark:bg-dark-ui/50 p-4 rounded-lg text-left cursor-pointer hover:bg-light-ui dark:hover:bg-dark-ui transition-colors">
                            <Cog6ToothIcon className="w-6 h-6 mb-2" />
                            <h4 className="font-semibold text-light-text dark:text-dark-text">Configure App</h4>
                            <p className="text-xs mt-1">Add API key, manage templates & AI.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;