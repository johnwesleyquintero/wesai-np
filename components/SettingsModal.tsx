import React, { useState, useEffect, useRef } from 'react';
import { PlusIcon } from './Icons';
import TemplateEditorModal from './TemplateEditorModal';
import { Template } from '../types';
import { useStoreContext } from '../context/AppContext';
import ConfirmationModal from './ConfirmationModal';
import { useToast } from '../context/ToastContext';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import { supabase } from '../lib/supabaseClient';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { templates, addTemplate, updateTemplate, deleteTemplate, notes, collections, smartCollections, importData } = useStoreContext();
    const { showToast } = useToast();
    
    const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
    const [templateToEdit, setTemplateToEdit] = useState<Template | null>(null);
    const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
    const [dataToImport, setDataToImport] = useState<any | null>(null);

    // FIX: Focus the close button since the API key section and save button are removed.
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useModalAccessibility(isOpen, onClose, modalRef);

    useEffect(() => {
        if (isOpen) {
            // FIX: Focus the close button on modal open for better accessibility.
            setTimeout(() => closeButtonRef.current?.focus(), 100);
        }
    }, [isOpen]);

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
                            {/* FIX: Removed Gemini API Key section to comply with guidelines. */}
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
                        {/* FIX: Removed "Save Settings" button as it's no longer needed. */}
                        <button ref={closeButtonRef} onClick={onClose} className="px-4 py-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">Close</button>
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
                message="Importing a backup file will permanently replace all your current notes, folders, and templates. This cannot be undone."/>
        </>
    );
};

// Fix: Add default export for lazy loading.
export default SettingsModal;