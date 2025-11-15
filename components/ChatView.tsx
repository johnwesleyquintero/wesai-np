import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChatContext, useStoreContext, useUIContext } from '../context/AppContext';
import { ChatMessage, ChatMode, ChatStatus, Note } from '../types';
import MarkdownPreview from './MarkdownPreview';
import { PaperAirplaneIcon, SparklesIcon, XCircleIcon, DocumentPlusIcon, PaperClipIcon, ClipboardDocumentIcon, EllipsisHorizontalIcon, TrashIcon, ThumbsUpIcon, ThumbsDownIcon, DocumentTextIcon, XMarkIcon, ChevronDownIcon, BookmarkIcon, Cog6ToothIcon } from './Icons';
import { useToast } from '../context/ToastContext';
import ChatViewSkeleton from './ChatViewSkeleton';
import NoteSelectorModal from './NoteSelectorModal';
import ToolCallDisplay from './ToolCallDisplay';

const ChatHeader: React.FC = () => {
    const { chatMode, setChatMode, chatStatus, clearChat } = useChatContext();
    const modes: { id: ChatMode; name: string; description: string }[] = [
        { id: 'ASSISTANT', name: 'Assistant', description: 'Your knowledge co-pilot. Answers questions based on your notes.' },
        { id: 'RESPONDER', name: 'Responder', description: 'Drafts professional customer service responses using your notes as a knowledge base.' },
        { id: 'WESCORE_COPILOT', name: 'WesCore Co-pilot', description: 'Your operational co-pilot. Creates, finds, and manages notes on your behalf.' },
        { id: 'AMAZON', name: 'Amazon Copywriter', description: 'Generates Amazon product listing copy based on product info and research notes.' },
    ];

    const currentMode = modes.find(m => m.id === chatMode)!;

    return (
        <header className="p-4 border-b border-light-border dark:border-dark-border flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-xl font-bold">{currentMode.name}</h1>
                    <p className="text-sm text-light-text/60 dark:text-dark-text/60">{currentMode.description}</p>
                </div>
                <button
                    onClick={clearChat}
                    disabled={chatStatus !== 'idle'}
                    className="text-sm font-semibold text-light-primary dark:text-dark-primary hover:underline disabled:opacity-50"
                >
                    Clear Chat
                </button>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
                {modes.map(mode => (
                    <button
                        key={mode.id}
                        onClick={() => setChatMode(mode.id)}
                        disabled={chatStatus !== 'idle'}
                        className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                            chatMode === mode.id
                                ? 'bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900'
                                : 'bg-light-ui dark:bg-dark-ui hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover'
                        }`}
                    >
                        {mode.name}
                    </button>
                ))}
            </div>
        </header>
    );
};

const SourceNotes: React.FC<{ sources: Note[] }> = ({ sources }) => {
    if (!sources || sources.length === 0) return null;

    const handleSourceClick = (index: number) => {
        const sourceEl = document.getElementById(`pinned-source-${index + 1}`);
        if (sourceEl) {
            sourceEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            sourceEl.classList.add('highlight-source');
            setTimeout(() => sourceEl.classList.remove('highlight-source'), 1500);
        }
    };

    return (
        <div className="mt-2">
            <p className="text-xs font-semibold text-light-text/60 dark:text-dark-text/60 mb-1">Sources:</p>
            <ol className="list-decimal list-inside text-xs space-y-1">
                {sources.map((note, index) => (
                    <li key={note.id}>
                        <button
                            onClick={() => handleSourceClick(index)}
                            className="hover:underline text-light-primary dark:text-dark-primary"
                        >
                            {note.title}
                        </button>
                    </li>
                ))}
            </ol>
        </div>
    );
};

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


interface MessageProps {
    message: ChatMessage;
    onDelete: () => void;
    onToggleSources: (sources: Note[]) => void;
    isSourcesPinned: boolean;
}

const feedbackReasons = ['Incorrect', 'Not Helpful', 'Off-topic'];

const Message: React.FC<MessageProps> = ({ message, onDelete, onToggleSources, isSourcesPinned }) => {
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

const ChatInput: React.FC = () => {
    const [input, setInput] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const { 
        chatMode, chatStatus, onSendMessage, onGenerateServiceResponse, onSendGeneralMessage, onGenerateAmazonCopy,
        recallLastMessage, responders, addResponder, deleteResponder, deleteMessage, contextNoteIds, setContextNoteIds,
    } = useChatContext();
    const { showToast } = useToast();
    const { notes, getNoteById } = useStoreContext();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showResponders, setShowResponders] = useState(false);
    const responderMenuRef = useRef<HTMLDivElement>(null);
    const [isNoteSelectorOpen, setIsNoteSelectorOpen] = useState(false);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const scrollHeight = textarea.scrollHeight;
            textarea.style.height = `${scrollHeight}px`;
        }
    }, [input]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (responderMenuRef.current && !responderMenuRef.current.contains(event.target as Node)) {
                setShowResponders(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSend = () => {
        if (!input.trim() || chatStatus !== 'idle') return;
        
        switch(chatMode) {
            case 'ASSISTANT':
                onSendMessage(input, image || undefined);
                break;
            case 'RESPONDER':
                onGenerateServiceResponse(input, image || undefined);
                break;
            case 'WESCORE_COPILOT':
                onSendGeneralMessage(input, image || undefined);
                break;
            case 'AMAZON':
                onGenerateAmazonCopy(input, image || undefined);
                break;
        }

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
    
    const handleSaveResponder = () => {
        if (input.trim()) {
            addResponder(input.trim());
            showToast({ message: 'Responder saved!', type: 'success' });
            setInput('');
        }
    };

    const handleRemoveContextNote = (idToRemove: string) => {
        setContextNoteIds(prev => prev.filter(id => id !== idToRemove));
    };

    const placeholderText = {
        ASSISTANT: 'Ask a question about your notes...',
        RESPONDER: 'Paste customer query or select a responder...',
        WESCORE_COPILOT: "Command your co-pilot... (e.g., 'create a note about Q4 planning')",
        AMAZON: 'Paste product info here...',
    }[chatMode];

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
                            <h4 className="text-xs font-semibold text-light-text/70 dark:text-dark-text/70">AI Context ({contextNoteIds.length})</h4>
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
                    {chatMode === 'RESPONDER' && (
                        <div ref={responderMenuRef} className="relative mr-1">
                            <button
                                onClick={() => setShowResponders(p => !p)}
                                disabled={chatStatus !== 'idle'}
                                className="p-2 rounded-md hover:bg-light-background dark:hover:bg-dark-background disabled:opacity-50 flex items-center gap-1 text-sm font-semibold"
                            >
                                <BookmarkIcon className="w-4 h-4" /> <ChevronDownIcon className="w-4 h-4" />
                            </button>
                            {showResponders && (
                                <div className="absolute bottom-full left-0 mb-2 w-72 max-h-60 overflow-y-auto bg-light-background dark:bg-dark-background rounded-lg shadow-xl border border-light-border dark:border-dark-border z-10 p-2">
                                    {responders.length > 0 ? (
                                        responders.map((responder, index) => (
                                            <div key={index} className="group flex items-center justify-between p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">
                                                <button onClick={() => { setInput(responder); setShowResponders(false); }} className="text-left text-sm truncate flex-1">
                                                    {responder}
                                                </button>
                                                <button onClick={() => deleteResponder(index)} className="p-1 opacity-0 group-hover:opacity-100 text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-center text-light-text/60 dark:text-dark-text/60 p-4">No saved responders. Type a prompt and click "Save" to create one.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholderText}
                        rows={1}
                        className="flex-1 bg-transparent focus:outline-none resize-none max-h-48 pr-28"
                        disabled={chatStatus !== 'idle'}
                    />
                    <div className="absolute right-2 bottom-2 flex items-center gap-1">
                        {chatMode === 'RESPONDER' && (
                             <button onClick={handleSaveResponder} className="p-2 rounded-md hover:bg-light-background dark:hover:bg-dark-background disabled:opacity-50 text-sm font-semibold flex items-center gap-1" disabled={chatStatus !== 'idle' || !input.trim()}>
                                <BookmarkIcon className="w-4 h-4"/> Save
                            </button>
                        )}
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


const ChatView: React.FC = () => {
    const { chatMessages, chatStatus, activeToolName, deleteMessage } = useChatContext();
    const { isAiEnabled, openSettings } = useUIContext();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [pinnedSourcesInfo, setPinnedSourcesInfo] = useState<{ messageId: string; sources: Note[] } | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, pinnedSourcesInfo]);
    
    if (!chatMessages) {
        return <ChatViewSkeleton />;
    }

    if (!isAiEnabled) {
        return (
            <div className="flex-1 flex flex-col h-full bg-light-background dark:bg-dark-background">
                <ChatHeader />
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <SparklesIcon className="w-16 h-16 mb-4 text-light-text/30 dark:text-dark-text/30" />
                    <h2 className="text-xl font-bold">AI Features Disabled</h2>
                    <p className="mt-2 max-w-sm text-light-text/60 dark:text-dark-text/60">
                        To use the AI Chat Assistant, please enable AI features in the settings.
                    </p>
                    <button
                        onClick={() => openSettings('general')}
                        className="mt-6 flex items-center gap-2 px-4 py-2 rounded-md bg-light-ui dark:bg-dark-ui hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover font-semibold"
                    >
                        <Cog6ToothIcon />
                        Open Settings
                    </button>
                </div>
            </div>
        );
    }

    const getStatusMessage = () => {
        switch (chatStatus) {
            case 'searching': return 'Searching notes...';
            case 'replying': return 'Generating response...';
            case 'using_tool': return activeToolName ? `Using tool: ${activeToolName}...` : 'Using tools...';
            default: return null;
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-light-background dark:bg-dark-background">
            <ChatHeader />
            <div className="flex flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                    <div className="max-w-3xl mx-auto w-full space-y-6">
                        {chatMessages.map(msg => 
                            <Message 
                                key={msg.id} 
                                message={msg} 
                                onDelete={() => deleteMessage(msg.id)}
                                onToggleSources={(sources) => {
                                    if (pinnedSourcesInfo?.messageId === msg.id) {
                                        setPinnedSourcesInfo(null);
                                    } else {
                                        setPinnedSourcesInfo({ messageId: msg.id, sources });
                                    }
                                }}
                                isSourcesPinned={pinnedSourcesInfo?.messageId === msg.id}
                            />
                        )}
                        {chatStatus !== 'idle' && (
                            <div className="flex items-start gap-4">
                                 <div className="w-8 h-8 rounded-full bg-light-primary dark:bg-dark-primary flex items-center justify-center text-white flex-shrink-0 mt-1 animate-pulse"><SparklesIcon className="w-5 h-5"/></div>
                                 <div className="p-3 rounded-lg bg-light-background dark:bg-dark-background">
                                     <p className="text-sm font-semibold italic text-light-text/80 dark:text-dark-text/80">
                                         {getStatusMessage()}
                                    </p>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {pinnedSourcesInfo && (
                    <div className="w-full md:w-1/2 lg:w-1/3 max-w-md h-full flex flex-col border-l border-light-border dark:border-dark-border bg-light-ui/50 dark:bg-dark-ui/50">
                        <div className="p-4 flex justify-between items-center border-b border-light-border dark:border-dark-border flex-shrink-0">
                            <h2 className="font-bold">Cited Sources</h2>
                            <button onClick={() => setPinnedSourcesInfo(null)} className="p-1 rounded-full hover:bg-light-background dark:hover:bg-dark-background">
                                <XMarkIcon />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-4 space-y-4">
                            {pinnedSourcesInfo.sources.map((source, index) => (
                                <div key={source.id} id={`pinned-source-${index + 1}`} className="bg-light-background dark:bg-dark-background rounded-lg p-4 border border-light-border dark:border-dark-border">
                                    <h3 className="font-bold mb-2 flex items-center gap-2">
                                        <span className="flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-light-ui dark:bg-dark-ui">{index + 1}</span>
                                        {source.title}
                                    </h3>
                                    <div className="text-sm max-h-64 overflow-y-auto chat-markdown">
                                        <MarkdownPreview title="" content={source.content} onToggleTask={() => {}} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <ChatInput />
        </div>
    );
};

export default ChatView;