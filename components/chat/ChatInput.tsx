
import React, { useState, useRef, useEffect } from 'react';
import { useChatContext, useStoreContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { XMarkIcon, DocumentPlusIcon, PaperClipIcon, PaperAirplaneIcon, XCircleIcon, DocumentTextIcon } from '../Icons';
import NoteSelectorModal from '../NoteSelectorModal';

const ChatInput: React.FC = () => {
    const [input, setInput] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const { 
        chatStatus, sendMessage, recallLastMessage, deleteMessage, contextNoteIds, setContextNoteIds,
    } = useChatContext();
    const { showToast } = useToast();
    const { getNoteById, notes } = useStoreContext();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isNoteSelectorOpen, setIsNoteSelectorOpen] = useState(false);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const scrollHeight = textarea.scrollHeight;
            textarea.style.height = `${Math.min(scrollHeight, 192)}px`; // Cap at 12rem (48 * 4)
        }
    }, [input]);
    
    const handleSend = () => {
        if (!input.trim() || chatStatus !== 'idle') return;
        
        sendMessage(input, image || undefined);

        setInput('');
        setImage(null);
        setIsPreviewModalOpen(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        } else if (e.key === 'ArrowUp' && input === '') {
            e.preventDefault();
            const messageToRecall = recallLastMessage();
            if (messageToRecall && typeof messageToRecall.content === 'string') {
                setInput(messageToRecall.content);
                deleteMessage(messageToRecall.id);
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).replace('data:', '').replace(/^.+,/, '');
                setImage(base64String);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleRemoveContextNote = (idToRemove: string) => {
        setContextNoteIds(prev => prev.filter(id => id !== idToRemove));
    };

    return (
        <div className="flex-shrink-0 p-4 sm:p-6 border-t border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background">
            {isPreviewModalOpen && image && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setIsPreviewModalOpen(false)}>
                    <img src={`data:image/jpeg;base64,${image}`} alt="Preview" className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                     <button onClick={() => setIsPreviewModalOpen(false)} className="absolute top-4 right-4 text-white p-2 rounded-full bg-black/50 hover:bg-black/80 transition-colors">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </div>
            )}
            <div className="max-w-3xl mx-auto">
                {contextNoteIds.length > 0 && (
                    <div className="mb-3 animate-fade-in-up">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-light-text/50 dark:text-dark-text/50 flex items-center gap-2">
                                <DocumentTextIcon className="w-3 h-3"/>
                                Active Context ({contextNoteIds.length})
                            </h4>
                            <button onClick={() => setContextNoteIds([])} className="text-xs font-semibold text-light-primary dark:text-dark-primary hover:underline">Clear All</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {contextNoteIds.map(id => {
                                const note = getNoteById(id);
                                return (
                                    <div key={id} className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md bg-light-ui dark:bg-dark-ui border border-light-border dark:border-dark-border shadow-sm text-light-text dark:text-dark-text group transition-all hover:border-light-primary/50 dark:hover:border-dark-primary/50">
                                        <span className="truncate max-w-[150px]">{note ? note.title : "Deleted Note"}</span>
                                        <button onClick={() => handleRemoveContextNote(id)} className="text-light-text/40 dark:text-dark-text/40 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                                            <XMarkIcon className="w-3 h-3"/>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                {image && (
                    <div className="relative w-24 h-24 mb-3 animate-fade-in-up">
                         <button onClick={() => setIsPreviewModalOpen(true)} className="w-full h-full rounded-lg overflow-hidden ring-2 ring-light-primary/50 dark:ring-dark-primary/50 transition-all hover:ring-light-primary dark:hover:ring-dark-primary">
                            <img src={`data:image/jpeg;base64,${image}`} alt="Preview" className="w-full h-full object-cover" />
                        </button>
                        <button onClick={() => { setImage(null); setIsPreviewModalOpen(false); }} className="absolute -top-2 -right-2 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-full p-1 shadow-md hover:bg-light-ui dark:hover:bg-dark-ui text-light-text dark:text-dark-text transition-colors">
                            <XMarkIcon className="w-3 h-3" />
                        </button>
                    </div>
                )}
                 <div className={`relative flex items-end p-2 rounded-xl bg-light-ui dark:bg-dark-ui border transition-all duration-200 ${chatStatus === 'idle' ? 'border-light-border dark:border-dark-border focus-within:border-light-primary dark:focus-within:border-dark-primary focus-within:ring-1 focus-within:ring-light-primary dark:focus-within:ring-dark-primary' : 'border-light-border/50 dark:border-dark-border/50 opacity-80'}`}>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Command your co-pilot... (e.g. 'find notes about Q4')"
                        rows={1}
                        className="flex-1 bg-transparent focus:outline-none resize-none max-h-48 py-2.5 pl-2 pr-28 text-base"
                        disabled={chatStatus !== 'idle'}
                    />
                    <div className="absolute right-2 bottom-2 flex items-center gap-1 bg-light-ui dark:bg-dark-ui pl-2">
                        <button onClick={() => setIsNoteSelectorOpen(true)} className="p-2 rounded-lg hover:bg-light-background dark:hover:bg-dark-background text-light-text/70 dark:text-dark-text/70 transition-colors disabled:opacity-50" disabled={chatStatus !== 'idle'} aria-label="Add Context Note" title="Add Note to Context">
                            <DocumentPlusIcon className="w-5 h-5"/>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg hover:bg-light-background dark:hover:bg-dark-background text-light-text/70 dark:text-dark-text/70 transition-colors disabled:opacity-50" disabled={chatStatus !== 'idle'} aria-label="Attach Image" title="Attach Image">
                            <PaperClipIcon className="w-5 h-5"/>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/jpeg,image/png" className="hidden" />
                        <button 
                            onClick={handleSend} 
                            disabled={chatStatus !== 'idle' || (!input.trim() && !image)}
                            className="p-2 rounded-lg bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900 shadow-sm hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            aria-label="Send Message"
                        >
                            <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
            <NoteSelectorModal
                isOpen={isNoteSelectorOpen}
                onClose={() => setIsNoteSelectorOpen(false)}
                onSave={setContextNoteIds}
                allNotes={notes}
                initialSelectedIds={contextNoteIds}
            />
        </div>
    );
};

export default ChatInput;
