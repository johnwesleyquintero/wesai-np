import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChatContext, useStoreContext, useUIContext } from '../context/AppContext';
import { ChatMessage, ChatMode, ChatStatus, Note } from '../types';
import MarkdownPreview from './MarkdownPreview';
import { PaperAirplaneIcon, SparklesIcon, XCircleIcon, DocumentPlusIcon, PaperClipIcon, ClipboardDocumentIcon, EllipsisHorizontalIcon, TrashIcon } from './Icons';
import { useToast } from '../context/ToastContext';
import ChatViewSkeleton from './ChatViewSkeleton';

const ChatHeader: React.FC = () => {
    const { chatMode, setChatMode, chatStatus, clearChat } = useChatContext();
    const modes: { id: ChatMode; name: string; description: string }[] = [
        { id: 'ASSISTANT', name: 'Assistant', description: 'Your knowledge co-pilot. Answers questions based on your notes.' },
        { id: 'RESPONDER', name: 'Responder', description: 'Drafts professional customer service responses using your notes as a knowledge base.' },
        { id: 'GENERAL', name: 'General', description: 'A general-purpose AI that can help you create and manage your notes.' },
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
    const { setActiveNoteId } = useStoreContext();
    const { setView } = useUIContext();

    const handleNoteClick = (id: string) => {
        setActiveNoteId(id);
        setView('NOTES');
    };

    if (!sources || sources.length === 0) return null;

    return (
        <div className="mt-2">
            <p className="text-xs font-semibold text-light-text/60 dark:text-dark-text/60 mb-1">Sources:</p>
            <div className="flex flex-wrap gap-2">
                {sources.map(note => (
                    <button
                        key={note.id}
                        onClick={() => handleNoteClick(note.id)}
                        className="px-2 py-1 text-xs bg-light-ui dark:bg-dark-ui rounded-md hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover"
                    >
                        {note.title}
                    </button>
                ))}
            </div>
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

const Message: React.FC<{ message: ChatMessage; onDelete: () => void }> = ({ message, onDelete }) => {
    const { showToast } = useToast();
    const { onAddNote, setActiveNoteId } = useStoreContext();
    const { setView } = useUIContext();
    const [isHovered, setIsHovered] = useState(false);

    const handleSaveAsNote = () => {
        if (typeof message.content === 'string') {
            onAddNote('AI Chat Response', message.content);
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

    const renderContent = () => {
        if (typeof message.content === 'string') {
            return <MarkdownPreview title="" content={message.content} onToggleTask={() => {}} />;
        }
        if (typeof message.content === 'object' && message.content.name) {
            const { name, args, result, status } = message.content;
            return (
                 <div className="text-xs p-2 bg-light-ui dark:bg-dark-ui rounded-md">
                     <p><strong>Tool Call:</strong> {name}</p>
                     <p><strong>Args:</strong> {JSON.stringify(args)}</p>
                     {status !== 'pending' && <p><strong>Status:</strong> {status}</p>}
                     {result && <p><strong>Result:</strong> {JSON.stringify(result)}</p>}
                </div>
            );
        }
        return 'Invalid message content';
    };

    const isUser = message.role === 'user';
    const isAi = message.role === 'ai';
    const isTool = message.role === 'tool';
    
    return (
        <div 
            className={`group flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
             {!isUser && <div className="w-8 h-8 rounded-full bg-light-primary dark:bg-dark-primary flex items-center justify-center text-white flex-shrink-0 mt-1"><SparklesIcon className="w-5 h-5"/></div>}
             {isUser && isHovered && <div className="flex-shrink-0 self-center"><MessageActions onDelete={onDelete} /></div>}

            <div className={`p-3 rounded-lg max-w-full md:max-w-2xl w-fit ${isUser ? 'bg-light-ui dark:bg-dark-ui' : 'bg-light-background dark:bg-dark-background'}`}>
                {message.image && <img src={`data:image/jpeg;base64,${message.image}`} alt="User upload" className="max-w-xs rounded-lg mb-2" />}
                {renderContent()}
                {isAi && <SourceNotes sources={message.sources || []} />}
                {isAi && message.noteId && (
                     <button onClick={() => handleNoteClick(message.noteId!)} className="text-xs font-semibold text-light-primary dark:text-dark-primary mt-2">
                        View touched note &rarr;
                    </button>
                )}
                {isAi && (
                    <div className="flex items-center gap-4 mt-2">
                        <button onClick={handleSaveAsNote} className="flex items-center gap-1 text-xs font-semibold text-light-text/60 dark:text-dark-text/60 hover:text-light-text dark:hover:text-dark-text">
                            <DocumentPlusIcon className="w-4 h-4" /> Save as Note
                        </button>
                        <button onClick={handleCopyToClipboard} className="flex items-center gap-1 text-xs font-semibold text-light-text/60 dark:text-dark-text/60 hover:text-light-text dark:hover:text-dark-text">
                            <ClipboardDocumentIcon className="w-4 h-4" /> Copy
                        </button>
                    </div>
                )}
            </div>
            {!isUser && isHovered && <div className="flex-shrink-0 self-center"><MessageActions onDelete={onDelete} /></div>}
        </div>
    );
};

const ChatInput: React.FC = () => {
    const [input, setInput] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const { 
        chatMode, chatStatus, onSendMessage, onGenerateServiceResponse, onSendGeneralMessage, onGenerateAmazonCopy,
        chatMessages, deleteMessage,
    } = useChatContext();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        
        switch(chatMode) {
            case 'ASSISTANT':
                onSendMessage(input, image || undefined);
                break;
            case 'RESPONDER':
                onGenerateServiceResponse(input, image || undefined);
                break;
            case 'GENERAL':
                onSendGeneralMessage(input, image || undefined);
                break;
            case 'AMAZON':
                onGenerateAmazonCopy(input, image || undefined);
                break;
        }

        setInput('');
        setImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        } else if (e.key === 'ArrowUp' && input === '') {
            e.preventDefault();
            const lastUserMessage = [...chatMessages].reverse().find(m => m.role === 'user');
            if (lastUserMessage && typeof lastUserMessage.content === 'string') {
                deleteMessage(lastUserMessage.id);
                setInput(lastUserMessage.content);
                // Note: Restoring image from last message is not implemented for simplicity.
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
    
    const placeholderText = {
        ASSISTANT: 'Ask a question about your notes...',
        RESPONDER: 'Paste customer query here...',
        GENERAL: 'Ask me to create or manage notes...',
        AMAZON: 'Paste product info here...',
    }[chatMode];

    return (
        <div className="flex-shrink-0 p-4 sm:p-6 border-t border-light-border dark:border-dark-border">
            <div className="max-w-3xl mx-auto">
                {image && (
                    <div className="relative w-24 h-24 mb-2">
                        <img src={`data:image/jpeg;base64,${image}`} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                        <button onClick={() => setImage(null)} className="absolute -top-2 -right-2 bg-light-ui dark:bg-dark-ui rounded-full p-1"><XCircleIcon /></button>
                    </div>
                )}
                 <div className="relative flex items-center p-2 rounded-lg bg-light-ui dark:bg-dark-ui border border-light-border/50 dark:border-dark-border/50 focus-within:border-light-primary dark:focus-within:border-dark-primary">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholderText}
                        rows={1}
                        className="flex-1 bg-transparent focus:outline-none resize-none max-h-48 pr-20"
                        disabled={chatStatus !== 'idle'}
                    />
                    <div className="absolute right-2 bottom-2 flex items-center gap-1">
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-md hover:bg-light-background dark:hover:bg-dark-background disabled:opacity-50" disabled={chatStatus !== 'idle'}><PaperClipIcon /></button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/jpeg,image/png" className="hidden" />
                        <button onClick={handleSend} className="p-2 rounded-md bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900 disabled:opacity-50" disabled={chatStatus !== 'idle'}><PaperAirplaneIcon /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const ChatView: React.FC = () => {
    const { chatMessages, chatStatus, activeToolName, deleteMessage } = useChatContext();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);
    
    if (!chatMessages) {
        return <ChatViewSkeleton />;
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
            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                <div className="max-w-3xl mx-auto w-full space-y-6">
                    {chatMessages.map(msg => <Message key={msg.id} message={msg} onDelete={() => deleteMessage(msg.id)} />)}
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
            <ChatInput />
        </div>
    );
};

export default ChatView;