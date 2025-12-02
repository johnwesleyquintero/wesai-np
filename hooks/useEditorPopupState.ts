import React, { useMemo } from 'react';
import { NoteEditorAction, NoteEditorUIState } from './useNoteEditorReducer';
import { InlineAction, SpellingError } from '../types';

interface UseEditorPopupStateProps {
    uiState: NoteEditorUIState;
    dispatch: React.Dispatch<NoteEditorAction>;
    editorPaneRef: React.RefObject<HTMLElement>;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    desiredCursorPosRef: React.MutableRefObject<number | { start: number; end: number } | null>;
    activeSpellingError: { error: SpellingError; rect: DOMRect } | null;
    setActiveSpellingError: (error: { error: SpellingError; rect: DOMRect } | null) => void;
    spellingSuggestions: string[];
    isLoadingSuggestions: boolean;
    suggestionError: string | null;
    isApiKeyMissing: boolean;
    isAiEnabled: boolean;
    handlers: {
        handleInsertLink: (noteId: string, noteTitle: string) => void;
        handleInsertSyncedBlock: (templateId: string) => void;
        handleSelectCommand: (commandId: string) => void;
        handleInlineAiAction: (action: InlineAction, selection: NonNullable<NoteEditorUIState['selection']>) => Promise<any>;
        handleFormatSelection: (format: 'bold' | 'italic' | 'code' | 'link') => void;
        handleApplySuggestion: (suggestion: string) => void;
        handleParagraphAiAction: (action: InlineAction, selection: { start: number; end: number }) => void;
    }
}

export const useEditorPopupState = ({
    uiState,
    dispatch,
    editorPaneRef,
    textareaRef,
    desiredCursorPosRef,
    activeSpellingError,
    setActiveSpellingError,
    spellingSuggestions,
    isLoadingSuggestions,
    suggestionError,
    isApiKeyMissing,
    isAiEnabled,
    handlers
}: UseEditorPopupStateProps) => {
    
    // Memoize the props object passed to EditorPopups to avoid unnecessary re-renders of the popups container
    // when unrelated editor state (like save status) changes.
    return useMemo(() => ({
        noteLinker: uiState.noteLinker,
        templateLinker: uiState.templateLinker,
        slashCommand: uiState.slashCommand,
        selection: uiState.selection,
        noteLinkerForSelection: uiState.noteLinkerForSelection,
        gutterMenu: uiState.gutterMenu,
        activeSpellingError: activeSpellingError,
        spellingSuggestions: spellingSuggestions,
        isLoadingSuggestions: isLoadingSuggestions,
        suggestionError: suggestionError,
        isAiActionLoading: uiState.isAiActionLoading,
        isApiKeyMissing: isApiKeyMissing,
        isAiEnabled: isAiEnabled,
        
        onInsertLink: handlers.handleInsertLink,
        onInsertSyncedBlock: handlers.handleInsertSyncedBlock,
        onSelectCommand: handlers.handleSelectCommand,
        onInlineAiAction: (action: InlineAction) => {
            if (uiState.selection) {
                return handlers.handleInlineAiAction(action, uiState.selection);
            }
            return Promise.resolve(null);
        },
        onFormatSelection: handlers.handleFormatSelection,
        onApplySpellingSuggestion: handlers.handleApplySuggestion,
        onParagraphAiAction: handlers.handleParagraphAiAction,
        
        closeNoteLinker: () => dispatch({ type: 'SET_NOTE_LINKER', payload: null }),
        closeTemplateLinker: () => dispatch({ type: 'SET_TEMPLATE_LINKER', payload: null }),
        closeSlashCommand: () => dispatch({ type: 'SET_SLASH_COMMAND', payload: null }),
        closeSelection: () => dispatch({ type: 'SET_SELECTION', payload: null }),
        closeSpelling: () => setActiveSpellingError(null),
        closeGutterMenu: () => dispatch({ type: 'SET_GUTTER_MENU', payload: null }),
        
        editorPaneRef,
        textareaRef,
        desiredCursorPosRef
    }), [
        uiState.noteLinker, uiState.templateLinker, uiState.slashCommand, uiState.selection,
        uiState.noteLinkerForSelection, uiState.gutterMenu, activeSpellingError, spellingSuggestions,
        isLoadingSuggestions, suggestionError, uiState.isAiActionLoading, isApiKeyMissing, isAiEnabled,
        handlers, dispatch, setActiveSpellingError, editorPaneRef, textareaRef, desiredCursorPosRef
    ]);
};