
import React, { Suspense } from 'react';
import { useUIContext, useStoreContext } from '../context/AppContext';
import { useOnboarding } from '../hooks/useOnboarding';

const CommandPalette = React.lazy(() => import('./CommandPalette'));
const SettingsModal = React.lazy(() => import('./SettingsModal'));
const SmartFolderModal = React.lazy(() => import('./SmartFolderModal'));
const WelcomeModal = React.lazy(() => import('./WelcomeModal'));
const CoachMark = React.lazy(() => import('./CoachMark'));
const HelpModal = React.lazy(() => import('./HelpModal'));

const ModalManager: React.FC = () => {
    const {
        isCommandPaletteOpen, setIsCommandPaletteOpen,
        isSettingsOpen, setIsSettingsOpen, initialSettingsTab,
        isSmartFolderModalOpen, setIsSmartFolderModalOpen, smartFolderToEdit, initialSmartFolderQuery,
        isWelcomeModalOpen, closeWelcomeModal,
        isHelpOpen, setIsHelpOpen,
    } = useUIContext();

    const { addSmartCollection, updateSmartCollection } = useStoreContext();
    const { activeCoachMark, dismissCoachMark } = useOnboarding();

    const handleSaveSmartFolder = (data: { name: string, query: string }) => {
        if (smartFolderToEdit) {
            updateSmartCollection(smartFolderToEdit.id, data);
        } else {
            addSmartCollection(data.name, data.query);
        }
        setIsSmartFolderModalOpen(false);
    };

    return (
        <Suspense fallback={<div />}>
            <CommandPalette
                isOpen={isCommandPaletteOpen}
                onClose={() => setIsCommandPaletteOpen(false)}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                initialTab={initialSettingsTab}
            />

            <SmartFolderModal
                isOpen={isSmartFolderModalOpen}
                onClose={() => setIsSmartFolderModalOpen(false)}
                folderToEdit={smartFolderToEdit}
                initialQuery={initialSmartFolderQuery}
                onSave={handleSaveSmartFolder}
            />

            <WelcomeModal isOpen={isWelcomeModalOpen} onClose={closeWelcomeModal} />

            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
            
            {activeCoachMark && (
                <CoachMark
                    key={activeCoachMark.id}
                    targetSelector={activeCoachMark.targetSelector}
                    title={activeCoachMark.title}
                    content={activeCoachMark.content}
                    onDismiss={dismissCoachMark}
                />
            )}
        </Suspense>
    );
};

export default ModalManager;
