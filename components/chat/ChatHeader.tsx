import React from 'react';
import { useChatContext } from '../../context/AppContext';
import { SparklesIcon } from '../Icons';

const ChatHeader: React.FC = () => {
    const { chatStatus, clearChat } = useChatContext();

    return (
        <header className="p-4 border-b border-light-border dark:border-dark-border flex-shrink-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-light-primary dark:text-dark-primary" />
                    <div>
                        <h1 className="text-xl font-bold leading-tight">WesCore Co-pilot</h1>
                        <p className="text-xs text-light-text/60 dark:text-dark-text/60">
                            Knowledge • Support • Ops • Copywriting
                        </p>
                    </div>
                </div>
                <button
                    onClick={clearChat}
                    disabled={chatStatus !== 'idle'}
                    className="text-sm font-semibold text-light-primary dark:text-dark-primary hover:underline disabled:opacity-50"
                >
                    Clear Chat
                </button>
            </div>
        </header>
    );
};

export default ChatHeader;