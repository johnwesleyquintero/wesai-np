
import React, { useState, useEffect } from 'react';
import { 
    Cog6ToothIcon, CheckIcon, ExclamationCircleIcon, ChevronDownIcon, 
    MagnifyingGlassIcon, PencilSquareIcon, TrashIcon, FolderIcon, 
    DocumentDuplicateIcon, ServerStackIcon, ArrowUturnRightIcon,
    ArrowTopRightOnSquareIcon
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

const formatValue = (value: any): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null) return JSON.stringify(value, null, 2);
    return String(value);
};

const getToolConfig = (name: string) => {
    const n = name.toLowerCase();
    // READ Operations
    if (n.includes('find') || n.includes('get') || n.includes('search')) {
        return { 
            icon: <MagnifyingGlassIcon className="w-4 h-4" />, 
            label: 'System Search',
            color: 'text-sky-500 dark:text-sky-400',
            bgColor: 'bg-sky-500/10 dark:bg-sky-500/20',
            borderColor: 'border-sky-200 dark:border-sky-800',
            type: 'READ'
        };
    }
    // WRITE Operations
    if (n.includes('create') || n.includes('add')) {
        return { 
            icon: <PencilSquareIcon className="w-4 h-4" />, 
            label: 'Write Operation',
            color: 'text-emerald-500 dark:text-emerald-400',
            bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/20',
            borderColor: 'border-emerald-200 dark:border-emerald-800',
            type: 'WRITE'
        };
    }
    // UPDATE Operations
    if (n.includes('update') || n.includes('replace') || n.includes('move') || n.includes('apply')) {
        return { 
            icon: <ServerStackIcon className="w-4 h-4" />, 
            label: 'System Update',
            color: 'text-amber-500 dark:text-amber-400',
            bgColor: 'bg-amber-500/10 dark:bg-amber-500/20',
            borderColor: 'border-amber-200 dark:border-amber-800',
            type: 'UPDATE'
        };
    }
    // DELETE Operations
    if (n.includes('delete')) {
        return { 
            icon: <TrashIcon className="w-4 h-4" />, 
            label: 'Delete Resource',
            color: 'text-rose-500 dark:text-rose-400',
            bgColor: 'bg-rose-500/10 dark:bg-rose-500/20',
            borderColor: 'border-rose-200 dark:border-rose-800',
            type: 'DELETE'
        };
    }
    // TEMPLATE Operations
    if (n.includes('template')) {
        return { 
            icon: <DocumentDuplicateIcon className="w-4 h-4" />, 
            label: 'Template Action',
            color: 'text-purple-500 dark:text-purple-400',
            bgColor: 'bg-purple-500/10 dark:bg-purple-500/20',
            borderColor: 'border-purple-200 dark:border-purple-800',
            type: 'TEMPLATE'
        };
    }
    // DEFAULT
    return { 
        icon: <Cog6ToothIcon className="w-4 h-4" />, 
        label: 'System Operation',
        color: 'text-slate-500 dark:text-slate-400',
        bgColor: 'bg-slate-500/10 dark:bg-slate-500/20',
        borderColor: 'border-slate-200 dark:border-slate-700',
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

    const getStatusStyles = () => {
        switch (status) {
            case 'pending': return {
                containerBorder: `border-transparent ring-1 ring-inset ${toolConfig.color} ring-opacity-30`,
                icon: <div className={`w-3 h-3 border-2 ${toolConfig.borderColor} border-t-current rounded-full animate-spin ${toolConfig.color}`} />,
                badge: 'animate-pulse'
            };
            case 'complete': return {
                containerBorder: `border-l-4 ${toolConfig.borderColor} border-y-transparent border-r-transparent bg-light-ui/20 dark:bg-dark-ui/20`,
                icon: <CheckIcon className={`w-4 h-4 ${toolConfig.color}`} />,
                badge: ''
            };
            case 'error': return {
                containerBorder: 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10',
                icon: <ExclamationCircleIcon className="w-4 h-4 text-red-500" />,
                badge: ''
            };
        }
    };

    const statusStyles = getStatusStyles();

    // Specific renderer for "Create/Update Note" success state - High Visibility Card
    if (status === 'complete' && result?.success && (name === 'createNote' || name === 'updateNote' || name === 'createTemplateFromNote')) {
        const title = args.title || result.templateTitle || "Untitled Note";
        const id = result.noteId;

        return (
            <div className={`rounded-md border ${toolConfig.borderColor} ${toolConfig.bgColor} overflow-hidden my-3 shadow-sm transition-all hover:shadow-md`}>
                <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-md bg-white/80 dark:bg-black/40 ${toolConfig.color}`}>
                            {toolConfig.icon}
                        </div>
                        <div className="min-w-0">
                            <div className={`text-[10px] font-bold uppercase tracking-wider ${toolConfig.color} opacity-90`}>
                                {name === 'createNote' ? 'Created New Note' : name === 'updateNote' ? 'Updated Note' : 'Created Template'}
                            </div>
                            <div className="text-sm font-bold text-light-text dark:text-dark-text mt-0.5 truncate">
                                {title}
                            </div>
                        </div>
                    </div>
                    {id && (
                        <button 
                            onClick={() => { setActiveNoteId(id); setView('NOTES'); }}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-black/30 rounded-md text-xs font-semibold text-light-text dark:text-dark-text hover:bg-light-ui hover:text-light-primary dark:hover:bg-black/50 dark:hover:text-dark-primary transition-colors border border-transparent hover:border-light-border dark:hover:border-dark-border"
                        >
                            Open <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Default Tool Renderer (Log Style)
    return (
        <div className={`group rounded-md overflow-hidden transition-all duration-300 my-2 text-sm border border-light-border/60 dark:border-dark-border/60 ${status === 'pending' ? 'bg-light-background dark:bg-dark-background shadow-md' : 'bg-light-ui/30 dark:bg-dark-ui/30'}`}>
            {/* Header */}
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-full flex items-center justify-between p-2.5 text-left transition-colors hover:bg-light-ui dark:hover:bg-dark-ui ${status === 'error' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex-shrink-0 ${toolConfig.color}`}>
                        {status === 'pending' ? statusStyles.icon : toolConfig.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className={`font-mono text-xs ${status === 'pending' ? 'text-light-text dark:text-dark-text' : 'text-light-text/60 dark:text-dark-text/60'}`}>
                            {name}
                        </span>
                        {status === 'pending' && (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-light-primary dark:text-dark-primary animate-pulse">
                                Executing...
                            </span>
                        )}
                        {status === 'error' && (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-red-500">
                                Failed
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <ChevronDownIcon className={`w-3 h-3 text-light-text/40 dark:text-dark-text/40 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Collapsible Details */}
            <div 
                className={`transition-all duration-200 ease-in-out overflow-hidden bg-light-ui/50 dark:bg-[#0d1117] ${
                    isExpanded ? 'max-h-[500px] opacity-100 border-t border-light-border/50 dark:border-dark-border/50' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="p-3 text-xs font-mono space-y-3">
                    {/* Parameters */}
                    <div>
                        <div className="flex items-center gap-1 text-light-text/40 dark:text-dark-text/40 mb-1">
                            <ArrowUturnRightIcon className="w-3 h-3" />
                            <span className="uppercase font-bold text-[10px] tracking-wider">Input</span>
                        </div>
                        <div className="pl-4 border-l-2 border-light-border dark:border-dark-border">
                            {Object.entries(args).map(([key, value]) => (
                                <div key={key} className="flex flex-col sm:flex-row sm:gap-2 mb-1 last:mb-0">
                                    <span className="text-light-primary dark:text-dark-primary shrink-0">{key}:</span>
                                    <span className="text-light-text/80 dark:text-dark-text/80 break-all whitespace-pre-wrap">{formatValue(value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Result */}
                    {result && (
                        <div>
                            <div className="flex items-center gap-1 text-light-text/40 dark:text-dark-text/40 mb-1">
                                <ArrowUturnRightIcon className="w-3 h-3 rotate-180 scale-x-[-1]" />
                                <span className="uppercase font-bold text-[10px] tracking-wider">Output</span>
                            </div>
                            <div className={`pl-4 border-l-2 ${result.success === false ? 'border-red-500' : 'border-green-500/50'} text-light-text/80 dark:text-dark-text/80 break-all whitespace-pre-wrap`}>
                                {result.success === false && result.error ? (
                                    <span className="text-red-500 font-bold">Error: {result.error}</span>
                                ) : (
                                    JSON.stringify(result, null, 2)
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ToolCallDisplay;
