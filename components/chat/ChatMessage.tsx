
import React, { useState } from 'react';
import { ChatMessage, Note } from '../../types';
import MarkdownPreview from '../MarkdownPreview';
import { SparklesIcon, ClipboardDocumentIcon, CheckIcon, EllipsisHorizontalIcon, TrashIcon, ThumbsUpIcon, ThumbsDownIcon, DocumentTextIcon, XMarkIcon, ArrowPathIcon } from '../Icons';
import { useStoreContext, useUIContext, useChatContext } from '../../context/AppContext';
import ToolCallDisplay from '../ToolCallDisplay';
import MessageArtifacts from './MessageArtifacts';

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
                className="p-1 rounded-full text-light-text/40 dark:text-dark-text/40 hover:bg-light-ui dark:hover:bg-dark-ui hover:text-light-text dark:hover:text-dark-text transition-colors"
                aria-label="Message options"
            >
                <EllipsisHorizontalIcon className="w-4 h-4" />
            </button>
            {isOpen && (
                <div className="absolute top-0 right-full mr-2 bg-light-background dark:bg-dark-background rounded-md shadow-lg border border-light-border dark:border-dark-border z-10 py-1 min-w-[100px]">
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
        <button onClick={onClick} className={`p-1.5 rounded-md text-light-text/40 dark:text-dark-text/40 hover:text-light-text dark:hover:text-dark-text hover:bg-light-ui dark:hover:bg-dark-ui transition-colors ${className}`}>
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
    const { getNoteById } = useStoreContext();
    const { handleFeedback, regenerateLastResponse, chatMessages } = useChatContext();
    const [isProvidingFeedback, setIsProvidingFeedback] = useState(false);

    const isLastMessage = chatMessages[chatMessages.length - 1]?.id === message.id;

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
    
    if (isTool) {
        const toolContent = message.content;
        if (typeof toolContent === 'object' && toolContent !== null && 'name' in toolContent) {
            return (
                <div className="flex justify-start w-full mb-2 pl-10 sm:pl-12 animate-fade-in-up">
                     <div className="w-full max-w-2xl">
                        <ToolCallDisplay content={toolContent as any} />
                     </div>
                </div>
            );
        }
        return null;
    }
    
    return (
        <div className={`group flex items-start gap-3 mb-6 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
             
             {isAi && (
                 <div className="w-8 h-8 mt-1 rounded-lg bg-white dark:bg-zinc-800 border border-light-border dark:border-dark-border flex items-center justify-center flex-shrink-0 shadow-sm text-light-primary dark:text-dark-primary">
                     <SparklesIcon className="w-5 h-5"/>
                 </div>
             )}

             {isUser && (
                 <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                     <MessageActions onDelete={onDelete} />
                 </div>
             )}

            <div className={`max-w-[90%] md:max-w-2xl transition-all duration-200 ${
                isUser 
                    ? 'bg-light-ui dark:bg-dark-ui border border-light-border/50 dark:border-dark-border/50 rounded-2xl rounded-tr-sm p-4 shadow-sm' 
                    : 'bg-transparent pl-1 py-1' // AI message blends into background
            }`}>
                {message.image && (
                    <div className="mb-3">
                        <img src={`data:image/jpeg;base64,${message.image}`} alt="User upload" className="max-w-xs rounded-lg shadow-sm border border-light-border dark:border-dark-border" />
                    </div>
                )}
                
                {isUser && message.contextNoteIds && message.contextNoteIds.length > 0 && (
                    <div className="mb-3 pb-3 border-b border-light-border dark:border-dark-border">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-light-text/50 dark:text-dark-text/50 mb-2 flex items-center gap-1">
                            <DocumentTextIcon className="w-3 h-3"/> Context Attached
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {message.contextNoteIds.map(id => {
                                const note = getNoteById(id);
                                return (
                                    <span key={id} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-white dark:bg-zinc-900 border border-light-border dark:border-zinc-700 text-light-text/80 dark:text-dark-text/80 shadow-sm">
                                        <span className="truncate max-w-[150px] font-medium">{note ? note.title : 'Deleted Note'}</span>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="chat-markdown leading-relaxed text-sm sm:text-base">
                    {renderContent()}
                </div>

                {isAi && (
                    <MessageArtifacts 
                        sources={message.sources}
                        groundingChunks={message.groundingMetadata?.groundingChunks}
                        noteIds={message.noteIds}
                    />
                )}

                {/* Feedback & Actions */}
                {isAi && message.status !== 'processing' && (
                    <div className="flex items-center justify-between mt-3 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isProvidingFeedback ? (
                            <div className="flex items-center gap-2 animate-fade-in w-full bg-light-ui dark:bg-dark-ui p-1 rounded-md border border-light-border dark:border-dark-border">
                                <span className="text-xs font-semibold text-light-text/70 dark:text-dark-text/70 whitespace-nowrap ml-1">Reason:</span>
                                <div className="flex flex-wrap gap-2 flex-1">
                                    {feedbackReasons.map(reason => (
                                        <button key={reason} onClick={() => handleSelectReason(reason)} className="px-2 py-0.5 text-xs rounded hover:bg-light-background dark:hover:bg-dark-background border border-transparent hover:border-light-border dark:hover:border-dark-border transition-colors">{reason}</button>
                                    ))}
                                </div>
                                <button onClick={() => setIsProvidingFeedback(false)} className="px-2 py-0.5 text-xs rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 flex items-center gap-1 transition-colors flex-shrink-0"><XMarkIcon className="w-3 h-3"/> Cancel</button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-1">
                                    <CopyMessageButton content={typeof message.content === 'string' ? message.content : ''} />
                                    {isLastMessage && (
                                        <ActionButton tooltip="Regenerate" onClick={regenerateLastResponse}>
                                            <ArrowPathIcon className="w-4 h-4" />
                                        </ActionButton>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => handleFeedback(message.id, { rating: 'up' })}
                                        disabled={!!message.feedback}
                                        className={`p-1.5 rounded-md transition-colors disabled:opacity-50 ${message.feedback?.rating === 'up' ? 'text-green-500 bg-green-50 dark:bg-green-900/20' : 'text-light-text/40 dark:text-dark-text/40 hover:text-green-500 hover:bg-light-ui dark:hover:bg-dark-ui'}`}
                                        aria-label="Thumbs Up"
                                    >
                                        <ThumbsUpIcon filled={message.feedback?.rating === 'up'} />
                                    </button>
                                     <button 
                                        onClick={() => !message.feedback && setIsProvidingFeedback(true)}
                                        disabled={!!message.feedback}
                                        className={`p-1.5 rounded-md transition-colors disabled:opacity-50 ${message.feedback?.rating === 'down' ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-light-text/40 dark:text-dark-text/40 hover:text-red-500 hover:bg-light-ui dark:hover:bg-dark-ui'}`}
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
                <div className="flex-shrink-0 self-start opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                    <MessageActions onDelete={onDelete} />
                </div>
            )}
        </div>
    );
};

export default ChatMessageComponent;
