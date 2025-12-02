import React, { useState, useEffect, useRef } from 'react';
import { SettingsTab } from '../types';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import GeneralTab from './settings/GeneralTab';
import TemplatesTab from './settings/TemplatesTab';
import DataTab from './settings/DataTab';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab: SettingsTab;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            active
                ? 'border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary'
                : 'border-transparent text-light-text/60 dark:text-dark-text/60 hover:text-light-text dark:hover:text-dark-text'
        }`}
    >
        {children}
    </button>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialTab }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
    const modalRef = useRef<HTMLDivElement>(null);

    useModalAccessibility(isOpen, onClose, modalRef);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" className="bg-light-background dark:bg-dark-background rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-full" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-light-border dark:border-dark-border flex-shrink-0">
                        <h2 id="settings-modal-title" className="text-2xl font-bold">Settings</h2>
                </div>
                
                <div className="px-6 border-b border-light-border dark:border-dark-border flex-shrink-0">
                    <div className="flex -mb-px">
                        <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')}>General</TabButton>
                        <TabButton active={activeTab === 'templates'} onClick={() => setActiveTab('templates')}>Templates</TabButton>
                        <TabButton active={activeTab === 'data'} onClick={() => setActiveTab('data')}>Data</TabButton>
                    </div>
                </div>

                <div className="overflow-y-auto p-6 flex-1">
                    {activeTab === 'general' && <GeneralTab onClose={onClose} />}
                    {activeTab === 'templates' && <TemplatesTab onClose={onClose} />}
                    {activeTab === 'data' && <DataTab onClose={onClose} />}
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;