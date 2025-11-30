
import React, { useCallback } from 'react';
import { NoteEditorAction, NoteEditorUIState } from './useNoteEditorReducer';
import { SpellingError } from '../types';

interface UseEditorInsertionLogicProps {
    setEditorState: (newStateOrFn: any) => void;
    dispatch: React.Dispatch<NoteEditorAction>;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    desiredCursorPosRef: React.MutableRefObject<number | { start: number; end: number } | null>;
    uiState: NoteEditorUIState;
    activeSpellingError: { error: SpellingError; rect: DOMRect } | null;
    summarizeAndFindActionForFullNote: (content: string) => Promise<void>;
    applyAiActionToFullNote: (action: any, content: string) => Promise<void>;
}

export const useEditorInsertionLogic = ({
    setEditorState,
    dispatch,
    textareaRef,
    desiredCursorPosRef,
    uiState,
    activeSpellingError,
    summarizeAndFindActionForFullNote,
    applyAiActionToFullNote,
}: UseEditorInsertionLogicProps) => {
    const { noteLinkerForSelection, noteLinker, templateLinker, slashCommand, selection } = uiState;

    const handleInsertLink = useCallback((noteId: string, noteTitle: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        if (noteLinkerForSelection) {
            const { start, end, text } = noteLinkerForSelection;
            setEditorState((prev: any) => ({ ...prev, content: `${prev.content.substring(0, start)}[[${noteId}|${text}]]${prev.content.substring(end)}` }));
            dispatch({ type: 'SET_NOTE_LINKER_FOR_SELECTION', payload: null });
            const pos = start + noteId.length + text.length + 5;
            desiredCursorPosRef.current = pos;
            textarea.focus();
        } else if (noteLinker) {
            const { selectionStart } = textarea; const startIndex = selectionStart - noteLinker.query.length - 2;
            setEditorState((prev: any) => ({ ...prev, content: `${prev.content.substring(0, startIndex)}[[${noteId}|${noteTitle}]]${prev.content.substring(selectionStart)}` }));
            dispatch({ type: 'SET_NOTE_LINKER', payload: null });
            const pos = startIndex + noteId.length + noteTitle.length + 5;
            desiredCursorPosRef.current = pos;
            textarea.focus();
        }
    }, [noteLinkerForSelection, noteLinker, setEditorState, dispatch, textareaRef, desiredCursorPosRef]);

    const handleInsertSyncedBlock = useCallback((templateId: string) => {
        if (!templateLinker) return;
        const textarea = textareaRef.current;
        if (!textarea) return;
        const { selectionStart } = textarea;
        const startIndex = selectionStart - templateLinker.query.length;
        setEditorState((prev: any) => ({ ...prev, content: `${prev.content.substring(0, startIndex)}[[sync:${templateId}]]${prev.content.substring(selectionStart)}` }));
        dispatch({ type: 'SET_TEMPLATE_LINKER', payload: null });
        const pos = startIndex + `[[sync:${templateId}]]`.length;
        desiredCursorPosRef.current = pos;
        textarea.focus();
    }, [templateLinker, setEditorState, dispatch, textareaRef, desiredCursorPosRef]);

    const handleSelectCommand = useCallback((commandId: string) => {
        if (!slashCommand) return;
        const { range, position } = slashCommand;
        
        const replaceCommandText = (replacement: string, cursorOffset = replacement.length) => {
            setEditorState((prev: any) => {
                const newContent = prev.content.substring(0, range.start) + replacement + prev.content.substring(range.end);
                return { ...prev, content: newContent };
            });
            const pos = range.start + cursorOffset;
            desiredCursorPosRef.current = pos;
            textareaRef.current?.focus();
        };
        switch(commandId) {
            case 'h1': replaceCommandText('# '); break; case 'h2': replaceCommandText('## '); break;
            case 'h3': replaceCommandText('### '); break; case 'list': replaceCommandText('- '); break;
            case 'todo': replaceCommandText('- [ ] '); break; case 'divider': replaceCommandText('---\n'); break;
            case 'ai-summarize': 
                setEditorState((prev: any) => {
                    const content = prev.content.substring(0, range.start) + prev.content.substring(range.end); // remove command text first
                    summarizeAndFindActionForFullNote(content); 
                    return { ...prev, content };
                });
                break;
            case 'ai-fix':
                setEditorState((prev: any) => {
                    const content = prev.content.substring(0, range.start) + prev.content.substring(range.end); // remove command text first
                    applyAiActionToFullNote('fix', content);
                    return { ...prev, content };
                });
                break;
            case 'synced-block':
                setEditorState((prev: any) => ({...prev, content: prev.content.substring(0, range.start) + prev.content.substring(range.end)}));
                dispatch({ type: 'SET_TEMPLATE_LINKER', payload: { query: '', position }});
                break;
            default: break;
        }
        dispatch({ type: 'SET_SLASH_COMMAND', payload: null });
    }, [slashCommand, setEditorState, dispatch, textareaRef, desiredCursorPosRef, summarizeAndFindActionForFullNote, applyAiActionToFullNote]);

    const handleFormatSelection = useCallback((format: 'bold' | 'italic' | 'code' | 'link') => {
        if (!selection) return;
        if (format === 'link') { dispatch({ type: 'SET_NOTE_LINKER_FOR_SELECTION', payload: selection }); return; }
        const { start, end, text } = selection; let prefix = '', suffix = '';
        switch(format) {
            case 'bold': prefix = suffix = '**'; break; case 'italic': prefix = suffix = '*'; break; case 'code': prefix = suffix = '`'; break;
        }
        setEditorState((prev: any) => ({...prev, content: prev.content.substring(0, start) + prefix + text + suffix + prev.content.substring(end)}));
        dispatch({ type: 'SET_SELECTION', payload: null });
        const pos = end + prefix.length + suffix.length;
        desiredCursorPosRef.current = pos;
        textareaRef.current?.focus();
    }, [selection, dispatch, setEditorState, textareaRef, desiredCursorPosRef]);

    const handleApplySuggestion = useCallback((suggestion: string) => {
        if (!activeSpellingError) return;
        const { index, length } = activeSpellingError.error;
        setEditorState((prev: any) => ({ ...prev, content: prev.content.substring(0, index) + suggestion + prev.content.substring(index + length) }));
        // Just clear the error in parent component, done via setActiveSpellingError(null) passed to popups
    }, [activeSpellingError, setEditorState]);

    return {
        handleInsertLink,
        handleInsertSyncedBlock,
        handleSelectCommand,
        handleFormatSelection,
        handleApplySuggestion
    };
};
