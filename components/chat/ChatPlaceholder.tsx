
import React from 'react';
import { SparklesIcon, ServerStackIcon, PencilSquareIcon, MagnifyingGlassIcon } from '../Icons';
import { useChatContext } from '../../context/AppContext';

const ChatPlaceholder: React.FC = () => {
    const { sendMessage } = useChatContext();

    const capabilities = [
        {
            icon: <MagnifyingGlassIcon className="w-5 h-5" />,
            title: "Deep Research",
            desc: "Semantic lookup & web grounding"
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
        "Find notes about marketing strategies",
        "Draft a professional email reply",
        "Create a new note for Q4 Objectives",
        "Analyze the connection between Projects A & B"
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] opacity-0 animate-fade-in-up px-4">
            
            {/* Hero Section */}
            <div className="relative mb-10 text-center">
                <div className="absolute inset-0 bg-light-primary/20 dark:bg-dark-primary/20 blur-[50px] rounded-full" />
                <div className="relative bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-light-border dark:border-dark-border shadow-lg inline-block mb-6">
                    <SparklesIcon className="w-12 h-12 text-light-primary dark:text-dark-primary" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-br from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent tracking-tight">
                    WesCore Co-Pilot
                </h1>
                <p className="text-light-text/60 dark:text-dark-text/60 mt-3 text-lg font-medium">
                    Your operating system for high-leverage work.
                </p>
            </div>

            {/* Capabilities Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-12">
                {capabilities.map((cap, i) => (
                    <div key={i} className="flex flex-col items-center text-center p-5 rounded-2xl bg-white/50 dark:bg-zinc-800/50 border border-light-border/50 dark:border-zinc-700/50 backdrop-blur-sm shadow-sm transition-transform hover:-translate-y-1">
                        <div className="text-light-primary dark:text-dark-primary mb-3 bg-light-ui dark:bg-zinc-900 p-2 rounded-full">{cap.icon}</div>
                        <h3 className="font-bold text-sm mb-1">{cap.title}</h3>
                        <p className="text-xs text-light-text/50 dark:text-dark-text/50">{cap.desc}</p>
                    </div>
                ))}
            </div>

            {/* Interactive Prompts */}
            <div className="w-full max-w-xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-light-text/40 dark:text-dark-text/40 text-center mb-4">
                    Initialize Command
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {starterPrompts.map((prompt, i) => (
                        <button
                            key={i}
                            onClick={() => sendMessage(prompt)}
                            className="group relative flex items-center p-3 text-left bg-white dark:bg-zinc-900 border border-light-border dark:border-zinc-800 rounded-xl hover:border-light-primary/50 dark:hover:border-dark-primary/50 hover:shadow-md transition-all duration-200"
                        >
                            <span className="text-sm text-light-text/70 dark:text-dark-text/70 group-hover:text-light-primary dark:group-hover:text-dark-primary transition-colors font-medium">
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
