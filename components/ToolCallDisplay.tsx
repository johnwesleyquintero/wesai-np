
import React, { useState, useEffect } from 'react';
import { 
    Cog6ToothIcon, CheckIcon, ExclamationCircleIcon, ChevronDownIcon, 
    MagnifyingGlassIcon, PencilSquareIcon, TrashIcon, 
    DocumentDuplicateIcon, ServerStackIcon, ArrowUturnRightIcon,
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
    // READ Operations
    if (n.includes('find') || n.includes('get') || n.includes('search')) {
        return { 
            icon: <MagnifyingGlassIcon className="w-4 h-4" />, 
            label: 'Searching Knowledge Base...',
            completedLabel: 'Search Complete',
            color: 'text-sky-600 dark:text-sky-400',
            bgColor: 'bg-sky-50 dark:bg-sky-900/10',
            borderColor: 'border-sky-200 dark:border-sky-800',
            ringColor: 'ring-sky-500',
            type: 'READ'
        };
    }
    // WRITE Operations
    if (n.includes('create') || n.includes('add')) {
        return { 
            icon: <PlusIcon className="w-4 h-4" />, 
            label: 'Creating...',
            completedLabel: 'Created',
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-50 dark:bg-emerald-900/10',
            borderColor: 'border-emerald-200 dark:border-emerald-800',
            ringColor: 'ring-emerald-500',
            type: 'WRITE'
        };
    }
    // UPDATE Operations
    if (n.includes('update') || n.includes('replace') || n.includes('move') || n.includes('apply')) {
        return { 
            icon: <PencilSquareIcon className="w-4 h-4" />, 
            label: 'Updating...',
            completedLabel: 'Updated',
            color: 'text-amber-600 dark:text-amber-400',
            bgColor: 'bg-amber-50 dark:bg-amber-900/10',
            borderColor: 'border-amber-200 dark:border-amber-800',
            ringColor: 'ring-amber-500',
            type: 'UPDATE'
        };
    }
    // DELETE Operations
    if (n.includes('delete')) {
        return { 
            icon: <TrashIcon className="w-4 h-4" />, 
            label: 'Deleting...',
            completedLabel: 'Deleted',
            color: 'text-rose-600 dark:text-rose-400',
            bgColor: 'bg-rose-50 dark:bg-rose-900/10',
            borderColor: 'border-rose-200 dark:border-rose-800',
            ringColor: 'ring-rose-500',
            type: 'DELETE'
        };
    }
    // DEFAULT
    return { 
        icon: <BoltIcon className="w-4 h-4" />, 
        label: 'Processing...',
        completedLabel: 'Executed',
        color: 'text-indigo-600 dark:text-indigo-400',
        bgColor: 'bg-indigo-50 dark:bg-indigo-900/10',
        borderColor: 'border-indigo-200 dark:border-indigo-800',
        ringColor: 'ring-indigo-500',
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

    const toolConfig = getToolConfig(name);

    // --- High Visibility Card for Major Actions (Create/Update) ---
    if (status === 'complete' && result?.success && (name === 'createNote' || name === 'updateNote' || name === 'createTemplateFromNote')) {
        const title = args.title || result.templateTitle || (name === 'updateNote' ? 'Note Updated' : "Untitled Note");
        const id = result.noteId;

        return (
            <div className={`group relative flex items-center justify-between p-3 my-3 rounded-lg border ${toolConfig.borderColor} ${toolConfig.bgColor} shadow-sm transition-all hover:shadow-md overflow-hidden`}>
                {/* Decorative background accent */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${toolConfig.color.replace('text-', 'bg-')}`} />
                
                <div className="flex items-center gap-3 min-w-0 pl-2">
                    <div className={`p-2 rounded-full bg-white dark:bg-zinc-800 ${toolConfig.color} shadow-sm border border-light-border/10`}>
                        {toolConfig.icon}
                    </div>
                    <div className="min-w-0">
                        <div className={`text-[10px] font-bold uppercase tracking-wider ${toolConfig.color} opacity-90`}>
                            {toolConfig.completedLabel}
                        </div>
                        <div className="text-sm font-bold text-light-text dark:text-dark-text truncate">
                            {title}
                        </div>
                    </div>
                </div>
                {id && (
                    <button 
                        onClick={() => { setActiveNoteId(id); setView('NOTES'); }}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 rounded-md text-xs font-semibold text-light-text dark:text-dark-text hover:text-light-primary dark:hover:text-dark-primary hover:shadow-sm transition-all border border-light-border/50 dark:border-dark-border/50"
                    >
                        Open <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                    </button>
                )}
            </div>
        );
    }

    // --- Standard "Step" Renderer for other actions (Search, Read, etc) ---
    return (
        <div className="my-2 text-sm font-sans">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-full flex items-center gap-3 p-2 rounded-md transition-all hover:bg-light-ui/50 dark:hover:bg-dark-ui/30 group border border-transparent ${isExpanded ? 'bg-light-ui/30 dark:bg-dark-ui/20' : ''} ${status === 'error' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' : ''}`}
            >
                {/* Status Icon / Spinner */}
                <div className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md border ${status === 'pending' ? 'border-transparent' : 'border-light-border dark:border-dark-border'} bg-white dark:bg-zinc-800 shadow-sm`}>
                    {status === 'pending' ? (
                        <div className={`w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin ${toolConfig.color.replace('text-', 'border-')}`} />
                    ) : status === 'error' ? (
                        <ExclamationCircleIcon className="w-4 h-4 text-red-500" />
                    ) : (
                        <div className={toolConfig.color}>{toolConfig.icon}</div>
                    )}
                </div>

                <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`font-semibold text-xs ${status === 'pending' ? toolConfig.color : 'text-light-text dark:text-dark-text'}`}>
                            {status === 'pending' ? toolConfig.label : (toolConfig.type === 'READ' ? `Searched for: "${args.query || args.noteId}"` : toolConfig.completedLabel)}
                        </span>
                        {status === 'error' && <span className="text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 rounded">FAILED</span>}
                    </div>
                    {/* Subtle details for read operations */}
                    {toolConfig.type === 'READ' && result && (
                        <div className="text-[10px] text-light-text/50 dark:text-dark-text/50 truncate mt-0.5 font-mono">
                            {Array.isArray(result.notes) ? `Found ${result.notes.length} matches` : 'Data retrieved'}
                        </div>
                    )}
                </div>

                <ChevronDownIcon className={`w-3 h-3 text-light-text/30 dark:text-dark-text/30 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Collapsible Details (JSON view) */}
            <div 
                className={`ml-5 pl-4 border-l-2 border-light-border/50 dark:border-dark-border/50 overflow-hidden transition-all duration-300 ${
                    isExpanded ? 'max-h-[500px] opacity-100 mt-1 mb-3' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-md text-[11px] font-mono border border-light-border/50 dark:border-zinc-800">
                    <div className="mb-2">
                        <span className="text-[10px] uppercase font-bold text-light-text/40 dark:text-dark-text/40">Input Arguments</span>
                        <div className="text-light-text/80 dark:text-dark-text/80 break-all whitespace-pre-wrap mt-1">
                            {JSON.stringify(args, null, 2)}
                        </div>
                    </div>
                    {result && (
                        <div>
                            <span className="text-[10px] uppercase font-bold text-light-text/40 dark:text-dark-text/40">Output Result</span>
                            <div className={`mt-1 break-all whitespace-pre-wrap ${result.success === false ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {JSON.stringify(result, null, 2)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ToolCallDisplay;
