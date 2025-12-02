
import React from 'react';
import { Note } from '../../types';
import { DocumentTextIcon, XMarkIcon } from '../Icons';

interface ChatStagingAreaProps {
    contextNoteIds: string[];
    getNoteById: (id: string) => Note | undefined;
    image: string | null;
    onRemoveContext: (id: string) => void;
    onClearAttachment: () => void;
    onPreviewImage: () => void;
}

const ChatStagingArea: React.FC<ChatStagingAreaProps> = ({
    contextNoteIds,
    getNoteById,
    image,
    onRemoveContext,
    onClearAttachment,
    onPreviewImage
}) => {
    const hasContext = contextNoteIds.length > 0 || image;

    if (!hasContext) return null;

    return (
        <div className="flex flex-wrap gap-2 animate-fade-in mb-2">
            {contextNoteIds.map(id => {
                const note = getNoteById(id);
                return (
                    <div key={id} className="flex items-center gap-1.5 text-xs pl-2 pr-1 py-1 rounded-full bg-light-ui dark:bg-zinc-800 border border-light-border dark:border-zinc-700 text-light-text dark:text-dark-text shadow-sm group transition-all hover:bg-light-ui-hover dark:hover:bg-zinc-700 hover:border-light-primary/30 dark:hover:border-dark-primary/30">
                        <DocumentTextIcon className="w-3 h-3 text-light-primary dark:text-dark-primary opacity-70 group-hover:opacity-100"/>
                        <span className="truncate max-w-[150px] font-medium">{note ? note.title : "Deleted Note"}</span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRemoveContext(id); }} 
                            className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-light-text/40 dark:text-dark-text/40 hover:text-red-500 dark:hover:text-red-400 transition-colors ml-0.5"
                        >
                            <XMarkIcon className="w-3 h-3"/>
                        </button>
                    </div>
                );
            })}
            
            {image && (
                <div className="relative group flex-shrink-0">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onPreviewImage(); }} 
                        className="relative w-12 h-12 rounded-lg overflow-hidden ring-1 ring-light-border dark:ring-dark-border hover:ring-light-primary dark:hover:ring-dark-primary transition-all shadow-sm"
                    >
                        <img src={`data:image/jpeg;base64,${image}`} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onClearAttachment(); }} 
                        className="absolute -top-2 -right-2 bg-zinc-800 text-white rounded-full p-0.5 shadow-md border border-white opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 z-10"
                    >
                        <XMarkIcon className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ChatStagingArea;
