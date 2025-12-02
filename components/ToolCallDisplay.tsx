
import React, { useState, useEffect } from 'react';
import { 
    ExclamationCircleIcon, ChevronDownIcon, 
    MagnifyingGlassIcon, PencilSquareIcon, TrashIcon, 
    ArrowTopRightOnSquareIcon, BoltIcon, PlusIcon
} from './Icons';
import { useStoreContext, useUIContext } from '../context/AppContext';

interface ToolCallDisplayProps {
    content: {
        name: string;
        args: any;
        result?: any;
        status: 'pending' | 'complete' | 'error';
    };
}

const getToolConfig = (name: string) => {
    const n = name.toLowerCase();
    
    // READ Operations (Blue)
    if (n.includes('find') || n.includes('get') || n.includes('search')) {
        return { 
            icon: <MagnifyingGlassIcon className="w-3.5 h-3.5" />, 
            label: 'Reading Database...',
            completedLabel: 'Read Complete',
            textClass: 'text-sky-600 dark:text-sky-400',
            bgClass: 'bg-sky-50 dark:bg-sky-500/10',
            borderClass: 'border-sky-100 dark:border-sky-500/20',
            type: 'READ'
        };
    }
    // WRITE Operations (Green)
    if (n.includes('create') || n.includes('add')) {
        return { 
            icon: <PlusIcon className="w-3.5 h-3.5" />, 
            label: 'Writing to File...',
            completedLabel: 'Written',
            textClass: 'text-emerald-600 dark:text-emerald-400',
            bgClass: 'bg-emerald-50 dark:bg-emerald-500/10',
            borderClass: 'border-emerald-100 dark:border-emerald-500/20',
            type: 'WRITE'
        };
    }
    // UPDATE Operations (Amber)
    if (n.includes('update') || n.includes('replace') || n.includes('move') || n.includes('apply')) {
        return { 
            icon: <PencilSquareIcon className="w-3.5 h-3.5" />, 
            label: 'Updating Record...',
            completedLabel: 'Updated',
            textClass: 'text-amber-600 dark:text-amber-400',
            bgClass: 'bg-amber-50 dark:bg-amber-500/10',
            borderClass: 'border-amber-100 dark:border-amber-500/20',
            type: 'UPDATE'
        };
    }
    // DELETE Operations (Red)
    if (n.includes('delete')) {
        return { 
            icon: <TrashIcon className="w-3.5 h-3.5" />, 
            label: 'Deleting Record...',
            completedLabel: 'Deleted',
            textClass: 'text-rose-600 dark:text-rose-400',
            bgClass: 'bg-rose-50 dark:bg-rose-500/10',
            borderClass: 'border-rose-100 dark:border-rose-500/20',
            type: 'DELETE'
        };
    }
    // DEFAULT (Indigo)
    return { 
        icon: <BoltIcon className="w-3.5 h-3.5" />, 
        label: 'Executing System Tool...',
        completedLabel: 'Executed',
        textClass: 'text-indigo-600 dark:text-indigo-400',
        bgClass: 'bg-indigo-50 dark:bg-indigo-500/10',
        borderClass: 'border-indigo-100 dark:border-indigo-500/20',
        type: 'SYSTEM'
    };
};

const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ content }) => {
    const { name, args, result, status } = content;
    const [isExpanded, setIsExpanded] = useState(status === 'error'); 
    const { setActiveNoteId } = useStoreContext();
    const { setView } = useUIContext();
    
    useEffect(() => {
        if (status === 'error') setIsExpanded(true);
    }, [status]);

    const config = getToolConfig(name);

    // Function to render a concise summary of args
    const renderArgsSummary = () => {
        if (args.title) return `"${args.title}"`;
        if (args.query) return `"${args.query}"`;
        if (args.noteId) return `ID: ${args.noteId.slice(0, 8)}...`;
        return '';
    };

    // --- Special High-Visibility Card for Major Create/Update Actions ---
    if (status === 'complete' && result?.success && (name === 'createNote' || name === 'updateNote' || name === 'createTemplateFromNote')) {
        const title = args.title || result.templateTitle || (name === 'updateNote' ? 'Note Updated' : "Untitled Note");
        const id = result.noteId;

        return (
            <div className={`group relative flex items-center justify-between p-3 my-3 rounded-lg border ${config.borderClass} ${config.bgClass} shadow-sm transition-all hover:shadow-md overflow-hidden`}>
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.textClass.replace('text-', 'bg-')}`} />
                
                <div className="flex items-center gap-3 min-w-0 pl-2">
                    <div className={`p-1.5 rounded-md bg-white dark:bg-zinc-800 ${config.textClass} shadow-sm border border-black/5 dark:border-white/5`}>
                        {config.icon}
                    </div>
                    <div className="min-w-0">
                        <div className={`text-[10px] font-bold uppercase tracking-wider ${config.textClass} opacity-80`}>
                            {config.completedLabel}
                        </div>
                        <div className="text-sm font-bold text-light-text dark:text-dark-text truncate">
                            {title}
                        </div>
                    </div>
                </div>
                {id && (
                    <button 
                        onClick={() => { setActiveNoteId(id); setView('NOTES'); }}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 rounded-md text-xs font-semibold text-light-text dark:text-dark-text hover:text-light-primary dark:hover:text-dark-primary hover:shadow-sm transition-all border border-black/5 dark:border-white/10"
                    >
                        Open <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                    </button>
                )}
            </div>
        );
    }

    // --- Standard Terminal-Style Log for Other Actions ---
    return (
        <div className="my-1.5 font-mono text-xs">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-full flex items-center gap-2 p-1.5 rounded-md transition-all hover:bg-light-ui/80 dark:hover:bg-zinc-800/80 group border border-transparent ${isExpanded ? 'bg-light-ui dark:bg-zinc-800' : ''} ${status === 'error' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' : ''}`}
            >
                {/* Status Indicator */}
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    {status === 'pending' ? (
                        <div className={`w-2.5 h-2.5 border-2 border-t-transparent rounded-full animate-spin ${config.textClass.replace('text-', 'border-')}`} />
                    ) : status === 'error' ? (
                        <ExclamationCircleIcon className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                        <div className={`${config.textClass} opacity-70`}>{config.icon}</div>
                    )}
                </div>

                <div className="flex-1 text-left min-w-0 flex items-center gap-2">
                    <span className={`font-semibold ${status === 'pending' ? config.textClass : 'text-light-text/70 dark:text-dark-text/70'}`}>
                        {name}
                    </span>
                    <span className="text-light-text/40 dark:text-dark-text/40 truncate">
                        {renderArgsSummary()}
                    </span>
                </div>

                {status === 'complete' && !isExpanded && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity px-2">OK</span>
                )}
                
                {status === 'error' && (
                    <span className="text-[10px] font-bold text-red-500 px-2">ERR</span>
                )}

                <ChevronDownIcon className={`w-3 h-3 text-light-text/30 dark:text-dark-text/30 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Expanded Details */}
            <div 
                className={`grid transition-all duration-200 ease-in-out ${
                    isExpanded ? 'grid-rows-[1fr] opacity-100 mt-1 mb-2' : 'grid-rows-[0fr] opacity-0'
                }`}
            >
                <div className="overflow-hidden">
                    <div className="ml-7 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-light-border/50 dark:border-zinc-800 text-[10px] leading-relaxed relative">
                        {/* Decorative line connector */}
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-light-border dark:bg-zinc-800 -ml-3.5" />
                        
                        <div className="mb-2">
                            <span className="text-light-text/40 dark:text-dark-text/40 font-bold uppercase tracking-wider block mb-1">Input</span>
                            <pre className="text-light-text/70 dark:text-dark-text/70 whitespace-pre-wrap font-mono break-all bg-white dark:bg-zinc-900 p-2 rounded border border-light-border/50 dark:border-zinc-800">
                                {JSON.stringify(args, null, 2)}
                            </pre>
                        </div>
                        {result && (
                            <div>
                                <span className="text-light-text/40 dark:text-dark-text/40 font-bold uppercase tracking-wider block mb-1">Output</span>
                                <pre className={`whitespace-pre-wrap font-mono break-all p-2 rounded border border-light-border/50 dark:border-zinc-800 bg-white dark:bg-zinc-900 ${result.success === false ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {JSON.stringify(result, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ToolCallDisplay;
