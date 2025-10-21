import React, { useState, useEffect, useRef } from 'react';
import { SmartCollection } from '../types';
import { BrainIcon } from './Icons';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

interface SmartFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<SmartCollection, 'id'>) => void;
    folderToEdit: Omit<SmartCollection, 'id'> | SmartCollection | null;
}

const SmartFolderModal: React.FC<SmartFolderModalProps> = ({ isOpen, onClose, onSave, folderToEdit }) => {
    const [name, setName] = useState('');
    const [query, setQuery] = useState('');
    const nameInputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useModalAccessibility(isOpen, onClose, modalRef);

    useEffect(() => {
        if (isOpen) {
            if (folderToEdit) {
                setName(folderToEdit.name);
                setQuery(folderToEdit.query);
            } else {
                setName('');
                setQuery('');
            }
            setTimeout(() => nameInputRef.current?.focus(), 100);
        }
    }, [isOpen, folderToEdit]);

    const handleSave = () => {
        if (name.trim() && query.trim()) {
            onSave({ name: name.trim(), query: query.trim() });
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={onClose}>
            <div 
                ref={modalRef}
                role="dialog" 
                aria-modal="true" 
                aria-labelledby="smart-folder-title"
                className="bg-light-background dark:bg-dark-background rounded-lg shadow-xl w-full max-w-lg p-6" 
                onClick={e => e.stopPropagation()}
            >
                <h2 id="smart-folder-title" className="text-2xl font-bold mb-4 flex items-center">
                    <BrainIcon className="mr-3" />
                    {folderToEdit ? 'Edit Smart Folder' : 'New Smart Folder'}
                </h2>
                
                <p className="text-sm text-light-text/60 dark:text-dark-text/60 mb-4">
                    Smart folders automatically display notes that match your AI-powered search query. They are like saved searches that stay up-to-date.
                </p>

                <div className="mb-4">
                    <label htmlFor="folderName" className="block text-sm font-medium mb-1">Folder Name</label>
                    <input
                        id="folderName"
                        ref={nameInputRef}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Project Phoenix Ideas"
                        className="w-full p-2 bg-light-ui dark:bg-dark-ui rounded-md border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary focus:outline-none"
                    />
                </div>

                <div className="mb-6">
                    <label htmlFor="folderQuery" className="block text-sm font-medium mb-1">AI Search Query</label>
                    <textarea
                        id="folderQuery"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="e.g., all notes about marketing strategies from the last month"
                        rows={3}
                        className="w-full p-2 bg-light-ui dark:bg-dark-ui rounded-md border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary focus:outline-none text-sm"
                    />
                </div>
                
                <div className="flex justify-end items-center space-x-4">
                    <button onClick={onClose} className="px-4 py-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">Cancel</button>
                    <button 
                        onClick={handleSave} 
                        disabled={!name.trim() || !query.trim()}
                        className="px-4 py-2 bg-light-primary text-white rounded-md hover:bg-light-primary-hover dark:bg-dark-primary dark:hover:bg-dark-primary-hover disabled:opacity-50"
                    >
                        Save Folder
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SmartFolderModal;