import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { ContextMenuItem } from '../types';

interface ContextMenuProps {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({
        opacity: 0,
        position: 'fixed',
        top: `${y}px`,
        left: `${x}px`,
    });

    useLayoutEffect(() => {
        if (menuRef.current) {
            const menuWidth = menuRef.current.offsetWidth;
            const menuHeight = menuRef.current.offsetHeight;
            const { innerWidth, innerHeight } = window;

            let newTop = y;
            let newLeft = x;

            if (y + menuHeight > innerHeight) {
                newTop = innerHeight - menuHeight - 10;
            }
            if (x + menuWidth > innerWidth) {
                newLeft = innerWidth - menuWidth - 10;
            }

            if (newTop < 10) newTop = 10;
            if (newLeft < 10) newLeft = 10;
            
            setStyle({
                opacity: 1,
                position: 'fixed',
                top: `${newTop}px`,
                left: `${newLeft}px`,
                transition: 'opacity 0.1s ease-in-out',
            });
        }
    }, [x, y]);

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


    return (
        <div
            ref={menuRef}
            style={{ ...style, zIndex: 50 }}
            className="bg-light-background dark:bg-dark-background rounded-lg shadow-xl border border-light-border dark:border-dark-border w-56 animate-fade-in-down py-1"
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