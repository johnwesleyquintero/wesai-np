import React from 'react';

export interface NoteVersion {
    savedAt: string;
    title: string;
    content: string;
    tags: string[];
}

export interface Note {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    isFavorite: boolean;
    tags: string[];
    history: NoteVersion[];
    parentId: string | null;
    order: number;
}

export interface Collection {
    id: string;
    name: string;
    parentId: string | null;
    order: number;
}

export interface SmartCollection {
    id: string;
    name: string;
    query: string;
}

export interface Template {
    id: string;
    title: string;
    content: string;
}

export interface ChatMessage {
    role: 'user' | 'ai';
    content: string;
    sources?: Note[];
    image?: string;
}

export type FilterType = 'RECENT' | 'FAVORITES' | 'ALL';

export type SearchMode = 'KEYWORD' | 'AI';

export type ChatMode = 'ASSISTANT' | 'RESPONDER' | 'GENERAL';

export interface SpellingError {
    word: string;
    index: number;
    length: number;
}

export interface EditorActions {
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    applyAiActionToFullNote: (action: import('./services/geminiService').InlineAction) => Promise<void>;
    suggestTagsForFullNote: () => void;
    suggestTitleForFullNote: () => void;
    summarizeAndFindActionForFullNote: () => Promise<void>;
}

export interface Command {
    id: string;
    name: string;
    action: () => void;
    icon: React.ReactElement;
    keywords?: string;
    section: 'Navigation' | 'Note' | 'AI' | 'Settings';
}

export interface SlashCommand {
    id: string;
    name: string;
    description: string;
    section: 'Formatting' | 'AI Actions' | 'Insert';
    icon: React.ReactElement;
    keywords?: string;
}

export interface ToastMessage {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

export interface ContextMenuItem {
    label: string;
    action: () => void;
    icon?: React.ReactElement;
    isDestructive?: boolean;
}