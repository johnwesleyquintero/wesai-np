import React, { useState } from 'react';
import { ChatMessage, Note } from '../../types';
import MarkdownPreview from '../MarkdownPreview';
import { SparklesIcon, DocumentPlusIcon, ClipboardDocumentIcon, CheckIcon, EllipsisHorizontalIcon, TrashIcon, ThumbsUpIcon, ThumbsDownIcon, DocumentTextIcon, XMarkIcon, ArrowPathIcon } from '../Icons';
import { useToast } from '../../context/ToastContext';
import { useStoreContext, useUIContext, useChatContext } from '../../context/AppContext';
import ToolCallDisplay from '../ToolCallDisplay';
import SourceNotes from './SourceNotes';

interface MessageProps {
    message: ChatMessage;
    onDelete: () => void;
    onToggleSources: (sources: Note[]) => void;
    isSourcesPinned: boolean;
}

const feedbackReasons = ['Incorrect', 'Not Helpful', 'Off-topic'];

const MessageActions: React.FC<{ onDelete: () => void }> = ({ onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(p => !p)}
                className="p-1 rounded-full hover:bg-light-ui dark:hover:bg-dark-ui opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <EllipsisHorizontalIcon className="w-4 h-4" />
            </button>
            {isOpen && (
                <div className="absolute bottom-full mb-1 right-0 bg-light-background dark:bg-dark-background rounded-md shadow-lg border border-light-border dark:border-dark-border z-10 py-1 min-w-[100px]">
                    <button
                        onClick={onDelete}
                        className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10"
                    >
                        <TrashIcon className="w-4 h-4" />
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
};

const ActionButton: React.FC<{ tooltip: string; onClick: () => void; children: React.ReactNode; className?: string }> = ({ tooltip, onClick, children, className }) => (
    <div className="relative group">
        <button onClick={onClick} className={`p-1.5 rounded-md text-light-text/60 dark:text-dark-text/60 hover:text-light-text dark:hover:text-dark-text hover:bg-light-ui dark:hover:bg-dark-ui transition-colors ${className}`}>
            {children}
        </button>
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-800 text-white text-xs font-semibold rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {tooltip}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-t-4 border-t-zinc-800 border-x-4 border-x-transparent" />
        </div>
    </div>
);

const CopyMessageButton: React.FC<{ content: string }> = ({ content }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    return (
        <ActionButton tooltip={isCopied ? "Copied!" : "Copy"} onClick={handleCopy}>
            {isCopied ? (
                <CheckIcon className="w-4 h-4 text-green-500 dark:text-green-400" />
            ) : (
                <ClipboardDocumentIcon className="w-4 h-4" />
            )}
        </ActionButton>
    );
};

const ChatMessageComponent: React.FC<MessageProps> = ({ message, onDelete, onToggleSources, isSourcesPinned }) => {
    const { showToast } = useToast();
    const { onAddNote, setActiveNoteId, getNoteById } = useStoreContext();
    const { handleFeedback, regenerateLastResponse, chatMessages } = useChatContext();
    const { setView } = useUIContext();
    const [isProvidingFeedback, setIsProvidingFeedback] = useState(false);

    const isLastMessage = chatMessages[chatMessages.length - 1]?.id === message.id;

    const handleSaveAsNote = async () => {
        if (typeof message.content === 'string') {
            const newNoteId = await onAddNote('AI Chat Response', message.content);
            setActiveNoteId(newNoteId);
            setView('NOTES');
            showToast({ message: 'Saved as new note!', type: 'success' });
        }
    };

    const handleNoteClick = (noteId: string) => {
        setActiveNoteId(noteId);
        setView('NOTES');
    };

    const handleSelectReason = (reason: string) => {
        handleFeedback(message.id, { rating: 'down', tags: [reason] });
        setIsProvidingFeedback(false);
    };

    const renderContent = () => {
        if (typeof message.content === 'string') {
            return <MarkdownPreview title="" content={message.content} onToggleTask={() => {}} isStreaming={message.role === 'ai' && message.status === 'processing'} />;
        }
        return 'Invalid message content';
    };

    const isUser = message.role === 'user';
    const isAi = message.role === 'ai';
    const isTool = message.role === 'tool';
    
    // --- Tool Message Rendering ---
    if (isTool) {
        const toolContent = message.content;
        if (typeof toolContent === 'object' && toolContent !== null && 'name' in toolContent) {
            return (
                <div className="flex justify-start w-full mb-3 pl-12 sm:pl-14 animate-fade-in-up">
                     <div className="w-full max-w-2xl relative">
                        {/* Connecting Line Visual - subtle suggestion of a thread */}
                        <div className="absolute -left-6 top-0 bottom-0 w-px bg-light-border/50 dark:bg-dark-border/50 hidden sm:block"></div>
                        <ToolCallDisplay content={toolContent as any} />
                     </div>
                </div>
            );
        }
        return null;
    }
    
    // --- User/AI Message Rendering ---
    return (
        <div className={`group flex items-start gap-4 mb-6 ${isUser ? 'justify-end' : ''}`}>
             
             {isAi && (
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-light-primary to-purple-600 dark:from-dark-primary dark:to-purple-500 flex items-center justify-center text-white flex-shrink-0 mt-1 shadow-md ring-2 ring-white dark:ring-dark-background z-10">
                     <SparklesIcon className="w-5 h-5"/>
                 </div>
             )}

             {isUser && (
                 <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <MessageActions onDelete={onDelete} />
                 </div>
             )}

            <div className={`p-4 rounded-2xl max-w-[90%] md:max-w-2xl shadow-sm relative ${
                isUser 
                    ? 'bg-light-ui dark:bg-dark-ui rounded-tr-none' 
                    : 'bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-tl-none'
            }`}>
                {message.image && <img src={`data:image/jpeg;base64,${message.image}`} alt="User upload" className="max-w-xs rounded-lg mb-3 shadow-sm" />}
                
                {isUser && message.contextNoteIds && message.contextNoteIds.length > 0 && (
                    <div className="mb-3 pb-3 border-b border-light-border/50 dark:border-dark-border/50">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-light-text/50 dark:text-dark-text/50 mb-2">Attached Context</p>
                        <div className="flex flex-wrap gap-2">
                            {message.contextNoteIds.map(id => {
                                const note = getNoteById(id);
                                return (
                                    <span key={id} className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-white dark:bg-zinc-800 border border-light-border/50 dark:border-dark-border/50 shadow-sm">
                                        <DocumentTextIcon className="w-3 h-3 text-light-primary dark:text-dark-primary"/>
                                        <span className="truncate max-w-[150px]">{note ? note.title : 'Deleted Note'}</span>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="chat-markdown leading-relaxed">
                    {renderContent()}
                </div>

                {isAi && message.sources && message.sources.length > 0 && <SourceNotes sources={message.sources} />}
                
                {isAi && message.noteIds && message.noteIds.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-light-border/50 dark:border-dark-border/50">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-light-text/50 dark:text-dark-text/50 mb-1">
                            Modified System Files
                        </p>
                        <div className="flex flex-col gap-1">
                            {message.noteIds.map(noteId => {
                                const note = getNoteById(noteId);
                                return (
                                    <button key={noteId} onClick={() => handleNoteClick(noteId)} className="text-xs flex items-center gap-1.5 text-light-primary dark:text-dark-primary hover:underline w-fit">
                                        <DocumentTextIcon className="w-3 h-3"/>
                                        {note ? note.title : 'Untitled Note'}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {isAi && message.status !== 'processing' && (
                    <div className="flex items-center gap-2 mt-4 pt-2 border-t border-light-border/30 dark:border-dark-border/30">
                        {isProvidingFeedback ? (
                            <div className="flex items-center gap-2 animate-fade-in w-full">
                                <span className="text-xs font-semibold text-light-text/70 dark:text-dark-text/70 whitespace-nowrap">Reason:</span>
                                <div className="flex flex-wrap gap-2 flex-1">
                                    {feedbackReasons.map(reason => (
                                        <button key={reason} onClick={() => handleSelectReason(reason)} className="px-2 py-0.5 text-xs rounded-full bg-light-ui dark:bg-dark-ui hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover border border-light-border dark:border-dark-border transition-colors">{reason}</button>
                                    ))}
                                </div>
                                <button onClick={() => setIsProvidingFeedback(false)} className="px-2 py-0.5 text-xs rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 flex items-center gap-1 transition-colors flex-shrink-0"><XMarkIcon className="w-3 h-3"/> Cancel</button>
                            </div>
                        ) : (
                            <>
                                {/* Left Actions: Utilities */}
                                <div className="flex items-center gap-1">
                                    {message.sources && message.sources.length > 0 && (
                                        <ActionButton tooltip={isSourcesPinned ? 'Hide Sources' : 'Show Sources'} onClick={() => onToggleSources(message.sources!)}>
                                            <DocumentTextIcon className="w-4 h-4" />
                                        </ActionButton>
                                    )}
                                    <ActionButton tooltip="Create Note" onClick={handleSaveAsNote}>
                                        <DocumentPlusIcon className="w-4 h-4" />
                                    </ActionButton>
                                    <CopyMessageButton content={typeof message.content === 'string' ? message.content : ''} />
                                </div>

                                <div className="flex-1" />
                                
                                {/* Right Actions: Feedback & Regenerate */}
                                <div className="flex items-center gap-1">
                                    {isLastMessage && (
                                        <>
                                            <ActionButton tooltip="Regenerate" onClick={regenerateLastResponse}>
                                                <ArrowPathIcon className="w-4 h-4" />
                                            </ActionButton>
                                            <div className="w-px h-4 bg-light-border/50 dark:bg-dark-border/50 mx-1"></div>
                                        </>
                                    )}
                                    
                                    <button 
                                        onClick={() => handleFeedback(message.id, { rating: 'up' })}
                                        disabled={!!message.feedback}
                                        className={`p-1.5 rounded-md transition-colors disabled:opacity-50 ${message.feedback?.rating === 'up' ? 'text-green-500 bg-green-500/10' : 'text-light-text/40 dark:text-dark-text/40 hover:text-green-500 hover:bg-green-500/10'}`}
                                        aria-label="Thumbs Up"
                                    >
                                        <ThumbsUpIcon filled={message.feedback?.rating === 'up'} />
                                    </button>
                                     <button 
                                        onClick={() => !message.feedback && setIsProvidingFeedback(true)}
                                        disabled={!!message.feedback}
                                        className={`p-1.5 rounded-md transition-colors disabled:opacity-50 ${message.feedback?.rating === 'down' ? 'text-red-500 bg-red-500/10' : 'text-light-text/40 dark:text-dark-text/40 hover:text-red-500 hover:bg-red-500/10'}`}
                                        aria-label="Thumbs Down"
                                     >
                                        <ThumbsDownIcon filled={message.feedback?.rating === 'down'} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
            
            {isAi && (
                <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <MessageActions onDelete={onDelete} />
                </div>
            )}
        </div>
    );
};

export default ChatMessageComponent;