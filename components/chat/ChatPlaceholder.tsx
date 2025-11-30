import React from 'react';
import { SparklesIcon } from '../Icons';

const ChatPlaceholder: React.FC = () => {
    return (
        <div className="text-center py-10 opacity-60">
            <SparklesIcon className="w-12 h-12 mx-auto mb-4 text-light-primary dark:text-dark-primary" />
            <h3 className="text-lg font-semibold">How can I help you?</h3>
            <p className="text-sm mt-2 max-w-md mx-auto">
                I can answer questions about your notes, draft customer responses, generate Amazon listings, or manage your workspace.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button className="text-xs bg-light-ui dark:bg-dark-ui px-3 py-1.5 rounded-full hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover transition-colors pointer-events-none">
                    "Summarize my meeting notes"
                </button>
                <button className="text-xs bg-light-ui dark:bg-dark-ui px-3 py-1.5 rounded-full hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover transition-colors pointer-events-none">
                    "Create a note about Q4 strategy"
                </button>
                <button className="text-xs bg-light-ui dark:bg-dark-ui px-3 py-1.5 rounded-full hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover transition-colors pointer-events-none">
                    "Draft a reply to this customer..."
                </button>
            </div>
        </div>
    );
};

export default ChatPlaceholder;