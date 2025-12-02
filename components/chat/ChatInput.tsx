
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
    const containerRef = useRef<HTMLDivElement>(null);
    const [isNoteSelectorOpen, setIsNoteSelectorOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const { 
        image, isPreviewModalOpen, setIsPreviewModalOpen, fileInputRef, 
        handleFileChange, clearAttachment, triggerFileInput 
    } = useChatAttachments();

    useAutoResizeTextArea(textareaRef, input, 192);
    
    const handleSend = () => {
        if (!input.trim() && !image) return;
        if (chatStatus !== 'idle') return;
        
        sendMessage(input, image || undefined);

        setInput('');
        clearAttachment();
        // Keep focus on textarea after send for flow
        textareaRef.current?.focus();
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
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={() => setIsPreviewModalOpen(false)}>
                    <img src={`data:image/jpeg;base64,${image}`} alt="Preview" className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl border border-white/10" onClick={e => e.stopPropagation()} />
                     <button onClick={() => setIsPreviewModalOpen(false)} className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </div>
            )}
            
            <div className="max-w-3xl mx-auto">
                {/* Unified Command Center Container */}
                <div 
                    ref={containerRef}
                    onClick={() => textareaRef.current?.focus()}
                    className={`relative flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border transition-all duration-200 overflow-hidden ${
                    chatStatus === 'idle' 
                        ? `${isFocused ? 'border-light-primary dark:border-dark-primary ring-2 ring-light-primary/10 dark:ring-dark-primary/10 shadow-md' : 'border-light-border dark:border-dark-border shadow-sm hover:border-light-text/30 dark:hover:border-dark-text/30'}` 
                        : 'border-light-border/50 dark:border-dark-border/50 opacity-80 cursor-not-allowed'
                }`}>
                    
                    {/* Staging area is now visually inside the input box */}
                    <div className={`${hasContext ? 'pt-3 px-3' : 'pt-0'}`}>
                        <ChatStagingArea
                            contextNoteIds={contextNoteIds}
                            getNoteById={getNoteById}
                            image={image}
                            onRemoveContext={handleRemoveContextNote}
                            onClearAttachment={clearAttachment}
                            onPreviewImage={() => setIsPreviewModalOpen(true)}
                        />
                    </div>

                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={hasContext ? "Ask questions about this context..." : "Type a message to WesCore..."}
                        rows={1}
                        className="w-full bg-transparent focus:outline-none resize-none max-h-48 py-3 px-4 text-base min-h-[52px] placeholder-light-text/30 dark:placeholder-dark-text/30"
                        disabled={chatStatus !== 'idle'}
                    />
                    
                    {/* Toolbar Row */}
                    <div className="flex items-center justify-between px-2 pb-2 mt-auto">
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsNoteSelectorOpen(true); }} 
                                className="p-2 rounded-lg text-light-text/40 dark:text-dark-text/40 hover:text-light-primary dark:hover:text-dark-primary hover:bg-light-ui dark:hover:bg-dark-ui transition-colors disabled:opacity-50" 
                                disabled={chatStatus !== 'idle'} 
                                title="Add Context Notes"
                            >
                                <DocumentPlusIcon className="w-5 h-5"/>
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); triggerFileInput(); }} 
                                className="p-2 rounded-lg text-light-text/40 dark:text-dark-text/40 hover:text-light-primary dark:hover:text-dark-primary hover:bg-light-ui dark:hover:bg-dark-ui transition-colors disabled:opacity-50" 
                                disabled={chatStatus !== 'idle'} 
                                title="Attach Image"
                            >
                                <PaperClipIcon className="w-5 h-5"/>
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/jpeg,image/png" className="hidden" />
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-light-text/30 dark:text-dark-text/30 font-medium hidden sm:block">
                                {input.length > 0 ? '↵ to send' : ''}
                            </span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleSend(); }}
                                disabled={chatStatus !== 'idle' || (!input.trim() && !image)}
                                className={`p-2 rounded-xl transition-all duration-200 flex items-center justify-center ${
                                    (input.trim() || image) && chatStatus === 'idle'
                                        ? 'bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900 shadow-sm hover:scale-105 active:scale-95' 
                                        : 'bg-light-ui dark:bg-dark-ui text-light-text/20 dark:text-dark-text/20 cursor-not-allowed'
                                }`}
                                aria-label="Send Message"
                            >
                                <PaperAirplaneIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="text-center mt-2 flex justify-center">
                    <p className="text-[10px] text-light-text/30 dark:text-dark-text/30 font-medium">
                        WesCore Co-Pilot v2.2 &bull; Context-Aware
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
