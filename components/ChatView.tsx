import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Note, ChatMode } from '../types';
import { Bars3Icon, SparklesIcon, DocumentTextIcon, PaperAirplaneIcon, MagnifyingGlassIcon, ClipboardDocumentIcon, PaperClipIcon, XMarkIcon, Cog6ToothIcon, CheckBadgeIcon, PencilSquareIcon, ArrowTopRightOnSquareIcon, XCircleIcon } from './Icons';
import MarkdownPreview from './MarkdownPreview';
import { useUIContext, useStoreContext, useChatContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { suggestTitle } from '../services/geminiService';

const ChatView: React.FC = () => {
    const { onAddNote, setActiveNoteId } = useStoreContext();
    const { 
        chatMessages: messages, 
        onSendMessage, 
        onGenerateServiceResponse, 
        onSendGeneralMessage, 
        chatStatus, 
        clearChat, 
        chatMode,
        setChatMode,
    } = useChatContext();
    const { isMobileView, onToggleSidebar, setView, isAiRateLimited } = useUIContext();
    const { showToast } = useToast();

    const [input, setInput] = useState('');
    const [imageData, setImageData] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isReplying = chatStatus !== 'idle';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(scrollToBottom, [messages, chatStatus]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if ((input.trim() || imageData) && !isReplying) {
            if (chatMode === 'ASSISTANT') {
                onSendMessage(input, imageData);
            } else if (chatMode === 'RESPONDER') {
                onGenerateServiceResponse(input, imageData);
            } else {
                onSendGeneralMessage(input, imageData);
            }
            setInput('');
            setImageData(null);
        }
    };
    
    const onSelectNote = (noteId: string) => {
        setActiveNoteId(noteId);
        setView('NOTES');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(e);
        }
    };

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content)
            .then(() => showToast({ message: 'Response copied to clipboard!', type: 'success' }))
            .catch(() => showToast({ message: 'Failed to copy text.', type: 'error' }));
    };
    
    const handleCreateNote = async (content: string) => {
        if (!content.trim()) return;
        try {
            const title = await suggestTitle(content.substring(0, 1000));
            // onAddNote now handles the toast, setting the active note, and switching the view.
            await onAddNote(null, title || 'AI Chat Response', content);
        } catch (error) {
            showToast({ message: `Failed to create note. ${error instanceof Error ? error.message : ''}`, type: 'error' });
        }
    };
    
    const handleModeChange = (newMode: ChatMode) => {
        if (chatMode !== newMode) {
            setChatMode(newMode);
        }
    };

    const handleFileSelect = (file: File | null) => {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast({ message: 'Please select an image file.', type: 'error' });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            setImageData(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };
    
    const ToolMessage: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
        const [isArgsOpen, setIsArgsOpen] = useState(true);

        if (typeof msg.content !== 'object' || msg.content === null) return null;
        const { name, args, status, result } = msg.content;

        const statusConfig = {
            pending: {
                icon: <Cog6ToothIcon className="w-5 h-5 animate-spin text-light-text/80 dark:text-dark-text/80" />,
                title: 'Using Tool',
                borderColor: 'border-light-border dark:border-dark-border',
            },
            complete: {
                icon: <CheckBadgeIcon className="w-5 h-5 text-green-500" />,
                title: 'Tool Succeeded',
                borderColor: 'border-green-300 dark:border-green-800',
            },
            error: {
                icon: <XCircleIcon className="w-5 h-5 text-red-500" />,
                title: 'Tool Failed',
                borderColor: 'border-red-300 dark:border-red-800',
            }
        };

        const currentStatus = statusConfig[status || 'pending'];

        const renderJson = (jsonObj: any) => {
            if (jsonObj === undefined || jsonObj === null) return 'null';
            try {
                if (Object.keys(jsonObj).length === 0 && jsonObj.constructor === Object) return '{}';
                return JSON.stringify(jsonObj, null, 2);
            } catch {
                return 'Invalid JSON object';
            }
        };

        return (
            <div className={`my-4 border rounded-lg overflow-hidden bg-light-ui/50 dark:bg-dark-ui/50 ${currentStatus.borderColor}`}>
                <div className="flex items-center justify-between p-3 bg-light-ui/70 dark:bg-dark-ui/70">
                    <div className="flex items-center gap-3">
                        {currentStatus.icon}
                        <span className="font-semibold text-sm">{currentStatus.title}: <span className="font-mono bg-light-background dark:bg-dark-background px-1.5 py-0.5 rounded">{name}</span></span>
                    </div>
                    <button onClick={() => setIsArgsOpen(!isArgsOpen)} className="text-xs font-medium text-light-text/60 dark:text-dark-text/60 hover:underline">
                        {isArgsOpen ? 'Hide Details' : 'Show Details'}
                    </button>
                </div>
                {isArgsOpen && (
                    <div className="p-3 text-xs font-mono bg-light-background dark:bg-dark-background">
                        <div className="mb-2">
                            <h4 className="font-semibold text-light-text/70 dark:text-dark-text/70 mb-1">Arguments:</h4>
                            <pre className="whitespace-pre-wrap break-all p-2 bg-light-ui dark:bg-dark-ui rounded text-light-text dark:text-dark-text">{renderJson(args)}</pre>
                        </div>
                         {(status === 'complete' || status === 'error') && result !== undefined && (
                            <div>
                                <h4 className="font-semibold text-light-text/70 dark:text-dark-text/70 mb-1">Result:</h4>
                                <pre className={`whitespace-pre-wrap break-all p-2 rounded ${status === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'}`}>{renderJson(result)}</pre>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };


    const LoadingIndicator = () => {
        const messagesContent = {
            searching: 'Finding relevant notes...',
            replying: 'AI is thinking...',
            using_tool: 'Using tool...',
        };

        if (chatStatus === 'idle') return null;

        if (chatStatus === 'replying' && messages[messages.length-1]?.role !== 'ai') {
             return (
                <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-light-primary dark:bg-dark-primary flex items-center justify-center flex-shrink-0 mt-1"><SparklesIcon className="w-5 h-5 text-white" /></div>
                    <div className="max-w-xl p-4 rounded-2xl bg-light-ui dark:bg-dark-ui">
                        <div className="flex items-center gap-2 text-light-text/80 dark:text-dark-text/80">
                            <div className="w-2 h-2 bg-light-primary dark:bg-dark-primary rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-light-primary dark:bg-dark-primary rounded-full animate-pulse [animation-delay:0.2s]"></div>
                            <div className="w-2 h-2 bg-light-primary dark:bg-dark-primary rounded-full animate-pulse [animation-delay:0.4s]"></div>
                            <span className="text-sm">{messagesContent[chatStatus]}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    }

    const placeholders = {
        ASSISTANT: "Ask a question about your notes...",
        RESPONDER: "Paste customer message here...",
        GENERAL: "Create a new note titled..."
    };
    
    const subtitles = {
        ASSISTANT: "Get answers from your knowledge base.",
        RESPONDER: "Draft professional replies using your notes.",
        GENERAL: "Your creative partner for managing notes."
    };
    
    const welcomeMessages = {
        ASSISTANT: {
            title: "Your personal knowledge assistant",
            body: "Ask a question about your notes to get started.",
            example: 'e.g., "What were the action items from my last meeting?"'
        },
        RESPONDER: {
            title: "Customer Service Responder",
            body: "Paste a customer's message below. The AI will use your notes as a knowledge base to draft a professional, compliant response.",
            example: "e.g., \"Hi, I haven't received my package yet, can you help?\""
        },
        GENERAL: {
            title: "General Assistant",
            body: "Use natural language to manage your notes. The AI can create, find, and update notes for you.",
            example: 'e.g., "Create a new note titled \'Q3 Marketing Plan\' and add a section about our target audience."'
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-light-background dark:bg-dark-background" onDragOver={handleDragOver} onDrop={handleDrop}>
            <header className="p-4 border-b border-light-border dark:border-dark-border flex-shrink-0">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        {isMobileView && (
                            <button onClick={onToggleSidebar} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui mr-2">
                                <Bars3Icon />
                            </button>
                        )}
                        <div className="flex-1">
                            <h2 className="text-xl font-bold flex items-center">
                                <SparklesIcon className="w-6 h-6 mr-2 text-light-primary dark:text-dark-primary"/>
                                AI Assistant
                            </h2>
                            <p className="text-sm text-light-text/60 dark:text-dark-text/60">{subtitles[chatMode]}</p>
                        </div>
                    </div>
                    {messages.length > 0 && (
                        <button onClick={clearChat} className="text-sm px-3 py-1.5 rounded-lg hover:bg-light-ui dark:hover:bg-dark-ui text-light-text/70 dark:text-dark-text/70">
                            Clear Chat
                        </button>
                    )}
                </div>
                 <div className="mt-4 flex justify-center">
                    <div className="flex space-x-1 bg-light-ui dark:bg-dark-ui p-1 rounded-lg">
                        <button
                            onClick={() => handleModeChange('ASSISTANT')}
                            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${chatMode === 'ASSISTANT' ? 'bg-white dark:bg-dark-ui-hover shadow-sm' : 'text-light-text/70 dark:text-dark-text/70 hover:bg-light-background dark:hover:bg-dark-ui-hover'}`}
                        >
                           Knowledge Assistant
                        </button>
                        <button
                            onClick={() => handleModeChange('RESPONDER')}
                            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${chatMode === 'RESPONDER' ? 'bg-white dark:bg-dark-ui-hover shadow-sm' : 'text-light-text/70 dark:text-dark-text/70 hover:bg-light-background dark:hover:bg-dark-ui-hover'}`}
                        >
                           Service Responder
                        </button>
                        <button
                            onClick={() => handleModeChange('GENERAL')}
                            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${chatMode === 'GENERAL' ? 'bg-white dark:bg-dark-ui-hover shadow-sm' : 'text-light-text/70 dark:text-dark-text/70 hover:bg-light-background dark:hover:bg-dark-ui-hover'}`}
                        >
                           General Assistant
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                <div className="max-w-3xl mx-auto w-full space-y-6">
                    {messages.length === 0 && (
                        <div className="text-center text-light-text/60 dark:text-dark-text/60 mt-16">
                             <SparklesIcon className="w-16 h-16 mx-auto mb-4 text-light-primary dark:text-dark-primary" />
                             <h3 className="text-xl font-semibold">{welcomeMessages[chatMode].title}</h3>
                             <p className="mt-2">{welcomeMessages[chatMode].body}</p>
                             <p className="text-sm mt-4 p-2 bg-light-ui dark:bg-dark-ui rounded-md">{welcomeMessages[chatMode].example}</p>
                        </div>
                    )}
                    {messages.map((msg, index) => {
                         if (msg.role === 'tool') {
                            return <ToolMessage key={index} msg={msg} />;
                        }

                        return (
                            <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                {msg.role === 'ai' && <div className="w-8 h-8 rounded-full bg-light-primary dark:bg-dark-primary flex items-center justify-center flex-shrink-0 mt-1"><SparklesIcon className="w-5 h-5 text-white" /></div>}
                                <div className={`relative group max-w-xl p-4 rounded-2xl ${msg.role === 'user' ? 'bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900' : 'bg-light-ui dark:bg-dark-ui'}`}>
                                    {msg.image && (
                                        <img src={msg.image} alt="User upload" className="mb-2 rounded-lg max-w-xs max-h-64" />
                                    )}
                                    {msg.role === 'ai' ? (
                                        <>
                                            <div className="prose prose-sm sm:prose-base max-w-none text-light-text dark:text-dark-text chat-markdown">
                                                <MarkdownPreview title="" content={msg.content as string || '...'} onToggleTask={() => {}} />
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-light-ui-hover dark:border-dark-ui-hover flex items-center gap-2">
                                                <button onClick={() => handleCopy(msg.content as string)} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-light-background dark:bg-dark-background hover:bg-light-ui dark:hover:bg-dark-ui-hover border border-light-border dark:border-dark-border">
                                                    <ClipboardDocumentIcon className="w-4 h-4"/> Copy
                                                </button>
                                                <button onClick={() => handleCreateNote(msg.content as string)} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-light-background dark:bg-dark-background hover:bg-light-ui dark:hover:bg-dark-ui-hover border border-light-border dark:border-dark-border">
                                                    <PencilSquareIcon className="w-4 h-4"/> Create Note
                                                </button>
                                                {msg.noteId && (
                                                    <button onClick={() => { setActiveNoteId(msg.noteId!); setView('NOTES'); }} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-light-background dark:bg-dark-background hover:bg-light-ui dark:hover:bg-dark-ui-hover border border-light-border dark:border-dark-border">
                                                        <ArrowTopRightOnSquareIcon className="w-4 h-4"/> Jump to Note
                                                    </button>
                                                )}
                                            </div>
                                            <button onClick={() => handleCopy(msg.content as string)} className="absolute -top-3 -right-3 p-1.5 bg-light-background dark:bg-dark-background rounded-full shadow-md border border-light-border dark:border-dark-border opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ClipboardDocumentIcon className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        msg.content && <p>{msg.content as string}</p>
                                    )}
                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-light-border dark:border-dark-border/50">
                                            <h4 className="text-xs font-semibold mb-2">Sources:</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {msg.sources.map(note => (
                                                    <button key={note.id} onClick={() => onSelectNote(note.id)} className="flex items-center text-xs bg-light-background dark:bg-dark-background hover:bg-light-background/80 dark:hover:bg-dark-background/80 p-2 rounded-md border border-light-border dark:border-dark-border">
                                                        <DocumentTextIcon className="w-4 h-4 mr-1.5 flex-shrink-0"/>
                                                        <span className="truncate">{note.title}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                 {msg.role === 'user' && msg.status === 'processing' && (
                                    <div className="w-5 h-5 border-2 border-light-ui dark:border-dark-ui border-t-light-primary dark:border-t-dark-primary rounded-full animate-spin self-center"></div>
                                )}
                            </div>
                        );
                    })}

                    <LoadingIndicator />

                     <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="flex-shrink-0 p-4 sm:p-6 border-t border-light-border dark:border-dark-border">
                <div className="max-w-3xl mx-auto">
                     {isAiRateLimited && (
                        <div className="text-center text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                            AI features are temporarily unavailable due to high usage.
                        </div>
                    )}
                    {imageData && (
                        <div className="relative w-24 h-24 mb-2 p-1 border-2 border-dashed border-light-border dark:border-dark-border rounded-lg">
                            <img src={imageData} alt="Preview" className="w-full h-full object-cover rounded" />
                            <button onClick={() => setImageData(null)} className="absolute -top-2 -right-2 bg-light-background dark:bg-dark-background rounded-full p-0.5 border border-light-border dark:border-dark-border">
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <form onSubmit={handleSend} className="relative">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)}
                            accept="image/*"
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isReplying || isAiRateLimited}
                            className="absolute left-3 top-1/2 -translate-y-1.2 p-2 rounded-full hover:bg-light-background dark:hover:bg-dark-background disabled:opacity-50"
                            aria-label="Attach image"
                        >
                            <PaperClipIcon />
                        </button>
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholders[chatMode]}
                            rows={1}
                            className="w-full p-3 pl-12 pr-12 bg-light-ui dark:bg-dark-ui rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary disabled:opacity-70"
                            disabled={isReplying || isAiRateLimited}
                        />
                        <button type="submit" disabled={isReplying || (!input.trim() && !imageData) || isAiRateLimited} className="absolute right-3 top-1/2 -translate-y-1.2 p-2 rounded-full bg-light-primary dark:bg-dark-primary text-white disabled:bg-light-ui-hover dark:disabled:bg-dark-ui-hover disabled:text-light-text/50 dark:disabled:text-dark-text/50 transition-colors">
                           <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChatView;
