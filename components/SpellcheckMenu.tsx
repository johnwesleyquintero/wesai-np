import React, { useRef } from 'react';
import { SpellingError } from '../types';
import { CheckBadgeIcon, XMarkIcon } from './Icons';
import { useDynamicPosition } from '../hooks/useDynamicPosition';

interface SpellcheckMenuProps {
    activeError: { error: SpellingError; rect: DOMRect } | null;
    suggestions: string[];
    onSelect: (suggestion: string) => void;
    isLoading: boolean;
    error: string | null;
    onClose: () => void;
    editorPaneRef: React.RefObject<HTMLElement>;
}

const SpellcheckMenu: React.FC<SpellcheckMenuProps> = ({ activeError, suggestions, onSelect, isLoading, error, onClose, editorPaneRef }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const style = useDynamicPosition({
        anchorRect: activeError?.rect || null,
        isOpen: !!activeError,
        menuRef,
        scrollContainerRef: editorPaneRef,
    });

    if (!activeError) return null;

    return (
        <div ref={menuRef} style={style} onMouseDown={(e) => e.preventDefault()}>
            <div className="bg-light-background dark:bg-dark-background rounded-lg shadow-xl border border-light-border dark:border-dark-border w-56 animate-fade-in-down">
                <div className="flex justify-between items-center p-2 border-b border-light-border dark:border-dark-border">
                    <h3 className="text-sm font-semibold ml-2 flex items-center gap-2">
                        <CheckBadgeIcon className="w-4 h-4 text-light-primary dark:text-dark-primary" />
                        Spelling
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
                <div className="py-1 max-h-48 overflow-y-auto">
                    {isLoading && <div className="px-3 py-2 text-sm text-light-text/70 dark:text-dark-text/70">Loading...</div>}
                    {error && <div className="px-3 py-2 text-sm text-red-500">{error}</div>}
                    {!isLoading && !error && suggestions.length > 0 && (
                        suggestions.map((suggestion) => (
                            <button
                                key={suggestion}
                                onClick={() => onSelect(suggestion)}
                                className="w-full text-left block px-3 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui transition-colors"
                            >
                                {suggestion}
                            </button>
                        ))
                    )}
                    {!isLoading && !error && suggestions.length === 0 && (
                        <div className="px-3 py-2 text-sm text-light-text/70 dark:text-dark-text/70">No suggestions found.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SpellcheckMenu;
