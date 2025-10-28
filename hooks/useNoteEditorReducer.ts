import { useReducer } from 'react';
import { NoteVersion } from '../types';

// Define state shapes from NoteEditor
export type SelectionState = { start: number; end: number; text: string; rect: DOMRect } | null;
export type NoteLinkerState = { query: string; position: { top: number; left: number } } | null;
export type SlashCommandState = { query: string; position: { top: number; left: number }, range: { start: number, end: number } } | null;

export interface NoteEditorUIState {
    saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
    isHistoryOpen: boolean;
    previewVersion: NoteVersion | null;
    viewMode: 'edit' | 'preview';
    selection: SelectionState;
    noteLinker: NoteLinkerState;
    templateLinker: NoteLinkerState;
    noteLinkerForSelection: SelectionState;
    slashCommand: SlashCommandState;
    isDragOver: boolean;
    isAiActionLoading: boolean; // inline
    isFullAiActionLoading: string | null; // full note
    aiActionError: string | null;
}

export const initialNoteEditorUIState: NoteEditorUIState = {
    saveStatus: 'saved',
    isHistoryOpen: false,
    previewVersion: null,
    viewMode: 'preview',
    selection: null,
    noteLinker: null,
    templateLinker: null,
    noteLinkerForSelection: null,
    slashCommand: null,
    isDragOver: false,
    isAiActionLoading: false,
    isFullAiActionLoading: null,
    aiActionError: null,
};

export type NoteEditorAction =
    | { type: 'SET_SAVE_STATUS'; payload: 'saved' | 'saving' | 'unsaved' | 'error' }
    | { type: 'SET_HISTORY_OPEN'; payload: boolean }
    | { type: 'SET_PREVIEW_VERSION'; payload: NoteVersion | null }
    | { type: 'SET_VIEW_MODE'; payload: 'edit' | 'preview' }
    | { type: 'SET_SELECTION'; payload: SelectionState }
    | { type: 'SET_NOTE_LINKER'; payload: NoteLinkerState }
    | { type: 'SET_TEMPLATE_LINKER'; payload: NoteLinkerState }
    | { type: 'SET_NOTE_LINKER_FOR_SELECTION'; payload: SelectionState }
    | { type: 'SET_SLASH_COMMAND'; payload: SlashCommandState }
    | { type: 'SET_DRAG_OVER'; payload: boolean }
    | { type: 'SET_AI_ACTION_LOADING'; payload: boolean }
    | { type: 'SET_FULL_AI_ACTION_LOADING'; payload: string | null }
    | { type: 'SET_AI_ACTION_ERROR'; payload: string | null }
    | { type: 'RESET_STATE_FOR_NEW_NOTE' };

const reducer = (state: NoteEditorUIState, action: NoteEditorAction): NoteEditorUIState => {
    switch (action.type) {
        case 'SET_SAVE_STATUS':
            return { ...state, saveStatus: action.payload };
        case 'SET_HISTORY_OPEN':
            // When closing history, also clear any active version preview
            return { ...state, isHistoryOpen: action.payload, previewVersion: action.payload ? state.previewVersion : null };
        case 'SET_PREVIEW_VERSION':
            return { ...state, previewVersion: action.payload };
        case 'SET_VIEW_MODE':
            return { ...state, viewMode: action.payload };
        case 'SET_SELECTION':
            return { ...state, selection: action.payload };
        case 'SET_NOTE_LINKER':
            // Note linker and slash command are mutually exclusive
            return { ...state, noteLinker: action.payload, slashCommand: null, templateLinker: null };
        case 'SET_TEMPLATE_LINKER':
            return { ...state, templateLinker: action.payload, slashCommand: null, noteLinker: null };
        case 'SET_NOTE_LINKER_FOR_SELECTION':
             // When linking from selection, clear the main selection popup
            return { ...state, noteLinkerForSelection: action.payload, selection: null };
        case 'SET_SLASH_COMMAND':
            // Note linker and slash command are mutually exclusive
            return { ...state, slashCommand: action.payload, noteLinker: null, templateLinker: null };
        case 'SET_DRAG_OVER':
            return { ...state, isDragOver: action.payload };
        case 'SET_AI_ACTION_LOADING':
            // When an inline AI action starts, hide the selection menu
            return { ...state, isAiActionLoading: action.payload, selection: action.payload ? null : state.selection };
        case 'SET_FULL_AI_ACTION_LOADING':
            return { ...state, isFullAiActionLoading: action.payload };
        case 'SET_AI_ACTION_ERROR':
            return { ...state, aiActionError: action.payload };
        case 'RESET_STATE_FOR_NEW_NOTE':
            return { ...initialNoteEditorUIState };
        default:
            return state;
    }
};

export const useNoteEditorReducer = () => {
    return useReducer(reducer, initialNoteEditorUIState);
};
