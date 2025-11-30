import React, { useState } from 'react';
import { ChatMessage, Note } from '../../types';
import MarkdownPreview from '../MarkdownPreview';
import { SparklesIcon, DocumentPlusIcon, ClipboardDocumentIcon, EllipsisHorizontalIcon, TrashIcon, ThumbsUpIcon, ThumbsDownIcon, DocumentTextIcon, XMarkIcon } from '../Icons';
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
                className="p-1 rounded-full hover:bg-light-ui dark:hover:bg-dark-ui"
            >
                <EllipsisHorizontalIcon className="w-4 h-4" />
            </button>
            {isOpen && (
                <div className="absolute bottom-full mb-1 right-0 bg-light-background dark:bg-dark-background rounded-md shadow-lg border border-light-border dark:border-dark-border z-10 py-1">
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

const ActionButton: React.FC<{ tooltip: string; onClick: () => void; children: React.ReactNode }> = ({ tooltip, onClick, children }) => (
    <div className="relative group">
        <button onClick={onClick} className="p-1.5 rounded-md text-light-text/60 dark:text-dark-text/60 hover:text-light-text dark:hover:text-dark-text hover:bg-light-ui dark:hover:bg-dark-ui">
            {children}
        </button>
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-800 text-white text-xs font-semibold rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {tooltip}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-t-4 border-t-zinc-800 border-x-4 border-x-transparent" />
        </div>
    </div>
);

const ChatMessageComponent: React.FC<MessageProps> = ({ message, onDelete, onToggleSources, isSourcesPinned }) => {
    const { showToast } = useToast();
    const { onAddNote, setActiveNoteId, getNoteById } = useStoreContext();
    const { handleFeedback } = useChatContext();
    const { setView } = useUIContext();
    const [isHovered, setIsHovered] = useState(false);
    const [isProvidingFeedback, setIsProvidingFeedback] = useState(false);


    const handleSaveAsNote = async () => {
        if (typeof message.content === 'string') {
            const newNoteId = await onAddNote('AI Chat Response', message.content);
            setActiveNoteId(newNoteId);
            setView('NOTES');
            showToast({ message: 'Saved as new note!', type: 'success' });
        }
    };
    
    const handleCopyToClipboard = () => {
        if (typeof message.content === 'string') {
            navigator.clipboard.writeText(message.content)
                .then(() => {
                    showToast({ message: 'Copied to clipboard!', type: 'success' });
                })
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                    showToast({ message: 'Failed to copy.', type: 'error' });
                });
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
    
    if (isTool) {
        const toolContent = message.content;
        if (typeof toolContent === 'object' && toolContent !== null && 'name' in toolContent) {
            return (
                <div className="my-2 max-w-full md:max-w-2xl mx-auto">
                     <ToolCallDisplay content={toolContent as any} />
                </div>
            );
        }
        return null; // Don't render invalid tool messages
    }
    
    return (
        <div 
            className={`group flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
             {isAi && <div className="w-8 h-8 rounded-full bg-light-primary dark:bg-dark-primary flex items-center justify-center text-white flex-shrink-0 mt-1"><SparklesIcon className="w-5 h-5"/></div>}
             {isUser && isHovered && <div className="flex-shrink-0 self-center"><MessageActions onDelete={onDelete} /></div>}

            <div className={`p-3 rounded-lg max-w-full md:max-w-2xl w-fit ${isUser ? 'bg-light-ui dark:bg-dark-ui' : 'bg-light-background dark:bg-dark-background'}`}>
                {message.image && <img src={`data:image/jpeg;base64,${message.image}`} alt="User upload" className="max-w-xs rounded-lg mb-2" />}
                {isUser && message.contextNoteIds && message.contextNoteIds.length > 0 && (
                    <div className="mb-2 pb-2 border-b border-light-border/50 dark:border-dark-border/50">
                        <p className="text-xs font-semibold text-light-text/60 dark:text-dark-text/60 mb-1">Provided Context:</p>
                        <div className="flex flex-wrap gap-1">
                            {message.contextNoteIds.map(id => {
                                const note = getNoteById(id);
                                return (
                                    <span key={id} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-light-background dark:bg-dark-background">
                                        <DocumentTextIcon className="w-3 h-3"/>
                                        {note ? note.title : 'Deleted Note'}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}
                <div className="chat-markdown">
                    {renderContent()}
                </div>
                {isAi && message.sources && message.sources.length > 0 && <SourceNotes sources={message.sources} />}
                {isAi && message.noteIds && message.noteIds.length > 0 && (
                    <div className="mt-2 space-y-1">
                        <p className="text-xs font-semibold text-light-text/60 dark:text-dark-text/60">
                            {message.noteIds.length > 1 ? 'Affected Notes:' : 'Affected Note:'}
                        </p>
                        {message.noteIds.map(noteId => {
                            const note = getNoteById(noteId);
                            return (
                                <button key={noteId} onClick={() => handleNoteClick(noteId)} className="text-xs font-semibold text-light-primary dark:text-dark-primary block hover:underline">
                                    &rarr; {note ? note.title : 'Untitled Note'}
                                </button>
                            );
                        })}
                    </div>
                )}
                {isAi && message.status !== 'processing' && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-light-border/50 dark:border-dark-border/50">
                        {isProvidingFeedback ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-light-text/70 dark:text-dark-text/70">Why?</span>
                                {feedbackReasons.map(reason => (
                                    <button key={reason} onClick={() => handleSelectReason(reason)} className="px-2 py-0.5 text-xs rounded-full bg-light-ui dark:bg-dark-ui hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover">{reason}</button>
                                ))}
                                <button onClick={() => setIsProvidingFeedback(false)} className="px-2 py-0.5 text-xs rounded-full bg-light-ui dark:bg-dark-ui hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover flex items-center gap-1"><XMarkIcon className="w-3 h-3"/> Cancel</button>
                            </div>
                        ) : (
                            <>
                                {message.sources && message.sources.length > 0 && (
                                    <ActionButton tooltip={isSourcesPinned ? 'Hide Sources' : 'Show Sources'} onClick={() => onToggleSources(message.sources!)}>
                                        <DocumentTextIcon className="w-4 h-4" />
                                    </ActionButton>
                                )}
                                <ActionButton tooltip="Save as Note" onClick={handleSaveAsNote}>
                                    <DocumentPlusIcon className="w-4 h-4" />
                                </ActionButton>
                                <ActionButton tooltip="Copy to Clipboard" onClick={handleCopyToClipboard}>
                                    <ClipboardDocumentIcon className="w-4 h-4" />
                                </ActionButton>

                                <div className="flex-1" />
                                
                                <button 
                                    onClick={() => handleFeedback(message.id, { rating: 'up' })}
                                    disabled={!!message.feedback}
                                    className={`p-1 rounded-md disabled:opacity-70 ${message.feedback?.rating === 'up' ? 'text-green-500 bg-green-500/10' : 'text-light-text/60 dark:text-dark-text/60 hover:bg-light-ui dark:hover:bg-dark-ui'}`}
                                >
                                    <ThumbsUpIcon filled={message.feedback?.rating === 'up'} />
                                </button>
                                 <button 
                                    onClick={() => !message.feedback && setIsProvidingFeedback(true)}
                                    disabled={!!message.feedback}
                                    className={`p-1 rounded-md disabled:opacity-70 ${message.feedback?.rating === 'down' ? 'text-red-500 bg-red-500/10' : 'text-light-text/60 dark:text-dark-text/60 hover:bg-light-ui dark:hover:bg-dark-ui'}`}
                                 >
                                    <ThumbsDownIcon filled={message.feedback?.rating === 'down'} />
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
            {isAi && isHovered && <div className="flex-shrink-0 self-center"><MessageActions onDelete={onDelete} /></div>}
        </div>
    );
};

export default ChatMessageComponent;