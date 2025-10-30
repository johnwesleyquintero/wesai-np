import React, { useState, useRef } from 'react';
import { InlineAction } from '../types';
import { SparklesIcon, BoldIcon, ItalicIcon, CodeBracketIcon, LinkIcon, ChevronDownIcon } from './Icons';
import { useDynamicPosition } from '../hooks/useDynamicPosition';

interface SelectionData {
    rect: DOMRect;
}

interface InlineAiMenuProps {
    selection: SelectionData | null;
    onAction: (action: InlineAction) => void;
    onFormat: (format: 'bold' | 'italic' | 'code' | 'link') => void;
    isLoading: boolean;
    onClose: () => void;
    isApiKeyMissing: boolean;
    isAiEnabled: boolean;
}

const actionMap: { action: InlineAction; label: string }[] = [
    { action: 'fix', label: 'Fix Spelling & Grammar' },
    { action: 'shorten', label: 'Make Shorter' },
    { action: 'expand', label: 'Make Longer' },
    { action: 'simplify', label: 'Simplify Language' },
    { action: 'makeProfessional', label: 'Make Professional' },
    { action: 'makeCasual', label: 'Make Casual' },
];

const FormatButton: React.FC<{ onClick: () => void, 'aria-label': string, children: React.ReactNode }> = ({ onClick, children, ...props }) => (
    <button onClick={onClick} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors" {...props}>
        {children}
    </button>
);


const InlineAiMenu: React.FC<InlineAiMenuProps> = ({ selection, onAction, onFormat, isLoading, onClose, isApiKeyMissing, isAiEnabled }) => {
    const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const style = useDynamicPosition({
        anchorRect: selection?.rect || null,
        isOpen: !!selection && !isLoading,
        menuRef,
    });

    if (!selection) return null;

    const handleActionClick = (action: InlineAction) => {
        setIsAiMenuOpen(false);
        onAction(action);
    };

    const handleFormatClick = (format: 'bold' | 'italic' | 'code' | 'link') => {
        onFormat(format);
    };
    
    if (isLoading) {
        const loadingStyle: React.CSSProperties = {
            position: 'fixed',
            top: `${selection.rect.bottom + 8}px`,
            left: `${selection.rect.left}px`,
            zIndex: 50,
        };
        return (
            <div style={loadingStyle} className="bg-light-ui dark:bg-dark-ui p-2 rounded-full shadow-xl flex items-center animate-pulse">
                 <SparklesIcon className="w-5 h-5 text-light-primary dark:text-dark-primary"/>
            </div>
        )
    }

    return (
        <div ref={menuRef} style={style} onMouseDown={(e) => e.preventDefault()}>
            <div className="bg-light-background dark:bg-dark-background rounded-lg shadow-xl border border-light-border dark:border-dark-border animate-fade-in-down w-auto">
                <div className="flex justify-around items-center p-1">
                    <FormatButton onClick={() => handleFormatClick('bold')} aria-label="Bold"><BoldIcon /></FormatButton>
                    <FormatButton onClick={() => handleFormatClick('italic')} aria-label="Italic"><ItalicIcon /></FormatButton>
                    <FormatButton onClick={() => handleFormatClick('code')} aria-label="Code"><CodeBracketIcon /></FormatButton>
                    <FormatButton onClick={() => handleFormatClick('link')} aria-label="Link"><LinkIcon /></FormatButton>
                    {!isApiKeyMissing && isAiEnabled && <div className="w-px h-6 bg-light-border dark:border-dark-border mx-1" />}
                    {!isApiKeyMissing && isAiEnabled && (
                        <div className="relative">
                            <button 
                                onClick={() => setIsAiMenuOpen(prev => !prev)}
                                className="flex items-center gap-2 p-2 text-sm font-semibold hover:bg-light-ui dark:hover:bg-dark-ui rounded-md"
                            >
                                <SparklesIcon className="w-4 h-4 text-light-primary dark:text-dark-primary"/>
                                AI Assistant
                                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isAiMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                             {isAiMenuOpen && (
                                <div className="absolute top-full right-0 mt-1 py-1 w-48 bg-light-background dark:bg-dark-background rounded-lg shadow-xl border border-light-border dark:border-dark-border">
                                    {actionMap.map(({ action, label }) => (
                                        <button
                                            key={action}
                                            onClick={() => handleActionClick(action)}
                                            className="w-full text-left block px-3 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui transition-colors"
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InlineAiMenu;