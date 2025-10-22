import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useStore, UseStoreReturn } from '../hooks/useStore';
import { useMobileView } from '../hooks/useMobileView';
import { EditorActions } from '../types';

// --- UI Context ---
interface UIContextType {
    view: 'NOTES' | 'CHAT';
    setView: (view: 'NOTES' | 'CHAT') => void;
    isSettingsOpen: boolean;
    openSettings: () => void;
    closeSettings: () => void;
    isCommandPaletteOpen: boolean;
    openCommandPalette: () => void;
    closeCommandPalette: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    isMobileView: boolean;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
    onToggleSidebar: () => void;
    isAiRateLimited: boolean;
    sidebarWidth: number;
    startSidebarResize: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

// --- Editor Context ---
interface EditorContextType {
    editorActions: EditorActions | null;
    registerEditorActions: (actions: EditorActions) => void;
    unregisterEditorActions: () => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

// --- Store Context ---
const StoreContext = createContext<UseStoreReturn | undefined>(undefined);


// --- App Context Provider ---
export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const store = useStore();
    const isMobileView = useMobileView();

    // --- UI State ---
    const [view, setView] = useState<'NOTES' | 'CHAT'>('NOTES');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined' && window.localStorage.getItem('theme') === 'dark') return 'dark';
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
        return 'light';
    });
    const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobileView);
    const [isAiRateLimited, setIsAiRateLimited] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(288);

    const openSettings = useCallback(() => setIsSettingsOpen(true), []);
    const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
    const openCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), []);
    const closeCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), []);

    const toggleTheme = useCallback(() => {
        setTheme(currentTheme => {
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            if (newTheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            return newTheme;
        });
    }, []);
    
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const onToggleSidebar = useCallback(() => setIsSidebarOpen(prev => !prev), []);

    const startSidebarResize = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const startX = e.clientX;
        const startWidth = sidebarWidth;
        const handleMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth + (moveEvent.clientX - startX);
            if (newWidth >= 240 && newWidth <= 500) { // Min and max width
                setSidebarWidth(newWidth);
            }
        };
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [sidebarWidth]);

    useEffect(() => {
        const handleRateLimitEvent = () => setIsAiRateLimited(true);
        window.addEventListener('ai-rate-limit', handleRateLimitEvent);
        return () => window.removeEventListener('ai-rate-limit', handleRateLimitEvent);
    }, []);

    const uiContextValue: UIContextType = {
        view, setView,
        isSettingsOpen, openSettings, closeSettings,
        isCommandPaletteOpen, openCommandPalette, closeCommandPalette,
        theme, toggleTheme,
        isMobileView,
        isSidebarOpen, setIsSidebarOpen, onToggleSidebar,
        isAiRateLimited,
        sidebarWidth, startSidebarResize
    };

    // --- Editor State ---
    const [editorActions, setEditorActions] = useState<EditorActions | null>(null);
    const registerEditorActions = useCallback((actions: EditorActions) => setEditorActions(actions), []);
    const unregisterEditorActions = useCallback(() => setEditorActions(null), []);

    const editorContextValue: EditorContextType = {
        editorActions,
        registerEditorActions,
        unregisterEditorActions,
    };

    return (
        <StoreContext.Provider value={store}>
            <UIContext.Provider value={uiContextValue}>
                <EditorContext.Provider value={editorContextValue}>
                    {children}
                </EditorContext.Provider>
            </UIContext.Provider>
        </StoreContext.Provider>
    );
};

// --- Custom Hooks for consuming contexts ---
export const useStoreContext = () => {
    const context = useContext(StoreContext);
    if (context === undefined) {
        throw new Error('useStoreContext must be used within an AppContextProvider');
    }
    return context;
};

export const useUIContext = () => {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error('useUIContext must be used within an AppContextProvider');
    }
    return context;
};

export const useEditorContext = () => {
    const context = useContext(EditorContext);
    if (context === undefined) {
        throw new Error('useEditorContext must be used within an AppContextProvider');
    }
    return context;
};
