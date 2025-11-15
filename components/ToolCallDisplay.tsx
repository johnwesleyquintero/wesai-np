import React from 'react';
import { Cog6ToothIcon, CheckIcon, ExclamationCircleIcon } from './Icons';

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
        return `"${value.length > 100 ? value.substring(0, 100) + '...' : value}"`;
    }
    if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
    }
    return String(value);
};

const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ content }) => {
    const { name, args, result, status } = content;

    const renderStatus = () => {
        switch (status) {
            case 'pending':
                return (
                    <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        <span>In progress...</span>
                    </div>
                );
            case 'complete':
                 return (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckIcon className="w-4 h-4" />
                        <span>Complete</span>
                    </div>
                );
            case 'error':
                 return (
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <ExclamationCircleIcon className="w-4 h-4" />
                        <span>Error</span>
                    </div>
                );
        }
    };

    return (
        <div className="text-sm p-3 bg-light-ui/70 dark:bg-dark-ui/70 rounded-lg border border-light-border dark:border-dark-border font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-light-border dark:border-dark-border">
                <div className="flex items-center gap-2 font-semibold text-light-text dark:text-dark-text">
                    <Cog6ToothIcon className="w-4 h-4 text-light-primary dark:text-dark-primary" />
                    <span>Tool: {name}</span>
                </div>
                {renderStatus()}
            </div>
            
            <dl className="mt-2 space-y-2 text-xs">
                {Object.keys(args).length > 0 && (
                    <div>
                        <dt className="font-semibold text-light-text/70 dark:text-dark-text/70">Parameters:</dt>
                        <dd className="pl-4 mt-1">
                            <ul className="list-disc list-inside space-y-1">
                                {Object.entries(args).map(([key, value]) => (
                                    <li key={key}>
                                        <span className="font-medium text-light-text/90 dark:text-dark-text/90">{key}:</span> <span className="text-light-text/70 dark:text-dark-text/70">{formatValue(value)}</span>
                                    </li>
                                ))}
                            </ul>
                        </dd>
                    </div>
                )}
                {result && (
                     <div>
                        <dt className="font-semibold text-light-text/70 dark:text-dark-text/70">Result:</dt>
                        <dd className="pl-4 mt-1 text-light-text/90 dark:text-dark-text/90">
                           {result.success === false && result.error ? (
                                <span className="text-red-500">{result.error}</span>
                           ) : (
                                <pre className="text-xs whitespace-pre-wrap bg-light-background dark:bg-dark-background p-2 rounded-md">
                                    {JSON.stringify(result, null, 2)}
                                </pre>
                           )}
                        </dd>
                    </div>
                )}
            </dl>
        </div>
    );
};

export default ToolCallDisplay;
