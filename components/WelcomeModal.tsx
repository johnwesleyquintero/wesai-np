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
                    <p>This is a powerful, AI-enhanced notepad where your data is securely stored and synced across your devices using your private Supabase account.</p>
                    <div>
                        <h3 className="font-semibold mb-1">To unlock AI features, you'll need a Google Gemini API key.</h3>
                        <p className="text-sm text-light-text/60 dark:text-dark-text/60">
                            You can get a free key from <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="underline text-light-primary dark:text-dark-primary">Google AI Studio</a>. It's quick and easy to set up.
                        </p>
                    </div>
                    <p>Your API key is stored locally in your browser and is never shared, ensuring your AI interactions remain private.</p>
                </div>
                <div className="flex justify-end items-center space-x-4 p-6 border-t border-light-border dark:border-dark-border">
                    <button onClick={onClose} className="px-4 py-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">Maybe Later</button>
                    <button onClick={handleOpenSettings} className="px-4 py-2 bg-light-primary text-white rounded-md hover:bg-light-primary-hover dark:bg-dark-primary dark:hover:bg-dark-primary-hover">Open Settings</button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;