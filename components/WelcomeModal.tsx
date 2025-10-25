import React, { useRef, useEffect } from 'react';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import { useUIContext } from '../context/AppContext';

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const { openSettings } = useUIContext();

    useModalAccessibility(isOpen, onClose, modalRef);

    const handleOpenSettings = () => {
        onClose();
        openSettings();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="welcome-modal-title"
                className="bg-light-background dark:bg-dark-background rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-full"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-light-border dark:border-dark-border">
                    <h2 id="welcome-modal-title" className="text-2xl font-bold">Welcome to WesAI Notepad!</h2>
                </div>
                <div className="overflow-y-auto p-6 space-y-4">
                    <p>To unlock the powerful AI features, you'll need to add your personal Google Gemini API key.</p>
                    <div className="p-3 bg-light-ui dark:bg-dark-ui rounded-md text-sm">
                        <p><strong>Step 1:</strong> Get a free API key from <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="font-semibold text-light-primary dark:text-dark-primary hover:underline">Google AI Studio</a>.</p>
                        <p className="mt-2"><strong>Step 2:</strong> Click "Open Settings" below and paste your key.</p>
                    </div>
                    <p className="text-xs text-light-text/60 dark:text-dark-text/60">Your key is stored only in your browser and is never sent to our servers.</p>
                </div>
                <div className="flex justify-end items-center space-x-4 p-6 border-t border-light-border dark:border-dark-border">
                    <button onClick={onClose} className="px-4 py-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">Do it later</button>
                    <button onClick={handleOpenSettings} className="px-4 py-2 bg-light-primary text-white rounded-md hover:bg-light-primary-hover dark:bg-dark-primary dark:hover:bg-dark-primary-hover">Open Settings</button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;