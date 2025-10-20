import { useState, useCallback } from 'react';

const API_KEY_STORAGE_KEY = 'wesai-api-key';

export const useApiKey = () => {
    const [apiKey, setApiKey] = useState<string | null>(() => {
        try {
            return localStorage.getItem(API_KEY_STORAGE_KEY);
        } catch (error) {
            console.error("Error reading API key from localStorage", error);
            return null;
        }
    });

    const saveApiKey = useCallback((key: string | null) => {
        try {
            if (key && key.trim()) {
                localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
                setApiKey(key.trim());
            } else {
                localStorage.removeItem(API_KEY_STORAGE_KEY);
                setApiKey(null);
            }
        } catch (error) {
            console.error("Error saving API key to localStorage", error);
        }
    }, []);

    return { apiKey, saveApiKey };
};
