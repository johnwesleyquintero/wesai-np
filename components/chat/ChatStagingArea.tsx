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
        <div className="flex items-center gap-2 px-3 pt-3 pb-2 overflow-x-auto scrollbar-thin animate-fade-in border-b border-light-border/30 dark:border-dark-border/30">
            {contextNoteIds.map(id => {
                const note = getNoteById(id);
                return (
                    <div key={id} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-light-ui dark:bg-dark-ui border border-light-border dark:border-zinc-700 text-light-text dark:text-dark-text flex-shrink-0 shadow-sm group transition-colors">
                        <DocumentTextIcon className="w-3 h-3 text-light-primary dark:text-dark-primary"/>
                        <span className="truncate max-w-[120px] font-medium">{note ? note.title : "Deleted Note"}</span>
                        <button onClick={() => onRemoveContext(id)} className="ml-1 p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-light-text/40 dark:text-dark-text/40 hover:text-red-500 dark:hover:text-red-400">
                            <XMarkIcon className="w-3 h-3"/>
                        </button>
                    </div>
                );
            })}
            {image && (
                <div className="relative group flex-shrink-0">
                    <button onClick={onPreviewImage} className="relative w-10 h-10 rounded-md overflow-hidden ring-1 ring-light-border dark:ring-dark-border hover:ring-light-primary dark:hover:ring-dark-primary transition-all">
                        <img src={`data:image/jpeg;base64,${image}`} alt="Preview" className="w-full h-full object-cover" />
                    </button>
                    <button onClick={onClearAttachment} className="absolute -top-1.5 -right-1.5 bg-zinc-800 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                        <XMarkIcon className="w-2.5 h-2.5" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ChatStagingArea;