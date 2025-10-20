import React, { createContext, useContext } from 'react';
import { Note, Template, ChatMessage, FilterType, SearchMode, EditorActions } from '../types';

interface AppContextType {
    notes: Note[];
    activeNote: Note | null;
    templates: Template[];
    theme: 'light' | 'dark';
    view: 'NOTES' | 'CHAT';
    isMobileView: boolean;
    isSidebarOpen: boolean;
    isAiRateLimited: boolean;
    
    // App actions
    onAddNote: () => void;
    onCopyNote: (noteId: string) => void;
    onSelectNote: (id: string) => void;
    onDeleteNote: (note: Note) => void;
    onToggleFavorite: (id: string) => void;
    toggleTheme: () => void;
    onSetView: (view: 'NOTES' | 'CHAT') => void;
    setIsSidebarOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
    openSettings: () => void;
    getNoteById: (id: string) => Note | undefined;

    // Editor actions - managed by NoteEditor
    editorActions: EditorActions | null;
    registerEditorActions: (actions: EditorActions) => void;
    unregisterEditorActions: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
