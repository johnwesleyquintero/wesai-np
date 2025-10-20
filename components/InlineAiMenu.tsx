import React, { useState } from 'react';
import { InlineAction } from '../services/geminiService';
import { SparklesIcon, XMarkIcon } from './Icons';

interface SelectionData {
    rect: DOMRect;
}

interface InlineAiMenuProps {
    selection: SelectionData | null;
    onAction: (action: InlineAction) => void;
    isLoading: boolean;
    onClose: () => void;
}

const actionMap: { action: InlineAction; label: string }[] = [
    { action: 'fix', label: 'Fix Spelling & Grammar' },
    { action: 'shorten', label: 'Make Shorter' },
    { action: 'expand', label: 'Make Longer' },
    { action: 'simplify', label: 'Simplify Language' },
    { action: 'makeProfessional', label: 'Make Professional' },
    { action: 'makeCasual', label: 'Make Casual' },
];

const InlineAiMenu: React.FC<InlineAiMenuProps> = ({ selection, onAction, isLoading, onClose }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    if (!selection) return null;

    const handleActionClick = (action: InlineAction) => {
        setIsMenuOpen(false);
        onAction(action);
    };
    
    // Position the menu below the selection. Adjust left position to not go off-screen.
    const leftPosition = Math.max(5, Math.min(selection.rect.left + window.scrollX, window.innerWidth - 230)); // 224px width + padding
    const menuStyle: React.CSSProperties = {
        position: 'fixed',
        top: `${selection.rect.bottom + window.scrollY + 8}px`,
        left: `${leftPosition}px`,
        zIndex: 50,
    };

    if (isLoading) {
        return (
            <div style={menuStyle} className="bg-light-ui dark:bg-dark-ui p-2 rounded-full shadow-xl flex items-center animate-pulse">
                 <SparklesIcon className="w-5 h-5 text-light-primary dark:text-dark-primary"/>
            </div>
        )
    }

    // When the menu is first shown, open it automatically.
    // The user can close it, but the next selection will open it again.
    if (!isMenuOpen) {
        setIsMenuOpen(true);
    }
    
    return (
        <div style={menuStyle}>
            {isMenuOpen ? (
                <div className="bg-light-background dark:bg-dark-background rounded-lg shadow-xl border border-light-border dark:border-dark-border w-56 animate-fade-in-down"
                    // Prevent the editor from losing focus when interacting with the menu
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <div className="flex justify-between items-center p-2 border-b border-light-border dark:border-dark-border">
                        <h3 className="text-sm font-semibold ml-2 flex items-center gap-2">
                            <SparklesIcon className="w-4 h-4 text-light-primary dark:text-dark-primary"/>
                            AI Assistant
                        </h3>
                        <button onClick={() => { setIsMenuOpen(false); onClose(); }} className="p-1 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="py-1">
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
                </div>
            ) : null}
        </div>
    );
};

export default InlineAiMenu;