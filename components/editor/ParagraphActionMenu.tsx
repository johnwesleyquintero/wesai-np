import React, { useRef } from 'react';
import { InlineAction } from '../../types';
import { useDynamicPosition } from '../../hooks/useDynamicPosition';

interface ParagraphActionMenuProps {
    anchorRect: DOMRect;
    onAction: (action: InlineAction) => void;
    onClose: () => void;
    editorPaneRef: React.RefObject<HTMLElement>;
}

const actionMap: { action: InlineAction; label: string }[] = [
    { action: 'fix', label: 'Fix Spelling & Grammar' },
    { action: 'shorten', label: 'Make Shorter' },
    { action: 'expand', label: 'Make Longer' },
    { action: 'simplify', label: 'Simplify Language' },
];

const ParagraphActionMenu: React.FC<ParagraphActionMenuProps> = ({ anchorRect, onAction, onClose, editorPaneRef }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const style = useDynamicPosition({
        anchorRect,
        isOpen: true,
        menuRef,
        align: 'bottom',
        scrollContainerRef: editorPaneRef,
    });

    // Close on any click outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // Defer adding the event listener to prevent the same click that opened the menu from closing it.
        const timerId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timerId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    return (
        <div ref={menuRef} style={style} className="bg-light-background dark:bg-dark-background rounded-lg shadow-xl border border-light-border dark:border-dark-border py-1 w-48 z-50">
            {actionMap.map(({ action, label }) => (
                <button
                    key={action}
                    onClick={() => {
                        onAction(action);
                        onClose();
                    }}
                    className="w-full text-left block px-3 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui transition-colors"
                >
                    {label}
                </button>
            ))}
        </div>
    );
};

export default ParagraphActionMenu;
