import React from 'react';
import { Session } from '@supabase/supabase-js';

export type AuthSession = Session;

export interface NoteVersion {
    id?: string;
    noteId?: string;
    userId?: string;
    savedAt: string;
    title: string;
    content: string;
    tags: string[];
}

export interface Note {
    id: string;
    userId?: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    isFavorite: boolean;
    tags: string[];
    history: NoteVersion[];
    parentId: string | null;
}

export interface Collection {
    id: string;
    userId?: string;
    name: string;
    parentId: string | null;
}

export interface SmartCollection {
    id: string;
    userId?: string;
    name: string;
    query: string;
}

export interface Template {
    id: string;
    title: string;
    content: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'ai' | 'tool';
    content: string | { name: string; args: any; result?: any; status: 'pending' | 'complete' | 'error' };
    sources?: Note[];
    image?: string;
    status?: 'processing' | 'complete';
    noteId?: string;
}

export type SearchMode = 'KEYWORD' | 'AI';

export type ChatMode = 'ASSISTANT' | 'RESPONDER' | 'WESCORE_COPILOT' | 'AMAZON';

export type ChatStatus = 'idle' | 'searching' | 'replying' | 'using_tool';

export type ViewState = 'NOTES' | 'CHAT' | 'CTR_ANALYTICS' | 'TREND_ANALYSIS' | 'GRAPH';

export interface SpellingError {
    word: string;
    index: number;
    length: number;
}

export type InlineAction = 'fix' | 'shorten' | 'expand' | 'simplify' | 'makeProfessional' | 'makeCasual';

export interface EditorActions {
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    applyAiActionToFullNote: (action: InlineAction) => Promise<void>;
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

export interface ConfirmationOptions {
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    confirmClass?: string;
    confirmationRequiredText?: string;
}

export interface ConfirmationState extends ConfirmationOptions {
    isOpen: boolean;
}

export interface ContextMenuItem {
    label: string;
    action?: () => void;
    icon?: React.ReactElement;
    isDestructive?: boolean;
    children?: ContextMenuItem[];
    disabled?: boolean;
}

export type TreeNode = (Note | (Collection & { type: 'collection' })) & {
    children: TreeNode[];
};