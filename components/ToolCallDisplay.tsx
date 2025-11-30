import React, { useState, useEffect } from 'react';
import { 
    Cog6ToothIcon, CheckIcon, ExclamationCircleIcon, ChevronDownIcon, 
    MagnifyingGlassIcon, PencilSquareIcon, TrashIcon, FolderIcon, 
    DocumentDuplicateIcon, ServerStackIcon, ArrowUturnRightIcon
} from './Icons';

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
    if (n.includes('find') || n.includes('get') || n.includes('search')) {
        return { 
            icon: <MagnifyingGlassIcon className="w-4 h-4" />, 
            label: 'Searching Knowledge Base',
            color: 'text-blue-500 dark:text-blue-400',
            bgColor: 'bg-blue-500/10'
        };
    }
    if (n.includes('create') || n.includes('add')) {
        return { 
            icon: <PencilSquareIcon className="w-4 h-4" />, 
            label: 'Creating System Resource',
            color: 'text-green-500 dark:text-green-400',
            bgColor: 'bg-green-500/10'
        };
    }
    if (n.includes('update') || n.includes('replace') || n.includes('move')) {
        return { 
            icon: <ServerStackIcon className="w-4 h-4" />, 
            label: 'Updating System Context',
            color: 'text-orange-500 dark:text-orange-400',
            bgColor: 'bg-orange-500/10'
        };
    }
    if (n.includes('delete')) {
        return { 
            icon: <TrashIcon className="w-4 h-4" />, 
            label: 'Removing Resource',
            color: 'text-red-500 dark:text-red-400',
            bgColor: 'bg-red-500/10'
        };
    }
    if (n.includes('template')) {
        return { 
            icon: <DocumentDuplicateIcon className="w-4 h-4" />, 
            label: 'Managing Templates',
            color: 'text-purple-500 dark:text-purple-400',
            bgColor: 'bg-purple-500/10'
        };
    }
    return { 
        icon: <Cog6ToothIcon className="w-4 h-4" />, 
        label: 'System Operation',
        color: 'text-gray-500 dark:text-gray-400',
        bgColor: 'bg-gray-500/10'
    };
};

const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ content }) => {
    const { name, args, result, status } = content;
    const [isExpanded, setIsExpanded] = useState(status === 'error'); 
    
    // Auto-collapse when status changes to complete, auto-expand on error
    useEffect(() => {
        if (status === 'error') setIsExpanded(true);
    }, [status]);

    const toolConfig = getToolConfig(name);

    const getStatusStyles = () => {
        switch (status) {
            case 'pending': return {
                border: 'border-light-primary/30 dark:border-dark-primary/30',
                icon: <div className="w-3.5 h-3.5 border-2 border-light-primary dark:border-dark-primary border-t-transparent rounded-full animate-spin" />,
                text: 'text-light-primary dark:text-dark-primary'
            };
            case 'complete': return {
                border: 'border-green-500/30',
                icon: <CheckIcon className="w-4 h-4 text-green-500" />,
                text: 'text-green-600 dark:text-green-400'
            };
            case 'error': return {
                border: 'border-red-500/30',
                icon: <ExclamationCircleIcon className="w-4 h-4 text-red-500" />,
                text: 'text-red-600 dark:text-red-400'
            };
        }
    };

    const statusStyles = getStatusStyles();

    return (
        <div className={`group rounded-lg border bg-light-background dark:bg-dark-background overflow-hidden transition-all duration-300 my-2 ${statusStyles.border}`}>
            {/* Header */}
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-light-ui/30 dark:hover:bg-dark-ui/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md ${toolConfig.bgColor} ${toolConfig.color}`}>
                        {toolConfig.icon}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-light-text/50 dark:text-dark-text/50">
                                System Action
                            </span>
                            {status === 'pending' && (
                                <span className="flex items-center gap-1 text-[10px] font-medium text-light-primary dark:text-dark-primary bg-light-primary/10 dark:bg-dark-primary/10 px-1.5 py-0.5 rounded-full animate-pulse">
                                    Processing
                                </span>
                            )}
                        </div>
                        <div className="text-sm font-semibold text-light-text/90 dark:text-dark-text/90 mt-0.5">
                            {toolConfig.label}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {statusStyles.icon}
                    <div className={`p-1 rounded hover:bg-light-ui dark:hover:bg-dark-ui transition-colors ${isExpanded ? 'bg-light-ui dark:bg-dark-ui' : ''}`}>
                        <ChevronDownIcon className={`w-4 h-4 text-light-text/40 dark:text-dark-text/40 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                </div>
            </button>

            {/* Collapsible Details (The "Terminal" View) */}
            <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isExpanded ? 'max-h-[500px] opacity-100 border-t border-light-border/50 dark:border-dark-border/50' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="p-3 bg-light-ui/20 dark:bg-dark-ui/20 text-xs font-mono space-y-3">
                    {/* Input Args */}
                    <div>
                        <div className="flex items-center gap-1.5 text-light-text/50 dark:text-dark-text/50 mb-1.5 px-1">
                            <ArrowUturnRightIcon className="w-3 h-3" />
                            <span className="uppercase tracking-wider font-semibold">Parameters</span>
                        </div>
                        <div className="bg-light-background dark:bg-[#0d1117] rounded-md border border-light-border dark:border-dark-border p-2.5 overflow-x-auto shadow-sm">
                            <table className="w-full text-left">
                                <tbody>
                                    {Object.entries(args).map(([key, value]) => (
                                        <tr key={key} className="align-top">
                                            <td className="pr-3 py-0.5 text-light-primary dark:text-dark-primary whitespace-nowrap opacity-80">{key}:</td>
                                            <td className="py-0.5 text-light-text/80 dark:text-dark-text/80 break-all">{formatValue(value)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Output Result */}
                    {result && (
                        <div>
                            <div className="flex items-center gap-1.5 text-light-text/50 dark:text-dark-text/50 mb-1.5 px-1">
                                <ArrowUturnRightIcon className="w-3 h-3 rotate-180 scale-x-[-1]" /> {/* Out arrow hack */}
                                <span className="uppercase tracking-wider font-semibold">Return Value</span>
                            </div>
                            <div className={`rounded-md border p-2.5 overflow-x-auto max-h-40 shadow-sm ${
                                result.success === false 
                                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-300' 
                                    : 'bg-light-background dark:bg-[#0d1117] border-light-border dark:border-dark-border text-light-text/70 dark:text-dark-text/70'
                            }`}>
                                {result.success === false && result.error ? (
                                    <span className="font-semibold">Error: {result.error}</span>
                                ) : (
                                    <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
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