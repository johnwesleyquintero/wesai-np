
import React from 'react';
import { ChatMessage } from '../../types';
import MarkdownPreview from '../MarkdownPreview';
import { DocumentTextIcon } from '../Icons';
import { useStoreContext } from '../../context/AppContext';
import { MessageActions } from './ChatActionButtons';

interface UserMessageProps {
    message: ChatMessage;
    onDelete: () => void;
}

const UserMessage: React.FC<UserMessageProps> = ({ message, onDelete }) => {
    const { getNoteById } = useStoreContext();

    const renderContent = () => {
        if (typeof message.content === 'string') {
            return <MarkdownPreview title="" content={message.content} onToggleTask={() => {}} />;
        }
        return 'Invalid message content';
    };

    return (
        <div className="group flex items-start gap-3 mb-6 justify-end animate-fade-in-up">
             <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                 <MessageActions onDelete={onDelete} />
             </div>

            <div className="max-w-[90%] md:max-w-2xl transition-all duration-200 bg-light-ui dark:bg-dark-ui border border-light-border/50 dark:border-dark-border/50 rounded-2xl rounded-tr-sm p-4 shadow-sm">
                {message.image && (
                    <div className="mb-3">
                        <img src={`data:image/jpeg;base64,${message.image}`} alt="User upload" className="max-w-xs rounded-lg shadow-sm border border-light-border dark:border-dark-border" />
                    </div>
                )}
                
                {message.contextNoteIds && message.contextNoteIds.length > 0 && (
                    <div className="mb-3 pb-3 border-b border-light-border dark:border-dark-border">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-light-text/50 dark:text-dark-text/50 mb-2 flex items-center gap-1">
                            <DocumentTextIcon className="w-3 h-3"/> Context Attached
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {message.contextNoteIds.map(id => {
                                const note = getNoteById(id);
                                return (
                                    <span key={id} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-white dark:bg-zinc-900 border border-light-border dark:border-zinc-700 text-light-text/80 dark:text-dark-text/80 shadow-sm">
                                        <span className="truncate max-w-[150px] font-medium">{note ? note.title : 'Deleted Note'}</span>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="chat-markdown leading-relaxed text-sm sm:text-base">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default UserMessage;
