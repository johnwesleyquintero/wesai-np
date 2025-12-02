
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
    };

    if (!isOpen) return null;

    const groupedCommands = filteredCommands.reduce((acc, command) => {
        (acc[command.section] = acc[command.section] || []).push(command);
        return acc;
    }, {} as Record<string, Command[]>);

    const sections = ['Navigation', 'Note', 'AI', 'Settings'];

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 pt-[10vh] sm:pt-[15vh]" onClick={onClose}>
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-label="Command Palette"
                className="bg-light-background/90 dark:bg-dark-background/90 backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-fade-in-down border border-light-border/50 dark:border-dark-border/50"
                onClick={e => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                <div className="flex items-center p-4 border-b border-light-border/50 dark:border-dark-border/50">
                    <MagnifyingGlassIcon className="w-5 h-5 mr-3 text-light-text/40 dark:text-dark-text/40" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="What would you like to do?"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent focus:outline-none text-xl placeholder-light-text/30 dark:placeholder-dark-text/30"
                    />
                    <div className="hidden sm:flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-light-text/30 dark:text-dark-text/30 bg-light-ui/50 dark:bg-dark-ui/50 px-2 py-1 rounded">
                        <span>Esc</span>
                    </div>
                </div>
                
                <div ref={resultsRef} className="max-h-[450px] overflow-y-auto p-2 scrollbar-thin">
                    {filteredCommands.length > 0 ? (
                        sections.map(section => (
                            groupedCommands[section] && (
                                <div key={section} className="mb-2">
                                    <h3 className="text-[10px] font-bold text-light-text/40 dark:text-dark-text/40 px-3 pt-2 pb-1 uppercase tracking-widest">{section}</h3>
                                    {groupedCommands[section].map((command) => {
                                        const globalIndex = filteredCommands.findIndex(c => c.id === command.id);
                                        const isSelected = globalIndex === selectedIndex;
                                        return (
                                            <div
                                                key={command.id}
                                                data-selected={isSelected}
                                                onClick={command.action}
                                                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-150 ${
                                                    isSelected 
                                                        ? 'bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900 shadow-md transform scale-[1.01]' 
                                                        : 'hover:bg-light-ui dark:hover:bg-dark-ui text-light-text/80 dark:text-dark-text/80'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`${isSelected ? 'text-white dark:text-zinc-900' : 'text-light-text/50 dark:text-dark-text/50 group-hover:text-light-text dark:group-hover:text-dark-text transition-colors'}`}>
                                                        {command.icon}
                                                    </div>
                                                    <span className="font-medium text-sm">{command.name}</span>
                                                </div>
                                                
                                                {isSelected && (
                                                    <div className="flex items-center">
                                                        <span className="text-[10px] font-bold opacity-70 px-1.5 py-0.5 rounded border border-current">↵</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        ))
                    ) : (
                        <div className="text-center py-12 px-4">
                            <p className="text-light-text/40 dark:text-dark-text/40 text-sm">No commands found.</p>
                        </div>
                    )}
                </div>
                
                <div className="px-4 py-2 border-t border-light-border/50 dark:border-dark-border/50 flex justify-between items-center text-[10px] text-light-text/40 dark:text-dark-text/40">
                    <span>Use <kbd className="font-sans bg-transparent border-transparent shadow-none p-0 text-current">↑</kbd> <kbd className="font-sans bg-transparent border-transparent shadow-none p-0 text-current">↓</kbd> to navigate</span>
                    <span>WesCore</span>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
