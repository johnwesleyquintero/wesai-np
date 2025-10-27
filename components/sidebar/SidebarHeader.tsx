import React from 'react';
import { ChevronDoubleLeftIcon, XMarkIcon, PencilSquareIcon } from '../Icons';
import { useStoreContext, useUIContext } from '../../context/AppContext';

const SidebarHeader: React.FC = () => {
    const { onAddNote } = useStoreContext();
    const { isMobileView, toggleSidebarCollapsed, setIsSidebarOpen } = useUIContext();

    return (
        <div className="p-4 flex-shrink-0 border-b border-light-border dark:border-dark-border">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold">WesCore</h1>
                {!isMobileView ? (
                    <button onClick={toggleSidebarCollapsed} className="p-2 -mr-2 rounded-md hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover" aria-label="Collapse sidebar">
                        <ChevronDoubleLeftIcon />
                    </button>
                ) : (
                     <button onClick={() => setIsSidebarOpen(false)} className="p-2 -mr-2 rounded-md hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover" aria-label="Close sidebar">
                        <XMarkIcon />
                    </button>
                )}
            </div>
            <div className="flex space-x-2">
                <button id="onboarding-new-note-btn" onClick={() => onAddNote()} className="flex-1 flex items-center justify-center bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900 rounded-md py-2 text-sm font-semibold hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover">
                    <PencilSquareIcon className="w-4 h-4 mr-2" />
                    New Note
                </button>
            </div>
        </div>
    );
};

export default SidebarHeader;
