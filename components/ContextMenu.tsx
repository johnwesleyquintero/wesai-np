import React, { useEffect, useRef, useLayoutEffect, useState } from 'react';
import { ContextMenuItem } from '../types';
import { ChevronRightIcon } from './Icons';

interface ContextMenuProps {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
    isSubMenu?: boolean;
}

const MenuItem: React.FC<{ item: ContextMenuItem; onClose: () => void; }> = ({ item, onClose }) => {
    const itemRef = useRef<HTMLDivElement>(null);
    const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
    const [subMenuCoords, setSubMenuCoords] = useState<{ x: number, y: number } | null>(null);
    
    const timeoutRef = useRef<number | null>(null);

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (item.children && item.children.length > 0) {
            const rect = itemRef.current?.getBoundingClientRect();
            if (rect) {
                setSubMenuCoords({ x: rect.right, y: rect.top });
                setIsSubMenuOpen(true);
            }
        }
    };

    const handleMouseLeave = () => {
        timeoutRef.current = window.setTimeout(() => setIsSubMenuOpen(false), 100);
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (item.action && !item.disabled) {
            item.action();
            onClose();
        }
    };
    
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <div ref={itemRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="relative">
            <button
                onClick={handleClick}
                disabled={item.disabled}
                className={`w-full flex items-center justify-between text-left px-3 py-2 text-sm transition-colors ${
                    item.isDestructive
                        ? 'text-red-600 dark:text-red-400 hover:bg-red-500/10'
                        : 'hover:bg-light-ui dark:hover:bg-dark-ui'
                } ${item.disabled ? 'opacity-50 cursor-not-allowed text-light-text/50 dark:text-dark-text/50' : ''}`}
            >
                <span className="flex items-center gap-3">
                    {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                    {item.label}
                </span>
                {item.children && item.children.length > 0 && <ChevronRightIcon className="w-4 h-4" />}
            </button>
            {isSubMenuOpen && item.children && subMenuCoords && (
                <ContextMenu
                    x={subMenuCoords.x}
                    y={subMenuCoords.y}
                    items={item.children}
                    onClose={onClose}
                    isSubMenu={true}
                />
            )}
        </div>
    );
};


const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose, isSubMenu = false }) => {
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
            const parentEl = menuRef.current.parentElement;
            const parentRect = isSubMenu && parentEl ? parentEl.getBoundingClientRect() : null;

            let newTop = y;
            let newLeft = x;
            
            if (isSubMenu && parentRect) {
                if (x + menuWidth > innerWidth) {
                    newLeft = parentRect.left - menuWidth;
                }
            } else if (x + menuWidth > innerWidth) {
                newLeft = innerWidth - menuWidth - 10;
            }

            if (y + menuHeight > innerHeight) {
                newTop = innerHeight - menuHeight - 10;
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
    }, [x, y, isSubMenu]);

    useEffect(() => {
        if (isSubMenu) return; // Only root menu handles this

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose, isSubMenu]);


    return (
        <div
            ref={menuRef}
            style={{ ...style, zIndex: 50 }}
            className="bg-light-background dark:bg-dark-background rounded-lg shadow-xl border border-light-border dark:border-dark-border w-56 animate-fade-in-down py-1"
        >
            {items.map((item, index) => (
                <MenuItem key={index} item={item} onClose={onClose} />
            ))}
        </div>
    );
};

export default ContextMenu;