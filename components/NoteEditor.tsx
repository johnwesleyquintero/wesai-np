import React, { useEffect, useRef, useMemo, useCallback, useState, useLayoutEffect } from 'react';
import { Note, NoteVersion, Template } from '../types';
import EditorHeader from './editor/EditorHeader';
import EditorTitle from './editor/EditorTitle';
import EditorContent from './editor/EditorContent';
import EditorMeta from './editor/EditorMeta';
import EditorStatusBar from './editor/EditorStatusBar';
import VersionHistorySidebar from './VersionHistorySidebar';
import { useUndoableState } from '../hooks/useUndoableState';
import InlineAiMenu from './InlineAiMenu';
import SpellcheckMenu from './SpellcheckMenu';
import { useEditorContext, useStoreContext, useUIContext, useAuthContext } from '../context/AppContext';
import NoteLinker from './NoteLinker';
import TemplateLinker from './TemplateLinker';
import { useBacklinks } from '../hooks/useBacklinks';
import SlashCommandMenu from './SlashCommandMenu';
import { uploadImage, getPublicUrl } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { useSpellcheck } from '../hooks/useSpellcheck';
import { useNoteEditorReducer } from '../hooks/useNoteEditorReducer';
import { useAiSuggestions } from '../hooks/useAiSuggestions';
import { useAiActions } from '../hooks/useAiActions';
import { useEditorHotkeys } from '../hooks/useEditorHotkeys';
import { SparklesIcon } from './Icons';
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
    // Create a set from one array and check if all elements of the other are present
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
    const { isMobileView, onToggleSidebar, isAiRateLimited, isSettingsOpen, isCommandPaletteOpen, isSmartFolderModalOpen, isWelcomeModalOpen, isApiKeyMissing, isFocusMode, showConfirmation, hideConfirmation, isAiEnabled } = useUIContext();
    const { session } = useAuthContext();
    const { showToast } = useToast();
    const { registerEditorActions, unregisterEditorActions } = useEditorContext();

    const {
        state: editorState,
        set: setEditorState,
        setPresent,
        reset: resetEditorState,
        undo,
        redo,
        canUndo,
        canRedo,
    } = useUndoableState<NoteState>({
        title: note.title,
        content: note.content,
        tags: note.tags,
    }, areNoteStatesEqual);
    
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
        handleParagraphAiAction,
    } = useAiActions(editorState, setEditorState, dispatch);

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
    const desiredCursorPosRef = useRef<number | { start: number; end: number } | null>(null);

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
    }); // No dependency array, runs after every render

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
        resetEditorState({ title: note.title, content: note.content, tags: note.tags });
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
    }, [note.id, note.title, note.content, resetEditorState, resetAiSuggestions, setActiveSpellingError, dispatch]);
    
    // Reset auto-title flag if content is cleared
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
    
        // Check for external updates
        if (note.updatedAt !== prevNoteRef.current.updatedAt) {
            const isSelfUpdate = stateWhenLastSavedRef.current !== null && areNoteStatesEqual(stateWhenLastSavedRef.current, {
                title: note.title,
                content: note.content,
                tags: note.tags,
            });

            if (isSelfUpdate) {
                stateWhenLastSavedRef.current = null; // Consume the flag
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
                // CONFLICT: External change detected while there are local unsaved changes.
                if (lastWarnedTimestamp !== note.updatedAt) {
                    showConfirmation({
                        title: "Sync Conflict",
                        message: "This note was updated on another device. You can discard your local changes to load the latest version, or cancel to manually copy your work.",
                        confirmText: "Reload & Discard",
                        confirmClass: "bg-red-600 hover:bg-red-700",
                        onConfirm: () => {
                            resetEditorState({ title: note.title, content: note.content, tags: note.tags });
                            setLastWarnedTimestamp(null); // Mark as resolved
                            hideConfirmation();
                        },
                    });
                    setLastWarnedTimestamp(note.updatedAt);
                }
            } else {
                // NO CONFLICT: No local changes, so safe to sync the external update.
                resetEditorState({ title: note.title, content: note.content, tags: note.tags });
                setLastWarnedTimestamp(null);
                showToast({
                    message: `"${note.title}" was synced from an external change.`,
                    type: 'info',
                });
            }
        }
        prevNoteRef.current = note;
    }, [note, resetEditorState, showToast, lastWarnedTimestamp, showConfirmation, hideConfirmation]);

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
    
    // Add safety net for closing the tab with unsaved changes.
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Use ref to get latest state, as state in closure can be stale
            const isDirty = !areNoteStatesEqual(latestEditorStateRef.current, {
                title: note.title,
                content: note.content,
                tags: note.tags,
            });

            if (isDirty) {
                e.preventDefault();
                e.returnValue = ''; // Required for most browsers
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [note.title, note.content, note.tags]); // Dependencies ensure the listener has access to the correct 'note' props for comparison

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
        applyAiActionToFullNote,
        suggestTagsForFullNote: () => suggestTagsForFullNote(editorState.title, editorState.content),
        suggestTitleForFullNote: () => suggestTitleForFullNote(editorState.content),
        summarizeAndFindActionForFullNote
    }), [
        undo, redo, canUndo, canRedo, applyAiActionToFullNote, suggestTagsForFullNote, 
        suggestTitleForFullNote, summarizeAndFindActionForFullNote, editorState.title, editorState.content
    ]);

    useEffect(() => {
        registerEditorActions(editorActions);
        return () => unregisterEditorActions();
    }, [registerEditorActions, unregisterEditorActions, editorActions]);
    
    // When a popup opens, record the current scroll position.
    useEffect(() => {
        const hasPopup = !!selection || !!activeSpellingError || !!noteLinker || !!templateLinker || !!noteLinkerForSelection || !!slashCommand || !!gutterMenu;
        if (!hasPopup) {
             // Reset when all popups are closed
        }
    }, [selection, activeSpellingError, noteLinker, templateLinker, noteLinkerForSelection, slashCommand, gutterMenu]);

    const getCursorPositionRect = useCallback((textarea: HTMLTextAreaElement, position: number): DOMRect => {
        const pre = cursorMeasureRef.current;
        if (!pre) return new DOMRect();

        const styles = window.getComputedStyle(textarea);
        const essentialStyles = [
            'font-family', 'font-size', 'font-style', 'font-weight', 'line-height',
            'letter-spacing', 'text-transform', 'padding-top', 'padding-right',
            'padding-bottom', 'padding-left', 'border-top-width', 'border-right-width',
            'border-bottom-width', 'border-left-width', 'box-sizing', 'width', 'text-indent'
        ];
        
        // Reset styles to ensure a clean slate for measurement
        pre.style.cssText = '';
        
        essentialStyles.forEach(key => {
            pre.style.setProperty(key, styles.getPropertyValue(key));
        });

        pre.style.whiteSpace = 'pre-wrap';
        pre.style.wordWrap = 'break-word';

        const before = editorState.content.substring(0, position);
        const span = document.createElement('span');
        span.textContent = '.'; // Use a non-whitespace character for measurement
        pre.textContent = before;
        pre.appendChild(span);

        const rect = span.getBoundingClientRect();
        pre.textContent = ''; // Clear content to prevent memory leaks

        return rect;
    }, [editorState.content]);
    
    const getLineInfoForPosition = (content: string, position: number) => {
        const start = content.lastIndexOf('\n', position - 1) + 1;
        let end = content.indexOf('\n', position);
        if (end === -1) end = content.length;
        const text = content.substring(start, end).trim();
        return { text, start, end };
    };

    const updateGutterState = useCallback(() => {
        if (isScrollingRef.current) return; // Don't update while scrolling
        
        const textarea = textareaRef.current;
        if (!textarea || viewMode !== 'edit' || gutterMenu) {
            setParagraphGutterTarget(current => current ? null : current); // Only set to null if it has a value
            return;
        }

        const { selectionStart } = textarea;
        const { text, start } = getLineInfoForPosition(editorState.content, selectionStart);
        
        const shouldShow = text && !isEffectivelyReadOnly && isAiEnabled && !isApiKeyMissing;

        if (shouldShow) {
            const rect = getCursorPositionRect(textarea, start);
            setParagraphGutterTarget(current => {
                if (current?.start !== start) return { start, rect };
                return current;
            });
        } else {
            setParagraphGutterTarget(null);
        }
    }, [editorState.content, viewMode, gutterMenu, isEffectivelyReadOnly, isAiEnabled, isApiKeyMissing, getCursorPositionRect]);

    const handleScroll = useCallback(() => {
        isScrollingRef.current = true;
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = window.setTimeout(() => {
            isScrollingRef.current = false;
            updateGutterState(); // Update gutter state once scrolling has stopped
        }, 150);

        // Always dismiss popups immediately on scroll to prevent "jitter".
        setParagraphGutterTarget(null);
        dispatch({ type: 'SET_GUTTER_MENU', payload: null });
        dispatch({ type: 'SET_SELECTION', payload: null });
        setActiveSpellingError(null);
        dispatch({ type: 'SET_NOTE_LINKER', payload: null });
        dispatch({ type: 'SET_TEMPLATE_LINKER', payload: null });
        dispatch({ type: 'SET_NOTE_LINKER_FOR_SELECTION', payload: null });
        dispatch({ type: 'SET_SLASH_COMMAND', payload: null });
    }, [dispatch, setActiveSpellingError, updateGutterState]);

    useEffect(() => {
        // This effect runs after content changes (typing, pasting), ensuring updateGutterState uses fresh state.
        updateGutterState();
    }, [updateGutterState]);
    
    useEffect(() => {
        const pane = editorPaneRef.current;
        pane?.addEventListener('scroll', handleScroll);
        return () => pane?.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    useEditorHotkeys({
        undo,
        redo,
        isModalOpen: isSettingsOpen || isCommandPaletteOpen || isSmartFolderModalOpen || isWelcomeModalOpen || !!noteLinker || !!noteLinkerForSelection,
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

        if (slashMatch) {
            const query = slashMatch[1];
            const rect = getCursorPositionRect(e.target, selectionStart);
            const range = { start: selectionStart - query.length - 1, end: selectionStart };
            dispatch({ type: 'SET_SLASH_COMMAND', payload: { query, position: { top: rect.bottom, left: rect.left }, range } });
        } else if (linkerMatch) {
            const rect = getCursorPositionRect(e.target, selectionStart);
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
        if (selectedText.trim().length > 0 && (!slashMatch || selectionStart !== selectionEnd)) {
            setActiveSpellingError(null);
            const rect = getCursorPositionRect(textarea, selectionEnd);
            dispatch({ type: 'SET_SELECTION', payload: { start: selectionStart, end: selectionEnd, text: selectedText, rect } });
        } else if (selection) {
            dispatch({ type: 'SET_SELECTION', payload: null });
        }

        if (selectionStart === selectionEnd) {
            const clickedError = spellingErrors.find(err => selectionStart >= err.index && selectionStart <= err.index + err.length);
            if (clickedError) {
                const rect = getCursorPositionRect(textarea, selectionStart);
                setActiveSpellingError({ error: clickedError, rect });
            } else if (activeSpellingError) {
                setActiveSpellingError(null);
            }
        }
        updateGutterState();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const pairs: { [key: string]: string } = { '(': ')', '[': ']', '{': '}', '"': '"', '*': '*', '_': '_' };
        const textarea = e.currentTarget;
        const { selectionStart, selectionEnd, value } = textarea;
        if (pairs[e.key]) {
            e.preventDefault();
            const char = e.key; const closingChar = pairs[char];
            if (selectionStart !== selectionEnd) {
                const selectedText = value.substring(selectionStart, selectionEnd);
                const newContent = `${value.substring(0, selectionStart)}${char}${selectedText}${closingChar}${value.substring(selectionEnd)}`;
                setEditorState({ ...editorState, content: newContent });
                desiredCursorPosRef.current = { start: selectionStart + 1, end: selectionEnd + 1 };
            } else {
                const newContent = `${value.substring(0, selectionStart)}${char}${closingChar}${value.substring(selectionStart)}`;
                setEditorState({ ...editorState, content: newContent });
                desiredCursorPosRef.current = selectionStart + 1;
            }
        }
        if (e.key === 'Backspace' && selectionStart === selectionEnd) {
            const charBefore = value[selectionStart - 1];
            const charAfter = value[selectionStart];
            if (charBefore && pairs[charBefore] === charAfter) {
                e.preventDefault();
                const newContent = value.substring(0, selectionStart - 1) + value.substring(selectionStart + 1);
                setEditorState({ ...editorState, content: newContent });
                desiredCursorPosRef.current = selectionStart - 1;
            }
        }
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        dispatch({ type: 'SET_DRAG_OVER', payload: false });
        if (isEffectivelyReadOnly || !session?.user) return;
        const file = e.dataTransfer.files[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                showToast({ message: 'Uploading image...', type: 'info' });
                uploadImage(session.user.id, note.id, file).then(path => {
                    const publicUrl = getPublicUrl(path);
                    const markdownImage = `\n![${file.name}](${publicUrl})\n`;
                    const { selectionStart } = textareaRef.current!;
                    const newContent = editorState.content.slice(0, selectionStart) + markdownImage + editorState.content.slice(selectionStart);
                    setEditorState({ ...editorState, content: newContent });
                    showToast({ message: 'Image uploaded successfully!', type: 'success' });
                }).catch(err => showToast({ message: err.message || 'Failed to upload image.', type: 'error' }));
            } else if (file.type.startsWith('text/') || file.name.endsWith('.md')) {
                 const reader = new FileReader();
                reader.onload = (loadEvent) => {
                    const textContent = loadEvent.target?.result;
                    if (typeof textContent === 'string') {
                        const { selectionStart } = textareaRef.current!;
                        const newContent = editorState.content.slice(0, selectionStart) + `\n\n${textContent}\n\n` + editorState.content.slice(selectionStart);
                        setEditorState({ ...editorState, content: newContent });
                    }
                };
                reader.readAsText(file);
            }
        }
    };

    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
        if (isEffectivelyReadOnly || !session?.user) return;
        const items = e.clipboardData?.items;
        if (!items) return;

        const imageItem = (Array.from(items) as DataTransferItem[]).find((item) => item.type.startsWith('image/'));

        if (imageItem) {
            e.preventDefault();
            const file = imageItem.getAsFile();
            if (file) {
                showToast({ message: 'Uploading image from clipboard...', type: 'info' });
                uploadImage(session.user.id, note.id, file).then(path => {
                    const publicUrl = getPublicUrl(path);
                    const markdownImage = `\n![Pasted image](${publicUrl})\n`;
                    const textarea = textareaRef.current;
                    if (textarea) {
                        const { selectionStart, selectionEnd } = textarea;
                        const newContent = editorState.content.slice(0, selectionStart) + markdownImage + editorState.content.slice(selectionEnd);
                        setEditorState({ ...editorState, content: newContent });
                        
                        const newCursorPos = selectionStart + markdownImage.length;
                        desiredCursorPosRef.current = newCursorPos;

                        showToast({ message: 'Image uploaded successfully!', type: 'success' });
                    }
                }).catch(err => showToast({ message: err.message || 'Failed to upload pasted image.', type: 'error' }));
            }
        }
    }, [isEffectivelyReadOnly, session, note.id, showToast, editorState, setEditorState]);
    
    const handleContentBlur = () => {
        if (isAiEnabled && !hasAutoTitledRef.current && editorState.title === 'Untitled Note' && editorState.content.trim()) {
            const firstLine = editorState.content.split('\n')[0].trim().replace(/^#+\s*/, '');
            if (firstLine) {
                const newTitle = firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;
                setPresent({ ...editorState, title: newTitle });
                hasAutoTitledRef.current = true;
            }
        }
    };

    const handleInsertLink = (noteId: string, noteTitle: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        if (noteLinkerForSelection) {
            const { start, end, text } = noteLinkerForSelection;
            const newContent = `${editorState.content.substring(0, start)}[[${noteId}|${text}]]${editorState.content.substring(end)}`;
            setEditorState({ ...editorState, content: newContent });
            dispatch({ type: 'SET_NOTE_LINKER_FOR_SELECTION', payload: null });
            const pos = start + noteId.length + text.length + 5;
            desiredCursorPosRef.current = pos;
            textarea.focus();
        } else if (noteLinker) {
            const { selectionStart } = textarea; const startIndex = selectionStart - noteLinker.query.length - 2;
            const newContent = `${editorState.content.substring(0, startIndex)}[[${noteId}|${noteTitle}]]${editorState.content.substring(selectionStart)}`;
            setEditorState({ ...editorState, content: newContent });
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
        const newContent = `${editorState.content.substring(0, startIndex)}[[sync:${templateId}]]${editorState.content.substring(selectionStart)}`;
        setEditorState({ ...editorState, content: newContent });
        dispatch({ type: 'SET_TEMPLATE_LINKER', payload: null });
        const pos = startIndex + `[[sync:${templateId}]]`.length;
        desiredCursorPosRef.current = pos;
        textarea.focus();
    };

    const handleSelectCommand = (commandId: string) => {
        if (!slashCommand) return;
        const { range, position } = slashCommand;
        const currentContent = editorState.content;
        const replaceCommandText = (replacement: string, cursorOffset = replacement.length) => {
            const newContent = currentContent.substring(0, range.start) + replacement + currentContent.substring(range.end);
            setEditorState({ ...editorState, content: newContent });
            const pos = range.start + cursorOffset;
            desiredCursorPosRef.current = pos;
            textareaRef.current?.focus();
        };
        switch(commandId) {
            case 'h1': replaceCommandText('# '); break; case 'h2': replaceCommandText('## '); break;
            case 'h3': replaceCommandText('### '); break; case 'list': replaceCommandText('- '); break;
            case 'todo': replaceCommandText('- [ ] '); break; case 'divider': replaceCommandText('---\n'); break;
            case 'ai-summarize': summarizeAndFindActionForFullNote(); replaceCommandText('', 0); break;
            case 'ai-fix': applyAiActionToFullNote('fix'); replaceCommandText('', 0); break;
            case 'synced-block':
                const newContent = currentContent.substring(0, range.start) + currentContent.substring(range.end);
                setEditorState({ ...editorState, content: newContent });
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
        const newContent = editorState.content.substring(0, start) + prefix + text + suffix + editorState.content.substring(end);
        setEditorState({...editorState, content: newContent });
        dispatch({ type: 'SET_SELECTION', payload: null });
        const pos = end + prefix.length + suffix.length;
        desiredCursorPosRef.current = pos;
        textareaRef.current?.focus();
    };
    
    const handleApplySuggestion = (suggestion: string) => {
        if (!activeSpellingError) return;
        const { index, length } = activeSpellingError.error;
        const newContent = editorState.content.substring(0, index) + suggestion + editorState.content.substring(index + length);
        setEditorState({ ...editorState, content: newContent });
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
    const handleToggleTask = (lineNumber: number) => { const lines = editorState.content.split('\n'); if (lineNumber >= lines.length) return; const line = lines[lineNumber]; const toggledLine = line.includes('[ ]') ? line.replace('[ ]', '[x]') : line.replace(/\[(x|X)\]/, '[ ]'); lines[lineNumber] = toggledLine; const newContent = lines.join('\n'); setEditorState({ ...editorState, content: newContent }); };
    const handleAddTag = (tagToAdd: string) => { if (!editorState.tags.includes(tagToAdd)) { setEditorState({ ...editorState, tags: [...editorState.tags, tagToAdd] }); } setSuggestedTags(prev => prev.filter(t => t !== tagToAdd)); };
    const handleApplyTitleSuggestion = (title: string) => { setEditorState({ ...editorState, title }); setSuggestedTitle(null); };

    const editorPaddingClass = 'px-4 sm:px-8';
    const sharedEditorClasses = 'w-full p-0 border-0 text-base sm:text-lg resize-none focus:outline-none leading-relaxed whitespace-pre-wrap break-words';

    return (
        <div className="flex-1 flex flex-col h-full relative bg-light-background dark:bg-dark-background" onDragOver={(e) => { e.preventDefault(); if (!isEffectivelyReadOnly) dispatch({ type: 'SET_DRAG_OVER', payload: true }); }} onDragLeave={() => dispatch({ type: 'SET_DRAG_OVER', payload: false })} onDrop={handleDrop} onPaste={handlePaste}>
            <pre ref={cursorMeasureRef} style={{ position: 'absolute', visibility: 'hidden', top: -9999, left: -9999, pointerEvents: 'none' }} />
            <EditorHeader note={note} onToggleFavorite={() => toggleFavorite(note.id)} saveStatus={saveStatus} handleSave={handleSave} editorTitle={editorState.title} onEnhance={handleEnhanceNote} onSummarize={summarizeAndFindActionForFullNote} onToggleHistory={() => dispatch({type: 'SET_HISTORY_OPEN', payload: !isHistoryOpen})} isHistoryOpen={isHistoryOpen} onApplyTemplate={handleApplyTemplate} isMobileView={isMobileView} onToggleSidebar={onToggleSidebar} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} viewMode={viewMode} onToggleViewMode={() => dispatch({type: 'SET_VIEW_MODE', payload: viewMode === 'edit' ? 'preview' : 'edit'})} wordCount={wordCount} charCount={charCount} isFullAiActionLoading={isFullAiActionLoading} isApiKeyMissing={isApiKeyMissing} isAiEnabled={isAiEnabled} />
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

            {(noteLinker || noteLinkerForSelection) && <NoteLinker query={noteLinker?.query || ''} onSelect={handleInsertLink} onClose={() => { dispatch({ type: 'SET_NOTE_LINKER', payload: null }); dispatch({ type: 'SET_NOTE_LINKER_FOR_SELECTION', payload: null }); }} position={noteLinker?.position || { top: noteLinkerForSelection!.rect.bottom, left: noteLinkerForSelection!.rect.left }} />}
            {templateLinker && <TemplateLinker query={templateLinker.query} onSelect={handleInsertSyncedBlock} onClose={() => dispatch({ type: 'SET_TEMPLATE_LINKER', payload: null })} position={templateLinker.position} />}
            {slashCommand && <SlashCommandMenu query={slashCommand.query} position={slashCommand.position} onSelect={handleSelectCommand} onClose={() => dispatch({ type: 'SET_SLASH_COMMAND', payload: null })} textareaRef={textareaRef} />}
            <InlineAiMenu selection={selection} onAction={async (action) => { if (selection) { const newPos = await handleInlineAiAction(action, selection); if (newPos !== null && textareaRef.current) { textareaRef.current.focus(); desiredCursorPosRef.current = newPos; } } }} onFormat={handleFormatSelection} isLoading={isAiActionLoading} onClose={() => dispatch({ type: 'SET_SELECTION', payload: null })} isApiKeyMissing={isApiKeyMissing} isAiEnabled={isAiEnabled} />
            <SpellcheckMenu activeError={activeSpellingError} suggestions={spellingSuggestions} onSelect={handleApplySuggestion} isLoading={isLoadingSuggestions} error={suggestionError} onClose={() => setActiveSpellingError(null)} />
            {isHistoryOpen && <VersionHistorySidebar history={note.history || []} onClose={handleCloseHistory} onPreview={(version) => dispatch({ type: 'SET_PREVIEW_VERSION', payload: version })} onRestore={handleRestore} activeVersionTimestamp={previewVersion?.savedAt} />}
            {gutterMenu && (
                <ParagraphActionMenu
                    anchorRect={gutterMenu.anchorRect}
                    onClose={() => dispatch({ type: 'SET_GUTTER_MENU', payload: null })}
                    onAction={(action) => {
                        handleParagraphAiAction(action, { start: gutterMenu.start, end: gutterMenu.end });
                    }}
                />
            )}
            {isDragOver && <div className="absolute inset-0 bg-light-primary/10 dark:bg-dark-primary/10 border-4 border-dashed border-light-primary dark:border-dark-primary rounded-2xl m-4 pointer-events-none flex items-center justify-center"><p className="text-light-primary dark:text-dark-primary font-bold text-2xl">Drop file to import</p></div>}
        </div>
    );
};

export default NoteEditor;
