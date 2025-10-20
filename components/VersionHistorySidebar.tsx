import React from 'react';
import { NoteVersion } from '../types';
import { XMarkIcon } from './Icons';

interface VersionHistorySidebarProps {
    history: NoteVersion[];
    onClose: () => void;
    onPreview: (version: NoteVersion | null) => void;
    onRestore: (version: NoteVersion) => void;
    activeVersionTimestamp?: string | null;
}

const VersionHistorySidebar: React.FC<VersionHistorySidebarProps> = ({ history, onClose, onPreview, onRestore, activeVersionTimestamp }) => {
    
    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    };
    
    return (
        <aside className="w-80 bg-light-ui dark:bg-dark-ui border-l border-light-border dark:border-dark-border flex flex-col h-full flex-shrink-0">
            <div className="p-4 flex-shrink-0 border-b border-light-border dark:border-dark-border">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-bold">Version History</h2>
                    <button onClick={onClose} className="p-2 rounded-md hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover">
                        <XMarkIcon />
                    </button>
                </div>
                 <p className="text-xs text-light-text/60 dark:text-dark-text/60">Click a version to preview. Click the current version to stop previewing.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                {history.length > 0 ? (
                    history.map(version => (
                        <div key={version.savedAt}
                            className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${activeVersionTimestamp === version.savedAt ? 'bg-light-primary/30 dark:bg-dark-primary/30' : 'hover:bg-light-background dark:hover:bg-dark-background'}`}
                        >
                            <div onClick={() => activeVersionTimestamp === version.savedAt ? onPreview(null) : onPreview(version)}>
                                <p className="font-semibold text-sm">
                                    {formatDateTime(version.savedAt)}
                                </p>
                                <p className="text-xs text-light-text/70 dark:text-dark-text/70 truncate">
                                    {version.content.substring(0, 50) || "No content"}...
                                </p>
                            </div>
                             {activeVersionTimestamp === version.savedAt && (
                                <button
                                    onClick={() => onRestore(version)}
                                    className="w-full text-center mt-2 px-3 py-1 text-sm bg-light-primary text-white rounded-md hover:bg-light-primary-hover dark:bg-dark-primary dark:hover:bg-dark-primary-hover"
                                >
                                    Restore this version
                                </button>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center text-light-text/60 dark:text-dark-text/60 mt-8">
                        <p>No history for this note yet.</p>
                        <p className="text-xs mt-2">Changes are saved automatically.</p>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default VersionHistorySidebar;
