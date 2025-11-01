import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Template } from '../types';
import { DocumentDuplicateIcon } from './Icons';
import { useStoreContext } from '../context/AppContext';
import { useDynamicPosition } from '../hooks/useDynamicPosition';

interface TemplateLinkerProps {
    query: string;
    onSelect: (templateId: string, templateTitle: string) => void;
    onClose: () => void;
    position: { top: number; left: number };
    editorPaneRef: React.RefObject<HTMLElement>;
}

const TemplateLinker: React.FC<TemplateLinkerProps> = ({ query, onSelect, onClose, position, editorPaneRef }) => {
    const { templates } = useStoreContext();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    const filteredTemplates = query
        ? templates.filter(template => template.title.toLowerCase().includes(query.toLowerCase()))
        : templates;
        
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

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredTemplates.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredTemplates.length) % filteredTemplates.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredTemplates[selectedIndex]) {
                    const selected = filteredTemplates[selectedIndex];
                    onSelect(selected.id, selected.title);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredTemplates, selectedIndex, onSelect, onClose]);

    useEffect(() => {
        const activeItem = resultsRef.current?.querySelector('[data-selected="true"]');
        activeItem?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);
    
    return (
        <div
            ref={menuRef}
            style={style}
            className="bg-light-background dark:bg-dark-background rounded-lg shadow-xl border border-light-border dark:border-dark-border w-80 animate-fade-in-down"
            onMouseDown={(e) => e.preventDefault()}
        >
            <div className="p-2 border-b border-light-border dark:border-dark-border text-sm font-semibold">
                Insert Synced Block
            </div>
            <div ref={resultsRef} className="max-h-60 overflow-y-auto p-2">
                {filteredTemplates.length > 0 ? (
                    filteredTemplates.map((template, index) => (
                        <div
                            key={template.id}
                            data-selected={index === selectedIndex}
                            onClick={() => onSelect(template.id, template.title)}
                            className={`flex items-center p-2 rounded-md cursor-pointer ${
                                index === selectedIndex
                                    ? 'bg-light-primary/20 dark:bg-dark-primary/20'
                                    : 'hover:bg-light-ui dark:hover:bg-dark-ui'
                            }`}
                        >
                            <DocumentDuplicateIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{template.title}</span>
                        </div>
                    ))
                ) : (
                    <p className="text-center p-4 text-sm text-light-text/60 dark:text-dark-text/60">No templates found.</p>
                )}
            </div>
        </div>
    );
};

export default TemplateLinker;
