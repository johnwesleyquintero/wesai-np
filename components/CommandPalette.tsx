import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useCommands } from '../hooks/useCommands';
import { Command } from '../types';
import { MagnifyingGlassIcon } from './Icons';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const allCommands = useCommands(onClose);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useModalAccessibility(isOpen, onClose, modalRef);

    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const filteredCommands = useMemo(() => {
        if (!searchTerm) {
            return allCommands;
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return allCommands.filter(command =>
            command.name.toLowerCase().includes(lowercasedTerm) ||
            command.keywords?.toLowerCase().includes(lowercasedTerm)
        );
    }, [searchTerm, allCommands]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [searchTerm]);
    
    useEffect(() => {
        if (!isOpen) return;
        const activeItem = resultsRef.current?.querySelector('[data-selected="true"]');
        activeItem?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex, isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // This handler is for navigating the list items, not for trapping focus.
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredCommands[selectedIndex]) {
                filteredCommands[selectedIndex].action();
            }
        }
        // Escape is handled by the useModalAccessibility hook
    };

    if (!isOpen) return null;

    const groupedCommands = filteredCommands.reduce((acc, command) => {
        (acc[command.section] = acc[command.section] || []).push(command);
        return acc;
    }, {} as Record<string, Command[]>);

    const sections = ['Navigation', 'Note', 'AI', 'Settings'];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-20" onClick={onClose}>
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-label="Command Palette"
                className="bg-light-background dark:bg-dark-background rounded-lg shadow-xl w-full max-w-xl flex flex-col overflow-hidden animate-fade-in-down"
                onClick={e => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                <div className="flex items-center p-4 border-b border-light-border dark:border-dark-border">
                    <MagnifyingGlassIcon className="w-4 h-4 mr-3 text-light-text/60 dark:text-dark-text/60" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a command or search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent focus:outline-none text-lg"
                    />
                </div>
                <div ref={resultsRef} className="max-h-[400px] overflow-y-auto p-2">
                    {filteredCommands.length > 0 ? (
                        sections.map(section => (
                            groupedCommands[section] && (
                                <div key={section} className="mb-2">
                                    <h3 className="text-xs font-semibold text-light-text/60 dark:text-dark-text/60 px-2 pt-2 pb-1">{section}</h3>
                                    {groupedCommands[section].map((command) => {
                                        const globalIndex = filteredCommands.findIndex(c => c.id === command.id);
                                        const isSelected = globalIndex === selectedIndex;
                                        return (
                                            <div
                                                key={command.id}
                                                data-selected={isSelected}
                                                onClick={command.action}
                                                className={`flex items-center p-3 rounded-md cursor-pointer ${isSelected ? 'bg-light-primary/20 dark:bg-dark-primary/20' : 'hover:bg-light-ui dark:hover:bg-dark-ui'}`}
                                            >
                                                <div className="mr-3">{command.icon}</div>
                                                <span>{command.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        ))
                    ) : (
                        <p className="text-center p-8 text-light-text/60 dark:text-dark-text/60">No results found.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;