
import React, { useState } from 'react';
import { ChatMessage } from '../../types';
import MarkdownPreview from '../MarkdownPreview';
import { SparklesIcon, ThumbsUpIcon, ThumbsDownIcon, ArrowPathIcon, XMarkIcon } from '../Icons';
import { useChatContext } from '../../context/AppContext';
import MessageArtifacts from './MessageArtifacts';
import { MessageActions, ActionButton, CopyMessageButton } from './ChatActionButtons';

interface AiMessageProps {
    message: ChatMessage;
    onDelete: () => void;
    isLastMessage: boolean;
}

const feedbackReasons = ['Incorrect', 'Not Helpful', 'Off-topic'];

const AiMessage: React.FC<AiMessageProps> = ({ message, onDelete, isLastMessage }) => {
    const { handleFeedback, regenerateLastResponse } = useChatContext();
    const [isProvidingFeedback, setIsProvidingFeedback] = useState(false);

    const handleSelectReason = (reason: string) => {
        handleFeedback(message.id, { rating: 'down', tags: [reason] });
        setIsProvidingFeedback(false);
    };

    const renderContent = () => {
        if (typeof message.content === 'string') {
            return <MarkdownPreview title="" content={message.content} onToggleTask={() => {}} isStreaming={message.status === 'processing'} />;
        }
        return 'Invalid message content';
    };

    return (
        <div className="group flex items-start gap-3 mb-6 justify-start animate-fade-in-up">
             <div className="w-8 h-8 mt-1 rounded-lg bg-white dark:bg-zinc-800 border border-light-border dark:border-dark-border flex items-center justify-center flex-shrink-0 shadow-sm text-light-primary dark:text-dark-primary">
                 <SparklesIcon className="w-5 h-5"/>
             </div>

            <div className="max-w-[90%] md:max-w-2xl transition-all duration-200 bg-transparent pl-1 py-1">
                <div className="chat-markdown leading-relaxed text-sm sm:text-base">
                    {renderContent()}
                </div>

                <MessageArtifacts 
                    sources={message.sources}
                    groundingChunks={message.groundingMetadata?.groundingChunks}
                    noteIds={message.noteIds}
                />

                {/* Feedback & Actions */}
                {message.status !== 'processing' && (
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
            
            <div className="flex-shrink-0 self-start opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                <MessageActions onDelete={onDelete} />
            </div>
        </div>
    );
};

export default AiMessage;
