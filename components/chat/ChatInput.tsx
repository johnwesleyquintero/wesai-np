import React, { useState, useRef, useEffect } from 'react';
import { useChatContext, useStoreContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { XMarkIcon, DocumentPlusIcon, PaperClipIcon, PaperAirplaneIcon, XCircleIcon } from '../Icons';
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
            textarea.style.height = `${scrollHeight}px`;
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
        <div className="flex-shrink-0 p-4 sm:p-6 border-t border-light-border dark:border-dark-border">
            {isPreviewModalOpen && image && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setIsPreviewModalOpen(false)}>
                    <img src={`data:image/jpeg;base64,${image}`} alt="Preview" className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                     <button onClick={() => setIsPreviewModalOpen(false)} className="absolute top-4 right-4 text-white p-2 rounded-full bg-black/50 hover:bg-black/80">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </div>
            )}
            <div className="max-w-3xl mx-auto">
                {contextNoteIds.length > 0 && (
                    <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                            <h4 className="text-xs font-semibold text-light-text/70 dark:text-dark-text/70">Context ({contextNoteIds.length})</h4>
                            <button onClick={() => setContextNoteIds([])} className="text-xs font-semibold text-light-primary dark:text-dark-primary hover:underline">Clear</button>
                        </div>
                        <div className="flex flex-wrap gap-2 p-2 rounded-md bg-light-ui dark:bg-dark-ui border border-light-border/50 dark:border-dark-border/50">
                            {contextNoteIds.map(id => {
                                const note = getNoteById(id);
                                return (
                                    <div key={id} className="flex items-center gap-1.5 text-sm px-2 py-1 rounded-full bg-light-background dark:bg-dark-background">
                                        <span className="truncate max-w-48">{note ? note.title : "Deleted Note"}</span>
                                        <button onClick={() => handleRemoveContextNote(id)} className="p-0.5 rounded-full hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover"><XMarkIcon className="w-3 h-3"/></button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                {image && (
                    <div className="relative w-24 h-24 mb-2">
                         <button onClick={() => setIsPreviewModalOpen(true)} className="w-full h-full rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary">
                            <img src={`data:image/jpeg;base64,${image}`} alt="Preview" className="w-full h-full object-cover" />
                        </button>
                        <button onClick={() => { setImage(null); setIsPreviewModalOpen(false); }} className="absolute -top-2 -right-2 bg-light-ui dark:bg-dark-ui rounded-full p-1 shadow-md"><XCircleIcon /></button>
                    </div>
                )}
                 <div className="relative flex items-center p-2 rounded-lg bg-light-ui dark:bg-dark-ui border border-light-border/50 dark:border-dark-border/50 focus-within:border-light-primary dark:focus-within:border-dark-primary">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Command your co-pilot... (e.g. 'find notes about Q4' or 'draft a response')"
                        rows={1}
                        className="flex-1 bg-transparent focus:outline-none resize-none max-h-48 pr-28"
                        disabled={chatStatus !== 'idle'}
                    />
                    <div className="absolute right-2 bottom-2 flex items-center gap-1">
                        <button onClick={() => setIsNoteSelectorOpen(true)} className="p-2 rounded-md hover:bg-light-background dark:hover:bg-dark-background disabled:opacity-50" disabled={chatStatus !== 'idle'} aria-label="Add Note Context"><DocumentPlusIcon /></button>
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-md hover:bg-light-background dark:hover:bg-dark-background disabled:opacity-50" disabled={chatStatus !== 'idle'}><PaperClipIcon /></button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/jpeg,image/png" className="hidden" />
                        <button onClick={handleSend} className="p-2 rounded-md bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900 disabled:opacity-50" disabled={chatStatus !== 'idle'}><PaperAirplaneIcon /></button>
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