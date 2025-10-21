import React, { createContext, useContext } from 'react';
import { Note, Template, Collection, SmartCollection, EditorActions, ContextMenuItem } from '../types';

interface AppContextType {
    // Data
    notes: Note[];
    collections: Collection[];
    smartCollections: SmartCollection[];
    activeNote: Note | null;
    templates: Template[];
    
    // UI State
    theme: 'light' | 'dark';
    view: 'NOTES' | 'CHAT';
    isMobileView: boolean;
    isSidebarOpen: boolean;
    isAiRateLimited: boolean;
    renamingItemId: string | null;

    // Actions
    onAddNote: (parentId?: string | null) => void;
    onAddNoteFromFile: (title: string, content: string, parentId: string | null) => string;
    onAddCollection: (name: string, parentId?: string | null) => void;
    onCopyNote: (noteId: string) => void;
    onSelectNote: (id: string) => void;
    onDeleteNote: (note: Note) => void;
    onDeleteCollection: (collection: Collection) => void;
    onDeleteSmartCollection: (collection: SmartCollection) => void;
    onOpenSmartFolderModal: (folder: SmartCollection | null) => void;
    onToggleFavorite: (id: string) => void;
    onUpdateCollection: (id: string, updatedFields: Partial<Omit<Collection, 'id'>>) => void;
    onRenameNote: (id: string, newTitle: string) => void;
    onMoveItem: (draggedItemId: string, targetItemId: string | null, position: 'top' | 'bottom' | 'inside') => void;
    setRenamingItemId: (id: string | null) => void;
    toggleTheme: () => void;
    onSetView: (view: 'NOTES' | 'CHAT') => void;
    setIsSidebarOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
    openSettings: () => void;
    getNoteById: (id: string) => Note | undefined;
    onOpenContextMenu: (e: React.MouseEvent, items: ContextMenuItem[]) => void;

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