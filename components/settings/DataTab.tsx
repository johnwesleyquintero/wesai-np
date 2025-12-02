import React from 'react';
import { ArrowDownTrayIcon, ArrowUpTrayIcon } from '../Icons';
import { useDataManagement } from '../../hooks/useDataManagement';
import ConfirmationModal from '../ConfirmationModal';

interface DataTabProps {
    onClose: () => void;
}

const DataTab: React.FC<DataTabProps> = ({ onClose }) => {
    const { handleExportAll, handleImportClick, confirmImport, isImportConfirmOpen, setIsImportConfirmOpen } = useDataManagement();

    return (
        <>
            <div>
                <h3 className="text-lg font-semibold mb-3">Data Management</h3>
                <p className="text-sm text-light-text/60 dark:text-dark-text/60 mb-3">
                    Export all your data to a single JSON file for backup, or import a backup file to restore your entire workspace.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                    <button onClick={handleExportAll} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-light-ui dark:bg-dark-ui hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover transition-colors font-medium">
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        Export All Data
                    </button>
                    <button onClick={handleImportClick} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-light-ui dark:bg-dark-ui hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover transition-colors font-medium">
                        <ArrowUpTrayIcon className="w-5 h-5" />
                        Import Data...
                    </button>
                </div>
                <div className="mt-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-md text-xs text-yellow-800 dark:text-yellow-200">
                    <strong>Note:</strong> Importing data will completely overwrite your current workspace. Make sure to back up your current data first.
                </div>
            </div>

            <div className="flex justify-end items-center pt-6 border-t border-light-border dark:border-dark-border mt-6">
                <button onClick={onClose} className="px-4 py-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">Close</button>
            </div>

            <ConfirmationModal
                isOpen={isImportConfirmOpen}
                onClose={() => setIsImportConfirmOpen(false)}
                onConfirm={confirmImport}
                title="Overwrite All Data?"
                message='Importing a backup file will permanently replace all your current notes, folders, and templates. This action cannot be undone. To confirm, please type "OVERWRITE" below.'
                confirmText="Overwrite"
                confirmClass="bg-red-600 hover:bg-red-700"
                confirmationRequiredText="OVERWRITE"
            />
        </>
    );
};

export default DataTab;