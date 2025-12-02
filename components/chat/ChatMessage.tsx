
import React from 'react';
import { ChatMessage, Note } from '../../types';
import ToolCallDisplay from '../ToolCallDisplay';
import UserMessage from './UserMessage';
import AiMessage from './AiMessage';
import { useChatContext } from '../../context/AppContext';

interface MessageProps {
    message: ChatMessage;
    onDelete: () => void;
    onToggleSources: (sources: Note[]) => void;
    isSourcesPinned: boolean;
}

const ChatMessageComponent: React.FC<MessageProps> = ({ message, onDelete }) => {
    const { chatMessages } = useChatContext();
    const isLastMessage = chatMessages[chatMessages.length - 1]?.id === message.id;

    if (message.role === 'tool') {
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
    
    if (message.role === 'user') {
        return <UserMessage message={message} onDelete={onDelete} />;
    }

    if (message.role === 'ai') {
        return <AiMessage message={message} onDelete={onDelete} isLastMessage={isLastMessage} />;
    }

    return null;
};

export default ChatMessageComponent;
