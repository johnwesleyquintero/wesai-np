import React, { useState } from 'react';
import { SparklesIcon } from '../Icons';

interface AiMenuProps {
    onEnhance: (tone: string) => Promise<void>;
    onSummarize: () => Promise<void>;
    isDisabled: boolean;
}

const AiMenu: React.FC<AiMenuProps> = ({ onEnhance, onSummarize, isDisabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [customTone, setCustomTone] = useState('');
    const [isCustomTone, setIsCustomTone] = useState(false);

    const handleEnhanceClick = async (tone: string) => {
        setIsOpen(false);
        if (!tone.trim()) return;
        await onEnhance(tone);
        setCustomTone('');
        setIsCustomTone(false);
    };

    const handleSummarizeClick = async () => {
        setIsOpen(false);
        await onSummarize();
    };

    const tones = ["Professional", "Casual", "Poetic", "Concise", "Expanded"];

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(prev => !prev)} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed" disabled={isDisabled}>
                <SparklesIcon className="mr-0 sm:mr-1 text-light-primary dark:text-dark-primary" />
                <span className="hidden sm:inline">Enhance</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-light-background dark:bg-dark-background rounded-md shadow-lg border border-light-border dark:border-dark-border z-10">
                    {isCustomTone ? (
                        <div className="p-2">
                            <input type="text" placeholder="Enter custom tone..." value={customTone} onChange={(e) => setCustomTone(e.target.value)} className="w-full text-sm p-2 bg-light-ui dark:bg-dark-ui rounded-md border border-light-border dark:border-dark-border focus:ring-1 focus:ring-light-primary" />
                            <button onClick={() => handleEnhanceClick(customTone)} className="w-full text-left p-2 text-sm mt-1 rounded-md bg-light-primary text-white text-center">Enhance</button>
                            <button onClick={() => { setIsCustomTone(false); setCustomTone(''); }} className="w-full text-left p-2 text-sm mt-1 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui text-center">Back</button>
                        </div>
                    ) : (
                        <>
                            {tones.map(tone => <button key={tone} onClick={() => handleEnhanceClick(tone)} className="w-full text-left block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui">Rewrite as {tone}</button>)}
                            <div className="border-t border-light-border dark:border-dark-border my-1"></div>
                            <button onClick={() => setIsCustomTone(true)} className="w-full text-left block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui">Custom Rewrite...</button>
                            <div className="border-t border-light-border dark:border-dark-border my-1"></div>
                            <button onClick={handleSummarizeClick} className="w-full text-left block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui">Summarize & Find Actions</button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default AiMenu;