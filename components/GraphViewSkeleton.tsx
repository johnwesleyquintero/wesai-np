import React from 'react';
import { NetworkIcon } from './Icons';

const GraphViewSkeleton: React.FC = () => {
    return (
        <div className="flex-1 flex items-center justify-center h-full animate-pulse">
            <div className="flex flex-col items-center text-light-text/40 dark:text-dark-text/40">
                <NetworkIcon className="w-16 h-16 mb-4" />
                <p className="font-semibold">Loading Knowledge Graph...</p>
            </div>
        </div>
    );
};

export default GraphViewSkeleton;