
import React, { useState, useRef, useEffect } from 'react';
import { useChatContext, useStoreContext } from '../../context/AppContext';
import { XMarkIcon, DocumentPlusIcon, PaperClipIcon, PaperAirplaneIcon, DocumentTextIcon } from '../Icons';
import NoteSelectorModal from '../NoteSelectorModal';
import { useChatAttachments } from '../../hooks/useChatAttachments';

const ChatInput: React.FC = () => {
    const [input, setInput] = useState('');
    const { 
        chatStatus, sendMessage, recallLastMessage, deleteMessage, contextNoteIds, setContextNoteIds,
    } = useChatContext();
    const { getNoteById, notes } = useStoreContext();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isNoteSelectorOpen, setIsNoteSelectorOpen] = useState(false);

    const { 
        image, isPreviewModalOpen, setIsPreviewModalOpen, fileInputRef, 
        handleFileChange, clearAttachment, triggerFileInput 
    } = useChatAttachments();

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const scrollHeight = textarea.scrollHeight;
            textarea.style.height = `${Math.min(scrollHeight, 192)}px`; // Cap at 12rem (48 * 4)
        }
    }, [input]);
    
    const handleSend = () => {
        if (!input.trim() && !image) return;
        if (chatStatus !== 'idle') return;
        
        sendMessage(input, image || undefined);

        setInput('');
        clearAttachment();
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
            
            <div className="max-w-3xl mx-auto space-y-2">
                {/* Horizontal Scrolling Context Pills */}
                {contextNoteIds.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin animate-fade-in-up">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-light-text/40 dark:text-dark-text/40 flex-shrink-0">
                            Context ({contextNoteIds.length})
                        </span>
                        {contextNoteIds.map(id => {
                            const note = getNoteById(id);
                            return (
                                <div key={id} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-light-ui dark:bg-dark-ui border border-light-border dark:border-dark-border shadow-sm text-light-text dark:text-dark-text flex-shrink-0 group">
                                    <DocumentTextIcon className="w-3 h-3 text-light-primary dark:text-dark-primary opacity-70"/>
                                    <span className="truncate max-w-[120px]">{note ? note.title : "Deleted Note"}</span>
                                    <button onClick={() => handleRemoveContextNote(id)} className="text-light-text/30 dark:text-dark-text/30 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                                        <XMarkIcon className="w-3 h-3"/>
                                    </button>
                                </div>
                            );
                        })}
                        <button onClick={() => setContextNoteIds([])} className="text-[10px] font-semibold text-red-500 hover:underline flex-shrink-0 ml-1">Clear</button>
                    </div>
                )}

                {image && (
                    <div className="relative w-16 h-16 animate-fade-in-up inline-block">
                         <button onClick={() => setIsPreviewModalOpen(true)} className="w-full h-full rounded-lg overflow-hidden ring-2 ring-light-primary dark:ring-dark-primary transition-all">
                            <img src={`data:image/jpeg;base64,${image}`} alt="Preview" className="w-full h-full object-cover" />
                        </button>
                        <button onClick={clearAttachment} className="absolute -top-2 -right-2 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-full p-0.5 shadow-md hover:bg-light-ui dark:hover:bg-dark-ui text-light-text dark:text-dark-text transition-colors">
                            <XMarkIcon className="w-3 h-3" />
                        </button>
                    </div>
                )}

                 <div className={`relative flex flex-col rounded-xl bg-light-ui/30 dark:bg-dark-ui/30 border transition-all duration-200 ${chatStatus === 'idle' ? 'border-light-border dark:border-dark-border focus-within:border-light-primary/50 dark:focus-within:border-dark-primary/50 focus-within:ring-2 focus-within:ring-light-primary/10 dark:focus-within:ring-dark-primary/10 focus-within:shadow-md' : 'border-light-border/50 dark:border-dark-border/50 opacity-80'}`}>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command or ask a question..."
                        rows={1}
                        className="w-full bg-transparent focus:outline-none resize-none max-h-48 py-3 px-4 text-base rounded-xl"
                        disabled={chatStatus !== 'idle'}
                    />
                    
                    <div className="flex items-center justify-between px-2 pb-2">
                        <div className="flex items-center gap-1">
                            <button onClick={() => setIsNoteSelectorOpen(true)} className="p-2 rounded-lg hover:bg-light-ui dark:hover:bg-dark-ui text-light-text/60 dark:text-dark-text/60 hover:text-light-primary dark:hover:text-dark-primary transition-colors disabled:opacity-50" disabled={chatStatus !== 'idle'} title="Add Context Note">
                                <DocumentPlusIcon className="w-5 h-5"/>
                            </button>
                            <button onClick={triggerFileInput} className="p-2 rounded-lg hover:bg-light-ui dark:hover:bg-dark-ui text-light-text/60 dark:text-dark-text/60 hover:text-light-primary dark:hover:text-dark-primary transition-colors disabled:opacity-50" disabled={chatStatus !== 'idle'} title="Attach Image">
                                <PaperClipIcon className="w-5 h-5"/>
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/jpeg,image/png" className="hidden" />
                        </div>
                        
                        <button 
                            onClick={handleSend} 
                            disabled={chatStatus !== 'idle' || (!input.trim() && !image)}
                            className={`p-2 rounded-lg transition-all duration-200 ${
                                (input.trim() || image) && chatStatus === 'idle'
                                    ? 'bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900 shadow-md hover:translate-y-[-1px]' 
                                    : 'bg-light-ui dark:bg-dark-ui text-light-text/30 dark:text-dark-text/30 cursor-not-allowed'
                            }`}
                            aria-label="Send Message"
                        >
                            <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                
                <div className="text-center">
                    <p className="text-[10px] text-light-text/40 dark:text-dark-text/40">
                        WesCore Co-Pilot can make mistakes. Verify important info.
                    </p>
                </div>
            </div>
            
            <NoteSelectorModal
                isOpen={isNoteSelectorOpen}
                onClose={() => setIsNoteSelectorOpen(false)}
                onSave={(ids) => setContextNoteIds(prev => Array.from(new Set([...prev, ...ids])))}
                allNotes={notes}
                initialSelectedIds={contextNoteIds}
            />
        </div>
    );
};

export default ChatInput;
