import React from 'react';
import { useUIContext } from '../context/AppContext';
import { Cog6ToothIcon, SparklesIcon } from './Icons';

const ApiKeyIndicator: React.FC = () => {
    const { openSettings } = useUIContext();

    return (
        <div className="bg-yellow-100 dark:bg-yellow-900/30 border-b border-yellow-300 dark:border-yellow-700/50 py-2 px-4 text-center text-sm text-yellow-800 dark:text-yellow-200 flex-shrink-0 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5" />
                <span>AI features are disabled. Please add your Gemini API key.</span>
            </div>
            <button
                onClick={openSettings}
                className="flex items-center gap-1.5 font-semibold underline hover:text-yellow-900 dark:hover:text-yellow-100"
            >
                <Cog6ToothIcon className="w-4 h-4" />
                Open Settings
            </button>
        </div>
    );
};

export default ApiKeyIndicator;
