import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Note, ChatMode } from '../types';
import { Bars3Icon, SparklesIcon, DocumentTextIcon, PaperAirplaneIcon, MagnifyingGlassIcon, ClipboardDocumentIcon } from './Icons';
import MarkdownPreview from './MarkdownPreview';
import { useUIContext, useStoreContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

const ChatView: React.FC = () => {
    const { chatMessages: messages, onSendMessage, onGenerateServiceResponse, onSendGeneralMessage, chatStatus, clearChat } = useStoreContext();
    const { isMobileView, onToggleSidebar, setView, isAiRateLimited } = useUIContext();
    const { setActiveNoteId } = useStoreContext();
    const { showToast } = useToast();

    const [input, setInput] = useState('');
    const [mode, setMode] = useState<ChatMode>('ASSISTANT');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isReplying = chatStatus !== 'idle';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(scrollToBottom, [messages, chatStatus]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isReplying) {
            if (mode === 'ASSISTANT') {
                onSendMessage(input);
            } else if (mode === 'RESPONDER') {
                onGenerateServiceResponse(input);
            } else {
                onSendGeneralMessage(input);
            }
            setInput('');
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
    
    const handleModeChange = (newMode: ChatMode) => {
        if (mode !== newMode) {
            clearChat();
            setMode(newMode);
        }
    };

    const LoadingIndicator = () => {
        if (chatStatus === 'searching') {
            return (
                 <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-light-primary/80 dark:bg-dark-primary/80 flex items-center justify-center flex-shrink-0 mt-1"><MagnifyingGlassIcon className="w-5 h-5 text-white" /></div>
                    <div className="max-w-xl p-4 rounded-2xl bg-light-ui dark:bg-dark-ui">
                        <div className="flex items-center gap-2 text-light-text/80 dark:text-dark-text/80">
                            <div className="w-2 h-2 bg-light-primary dark:bg-dark-primary rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-light-primary dark:bg-dark-primary rounded-full animate-pulse [animation-delay:0.2s]"></div>
                            <div className="w-2 h-2 bg-light-primary dark:bg-dark-primary rounded-full animate-pulse [animation-delay:0.4s]"></div>
                            <span className="text-sm">Finding relevant notes...</span>
                        </div>
                    </div>
                </div>
            );
        }
        if (chatStatus === 'replying' && messages[messages.length-1]?.role !== 'ai') {
             return (
                <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-light-primary dark:bg-dark-primary flex items-center justify-center flex-shrink-0 mt-1"><SparklesIcon className="w-5 h-5 text-white" /></div>
                    <div className="max-w-xl p-4 rounded-2xl bg-light-ui dark:bg-dark-ui">
                        <div className="flex items-center gap-2 text-light-text/80 dark:text-dark-text/80">
                            <div className="w-2 h-2 bg-light-primary dark:bg-dark-primary rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-light-primary dark:bg-dark-primary rounded-full animate-pulse [animation-delay:0.2s]"></div>
                            <div className="w-2 h-2 bg-light-primary dark:bg-dark-primary rounded-full animate-pulse [animation-delay:0.4s]"></div>
                            <span className="text-sm">AI is thinking...</span>
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
        GENERAL: "Ask me anything..."
    };
    
    const subtitles = {
        ASSISTANT: "Get answers from your knowledge base.",
        RESPONDER: "Draft professional replies using your notes.",
        GENERAL: "Your general-purpose assistant for any task."
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
            body: "How can I help you today? Brainstorm ideas, draft content, or get help with any task.",
            example: 'e.g., "Write a marketing email for our new product launch."'
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-light-background dark:bg-dark-background">
            <header className="p-4 border-b border-light-border dark:border-dark-border flex-shrink-0">
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
                        <p className="text-sm text-light-text/60 dark:text-dark-text/60">{subtitles[mode]}</p>
                    </div>
                </div>
                 <div className="mt-4 flex justify-center">
                    <div className="flex space-x-1 bg-light-ui dark:bg-dark-ui p-1 rounded-lg">
                        <button
                            onClick={() => handleModeChange('ASSISTANT')}
                            className={`px-3 py-1.5 text-sm font-semibold rounded-md ${mode === 'ASSISTANT' ? 'bg-white dark:bg-dark-ui-hover shadow-sm' : 'text-light-text/70 dark:text-dark-text/70'}`}
                        >
                           Knowledge Assistant
                        </button>
                        <button
                            onClick={() => handleModeChange('RESPONDER')}
                            className={`px-3 py-1.5 text-sm font-semibold rounded-md ${mode === 'RESPONDER' ? 'bg-white dark:bg-dark-ui-hover shadow-sm' : 'text-light-text/70 dark:text-dark-text/70'}`}
                        >
                           Service Responder
                        </button>
                        <button
                            onClick={() => handleModeChange('GENERAL')}
                            className={`px-3 py-1.5 text-sm font-semibold rounded-md ${mode === 'GENERAL' ? 'bg-white dark:bg-dark-ui-hover shadow-sm' : 'text-light-text/70 dark:text-dark-text/70'}`}
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
                             <h3 className="text-xl font-semibold">{welcomeMessages[mode].title}</h3>
                             <p className="mt-2">{welcomeMessages[mode].body}</p>
                             <p className="text-sm mt-4 p-2 bg-light-ui dark:bg-dark-ui rounded-md">{welcomeMessages[mode].example}</p>
                        </div>
                    )}
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'ai' && <div className="w-8 h-8 rounded-full bg-light-primary dark:bg-dark-primary flex items-center justify-center flex-shrink-0 mt-1"><SparklesIcon className="w-5 h-5 text-white" /></div>}
                            <div className={`relative group max-w-xl p-4 rounded-2xl ${msg.role === 'user' ? 'bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900' : 'bg-light-ui dark:bg-dark-ui'}`}>
                                {msg.role === 'ai' ? (
                                    <>
                                        <div className="prose prose-sm sm:prose-base max-w-none text-light-text dark:text-dark-text">
                                            <MarkdownPreview title="" content={msg.content || '...'} onToggleTask={() => {}} />
                                        </div>
                                        <button onClick={() => handleCopy(msg.content)} className="absolute -top-3 -right-3 p-1.5 bg-light-background dark:bg-dark-background rounded-full shadow-md border border-light-border dark:border-dark-border opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ClipboardDocumentIcon className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <p>{msg.content}</p>
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
                        </div>
                    ))}

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
                    <form onSubmit={handleSend} className="relative">
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholders[mode]}
                            rows={1}
                            className="w-full p-3 pr-12 bg-light-ui dark:bg-dark-ui rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary disabled:opacity-70"
                            disabled={isReplying || isAiRateLimited}
                        />
                        <button type="submit" disabled={isReplying || !input.trim() || isAiRateLimited} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-light-primary dark:bg-dark-primary text-white disabled:bg-light-ui-hover dark:disabled:bg-dark-ui-hover disabled:text-light-text/50 dark:disabled:text-dark-text/50 transition-colors">
                           <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChatView;