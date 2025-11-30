
import React, { useState } from 'react';
import { Cog6ToothIcon, CheckIcon, ExclamationCircleIcon, ChevronDownIcon, MagnifyingGlassIcon, PencilSquareIcon, TrashIcon, FolderIcon, DocumentDuplicateIcon } from './Icons';

interface ToolCallDisplayProps {
    content: {
        name: string;
        args: any;
        result?: any;
        status: 'pending' | 'complete' | 'error';
    };
}

const formatValue = (value: any): string => {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value, null, 2);
    }
    return String(value);
};

const getToolIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('find') || n.includes('get')) return <MagnifyingGlassIcon className="w-4 h-4" />;
    if (n.includes('create') || n.includes('update') || n.includes('replace')) return <PencilSquareIcon className="w-4 h-4" />;
    if (n.includes('delete')) return <TrashIcon className="w-4 h-4" />;
    if (n.includes('collection') || n.includes('move')) return <FolderIcon className="w-4 h-4" />;
    if (n.includes('template')) return <DocumentDuplicateIcon className="w-4 h-4" />;
    return <Cog6ToothIcon className="w-4 h-4" />;
};

const getToolLabel = (name: string) => {
    // Convert camelCase to Title Case with spaces
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
};

const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ content }) => {
    const { name, args, result, status } = content;
    const [isExpanded, setIsExpanded] = useState(status === 'error'); // Auto-expand on error

    const toggleExpand = () => setIsExpanded(!isExpanded);

    const getStatusColor = () => {
        switch (status) {
            case 'pending': return 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-900/10';
            case 'complete': return 'border-green-500/50 bg-green-50/50 dark:bg-green-900/10';
            case 'error': return 'border-red-500/50 bg-red-50/50 dark:bg-red-900/10';
            default: return 'border-light-border dark:border-dark-border';
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'pending': return <div className="w-3.5 h-3.5 border-2 border-yellow-600 dark:border-yellow-400 border-t-transparent rounded-full animate-spin" />;
            case 'complete': return <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />;
            case 'error': return <ExclamationCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />;
        }
    };

    return (
        <div className={`rounded-md border-l-4 ${getStatusColor()} border-y border-r border-light-border dark:border-dark-border overflow-hidden transition-all duration-300 my-2`}>
            {/* Header / Summary */}
            <button 
                onClick={toggleExpand}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-light-ui/50 dark:hover:bg-dark-ui/50 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md bg-light-ui dark:bg-dark-ui text-light-text/70 dark:text-dark-text/70`}>
                        {getToolIcon(name)}
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-light-text/50 dark:text-dark-text/50 flex items-center gap-2">
                            System Action
                            {status === 'pending' && <span className="text-yellow-600 dark:text-yellow-400 animate-pulse text-[10px] lowercase">• running</span>}
                        </div>
                        <div className="text-sm font-medium text-light-text dark:text-dark-text">
                            {getToolLabel(name)}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {getStatusIcon()}
                    <ChevronDownIcon className={`w-4 h-4 text-light-text/40 dark:text-dark-text/40 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="px-3 pb-3 pt-0 bg-light-ui/30 dark:bg-dark-ui/30 border-t border-light-border/50 dark:border-dark-border/50">
                    <div className="mt-3 grid gap-3">
                        {/* Parameters */}
                        <div className="text-xs">
                            <span className="font-semibold text-light-text/60 dark:text-dark-text/60 uppercase tracking-wider mb-1 block">Input Parameters</span>
                            <div className="bg-light-background dark:bg-dark-background rounded border border-light-border dark:border-dark-border p-2 font-mono text-light-text/80 dark:text-dark-text/80 overflow-x-auto">
                                <table className="w-full text-left">
                                    <tbody>
                                        {Object.entries(args).map(([key, value]) => (
                                            <tr key={key} className="align-top">
                                                <td className="pr-4 text-light-primary dark:text-dark-primary whitespace-nowrap">{key}:</td>
                                                <td className="break-all whitespace-pre-wrap">{formatValue(value)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Result */}
                        {result && (
                            <div className="text-xs">
                                <span className="font-semibold text-light-text/60 dark:text-dark-text/60 uppercase tracking-wider mb-1 block">Execution Result</span>
                                <div className={`rounded border p-2 font-mono overflow-x-auto max-h-40 overflow-y-auto ${
                                    result.success === false 
                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' 
                                        : 'bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border text-light-text/80 dark:text-dark-text/80'
                                }`}>
                                    {result.success === false && result.error ? (
                                        <span>Error: {result.error}</span>
                                    ) : (
                                        <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ToolCallDisplay;
