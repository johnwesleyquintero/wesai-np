import React, { useState, useEffect, useRef } from 'react';
import { Template } from '../types';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import { useToast } from '../context/ToastContext';

interface TemplateEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (template: Omit<Template, 'id'>) => void;
    templateToEdit: Template | null;
}

const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({ isOpen, onClose, onSave, templateToEdit }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const titleInputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const { showToast } = useToast();

    useModalAccessibility(isOpen, onClose, modalRef);

    useEffect(() => {
        if (isOpen) {
            if (templateToEdit) {
                setTitle(templateToEdit.title);
                setContent(templateToEdit.content);
            } else {
                setTitle('');
                setContent('');
            }
            setTimeout(() => titleInputRef.current?.focus(), 100);
        }
    }, [isOpen, templateToEdit]);

    const handleSave = () => {
        onSave({ title, content });
        onClose();
    };
    
    const handleCopySyncId = () => {
        if (templateToEdit) {
            const syncText = `[[sync:${templateToEdit.id}]]`;
            navigator.clipboard.writeText(syncText)
                .then(() => showToast({ message: 'Sync ID copied to clipboard!', type: 'success' }))
                .catch(() => showToast({ message: 'Failed to copy Sync ID.', type: 'error' }));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={onClose}>
            <div 
                ref={modalRef}
                role="dialog" 
                aria-modal="true" 
                aria-labelledby="template-editor-title"
                className="bg-light-background dark:bg-dark-background rounded-lg shadow-xl w-full max-w-2xl p-6" 
                onClick={e => e.stopPropagation()}
            >
                <h2 id="template-editor-title" className="text-2xl font-bold mb-4">{templateToEdit ? 'Edit Template' : 'New Template'}</h2>
                
                <div className="mb-4">
                    <label htmlFor="templateTitle" className="block text-sm font-medium mb-1">Template Title</label>
                    <input
                        id="templateTitle"
                        ref={titleInputRef}
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Meeting Minutes"
                        className="w-full p-2 bg-light-ui dark:bg-dark-ui rounded-md border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary focus:outline-none"
                    />
                </div>

                <div className="mb-6">
                    <label htmlFor="templateContent" className="block text-sm font-medium mb-1">Template Content</label>
                    <textarea
                        id="templateContent"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Enter your template content using Markdown..."
                        rows={10}
                        className="w-full p-2 bg-light-ui dark:bg-dark-ui rounded-md border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary focus:outline-none font-mono text-sm"
                    />
                </div>
                
                <div className="flex justify-between items-center">
                    <div>
                        {templateToEdit && (
                            <button onClick={handleCopySyncId} className="px-4 py-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui text-sm">Copy Sync ID</button>
                        )}
                    </div>
                    <div className="flex items-center space-x-4">
                        <button onClick={onClose} className="px-4 py-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-light-primary text-white rounded-md hover:bg-light-primary-hover dark:bg-dark-primary dark:hover:bg-dark-primary-hover">
                            Save Template
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TemplateEditorModal;
