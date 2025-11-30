
import React from 'react';
import { SparklesIcon, ServerStackIcon, PencilSquareIcon, MagnifyingGlassIcon } from '../Icons';
import { useChatContext } from '../../context/AppContext';

const ChatPlaceholder: React.FC = () => {
    const { sendMessage } = useChatContext();

    const capabilities = [
        {
            icon: <MagnifyingGlassIcon className="w-5 h-5" />,
            title: "Deep Search",
            desc: "Semantic lookup across all notes"
        },
        {
            icon: <PencilSquareIcon className="w-5 h-5" />,
            title: "Content Studio",
            desc: "Draft, edit, and format content"
        },
        {
            icon: <ServerStackIcon className="w-5 h-5" />,
            title: "Ops Control",
            desc: "Create, organize, and manage files"
        }
    ];

    const starterPrompts = [
        "Find notes about marketing and summarize key points",
        "Draft a professional reply to a customer complaint",
        "Create a new note for Q4 Objectives",
        "Analyze the connection between Project Alpha and Beta"
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] opacity-0 animate-fade-in-up">
            
            {/* Hero Section */}
            <div className="relative mb-10 text-center">
                <div className="absolute inset-0 bg-light-primary/20 dark:bg-dark-primary/20 blur-3xl rounded-full" />
                <div className="relative bg-light-background dark:bg-dark-background p-4 rounded-2xl border border-light-border/50 dark:border-dark-border/50 shadow-sm inline-block mb-4">
                    <SparklesIcon className="w-10 h-10 text-light-primary dark:text-dark-primary" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-light-text to-light-primary dark:from-dark-text dark:to-dark-primary bg-clip-text text-transparent">
                    WesCore Co-Pilot
                </h1>
                <p className="text-light-text/60 dark:text-dark-text/60 mt-2 font-medium">
                    System Ready. Awaiting Instructions.
                </p>
            </div>

            {/* Capabilities Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-10">
                {capabilities.map((cap, i) => (
                    <div key={i} className="flex flex-col items-center text-center p-4 rounded-xl bg-light-ui/30 dark:bg-dark-ui/30 border border-light-border/30 dark:border-dark-border/30">
                        <div className="text-light-text/70 dark:text-dark-text/70 mb-2">{cap.icon}</div>
                        <h3 className="font-semibold text-sm">{cap.title}</h3>
                        <p className="text-xs text-light-text/50 dark:text-dark-text/50">{cap.desc}</p>
                    </div>
                ))}
            </div>

            {/* Interactive Prompts */}
            <div className="w-full max-w-xl">
                <p className="text-xs font-bold uppercase tracking-widest text-light-text/40 dark:text-dark-text/40 text-center mb-4">
                    Quick Commands
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {starterPrompts.map((prompt, i) => (
                        <button
                            key={i}
                            onClick={() => sendMessage(prompt)}
                            className="group relative flex items-center p-3 text-left bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-lg hover:border-light-primary/50 dark:hover:border-dark-primary/50 hover:shadow-md transition-all duration-200"
                        >
                            <span className="text-sm text-light-text/80 dark:text-dark-text/80 group-hover:text-light-primary dark:group-hover:text-dark-primary transition-colors">
                                "{prompt}"
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ChatPlaceholder;
