import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SmartCollection, ContextMenuItem, ViewState, ConfirmationState, ConfirmationOptions } from '../types';
import { useMobileView } from './useMobileView';
import { useApiKey } from './useApiKey';

const initialConfirmationState: ConfirmationState = {
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
};

export const useUIProviderLogic = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
    const [view, setView] = useState<ViewState>('NOTES');
    const isMobileView = useMobileView();
    const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobileView);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
        try {
            return localStorage.getItem('wesai-sidebar-collapsed') === 'true';
        } catch {
            return false;
        }
    });
    const [isAiRateLimited, setIsAiRateLimited] = useState(false);
    const rateLimitTimerRef = useRef<number | null>(null);
    const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
    const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [isSmartFolderModalOpen, setIsSmartFolderModalOpen] = useState(false);
    const [smartFolderToEdit, setSmartFolderToEdit] = useState<SmartCollection | null>(null);
    const [initialSmartFolderQuery, setInitialSmartFolderQuery] = useState<string | undefined>();
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
    const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [confirmation, setConfirmation] = useState<ConfirmationState>(initialConfirmationState);
    const { apiKey } = useApiKey();
    const [isDemoMode, setIsDemoMode] = useState(false);

    useEffect(() => {
        const hasSeenWelcome = localStorage.getItem('wesai-seen-welcome');
        if (!hasSeenWelcome && !isDemoMode) {
            setIsWelcomeModalOpen(true);
        }
    }, [isDemoMode]);

    useEffect(() => {
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    useEffect(() => {
        try {
            localStorage.setItem('wesai-sidebar-collapsed', String(isSidebarCollapsed));
        } catch (error) {
            console.error("Failed to save sidebar collapsed state to localStorage", error);
        }
    }, [isSidebarCollapsed]);


    useEffect(() => {
        const handleRateLimit = () => {
            setIsAiRateLimited(true);
            if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
            rateLimitTimerRef.current = window.setTimeout(() => setIsAiRateLimited(false), 60000);
        };
        window.addEventListener('ai-rate-limit', handleRateLimit);
        return () => {
            window.removeEventListener('ai-rate-limit', handleRateLimit);
            if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
        };
    }, []);
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().includes('MAC');
            const modKey = isMac ? event.metaKey : event.ctrlKey;

            if (modKey && event.key.toLowerCase() === 'k') {
                 event.preventDefault(); 
                 setIsCommandPaletteOpen(prev => !prev); 
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const toggleTheme = useCallback(() => setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light')), []);
    const toggleSidebarCollapsed = useCallback(() => setIsSidebarCollapsed(prev => !prev), []);
    const onToggleSidebar = useCallback(() => setIsSidebarOpen(p => !p), []);
    const openSettings = useCallback(() => setIsSettingsOpen(true), []);
    const openSmartFolderModal = useCallback((folder: SmartCollection | null, query?: string) => {
        setSmartFolderToEdit(folder);
        setInitialSmartFolderQuery(query);
        setIsSmartFolderModalOpen(true);
    }, []);
    const onOpenContextMenu = useCallback((e: React.MouseEvent, items: ContextMenuItem[]) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, items }); }, []);
    const closeWelcomeModal = useCallback(() => { localStorage.setItem('wesai-seen-welcome', 'true'); setIsWelcomeModalOpen(false); }, []);
    const openHelpModal = useCallback(() => setIsHelpModalOpen(true), []);
    
    const showConfirmation = useCallback((options: ConfirmationOptions) => {
        setConfirmation({ ...options, isOpen: true });
    }, []);

    const hideConfirmation = useCallback(() => {
        setConfirmation(prev => ({ ...initialConfirmationState, isOpen: false }));
    }, []);

    const uiValue = useMemo(() => ({
        theme, toggleTheme, view, setView, isMobileView, isSidebarOpen, setIsSidebarOpen,
        onToggleSidebar, isSidebarCollapsed, toggleSidebarCollapsed,
        isAiRateLimited, renamingItemId, setRenamingItemId, isSettingsOpen, setIsSettingsOpen,
        openSettings, isCommandPaletteOpen, setIsCommandPaletteOpen, isSmartFolderModalOpen,
        setIsSmartFolderModalOpen, smartFolderToEdit, openSmartFolderModal, contextMenu,
        setContextMenu, onOpenContextMenu, isWelcomeModalOpen, closeWelcomeModal, isApiKeyMissing: !apiKey && !isDemoMode,
        draggingItemId, setDraggingItemId,
        confirmation, showConfirmation, hideConfirmation,
        isHelpModalOpen, setIsHelpModalOpen, openHelpModal,
        initialSmartFolderQuery,
        isDemoMode, setIsDemoMode,
    }), [
        theme, toggleTheme, view, setView, isMobileView, isSidebarOpen, setIsSidebarOpen,
        onToggleSidebar, isSidebarCollapsed, toggleSidebarCollapsed,
        isAiRateLimited, renamingItemId, setRenamingItemId, isSettingsOpen, setIsSettingsOpen,
        openSettings, isCommandPaletteOpen, setIsCommandPaletteOpen, isSmartFolderModalOpen,
        setIsSmartFolderModalOpen, smartFolderToEdit, openSmartFolderModal, contextMenu,
        setContextMenu, onOpenContextMenu, isWelcomeModalOpen, closeWelcomeModal, apiKey,
        draggingItemId, setDraggingItemId,
        confirmation, showConfirmation, hideConfirmation,
        isHelpModalOpen, setIsHelpModalOpen, openHelpModal,
        initialSmartFolderQuery, isDemoMode, setIsDemoMode
    ]);
    
    return uiValue;
}