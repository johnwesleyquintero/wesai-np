import React, { useState, useEffect } from 'react';
import { PlusIcon } from './Icons';
import { useTemplates } from '../hooks/useTemplates';
import TemplateEditorModal from './TemplateEditorModal';
import { Template } from '../types';
import { useApiKey } from '../hooks/useApiKey';
import { useStore } from '../hooks/useStore';
import ConfirmationModal from './ConfirmationModal';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { templates, addTemplate, updateTemplate, deleteTemplate, importTemplates } = useTemplates();
    const { apiKey, saveApiKey } = useApiKey();
    const { notes, collections, smartCollections, importData } = useStore();
    
    const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
    const [templateToEdit, setTemplateToEdit] = useState<Template | null>(null);
    const [localApiKey, setLocalApiKey] = useState('');
    const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
    const [dataToImport, setDataToImport] = useState<any | null>(null);


    useEffect(() => {
        if (isOpen) {
            setLocalApiKey(apiKey || '');
        }
    }, [isOpen, apiKey]);

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

    const handleSaveSettings = () => {
        saveApiKey(localApiKey);
        onClose();
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
                            alert('Invalid backup file format.');
                        }
                    } catch (err) {
                        alert('Error reading backup file. Please ensure it is a valid JSON file.');
                        console.error(err);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };
    
    const handleImportConfirm = () => {
        if (dataToImport) {
            importData(dataToImport.notes, dataToImport.collections, dataToImport.smartCollections);
            importTemplates(dataToImport.templates);
            setIsImportConfirmOpen(false);
            setDataToImport(null);
            alert('Data imported successfully! The app will now reload to apply the changes.');
            window.location.reload();
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
                <div className="bg-light-background dark:bg-dark-background rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-full" onClick={e => e.stopPropagation()}>
                    {/* Modal Header */}
                    <div className="p-6 border-b border-light-border dark:border-dark-border flex-shrink-0">
                         <h2 className="text-2xl font-bold">Settings</h2>
                    </div>
                    
                    {/* Scrollable Content */}
                    <div className="overflow-y-auto p-6">
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Gemini API Key</h3>
                                <p className="text-sm text-light-text/60 dark:text-dark-text/60 mb-2">
                                    Your API key is stored locally in your browser and is required for all AI features. You can get a free key from <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="underline text-light-primary dark:text-dark-primary">Google AI Studio</a>.
                                </p>
                                <input
                                    type="password"
                                    value={localApiKey}
                                    onChange={(e) => setLocalApiKey(e.target.value)}
                                    placeholder="Enter your Gemini API Key"
                                    className="w-full p-2 bg-light-ui dark:bg-dark-ui rounded-md border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary focus:outline-none"
                                />
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-3">Note Templates</h3>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                    {templates.map(template => (
                                        <div key={template.id} className="flex items-center justify-between bg-light-ui/50 dark:bg-dark-ui/50 p-2 rounded-md">
                                            <span className="font-medium truncate pr-2">{template.title}</span>
                                            <div className="space-x-2 flex-shrink-0">
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
                                    <PlusIcon className="mr-2" /> Add New Template
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

                    {/* Modal Footer */}
                    <div className="flex justify-end items-center space-x-4 p-6 border-t border-light-border dark:border-dark-border flex-shrink-0">
                        <button onClick={onClose} className="px-4 py-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">Cancel</button>
                        <button onClick={handleSaveSettings} className="px-4 py-2 bg-light-primary text-white rounded-md hover:bg-light-primary-hover dark:bg-dark-primary dark:hover:bg-dark-primary-hover">Save Settings</button>
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
                message="Importing a backup file will permanently replace all your current notes, folders, and templates. This cannot be undone."
                confirmText="Overwrite"
                confirmClass="bg-red-600 hover:bg-red-700"
            />
        </>
    );
};

export default SettingsModal;