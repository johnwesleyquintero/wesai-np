
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
        <div className="flex-shrink-0 p-4 sm:px-8 sm:pb-8 bg-light-background dark:bg-dark-background">
            {isPreviewModalOpen && image && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setIsPreviewModalOpen(false)}>
                    <img src={`data:image/jpeg;base64,${image}`} alt="Preview" className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                     <button onClick={() => setIsPreviewModalOpen(false)} className="absolute top-4 right-4 text-white p-2 rounded-full bg-black/50 hover:bg-black/80 transition-colors">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </div>
            )}
            
            <div className="max-w-3xl mx-auto">
                <div className={`relative flex flex-col rounded-2xl bg-light-ui dark:bg-dark-ui border transition-all duration-200 ${
                    chatStatus === 'idle' 
                        ? 'border-light-border dark:border-dark-border focus-within:border-light-primary dark:focus-within:border-dark-primary focus-within:ring-1 focus-within:ring-light-primary dark:focus-within:ring-dark-primary shadow-sm' 
                        : 'border-light-border/50 dark:border-dark-border/50 opacity-80'
                }`}>
                    
                    {/* Integrated Context/Attachment Area */}
                    {(contextNoteIds.length > 0 || image) && (
                        <div className="flex items-center gap-2 p-3 pb-0 overflow-x-auto scrollbar-thin animate-fade-in">
                            {contextNoteIds.map(id => {
                                const note = getNoteById(id);
                                return (
                                    <div key={id} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-white dark:bg-zinc-800 border border-light-border dark:border-zinc-700 text-light-text dark:text-dark-text flex-shrink-0 shadow-sm group">
                                        <DocumentTextIcon className="w-3 h-3 text-light-primary dark:text-dark-primary"/>
                                        <span className="truncate max-w-[120px] font-medium">{note ? note.title : "Deleted Note"}</span>
                                        <button onClick={() => handleRemoveContextNote(id)} className="ml-1 text-light-text/40 dark:text-dark-text/40 hover:text-red-500 dark:hover:text-red-400">
                                            <XMarkIcon className="w-3 h-3"/>
                                        </button>
                                    </div>
                                );
                            })}
                            {image && (
                                <div className="relative group flex-shrink-0">
                                    <button onClick={() => setIsPreviewModalOpen(true)} className="relative w-10 h-10 rounded overflow-hidden ring-1 ring-light-border dark:ring-dark-border">
                                        <img src={`data:image/jpeg;base64,${image}`} alt="Preview" className="w-full h-full object-cover" />
                                    </button>
                                    <button onClick={clearAttachment} className="absolute -top-1.5 -right-1.5 bg-zinc-800 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                                        <XMarkIcon className="w-2.5 h-2.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask WesCore..."
                        rows={1}
                        className="w-full bg-transparent focus:outline-none resize-none max-h-48 py-3 px-4 text-base min-h-[52px]"
                        disabled={chatStatus !== 'idle'}
                    />
                    
                    <div className="flex items-center justify-between px-2 pb-2">
                        <div className="flex items-center">
                            <button 
                                onClick={() => setIsNoteSelectorOpen(true)} 
                                className="p-2 rounded-lg text-light-text/50 dark:text-dark-text/50 hover:text-light-primary dark:hover:text-dark-primary hover:bg-light-background/50 dark:hover:bg-dark-background/50 transition-colors disabled:opacity-50" 
                                disabled={chatStatus !== 'idle'} 
                                title="Add Context"
                            >
                                <DocumentPlusIcon className="w-5 h-5"/>
                            </button>
                            <button 
                                onClick={triggerFileInput} 
                                className="p-2 rounded-lg text-light-text/50 dark:text-dark-text/50 hover:text-light-primary dark:hover:text-dark-primary hover:bg-light-background/50 dark:hover:bg-dark-background/50 transition-colors disabled:opacity-50" 
                                disabled={chatStatus !== 'idle'} 
                                title="Attach Image"
                            >
                                <PaperClipIcon className="w-5 h-5"/>
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/jpeg,image/png" className="hidden" />
                        </div>
                        
                        <button 
                            onClick={handleSend} 
                            disabled={chatStatus !== 'idle' || (!input.trim() && !image)}
                            className={`p-2 rounded-lg transition-all duration-200 ${
                                (input.trim() || image) && chatStatus === 'idle'
                                    ? 'bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900 shadow-md hover:scale-105 active:scale-95' 
                                    : 'bg-light-background/50 dark:bg-dark-background/50 text-light-text/20 dark:text-dark-text/20 cursor-not-allowed'
                            }`}
                            aria-label="Send Message"
                        >
                            <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                
                <div className="text-center mt-2">
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
