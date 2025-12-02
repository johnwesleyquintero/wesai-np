
import { useState, useCallback } from 'react';
import { useStoreContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

export const useDataManagement = () => {
    const { notes, collections, smartCollections, templates, importData } = useStoreContext();
    const { showToast } = useToast();
    const [dataToImport, setDataToImport] = useState<any | null>(null);
    const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);

    const handleExportAll = useCallback(() => {
        try {
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
            a.download = `wescore-backup-${date}.json`;
            a.href = url;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast({ message: 'Data exported successfully!', type: 'success' });
        } catch (error) {
            console.error("Export failed:", error);
            showToast({ message: 'Failed to export data.', type: 'error' });
        }
    }, [notes, collections, smartCollections, templates, showToast]);

    const handleImportClick = useCallback(() => {
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
    }, [showToast]);

    const confirmImport = useCallback(async () => {
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
    }, [dataToImport, importData, showToast]);

    return {
        handleExportAll,
        handleImportClick,
        confirmImport,
        isImportConfirmOpen,
        setIsImportConfirmOpen,
        dataToImport
    };
};
