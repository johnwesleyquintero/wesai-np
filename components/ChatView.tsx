import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Note } from '../types';
import { Bars3Icon, SparklesIcon, DocumentTextIcon, PaperAirplaneIcon, MagnifyingGlassIcon } from './Icons';
import MarkdownPreview from './MarkdownPreview';

interface ChatViewProps {
    messages: ChatMessage[];
    onSendMessage: (query: string) => void;
    chatStatus: 'idle' | 'searching' | 'replying';
    onSelectNote: (noteId: string) => void;
    isMobileView: boolean;
    onToggleSidebar: () => void;
    isAiRateLimited: boolean;
}

const ChatView: React.FC<ChatViewProps> = ({ messages, onSendMessage, chatStatus, onSelectNote, isMobileView, onToggleSidebar, isAiRateLimited }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isReplying = chatStatus !== 'idle';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(scrollToBottom, [messages, chatStatus]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isReplying) {
            onSendMessage(input);
            setInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(e);
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

    return (
        <div className="flex-1 flex flex-col h-full bg-light-background dark:bg-dark-background">
            <header className="flex items-center p-4 border-b border-light-border dark:border-dark-border flex-shrink-0">
                {isMobileView && (
                    <button onClick={onToggleSidebar} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui mr-2">
                        <Bars3Icon />
                    </button>
                )}
                <h2 className="text-xl font-bold flex items-center">
                    <SparklesIcon className="w-6 h-6 mr-2 text-light-primary dark:text-dark-primary"/>
                    Ask AI About Your Notes
                </h2>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                <div className="max-w-3xl mx-auto w-full space-y-6">
                    {messages.length === 0 && (
                        <div className="text-center text-light-text/60 dark:text-dark-text/60 mt-16">
                             <SparklesIcon className="w-16 h-16 mx-auto mb-4 text-light-primary dark:text-dark-primary" />
                            <h3 className="text-xl font-semibold">Your personal knowledge assistant</h3>
                            <p className="mt-2">Ask a question about your notes to get started.</p>
                             <p className="text-sm mt-4 p-2 bg-light-ui dark:bg-dark-ui rounded-md">e.g., "What were the action items from my last meeting?"</p>
                        </div>
                    )}
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'ai' && <div className="w-8 h-8 rounded-full bg-light-primary dark:bg-dark-primary flex items-center justify-center flex-shrink-0 mt-1"><SparklesIcon className="w-5 h-5 text-white" /></div>}
                            <div className={`max-w-xl p-4 rounded-2xl ${msg.role === 'user' ? 'bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900' : 'bg-light-ui dark:bg-dark-ui'}`}>
                                {msg.role === 'ai' ? (
                                    <div className="prose prose-sm sm:prose-base max-w-none text-light-text dark:text-dark-text">
                                        <MarkdownPreview title="" content={msg.content || '...'} onToggleTask={() => {}} />
                                    </div>
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
                            AI chat is temporarily unavailable due to high usage.
                        </div>
                    )}
                    <form onSubmit={handleSend} className="relative">
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask a follow-up question..."
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