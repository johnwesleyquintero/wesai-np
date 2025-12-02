import React, { useRef, useState, useEffect } from 'react';
import { EyeIcon, EyeSlashIcon } from '../Icons';
import { useUIContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { useApiKey } from '../../hooks/useApiKey';
import { supabase } from '../../lib/supabaseClient';

interface GeneralTabProps {
    onClose: () => void;
}

const GeneralTab: React.FC<GeneralTabProps> = ({ onClose }) => {
    const { isAiEnabled, toggleAiEnabled } = useUIContext();
    const { apiKey, saveApiKey } = useApiKey();
    const { showToast } = useToast();

    const [localApiKey, setLocalApiKey] = useState(apiKey || '');
    const [isKeyVisible, setIsKeyVisible] = useState(false);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const apiKeyInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!apiKey) {
            apiKeyInputRef.current?.focus();
        }
    }, [apiKey]);

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

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        onClose();
    };

    return (
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
            
            <div className="pt-6 border-t border-light-border dark:border-dark-border">
                <h3 className="text-lg font-semibold mb-3">AI Engine</h3>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Enable AI Features</p>
                        <p className="text-sm text-light-text/60 dark:text-dark-text/60">
                            Enables chat, suggestions, search, and more.
                        </p>
                    </div>
                    <button
                        role="switch"
                        aria-checked={isAiEnabled}
                        onClick={toggleAiEnabled}
                        className={`${isAiEnabled ? 'bg-light-primary dark:bg-dark-primary' : 'bg-light-border dark:bg-dark-border'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-primary dark:focus:ring-offset-dark-background`}
                    >
                        <span
                            className={`${isAiEnabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                        />
                    </button>
                </div>
                <p className="text-xs text-light-text/60 dark:text-dark-text/60 mt-3">
                    Disabling this will turn WesCore into a standard notepad and prevent any usage of your Gemini API key.
                </p>
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-3">Account</h3>
                <button onClick={handleSignOut} className="w-full text-center px-4 py-2 rounded-md bg-light-ui dark:bg-dark-ui hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover">Sign Out</button>
            </div>

            <div className="flex justify-end items-center space-x-4 pt-4 border-t border-light-border dark:border-dark-border">
                <button onClick={onClose} className="px-4 py-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">Cancel</button>
                <button onClick={handleSaveSettings} disabled={isSaving || !!apiKeyError} className="px-4 py-2 bg-light-primary text-white rounded-md hover:bg-light-primary-hover dark:bg-dark-primary dark:hover:bg-dark-primary-hover disabled:opacity-50">
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
};

export default GeneralTab;