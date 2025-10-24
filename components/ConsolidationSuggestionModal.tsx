import React, { useState, useEffect, useRef } from 'react';
import { Note } from '../types';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import { suggestNoteConsolidation } from '../services/geminiService';
import MarkdownPreview from './MarkdownPreview';
import { useToast } from '../context/ToastContext';
import { useStoreContext } from '../context/AppContext';

interface ConsolidationSuggestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    note1: Note;
    note2: Note;
}

const ConsolidationSuggestionModal: React.FC<ConsolidationSuggestionModalProps> = ({ isOpen, onClose, note1, note2 }) => {
    const { showToast } = useToast();
    const { onAddNote } = useStoreContext();
    const modalRef = useRef<HTMLDivElement>(null);
    useModalAccessibility(isOpen, onClose, modalRef);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [suggestion, setSuggestion] = useState<{ title: string; content: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setError(null);
            setSuggestion(null);
            
            suggestNoteConsolidation(note1, note2)
                .then(setSuggestion)
                .catch(err => setError(err.message || 'Failed to generate suggestion.'))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, note1, note2]);

    const handleCopy = () => {
        if (suggestion) {
            const fullMarkdown = `# ${suggestion.title}\n\n${suggestion.content}`;
            navigator.clipboard.writeText(fullMarkdown)
                .then(() => showToast({ message: "Consolidated note copied!", type: 'success' }))
                .catch(() => showToast({ message: "Failed to copy.", type: 'error' }));
        }
    };

    const handleCreateNote = () => {
        if (suggestion) {
            onAddNote(null, suggestion.title, suggestion.content);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="consolidation-modal-title"
                className="bg-light-background dark:bg-dark-background rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-light-border dark:border-dark-border flex-shrink-0">
                    <h2 id="consolidation-modal-title" className="text-2xl font-bold">AI Consolidation Suggestion</h2>
                    <p className="text-sm text-light-text/60 dark:text-dark-text/60">Merging "{note1.title}" and "{note2.title}"</p>
                </div>
                
                <div className="overflow-y-auto p-6 flex-1">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="w-8 h-8 border-4 border-light-ui dark:border-dark-ui border-t-light-primary dark:border-t-dark-primary rounded-full animate-spin mb-4"></div>
                            <p className="text-lg font-semibold text-light-text dark:text-dark-text">Generating suggestion...</p>
                        </div>
                    )}
                    {error && <div className="p-4 text-center text-red-700 bg-red-100 rounded-md dark:bg-red-900/30 dark:text-red-200">{error}</div>}
                    {suggestion && (
                        <MarkdownPreview title={suggestion.title} content={suggestion.content} onToggleTask={() => {}} />
                    )}
                </div>

                <div className="flex justify-end items-center space-x-4 p-6 border-t border-light-border dark:border-dark-border flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">Close</button>
                    <button onClick={handleCopy} disabled={!suggestion} className="px-4 py-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui disabled:opacity-50">Copy Markdown</button>
                    <button onClick={handleCreateNote} disabled={!suggestion} className="px-4 py-2 bg-light-primary text-white rounded-md hover:bg-light-primary-hover dark:bg-dark-primary dark:hover:bg-dark-primary-hover disabled:opacity-50">Create New Note</button>
                </div>
            </div>
        </div>
    );
};

export default ConsolidationSuggestionModal;