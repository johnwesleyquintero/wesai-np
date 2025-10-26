import React, { useState, useEffect, useRef } from 'react';
import { PlusIcon, EyeIcon, EyeSlashIcon, ClipboardDocumentIcon } from './Icons';
import TemplateEditorModal from './TemplateEditorModal';
import { Template } from '../types';
import { useStoreContext } from '../context/AppContext';
import ConfirmationModal from './ConfirmationModal';
import { useToast } from '../context/ToastContext';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import { supabase } from '../lib/supabaseClient';
import { useApiKey } from '../hooks/useApiKey';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { templates, addTemplate, updateTemplate, deleteTemplate, notes, collections, smartCollections, importData } = useStoreContext();
    const { showToast } = useToast();
    
    const { apiKey, saveApiKey } = useApiKey();
    const [localApiKey, setLocalApiKey] = useState(apiKey || '');
    const [isSaving, setIsSaving] = useState(false);
    
    const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
    const [templateToEdit, setTemplateToEdit] = useState<Template | null>(null);
    const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
    const [dataToImport, setDataToImport] = useState<any | null>(null);
    
    const [isKeyVisible, setIsKeyVisible] = useState(false);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);

    const apiKeyInputRef = useRef<HTMLInputElement>(null);
    const saveButtonRef = useRef<HTMLButtonElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useModalAccessibility(isOpen, onClose, modalRef);

    useEffect(() => {
        if (isOpen) {
            setLocalApiKey(apiKey || '');
            setIsKeyVisible(false);
            setTimeout(() => {
                if (!apiKey) {
                    apiKeyInputRef.current?.focus();
                } else {
                    saveButtonRef.current?.focus();
                }
            }, 100);
        }
    }, [isOpen, apiKey]);
    
    useEffect(() => {
        const validateApiKey = (key: string) => {
            if (!key) {
                setApiKeyError(null);
                return;
            }
            if (key.length < 35 || key.length > 45 || !/^[A-Za-z0-9_-]+$/.test(key)) {
                setApiKeyError('Invalid API key format. Please check your key.');
            } else {
                setApiKeyError(null);
            }
        };
        validateApiKey(localApiKey);
    }, [localApiKey]);

    const handleOpenTemplateEditor = (template: Template | null) => {
        setTemplateToEdit(template);
        setIsTemplateEditorOpen(true);
    };

    const handleSaveTemplate = (templateData: Omit<Template, 'id'>) => {
        if (templateToEdit) {
            updateTemplate(templateToEdit.id, templateData);
        } else {
            addTemplate(templateData.title, templateData.content);
        }
    };

    const handleDeleteTemplate = (id: string) => {
        if (window.confirm('Are you sure you want to delete this template?')) {
            deleteTemplate(id);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        onClose();
        // Clear local non-Supabase state if necessary
        // e.g. localStorage.clear();
        // window.location.reload(); // To ensure clean state
    };
    
    const handleExport = () => {
        const allData = {
            notes,
            collections,
            smartCollections,
            templates,
        };
        const jsonString = JSON.stringify(allData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        a.download = `wesai-notepad-backup-${date}.json`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast({ message: 'Data exported successfully!', type: 'success' });
        onClose();
    };

    const handleImportClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target!.result as string);
                        if (data.notes && data.collections && data.templates && data.smartCollections) {
                            setDataToImport(data);
                            setIsImportConfirmOpen(true);
                        } else {
                            showToast({ message: 'Invalid backup file format.', type: 'error' });
                        }
                    } catch (err) {
                        showToast({ message: 'Error reading backup file.', type: 'error' });
                        console.error(err);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };
    
    const handleImportConfirm = async () => {
        if (dataToImport) {
            try {
                await importData(dataToImport);
                setIsImportConfirmOpen(false);
                setDataToImport(null);
                showToast({ message: 'Data imported! App will now reload.', type: 'success' });
                setTimeout(() => window.location.reload(), 1500);
            } catch (error) {
                const message = error instanceof Error ? error.message : "An unknown error occurred during import.";
                showToast({ message: `Import failed: ${message}`, type: 'error' });
                setIsImportConfirmOpen(false);
            }
        }
    };
    
    const handleSaveSettings = () => {
        if (apiKeyError) {
            showToast({ message: apiKeyError, type: 'error' });
            return;
        }
        setIsSaving(true);
        saveApiKey(localApiKey);
        setTimeout(() => {
            setIsSaving(false);
            showToast({ message: 'Settings saved!', type: 'success' });
            onClose();
        }, 500);
    };
    
    const handleCopySyncId = (templateId: string) => {
        const syncText = `[[sync:${templateId}]]`;
        navigator.clipboard.writeText(syncText)
            .then(() => showToast({ message: 'Sync ID copied to clipboard!', type: 'success' }))
            .catch(() => showToast({ message: 'Failed to copy Sync ID.', type: 'error' }));
    };


    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
                <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" className="bg-light-background dark:bg-dark-background rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-full" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-light-border dark:border-dark-border flex-shrink-0">
                         <h2 id="settings-modal-title" className="text-2xl font-bold">Settings</h2>
                    </div>
                    
                    <div className="overflow-y-auto p-6">
                        <div className="space-y-6">
                             <div>
                                <h3 className="text-lg font-semibold mb-3">Gemini API Key</h3>
                                <p className="text-sm text-light-text/60 dark:text-dark-text/60 mb-3">
                                    Your personal API key for Google Gemini is required for all AI features. Your key is stored securely in your browser's local storage and is never sent to our servers.
                                </p>
                                <div className="relative">
                                    <input
                                        ref={apiKeyInputRef}
                                        type={isKeyVisible ? 'text' : 'password'}
                                        value={localApiKey}
                                        onChange={(e) => setLocalApiKey(e.target.value)}
                                        placeholder="Enter your Gemini API key"
                                        className="w-full p-2 pr-10 bg-light-ui dark:bg-dark-ui rounded-md border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsKeyVisible(!isKeyVisible)}
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-light-text/60 dark:text-dark-text/60"
                                        aria-label={isKeyVisible ? 'Hide API key' : 'Show API key'}
                                    >
                                        {isKeyVisible ? <EyeSlashIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                                {apiKeyError && <p className="text-xs text-red-500 mt-1">{apiKeyError}</p>}
                                <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="text-xs text-light-primary dark:text-dark-primary hover:underline mt-2 block">
                                    Get an API key from Google AI Studio &rarr;
                                </a>
                            </div>

                             <div>
                                <h3 className="text-lg font-semibold mb-3">Account</h3>
                                 <button onClick={handleSignOut} className="w-full text-center px-4 py-2 rounded-md bg-light-ui dark:bg-dark-ui hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover">Sign Out</button>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-3">Note Templates</h3>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                    {templates.map(template => (
                                        <div key={template.id} className="flex items-center justify-between bg-light-ui/50 dark:bg-dark-ui/50 p-2 rounded-md">
                                            <span className="font-medium truncate pr-2">{template.title}</span>
                                            <div className="space-x-2 flex-shrink-0">
                                                <button onClick={() => handleCopySyncId(template.id)} className="text-sm text-light-primary dark:text-dark-primary hover:underline" title="Copy Sync ID">Copy ID</button>
                                                <button onClick={() => handleOpenTemplateEditor(template)} className="text-sm text-light-primary dark:text-dark-primary hover:underline">Edit</button>
                                                <button onClick={() => handleDeleteTemplate(template.id)} className="text-sm text-red-500 hover:underline">Delete</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => handleOpenTemplateEditor(null)}
                                    className="flex items-center justify-center w-full mt-3 px-4 py-2 border-2 border-dashed border-light-border dark:border-dark-border rounded-md hover:border-light-primary hover:text-light-primary dark:hover:border-dark-primary dark:hover:text-dark-primary transition-colors"
                                >
                                    <PlusIcon className="w-4 h-4 mr-2" /> Add New Template
                                </button>
                            </div>
                            
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Data Management</h3>
                                <p className="text-sm text-light-text/60 dark:text-dark-text/60 mb-3">
                                    Export all your data to a single file for backup, or import a backup file to restore your notepad.
                                </p>
                                <div className="flex space-x-4">
                                    <button onClick={handleExport} className="flex-1 px-4 py-2 rounded-md bg-light-ui dark:bg-dark-ui hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover">Export All Data</button>
                                    <button onClick={handleImportClick} className="flex-1 px-4 py-2 rounded-md bg-light-ui dark:bg-dark-ui hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover">Import Data...</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end items-center space-x-4 p-6 border-t border-light-border dark:border-dark-border flex-shrink-0">
                        <button onClick={onClose} className="px-4 py-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">Cancel</button>
                        <button ref={saveButtonRef} onClick={handleSaveSettings} disabled={isSaving || !!apiKeyError} className="px-4 py-2 bg-light-primary text-white rounded-md hover:bg-light-primary-hover dark:bg-dark-primary dark:hover:bg-dark-primary-hover disabled:opacity-50">
                            {isSaving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </div>
            </div>
            <TemplateEditorModal
                isOpen={isTemplateEditorOpen}
                onClose={() => setIsTemplateEditorOpen(false)}
                onSave={handleSaveTemplate}
                templateToEdit={templateToEdit}
            />
            <ConfirmationModal
                isOpen={isImportConfirmOpen}
                onClose={() => setIsImportConfirmOpen(false)}
                onConfirm={handleImportConfirm}
                title="Overwrite All Data?"
                message='Importing a backup file will permanently replace all your current notes, folders, and templates. This action cannot be undone. To confirm, please type "OVERWRITE" below.'
                confirmText="Overwrite"
                confirmClass="bg-red-600 hover:bg-red-700"
                confirmationRequiredText="OVERWRITE"
            />
        </>
    );
};

// Fix: Add default export for lazy loading.
export default SettingsModal;
