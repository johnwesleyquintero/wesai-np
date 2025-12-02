import React, { useState, useRef } from 'react';
import { useChatContext, useStoreContext } from '../../context/AppContext';
import { PaperAirplaneIcon, DocumentPlusIcon, PaperClipIcon, XMarkIcon } from '../Icons';
import NoteSelectorModal from '../NoteSelectorModal';
import { useChatAttachments } from '../../hooks/useChatAttachments';
import { useAutoResizeTextArea } from '../../hooks/useAutoResizeTextArea';
import ChatStagingArea from './ChatStagingArea';

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

    // Use the new hook for resizing, capped at 192px (approx 12rem)
    useAutoResizeTextArea(textareaRef, input, 192);
    
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

    const hasContext = contextNoteIds.length > 0 || image;

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
                <div className={`relative flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border transition-all duration-200 ${
                    chatStatus === 'idle' 
                        ? 'border-light-border dark:border-dark-border focus-within:border-light-primary dark:focus-within:border-dark-primary focus-within:ring-2 focus-within:ring-light-primary/20 dark:focus-within:ring-dark-primary/20 shadow-sm' 
                        : 'border-light-border/50 dark:border-dark-border/50 opacity-80'
                }`}>
                    
                    <ChatStagingArea
                        contextNoteIds={contextNoteIds}
                        getNoteById={getNoteById}
                        image={image}
                        onRemoveContext={handleRemoveContextNote}
                        onClearAttachment={clearAttachment}
                        onPreviewImage={() => setIsPreviewModalOpen(true)}
                    />

                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={hasContext ? "Ask questions about this context..." : "Ask WesCore..."}
                        rows={1}
                        className="w-full bg-transparent focus:outline-none resize-none max-h-48 py-3 px-4 text-base min-h-[52px]"
                        disabled={chatStatus !== 'idle'}
                    />
                    
                    <div className="flex items-center justify-between px-2 pb-2">
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setIsNoteSelectorOpen(true)} 
                                className="p-2 rounded-lg text-light-text/50 dark:text-dark-text/50 hover:text-light-primary dark:hover:text-dark-primary hover:bg-light-ui dark:hover:bg-dark-ui transition-colors disabled:opacity-50" 
                                disabled={chatStatus !== 'idle'} 
                                title="Add Context"
                            >
                                <DocumentPlusIcon className="w-5 h-5"/>
                            </button>
                            <button 
                                onClick={triggerFileInput} 
                                className="p-2 rounded-lg text-light-text/50 dark:text-dark-text/50 hover:text-light-primary dark:hover:text-dark-primary hover:bg-light-ui dark:hover:bg-dark-ui transition-colors disabled:opacity-50" 
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
                                    : 'bg-light-ui dark:bg-dark-ui text-light-text/20 dark:text-dark-text/20 cursor-not-allowed'
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