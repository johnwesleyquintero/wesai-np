
import React, { useRef, useEffect, useState } from 'react';
import { useChatContext, useUIContext } from '../context/AppContext';
import { ChatMode, Note } from '../types';
import MarkdownPreview from './MarkdownPreview';
import { SparklesIcon, Cog6ToothIcon, XMarkIcon } from './Icons';
import ChatViewSkeleton from './ChatViewSkeleton';
import ChatMessageComponent from './chat/ChatMessage';
import ChatInput from './chat/ChatInput';

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
                            <ChatMessageComponent 
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
