
import React from 'react';
import { NoteLinkerState, SelectionState, SlashCommandState } from '../../hooks/useNoteEditorReducer';
import { InlineAction, SpellingError } from '../../types';
import NoteLinker from '../NoteLinker';
import TemplateLinker from '../TemplateLinker';
import SlashCommandMenu from '../SlashCommandMenu';
import InlineAiMenu from '../InlineAiMenu';
import SpellcheckMenu from '../SpellcheckMenu';
import ParagraphActionMenu from './ParagraphActionMenu';

interface EditorPopupsProps {
    noteLinker: NoteLinkerState;
    templateLinker: NoteLinkerState;
    slashCommand: SlashCommandState;
    selection: SelectionState;
    noteLinkerForSelection: SelectionState;
    gutterMenu: { anchorRect: DOMRect; start: number; end: number } | null;
    activeSpellingError: { error: SpellingError; rect: DOMRect } | null;
    spellingSuggestions: string[];
    isLoadingSuggestions: boolean;
    suggestionError: string | null;
    isAiActionLoading: boolean;
    isApiKeyMissing: boolean;
    isAiEnabled: boolean;
    
    // Actions
    onInsertLink: (noteId: string, noteTitle: string) => void;
    onInsertSyncedBlock: (templateId: string) => void;
    onSelectCommand: (commandId: string) => void;
    onInlineAiAction: (action: InlineAction) => Promise<any>;
    onFormatSelection: (format: 'bold' | 'italic' | 'code' | 'link') => void;
    onApplySpellingSuggestion: (suggestion: string) => void;
    onParagraphAiAction: (action: InlineAction, selection: { start: number; end: number }) => void;
    
    // State Setters / Closers
    closeNoteLinker: () => void;
    closeTemplateLinker: () => void;
    closeSlashCommand: () => void;
    closeSelection: () => void;
    closeSpelling: () => void;
    closeGutterMenu: () => void;
    
    // Refs
    editorPaneRef: React.RefObject<HTMLElement>;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    desiredCursorPosRef: React.MutableRefObject<number | { start: number; end: number } | null>;
}

const EditorPopups: React.FC<EditorPopupsProps> = ({
    noteLinker,
    templateLinker,
    slashCommand,
    selection,
    noteLinkerForSelection,
    gutterMenu,
    activeSpellingError,
    spellingSuggestions,
    isLoadingSuggestions,
    suggestionError,
    isAiActionLoading,
    isApiKeyMissing,
    isAiEnabled,
    onInsertLink,
    onInsertSyncedBlock,
    onSelectCommand,
    onInlineAiAction,
    onFormatSelection,
    onApplySpellingSuggestion,
    onParagraphAiAction,
    closeNoteLinker,
    closeTemplateLinker,
    closeSlashCommand,
    closeSelection,
    closeSpelling,
    closeGutterMenu,
    editorPaneRef,
    textareaRef,
    desiredCursorPosRef
}) => {
    return (
        <>
            {(noteLinker || noteLinkerForSelection) && (
                <NoteLinker 
                    editorPaneRef={editorPaneRef} 
                    query={noteLinker?.query || ''} 
                    onSelect={onInsertLink} 
                    onClose={() => { 
                        closeNoteLinker(); 
                        // If we were linking for a selection, closing essentially cancels that specific mode
                        if (noteLinkerForSelection) closeNoteLinker(); 
                    }} 
                    position={noteLinker?.position || { top: noteLinkerForSelection!.rect.bottom, left: noteLinkerForSelection!.rect.left }} 
                />
            )}
            
            {templateLinker && (
                <TemplateLinker 
                    editorPaneRef={editorPaneRef} 
                    query={templateLinker.query} 
                    onSelect={onInsertSyncedBlock} 
                    onClose={closeTemplateLinker} 
                    position={templateLinker.position} 
                />
            )}
            
            {slashCommand && (
                <SlashCommandMenu 
                    editorPaneRef={editorPaneRef} 
                    query={slashCommand.query} 
                    position={slashCommand.position} 
                    onSelect={onSelectCommand} 
                    onClose={closeSlashCommand} 
                    textareaRef={textareaRef} 
                />
            )}
            
            <InlineAiMenu 
                editorPaneRef={editorPaneRef} 
                selection={selection} 
                onAction={async (action) => { 
                    if (selection) { 
                        const newPos = await onInlineAiAction(action); 
                        if (newPos !== null && textareaRef.current) { 
                            textareaRef.current.focus(); 
                            desiredCursorPosRef.current = newPos; 
                        } 
                    } 
                }} 
                onFormat={onFormatSelection} 
                isLoading={isAiActionLoading} 
                onClose={closeSelection} 
                isApiKeyMissing={isApiKeyMissing} 
                isAiEnabled={isAiEnabled} 
            />
            
            <SpellcheckMenu 
                editorPaneRef={editorPaneRef} 
                activeError={activeSpellingError} 
                suggestions={spellingSuggestions} 
                onSelect={onApplySpellingSuggestion} 
                isLoading={isLoadingSuggestions} 
                error={suggestionError} 
                onClose={closeSpelling} 
            />
            
            {gutterMenu && (
                <ParagraphActionMenu
                    anchorRect={gutterMenu.anchorRect}
                    onClose={closeGutterMenu}
                    onAction={(action) => {
                        onParagraphAiAction(action, { start: gutterMenu.start, end: gutterMenu.end });
                    }}
                    editorPaneRef={editorPaneRef}
                />
            )}
        </>
    );
};

export default React.memo(EditorPopups);