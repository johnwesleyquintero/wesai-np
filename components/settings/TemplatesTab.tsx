import React, { useState } from 'react';
import { Template } from '../../types';
import { useStoreContext, useUIContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { PlusIcon } from '../Icons';
import TemplateEditorModal from '../TemplateEditorModal';

interface TemplatesTabProps {
    onClose: () => void;
}

const TemplatesTab: React.FC<TemplatesTabProps> = ({ onClose }) => {
    const { templates, addTemplate, updateTemplate, deleteTemplate } = useStoreContext();
    const { showConfirmation } = useUIContext();
    const { showToast } = useToast();
    
    const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
    const [templateToEdit, setTemplateToEdit] = useState<Template | null>(null);

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

    const handleCopySyncId = (templateId: string) => {
        const syncText = `[[sync:${templateId}]]`;
        navigator.clipboard.writeText(syncText)
            .then(() => showToast({ message: 'Sync ID copied to clipboard!', type: 'success' }))
            .catch(() => showToast({ message: 'Failed to copy Sync ID.', type: 'error' }));
    };

    return (
        <>
            <div>
                <h3 className="text-lg font-semibold mb-3">Note Templates</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {templates.length === 0 && (
                        <p className="text-sm text-light-text/60 dark:text-dark-text/60 text-center py-4">No templates yet.</p>
                    )}
                    {templates.map(template => (
                        <div key={template.id} className="flex items-center justify-between bg-light-ui/50 dark:bg-dark-ui/50 p-2 rounded-md">
                            <span className="font-medium truncate pr-2">{template.title}</span>
                            <div className="space-x-2 flex-shrink-0">
                                <button onClick={() => handleCopySyncId(template.id)} className="text-sm text-light-primary dark:text-dark-primary hover:underline" title="Copy Sync ID">Copy ID</button>
                                <button onClick={() => handleOpenTemplateEditor(template)} className="text-sm text-light-primary dark:text-dark-primary hover:underline">Edit</button>
                                <button
                                    onClick={() => showConfirmation({
                                        title: "Delete Template",
                                        message: `Are you sure you want to permanently delete the template "${template.title}"? This cannot be undone. To confirm, type "${template.title}".`,
                                        onConfirm: () => deleteTemplate(template.id),
                                        confirmText: "Delete",
                                        confirmClass: "bg-red-600 hover:bg-red-700",
                                        confirmationRequiredText: template.title,
                                    })}
                                    className="text-sm text-red-500 hover:underline"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    onClick={() => handleOpenTemplateEditor(null)}
                    className="flex items-center justify-center w-full mt-4 px-4 py-2 border-2 border-dashed border-light-border dark:border-dark-border rounded-md hover:border-light-primary hover:text-light-primary dark:hover:border-dark-primary dark:hover:text-dark-primary transition-colors"
                >
                    <PlusIcon className="w-4 h-4 mr-2" /> Add New Template
                </button>
            </div>
            
            <div className="flex justify-end items-center pt-6 border-t border-light-border dark:border-dark-border mt-6">
                <button onClick={onClose} className="px-4 py-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">Close</button>
            </div>

            <TemplateEditorModal
                isOpen={isTemplateEditorOpen}
                onClose={() => setIsTemplateEditorOpen(false)}
                onSave={handleSaveTemplate}
                templateToEdit={templateToEdit}
            />
        </>
    );
};

export default TemplatesTab;