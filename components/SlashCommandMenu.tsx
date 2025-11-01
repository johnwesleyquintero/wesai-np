import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SlashCommand } from '../types';
import { slashCommands } from './slashCommands';
import { useDynamicPosition } from '../hooks/useDynamicPosition';

interface SlashCommandMenuProps {
    query: string;
    onSelect: (commandId: string) => void;
    onClose: () => void;
    position: { top: number; left: number };
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    editorPaneRef: React.RefObject<HTMLElement>;
}

const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({ query, onSelect, onClose, position, textareaRef, editorPaneRef }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    const anchorRect = useMemo(() => {
        if (!position) return null;
        return new DOMRect(position.left, position.top, 0, 0);
    }, [position]);

    const style = useDynamicPosition({
        anchorRect,
        isOpen: !!position,
        menuRef,
        scrollContainerRef: editorPaneRef,
    });
    
    const filteredCommands = useMemo(() => {
        if (!query) return slashCommands;
        const lowerQuery = query.toLowerCase();
        return slashCommands.filter(cmd => 
            cmd.name.toLowerCase().includes(lowerQuery) || 
            cmd.keywords?.toLowerCase().includes(lowerQuery)
        );
    }, [query]);

    useEffect(() => { setSelectedIndex(0); }, [filteredCommands.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    onSelect(filteredCommands[selectedIndex].id);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        const textarea = textareaRef.current;
        textarea?.addEventListener('keydown', handleKeyDown);
        return () => textarea?.removeEventListener('keydown', handleKeyDown);
    }, [filteredCommands, selectedIndex, onSelect, onClose, textareaRef]);
    
    useEffect(() => {
        const selectedItem = menuRef.current?.querySelector('[data-selected="true"]');
        selectedItem?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    const groupedCommands = useMemo(() => {
        return filteredCommands.reduce((acc, command) => {
            (acc[command.section] = acc[command.section] || []).push(command);
            return acc;
        }, {} as Record<string, SlashCommand[]>);
    }, [filteredCommands]);

    const sections: ('Formatting' | 'Insert' | 'AI Actions')[] = ['Formatting', 'Insert', 'AI Actions'];

    if (filteredCommands.length === 0) {
        return (
             <div
                ref={menuRef}
                style={style}
                className="fixed bg-light-background dark:bg-dark-background rounded-lg shadow-xl border border-light-border dark:border-dark-border w-80 z-50 p-4 text-center text-sm text-light-text/60 dark:text-dark-text/60"
            >
                No commands found.
            </div>
        );
    }
    
    return (
        <div
            ref={menuRef}
            style={style}
            className="fixed bg-light-background dark:bg-dark-background rounded-lg shadow-xl border border-light-border dark:border-dark-border w-80 max-h-80 overflow-y-auto z-50 p-2 animate-fade-in-down"
            onMouseDown={(e) => e.preventDefault()} // Prevent textarea from losing focus
        >
            {sections.map(section => {
                if (!groupedCommands[section]) return null;
                const sectionCommands = groupedCommands[section];
                
                return (
                    <div key={section} className="mb-1">
                        <h3 className="text-xs font-semibold text-light-text/60 dark:text-dark-text/60 px-2 pt-2 pb-1 uppercase tracking-wider">{section}</h3>
                        {sectionCommands.map(command => {
                            const globalIndex = filteredCommands.findIndex(c => c.id === command.id);
                            const isSelected = globalIndex === selectedIndex;
                            return (
                                <div
                                    key={command.id}
                                    data-selected={isSelected}
                                    onClick={() => onSelect(command.id)}
                                    className={`flex items-start p-2 rounded-md cursor-pointer ${isSelected ? 'bg-light-primary/20 dark:bg-dark-primary/20' : 'hover:bg-light-ui dark:hover:bg-dark-ui'}`}
                                >
                                    <div className="mr-3 mt-1 text-light-text/80 dark:text-dark-text/80">{command.icon}</div>
                                    <div>
                                        <p className="font-semibold text-sm">{command.name}</p>
                                        <p className="text-xs text-light-text/60 dark:text-dark-text/60">{command.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            })}
        </div>
    );
};

export default SlashCommandMenu;
