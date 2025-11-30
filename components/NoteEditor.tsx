
import React, { useEffect, useRef, useMemo, useCallback, useState, useLayoutEffect } from 'react';
import { Note, NoteVersion, Template, InlineAction } from '../types';
import EditorHeader from './editor/EditorHeader';
import EditorTitle from './editor/EditorTitle';
import EditorContent from './editor/EditorContent';
import EditorMeta from './editor/EditorMeta';
import EditorStatusBar from './editor/EditorStatusBar';
import VersionHistorySidebar from './VersionHistorySidebar';
import { useUndoableState } from '../hooks/useUndoableState';
import { useEditorContext, useStoreContext, useUIContext, useAuthContext } from '../context/AppContext';
import { useBacklinks } from '../hooks/useBacklinks';
import { useToast } from '../context/ToastContext';
import { useSpellcheck } from '../hooks/useSpellcheck';
import { useNoteEditorReducer } from '../hooks/useNoteEditorReducer';
import { useAiSuggestions } from '../hooks/useAiSuggestions';
import { useAiActions } from '../hooks/useAiActions';
import { useEditorHotkeys } from '../hooks/useEditorHotkeys';
import { useNoteInputHandlers } from '../hooks/useNoteInputHandlers';
import { SparklesIcon } from './Icons';
import { getCursorPositionRect, getLineInfoForPosition } from '../lib/editorDOMUtils';
import EditorPopups from './editor/EditorPopups';
import NoteLinker from '../components/NoteLinker';
import TemplateLinker from '../components/TemplateLinker';
import SlashCommandMenu from '../components/SlashCommandMenu';
import InlineAiMenu from '../components/InlineAiMenu';
import SpellcheckMenu from '../components/SpellcheckMenu';
import ParagraphActionMenu from './editor/ParagraphActionMenu';

interface NoteEditorProps {
    note: Note;
}

type NoteState = { title: string; content: string; tags: string[] };

const areNoteStatesEqual = (a: NoteState, b: NoteState): boolean => {
    if (!a || !b) return a === b;
    if (a.title !== b.title || a.content !== b.content) {
        return false;
    }
    if (a.tags.length !== b.tags.length) {
        return false;
    }
    const tagsSetA = new Set(a.tags);
    for (const tag of b.tags) {
        if (!tagsSetA.has(tag)) {
            return false;
        }
    }
    return true;
};


const NoteEditor: React.FC<NoteEditorProps> = ({ note }) => {
    const { updateNote, toggleFavorite, notes, restoreNoteVersion } = useStoreContext();
    const { isMobileView, onToggleSidebar, isAiRateLimited, isSettingsOpen, isCommandPaletteOpen, isSmartFolderModalOpen, isWelcomeModalOpen, isApiKeyMissing, isFocusMode, showConfirmation, hideConfirmation, isAiEnabled, isHelpOpen, confirmation } = useUIContext();
    const { session } = useAuthContext();
    const { showToast } = useToast();
    const { registerEditorActions, unregisterEditorActions } = useEditorContext();

    const EDITOR_SESSION_KEY = `wescore-editor-session-${note.id}`;

    const {
        state: editorState,
        set: setEditorState,
        setPresent,
        reset: resetEditorState,
        undo,
        redo,
        canUndo,
        canRedo,
    } = useUndoableState<NoteState>(
        {
            title: note.title,
            content: note.content,
            tags: note.tags,
        },
        {
            isEqual: areNoteStatesEqual,
            sessionKey: EDITOR_SESSION_KEY,
        }
    );
    
    const latestEditorStateRef = useRef(editorState);
    useEffect(() => {
        latestEditorStateRef.current = editorState;
    }, [editorState]);
    
    const prevNoteRef = useRef(note);
    const [lastWarnedTimestamp, setLastWarnedTimestamp] = useState<string | null>(null);
    const [paragraphGutterTarget, setParagraphGutterTarget] = useState<{ start: number; rect: DOMRect } | null>(null);
    const stateWhenLastSavedRef = useRef<NoteState | null>(null);

    const [uiState, dispatch] = useNoteEditorReducer();
    const {
        saveStatus, isHistoryOpen, previewVersion, viewMode, selection, noteLinker, templateLinker, noteLinkerForSelection,
        slashCommand, isDragOver, isAiActionLoading, isFullAiActionLoading, gutterMenu,
    } = uiState;

    const { 
        suggestedTags, isSuggestingTags,
        suggestedTitle, isSuggestingTitle,
        setSuggestedTags, setSuggestedTitle,
        suggestTagsForFullNote, suggestTitleForFullNote, resetAiSuggestions
    } = useAiSuggestions(editorState, isAiRateLimited || !isAiEnabled);
    
    const {
        applyAiActionToFullNote,
        summarizeAndFindActionForFullNote,
        handleEnhanceNote,
        handleInlineAiAction,
        handleParagraphAiAction: performParagraphAiAction,
    } = useAiActions(setEditorState, dispatch);

    const isEffectivelyReadOnly = !!previewVersion || viewMode === 'preview' || !!isFullAiActionLoading;

    const { 
        spellingErrors, isCheckingSpelling, activeSpellingError, setActiveSpellingError,
        spellingSuggestions, isLoadingSuggestions, suggestionError 
    } = useSpellcheck(editorState.content, isEffectivelyReadOnly || isAiRateLimited || isApiKeyMissing || !isAiEnabled);

    const backlinks = useBacklinks(note.id, notes);
    
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        notes.forEach(note => {
            if (note.tags) {
                note.tags.forEach(tag => tagSet.add(tag));
            }
        });
        return Array.from(tagSet).sort();
    }, [notes]);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const editorPaneRef = useRef<HTMLDivElement>(null);
    const cursorMeasureRef = useRef<HTMLPreElement>(null);
    const hasAutoTitledRef = useRef(false);
    const isScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<number | null>(null);
    
    const { 
        handleKeyDown, 
        handleDrop, 
        handlePaste, 
        desiredCursorPosRef 
    } = useNoteInputHandlers({
        editorState,
        setEditorState,
        textareaRef,
        dispatch,
        noteId: note.id,
        session,
        isEffectivelyReadOnly
    });

    useLayoutEffect(() => {
        if (desiredCursorPosRef.current !== null && textareaRef.current) {
            const pos = desiredCursorPosRef.current;
            if (typeof pos === 'number') {
                textareaRef.current.selectionStart = pos;
                textareaRef.current.selectionEnd = pos;
            } else {
                textareaRef.current.selectionStart = pos.start;
                textareaRef.current.selectionEnd = pos.end;
            }
            desiredCursorPosRef.current = null;
        }
    });

    const displayedTitle = previewVersion ? previewVersion.title : editorState.title;
    const displayedContent = previewVersion ? previewVersion.content : editorState.content;
    const displayedTags = previewVersion ? previewVersion.tags : editorState.tags;
    
    const { wordCount, charCount, readingTime } = useMemo(() => {
        const content = editorState.content;
        const words = content.trim().split(/\s+/).filter(Boolean).length;
        const finalWordCount = content.trim() === '' ? 0 : words;
        const finalReadingTime = Math.ceil(finalWordCount / 200);
        return { wordCount: finalWordCount, charCount: content.length, readingTime: finalReadingTime };
    }, [editorState.content]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea && viewMode === 'edit') {
            const resize = () => {
                textarea.style.height = 'auto';
                textarea.style.height = `${textarea.scrollHeight}px`;
            };
            resize();
            window.addEventListener('resize', resize);
            return () => window.removeEventListener('resize', resize);
        }
    }, [editorState.content, viewMode]);

    useEffect(() => {
        dispatch({ type: 'RESET_STATE_FOR_NEW_NOTE' });
        resetAiSuggestions();
        setActiveSpellingError(null);
        hasAutoTitledRef.current = false;
        setLastWarnedTimestamp(null);
        setParagraphGutterTarget(null);
        
        if (note.title === 'Untitled Note' && note.content === '') {
            dispatch({ type: 'SET_VIEW_MODE', payload: 'edit' });
            setTimeout(() => titleInputRef.current?.focus(), 100);
        }
    }, [note.id, resetAiSuggestions, setActiveSpellingError, dispatch]);
    
    useEffect(() => {
        if (editorState.content.trim() === '') {
            hasAutoTitledRef.current = false;
        }
    }, [editorState.content]);

    useEffect(() => {
        if (note.id !== prevNoteRef.current.id) {
            prevNoteRef.current = note;
            return;
        }
    
        if (note.updatedAt !== prevNoteRef.current.updatedAt) {
            const isSelfUpdate = stateWhenLastSavedRef.current !== null && areNoteStatesEqual(stateWhenLastSavedRef.current, {
                title: note.title,
                content: note.content,
                tags: note.tags,
            });

            if (isSelfUpdate) {
                stateWhenLastSavedRef.current = null;
                setLastWarnedTimestamp(null);
                prevNoteRef.current = note;
                return;
            }
    
            const hasLocalChanges = !areNoteStatesEqual(latestEditorStateRef.current, {
                title: prevNoteRef.current.title,
                content: prevNoteRef.current.content,
                tags: prevNoteRef.current.tags,
            });
    
            if (hasLocalChanges) {
                if (lastWarnedTimestamp !== note.updatedAt) {
                    showConfirmation({
                        title: "Sync Conflict",
                        message: "This note was updated on another device. You can discard your local changes to load the latest version, or cancel to manually copy your work.",
                        confirmText: "Reload & Discard",
                        confirmClass: "bg-red-600 hover:bg-red-700",
                        onConfirm: () => {
                            resetEditorState({ title: note.title, content: note.content, tags: note.tags });
                            setLastWarnedTimestamp(null);
                            hideConfirmation();
                        },
                    });
                    setLastWarnedTimestamp(note.updatedAt);
                }
            } else {
                setPresent({ title: note.title, content: note.content, tags: note.tags });
                setLastWarnedTimestamp(null);
                showToast({
                    message: `"${note.title}" was synced from an external change.`,
                    type: 'info',
                });
            }
        }
        prevNoteRef.current = note;
    }, [note, resetEditorState, showToast, lastWarnedTimestamp, showConfirmation, hideConfirmation, setPresent]);

    useEffect(() => {
        if (previewVersion) return;

        const isLiveDirty = !areNoteStatesEqual(editorState, {
            title: note.title,
            content: note.content,
            tags: note.tags,
        });

        if (isLiveDirty) {
            if (saveStatus === 'saved') {
                dispatch({ type: 'SET_SAVE_STATUS', payload: 'unsaved' });
            }
        } else {
            if (saveStatus !== 'saved') {
                dispatch({ type: 'SET_SAVE_STATUS', payload: 'saved' });
            }
        }
    }, [editorState, note.title, note.content, note.tags, previewVersion, saveStatus, dispatch]);
    
    useEffect(() => {
        const noteAtMount = note;
        const sessionKeyAtMount = `wescore-editor-session-${noteAtMount.id}`;

        return () => {
            const latestStateForNote = latestEditorStateRef.current;
            const isDirty = !areNoteStatesEqual(latestStateForNote, {
                title: noteAtMount.title,
                content: noteAtMount.content,
                tags: noteAtMount.tags,
            });
    
            if (isDirty) {
                updateNote(noteAtMount.id, latestStateForNote).catch(error => {
                     console.error("Failed to save note on unmount/change:", error);
                     showToast({ message: `Failed to save "${noteAtMount.title}".`, type: 'error' });
                });
            }

            try {
                sessionStorage.removeItem(sessionKeyAtMount);
            } catch (e) {
                console.warn(`Could not remove session storage for key ${sessionKeyAtMount}:`, e);
            }
        };
    }, [note.id, updateNote, showToast]);

    const handleSave = useCallback(async () => {
        if (saveStatus === 'saving') return;
        dispatch({ type: 'SET_SAVE_STATUS', payload: 'saving' });
        stateWhenLastSavedRef.current = editorState;
        try {
            await updateNote(note.id, editorState);
            dispatch({ type: 'SET_SAVE_STATUS', payload: 'saved' });
            showToast({ message: 'Note saved!', type: 'success' });
        } catch (error) {
            console.error("Manual save failed:", error);
            showToast({ message: `Save failed. Your changes are safe here.`, type: 'error' });
            dispatch({ type: 'SET_SAVE_STATUS', payload: 'error' });
        }
    }, [note.id, editorState, updateNote, showToast, dispatch, saveStatus]);

    const editorActions = useMemo(() => ({ 
        undo, redo, canUndo, canRedo, 
        applyAiActionToFullNote: (action: InlineAction) => applyAiActionToFullNote(action, editorState.content),
        suggestTagsForFullNote: () => suggestTagsForFullNote(editorState.title, editorState.content),
        suggestTitleForFullNote: () => suggestTitleForFullNote(editorState.content),
        summarizeAndFindActionForFullNote: () => summarizeAndFindActionForFullNote(editorState.content),
    }), [
        undo, redo, canUndo, canRedo, applyAiActionToFullNote, suggestTagsForFullNote, 
        suggestTitleForFullNote, summarizeAndFindActionForFullNote, editorState.title, editorState.content
    ]);

    useEffect(() => {
        registerEditorActions(editorActions);
        return () => unregisterEditorActions();
    }, [registerEditorActions, unregisterEditorActions, editorActions]);
    
    const updateGutterState = useCallback(() => {
        if (isScrollingRef.current) return;
        
        const textarea = textareaRef.current;
        if (!textarea || viewMode !== 'edit' || gutterMenu) {
            setParagraphGutterTarget(current => current ? null : current);
            return;
        }

        const { selectionStart } = textarea;
        const { text, start } = getLineInfoForPosition(editorState.content, selectionStart);
        
        const shouldShow = text && !isEffectivelyReadOnly && isAiEnabled && !isApiKeyMissing;

        if (shouldShow) {
            const measureRef = cursorMeasureRef.current;
            if (measureRef) {
                const rect = getCursorPositionRect(textarea, start, measureRef, editorState.content);
                setParagraphGutterTarget(current => {
                    if (current?.start !== start) return { start, rect };
                    return current;
                });
            }
        } else {
            setParagraphGutterTarget(null);
        }
    }, [editorState.content, viewMode, gutterMenu, isEffectivelyReadOnly, isAiEnabled, isApiKeyMissing]);

    useEffect(() => {
        const pane = editorPaneRef.current;
        const handleScroll = () => {
            isScrollingRef.current = true;
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = window.setTimeout(() => {
                isScrollingRef.current = false;
                updateGutterState();
            }, 150);
        };
        pane?.addEventListener('scroll', handleScroll);
        return () => pane?.removeEventListener('scroll', handleScroll);
    }, [updateGutterState]);

    useEffect(() => {
        updateGutterState();
    }, [updateGutterState]);

    const isAnyPopupOpen = useMemo(() => 
        isSettingsOpen || 
        isCommandPaletteOpen || 
        isSmartFolderModalOpen || 
        isWelcomeModalOpen ||
        isHelpOpen ||
        confirmation.isOpen ||
        !!selection ||
        !!activeSpellingError ||
        !!noteLinker ||
        !!templateLinker ||
        !!noteLinkerForSelection ||
        !!slashCommand ||
        !!gutterMenu,
    [isSettingsOpen, isCommandPaletteOpen, isSmartFolderModalOpen, isWelcomeModalOpen, isHelpOpen, confirmation.isOpen, selection, activeSpellingError, noteLinker, templateLinker, noteLinkerForSelection, slashCommand, gutterMenu]);

    useEditorHotkeys({
        undo,
        redo,
        isModalOpen: isAnyPopupOpen,
        editorElements: [titleInputRef, textareaRef],
    });


    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value, selectionStart } = e.target;
        setEditorState({ ...editorState, content: value });
        dispatch({ type: 'SET_SELECTION', payload: null }); 
        setActiveSpellingError(null);
        dispatch({ type: 'SET_GUTTER_MENU', payload: null });

        const textBeforeCursor = value.substring(0, selectionStart);
        const slashMatch = textBeforeCursor.match(/(?:\s|^)\/([\w-]*)$/);
        const linkerMatch = textBeforeCursor.match(/\[\[([^\[\]]*)$/);

        const measureRef = cursorMeasureRef.current;

        if (slashMatch && measureRef) {
            const query = slashMatch[1];
            const rect = getCursorPositionRect(e.target, selectionStart, measureRef, value);
            const range = { start: selectionStart - query.length - 1, end: selectionStart };
            dispatch({ type: 'SET_SLASH_COMMAND', payload: { query, position: { top: rect.bottom, left: rect.left }, range } });
        } else if (linkerMatch && measureRef) {
            const rect = getCursorPositionRect(e.target, selectionStart, measureRef, value);
            dispatch({ type: 'SET_NOTE_LINKER', payload: { query: linkerMatch[1], position: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX } } });
        } else {
            if (slashCommand) dispatch({ type: 'SET_SLASH_COMMAND', payload: null });
            if (noteLinker) dispatch({ type: 'SET_NOTE_LINKER', payload: null });
        }
    };
    
    const handleSelect = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const { selectionStart, selectionEnd, value } = textarea;
        const textBeforeCursor = value.substring(0, selectionStart);
        const slashMatch = textBeforeCursor.match(/(?:\s|^)\/([\w-]*)$/);
        if (!slashMatch || selectionStart !== selectionEnd) {
            if (slashCommand) dispatch({ type: 'SET_SLASH_COMMAND', payload: null });
        }
        if (isEffectivelyReadOnly || isAiActionLoading || isAiRateLimited) {
            dispatch({ type: 'SET_SELECTION', payload: null }); return;
        }

        const selectedText = value.substring(selectionStart, selectionEnd);
        const measureRef = cursorMeasureRef.current;

        if (selectedText.trim().length > 0 && (!slashMatch || selectionStart !== selectionEnd) && measureRef) {
            setActiveSpellingError(null);
            const rect = getCursorPositionRect(textarea, selectionEnd, measureRef, value);
            dispatch({ type: 'SET_SELECTION', payload: { start: selectionStart, end: selectionEnd, text: selectedText, rect } });
        } else if (selection) {
            dispatch({ type: 'SET_SELECTION', payload: null });
        }

        if (selectionStart === selectionEnd && measureRef) {
            const clickedError = spellingErrors.find(err => selectionStart >= err.index && selectionStart <= err.index + err.length);
            if (clickedError) {
                const rect = getCursorPositionRect(textarea, selectionStart, measureRef, value);
                setActiveSpellingError({ error: clickedError, rect });
            } else if (activeSpellingError) {
                setActiveSpellingError(null);
            }
        }
        updateGutterState();
    };
    
    const handleContentBlur = () => {
        if (isAiEnabled && !hasAutoTitledRef.current && editorState.title === 'Untitled Note' && editorState.content.trim()) {
            const firstLine = editorState.content.split('\n')[0].trim().replace(/^#+\s*/, '');
            if (firstLine) {
                const newTitle = firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;
                setEditorState({ ...editorState, title: newTitle });
                hasAutoTitledRef.current = true;
            }
        }
    };

    const handleInsertLink = (noteId: string, noteTitle: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        if (noteLinkerForSelection) {
            const { start, end, text } = noteLinkerForSelection;
            setEditorState(prev => ({ ...prev, content: `${prev.content.substring(0, start)}[[${noteId}|${text}]]${prev.content.substring(end)}` }));
            dispatch({ type: 'SET_NOTE_LINKER_FOR_SELECTION', payload: null });
            const pos = start + noteId.length + text.length + 5;
            desiredCursorPosRef.current = pos;
            textarea.focus();
        } else if (noteLinker) {
            const { selectionStart } = textarea; const startIndex = selectionStart - noteLinker.query.length - 2;
            setEditorState(prev => ({ ...prev, content: `${prev.content.substring(0, startIndex)}[[${noteId}|${noteTitle}]]${prev.content.substring(selectionStart)}` }));
            dispatch({ type: 'SET_NOTE_LINKER', payload: null });
            const pos = startIndex + noteId.length + noteTitle.length + 5;
            desiredCursorPosRef.current = pos;
            textarea.focus();
        }
    };
    
    const handleInsertSyncedBlock = (templateId: string) => {
        if (!templateLinker) return;
        const textarea = textareaRef.current;
        if (!textarea) return;
        const { selectionStart } = textarea;
        const startIndex = selectionStart - templateLinker.query.length;
        setEditorState(prev => ({ ...prev, content: `${prev.content.substring(0, startIndex)}[[sync:${templateId}]]${prev.content.substring(selectionStart)}` }));
        dispatch({ type: 'SET_TEMPLATE_LINKER', payload: null });
        const pos = startIndex + `[[sync:${templateId}]]`.length;
        desiredCursorPosRef.current = pos;
        textarea.focus();
    };

    const handleSelectCommand = (commandId: string) => {
        if (!slashCommand) return;
        const { range, position } = slashCommand;
        
        const replaceCommandText = (replacement: string, cursorOffset = replacement.length) => {
            setEditorState(prev => {
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
            case 'ai-summarize': summarizeAndFindActionForFullNote(editorState.content); replaceCommandText('', 0); break;
            case 'ai-fix': applyAiActionToFullNote('fix', editorState.content); replaceCommandText('', 0); break;
            case 'synced-block':
                setEditorState(prev => ({...prev, content: prev.content.substring(0, range.start) + prev.content.substring(range.end)}));
                dispatch({ type: 'SET_TEMPLATE_LINKER', payload: { query: '', position }});
                break;
            default: break;
        }
        dispatch({ type: 'SET_SLASH_COMMAND', payload: null });
    };

    const handleFormatSelection = (format: 'bold' | 'italic' | 'code' | 'link') => {
        if (!selection) return;
        if (format === 'link') { dispatch({ type: 'SET_NOTE_LINKER_FOR_SELECTION', payload: selection }); return; }
        const { start, end, text } = selection; let prefix = '', suffix = '';
        switch(format) {
            case 'bold': prefix = suffix = '**'; break; case 'italic': prefix = suffix = '*'; break; case 'code': prefix = suffix = '`'; break;
        }
        setEditorState(prev => ({...prev, content: prev.content.substring(0, start) + prefix + text + suffix + prev.content.substring(end)}));
        dispatch({ type: 'SET_SELECTION', payload: null });
        const pos = end + prefix.length + suffix.length;
        desiredCursorPosRef.current = pos;
        textareaRef.current?.focus();
    };
    
    const handleApplySuggestion = (suggestion: string) => {
        if (!activeSpellingError) return;
        const { index, length } = activeSpellingError.error;
        setEditorState(prev => ({ ...prev, content: prev.content.substring(0, index) + suggestion + prev.content.substring(index + length) }));
        setActiveSpellingError(null);
    };

    const handleRestore = (version: NoteVersion) => { restoreNoteVersion(note.id, version); dispatch({ type: 'SET_PREVIEW_VERSION', payload: null }); dispatch({ type: 'SET_HISTORY_OPEN', payload: false }); };
    const handleCloseHistory = () => { dispatch({ type: 'SET_PREVIEW_VERSION', payload: null }); dispatch({ type: 'SET_HISTORY_OPEN', payload: false }); };
    const handleApplyTemplate = (template: Template) => {
        const apply = () => {
            setEditorState({ title: template.title, content: template.content, tags: []}); 
            dispatch({ type: 'SET_VIEW_MODE', payload: 'edit' });
        };

        if (editorState.content.trim() !== '') {
            showConfirmation({
                title: 'Apply Template',
                message: 'Applying a template will replace the current note content. Are you sure?',
                confirmText: 'Apply',
                onConfirm: apply,
            });
        } else {
            apply();
        }
    };
    const handleToggleTask = (lineNumber: number) => { 
        setEditorState(prev => {
            const lines = prev.content.split('\n'); 
            if (lineNumber >= lines.length) return prev; 
            const line = lines[lineNumber]; 
            const toggledLine = line.includes('[ ]') ? line.replace('[ ]', '[x]') : line.replace(/\[(x|X)\]/, '[ ]'); 
            lines[lineNumber] = toggledLine; 
            const newContent = lines.join('\n'); 
            return { ...prev, content: newContent };
        });
    };
    const handleAddTag = (tagToAdd: string) => { if (!editorState.tags.includes(tagToAdd)) { setEditorState({ ...editorState, tags: [...editorState.tags, tagToAdd] }); } setSuggestedTags(prev => prev.filter(t => t !== tagToAdd)); };
    const handleApplyTitleSuggestion = (title: string) => { setEditorState({ ...editorState, title }); setSuggestedTitle(null); };

    const editorPaddingClass = 'px-4 sm:px-8';
    const sharedEditorClasses = 'w-full p-0 border-0 text-base sm:text-lg resize-none focus:outline-none leading-relaxed whitespace-pre-wrap break-words';

    const handleParagraphAiAction = useCallback((action: InlineAction, selection: { start: number; end: number }) => {
        performParagraphAiAction(action, selection, editorState.content);
    }, [performParagraphAiAction, editorState.content]);

    return (
        <div className="flex-1 flex flex-col h-full relative bg-light-background dark:bg-dark-background" onDragOver={(e) => { e.preventDefault(); if (!isEffectivelyReadOnly) dispatch({ type: 'SET_DRAG_OVER', payload: true }); }} onDragLeave={() => dispatch({ type: 'SET_DRAG_OVER', payload: false })} onDrop={handleDrop} onPaste={handlePaste}>
            <pre ref={cursorMeasureRef} style={{ position: 'absolute', visibility: 'hidden', top: -9999, left: -9999, pointerEvents: 'none' }} />
            <EditorHeader note={note} onToggleFavorite={() => toggleFavorite(note.id)} saveStatus={saveStatus} handleSave={handleSave} editorTitle={editorState.title} onEnhance={(tone) => handleEnhanceNote(tone, editorState.content)} onSummarize={() => summarizeAndFindActionForFullNote(editorState.content)} onToggleHistory={() => dispatch({type: 'SET_HISTORY_OPEN', payload: !isHistoryOpen})} isHistoryOpen={isHistoryOpen} onApplyTemplate={handleApplyTemplate} isMobileView={isMobileView} onToggleSidebar={onToggleSidebar} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} viewMode={viewMode} onToggleViewMode={() => dispatch({type: 'SET_VIEW_MODE', payload: viewMode === 'edit' ? 'preview' : 'edit'})} wordCount={wordCount} charCount={charCount} isFullAiActionLoading={isFullAiActionLoading} isApiKeyMissing={isApiKeyMissing} isAiEnabled={isAiEnabled} />
            {isAiRateLimited && <div className="bg-yellow-100 dark:bg-yellow-900/30 border-b border-yellow-300 dark:border-yellow-700/50 py-2 px-4 text-center text-sm text-yellow-800 dark:text-yellow-200 flex-shrink-0">AI features are temporarily paused due to high usage. They will be available again shortly.</div>}
            
            <div ref={editorPaneRef} className={`flex-1 overflow-y-auto relative transition-opacity`}>
                 {!!previewVersion && <div className={`bg-yellow-100 dark:bg-yellow-900/30 py-2 text-center text-sm text-yellow-800 dark:text-yellow-200 max-w-3xl mx-auto ${editorPaddingClass}`}>You are previewing a version from {new Date(previewVersion.savedAt).toLocaleString()}.</div>}

                <div className={`relative mx-auto py-12 ${editorPaddingClass} transition-all duration-300 ${isFullAiActionLoading ? 'opacity-50 pointer-events-none' : ''} ${isFocusMode ? 'max-w-4xl' : 'max-w-3xl'}`}>
                    {paragraphGutterTarget && (
                        <button
                            aria-label="AI actions for this paragraph"
                            className="editor-gutter-button"
                            style={{ top: `${paragraphGutterTarget.rect.top - editorPaneRef.current!.getBoundingClientRect().top + editorPaneRef.current!.scrollTop}px` }}
                            onClick={(e) => {
                                const { start } = paragraphGutterTarget;
                                const { end } = getLineInfoForPosition(editorState.content, start);
                                dispatch({ type: 'SET_GUTTER_MENU', payload: { anchorRect: e.currentTarget.getBoundingClientRect(), start, end } });
                            }}
                        >
                            <SparklesIcon />
                        </button>
                    )}
                    <EditorTitle
                        titleInputRef={titleInputRef}
                        value={displayedTitle}
                        onChange={(e) => setEditorState({ ...editorState, title: e.target.value })}
                        isReadOnly={isEffectivelyReadOnly}
                        suggestion={suggestedTitle}
                        onApplySuggestion={handleApplyTitleSuggestion}
                        isSuggesting={isSuggestingTitle}
                        isApiKeyMissing={isApiKeyMissing}
                        isAiEnabled={isAiEnabled}
                    />
                    <EditorContent
                        textareaRef={textareaRef}
                        viewMode={viewMode}
                        displayedTitle={displayedTitle}
                        displayedContent={displayedContent}
                        isReadOnly={isEffectivelyReadOnly}
                        onChange={handleChange}
                        onSelect={handleSelect}
                        onKeyDown={handleKeyDown}
                        onKeyUp={handleSelect}
                        onClick={handleSelect}
                        onBlur={handleContentBlur}
                        onToggleTask={handleToggleTask}
                        sharedEditorClasses={sharedEditorClasses}
                    />
                    <EditorMeta
                        note={note}
                        backlinks={backlinks}
                        tags={displayedTags}
                        onTagsChange={(tags) => setEditorState({ ...editorState, tags })}
                        isReadOnly={isEffectivelyReadOnly}
                        allExistingTags={allTags}
                        suggestedTags={suggestedTags}
                        onAddTag={handleAddTag}
                        isLoadingTags={isSuggestingTags}
                        isApiKeyMissing={isApiKeyMissing}
                        isAiEnabled={isAiEnabled}
                    />
                </div>
            </div>
            
            <EditorStatusBar wordCount={wordCount} charCount={charCount} readingTime={readingTime} isCheckingSpelling={isCheckingSpelling} />

            {(noteLinker || noteLinkerForSelection) && <NoteLinker editorPaneRef={editorPaneRef} query={noteLinker?.query || ''} onSelect={handleInsertLink} onClose={() => { dispatch({ type: 'SET_NOTE_LINKER', payload: null }); dispatch({ type: 'SET_NOTE_LINKER_FOR_SELECTION', payload: null }); }} position={noteLinker?.position || { top: noteLinkerForSelection!.rect.bottom, left: noteLinkerForSelection!.rect.left }} />}
            {templateLinker && <TemplateLinker editorPaneRef={editorPaneRef} query={templateLinker.query} onSelect={handleInsertSyncedBlock} onClose={() => dispatch({ type: 'SET_TEMPLATE_LINKER', payload: null })} position={templateLinker.position} />}
            {slashCommand && <SlashCommandMenu editorPaneRef={editorPaneRef} query={slashCommand.query} position={slashCommand.position} onSelect={handleSelectCommand} onClose={() => dispatch({ type: 'SET_SLASH_COMMAND', payload: null })} textareaRef={textareaRef} />}
            <InlineAiMenu editorPaneRef={editorPaneRef} selection={selection} onAction={async (action) => { if (selection) { const newPos = await handleInlineAiAction(action, selection); if (newPos !== null && textareaRef.current) { textareaRef.current.focus(); desiredCursorPosRef.current = newPos; } } }} onFormat={handleFormatSelection} isLoading={isAiActionLoading} onClose={() => dispatch({ type: 'SET_SELECTION', payload: null })} isApiKeyMissing={isApiKeyMissing} isAiEnabled={isAiEnabled} />
            <SpellcheckMenu editorPaneRef={editorPaneRef} activeError={activeSpellingError} suggestions={spellingSuggestions} onSelect={handleApplySuggestion} isLoading={isLoadingSuggestions} error={suggestionError} onClose={() => setActiveSpellingError(null)} />
            {isHistoryOpen && <VersionHistorySidebar history={note.history || []} onClose={handleCloseHistory} onPreview={(version) => dispatch({ type: 'SET_PREVIEW_VERSION', payload: version })} onRestore={handleRestore} activeVersionTimestamp={previewVersion?.savedAt} />}
            {gutterMenu && (
                <ParagraphActionMenu
                    anchorRect={gutterMenu.anchorRect}
                    onClose={() => dispatch({ type: 'SET_GUTTER_MENU', payload: null })}
                    onAction={(action) => {
                        performParagraphAiAction(action, { start: gutterMenu.start, end: gutterMenu.end }, editorState.content);
                    }}
                    editorPaneRef={editorPaneRef}
                />
            )}
            {isDragOver && <div className="absolute inset-0 bg-light-primary/10 dark:bg-dark-primary/10 border-4 border-dashed border-light-primary dark:border-dark-primary rounded-2xl m-4 pointer-events-none flex items-center justify-center"><p className="text-light-primary dark:text-dark-primary font-bold text-2xl">Drop file to import</p></div>}
            
            <EditorPopups
                noteLinker={noteLinker}
                templateLinker={templateLinker}
                slashCommand={slashCommand}
                selection={selection}
                noteLinkerForSelection={noteLinkerForSelection}
                gutterMenu={gutterMenu}
                activeSpellingError={activeSpellingError}
                spellingSuggestions={spellingSuggestions}
                isLoadingSuggestions={isLoadingSuggestions}
                suggestionError={suggestionError}
                isAiActionLoading={isAiActionLoading}
                isApiKeyMissing={isApiKeyMissing}
                isAiEnabled={isAiEnabled}
                onInsertLink={handleInsertLink}
                onInsertSyncedBlock={handleInsertSyncedBlock}
                onSelectCommand={handleSelectCommand}
                onInlineAiAction={(action) => handleInlineAiAction(action, selection!)}
                onFormatSelection={handleFormatSelection}
                onApplySpellingSuggestion={handleApplySuggestion}
                onParagraphAiAction={handleParagraphAiAction}
                closeNoteLinker={() => dispatch({ type: 'SET_NOTE_LINKER', payload: null })}
                closeTemplateLinker={() => dispatch({ type: 'SET_TEMPLATE_LINKER', payload: null })}
                closeSlashCommand={() => dispatch({ type: 'SET_SLASH_COMMAND', payload: null })}
                closeSelection={() => dispatch({ type: 'SET_SELECTION', payload: null })}
                closeSpelling={() => setActiveSpellingError(null)}
                closeGutterMenu={() => dispatch({ type: 'SET_GUTTER_MENU', payload: null })}
                editorPaneRef={editorPaneRef}
                textareaRef={textareaRef}
                desiredCursorPosRef={desiredCursorPosRef}
            />
        </div>
    );
};

export default NoteEditor;
