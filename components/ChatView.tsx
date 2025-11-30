import React, { useRef, useEffect, useState } from 'react';
import { useChatContext, useUIContext } from '../context/AppContext';
import { Note } from '../types';
import { SparklesIcon, Cog6ToothIcon } from './Icons';
import ChatViewSkeleton from './ChatViewSkeleton';
import ChatMessageComponent from './chat/ChatMessage';
import ChatInput from './chat/ChatInput';
import ChatHeader from './chat/ChatHeader';
import PinnedSourcesPanel from './chat/PinnedSourcesPanel';
import ChatPlaceholder from './chat/ChatPlaceholder';

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
                        {chatMessages.length === 0 && <ChatPlaceholder />}
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
                    <PinnedSourcesPanel 
                        sources={pinnedSourcesInfo.sources} 
                        onClose={() => setPinnedSourcesInfo(null)} 
                    />
                )}
            </div>
            <ChatInput />
        </div>
    );
};

export default ChatView;