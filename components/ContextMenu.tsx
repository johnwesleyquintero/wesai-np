import React, { useEffect, useRef } from 'react';
import { ContextMenuItem } from '../types';

interface ContextMenuProps {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);
    
    // Adjust position if menu would go off-screen
    const menuStyle: React.CSSProperties = {
        top: y,
        left: x,
        position: 'fixed',
        transform: 'translate(0, 0)',
    };
    if (y + (menuRef.current?.offsetHeight || 0) > window.innerHeight) {
        menuStyle.top = window.innerHeight - (menuRef.current?.offsetHeight || 0) - 10;
    }
    if (x + (menuRef.current?.offsetWidth || 0) > window.innerWidth) {
        menuStyle.left = window.innerWidth - (menuRef.current?.offsetWidth || 0) - 10;
    }


    return (
        <div
            ref={menuRef}
            style={menuStyle}
            className="z-50 bg-light-background dark:bg-dark-background rounded-lg shadow-xl border border-light-border dark:border-dark-border w-56 animate-fade-in-down py-1"
        >
            {items.map((item, index) => (
                <button
                    key={index}
                    onClick={() => {
                        item.action();
                        onClose();
                    }}
                    className={`w-full flex items-center text-left px-3 py-2 text-sm transition-colors ${
                        item.isDestructive
                            ? 'text-red-600 dark:text-red-400 hover:bg-red-500/10'
                            : 'hover:bg-light-ui dark:hover:bg-dark-ui'
                    }`}
                >
                    {item.icon && <span className="mr-3 w-4 h-4">{item.icon}</span>}
                    {item.label}
                </button>
            ))}
        </div>
    );
};

export default ContextMenu;
