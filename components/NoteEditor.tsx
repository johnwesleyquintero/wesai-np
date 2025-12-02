import React, { useEffect, useRef, useMemo, useCallback, useLayoutEffect, Suspense } from 'react';
import { Note, InlineAction } from '../types';
import EditorHeader from './editor/EditorHeader';
import EditorTitle from './editor/EditorTitle';
import EditorContent from './editor/EditorContent';
import EditorMeta from './editor/EditorMeta';
import EditorStatusBar from './editor/EditorStatusBar';
import { useUndoableState } from '../hooks/useUndoableState';
import { useEditorContext, useStoreContext, useUIContext, useAuthContext } from '../context/AppContext';
import { useBacklinks } from '../hooks/useBacklinks';
import { useSpellcheck } from '../hooks/useSpellcheck';
import { useNoteEditorReducer } from '../hooks/useNoteEditorReducer';
import { useAiSuggestions } from '../hooks/useAiSuggestions';
import { useAiActions } from '../hooks/useAiActions';
import { useEditorHotkeys } from '../hooks/useEditorHotkeys';
import { useNoteInputHandlers } from '../hooks/useNoteInputHandlers';
import { useAutoPairing } from '../hooks/useAutoPairing';
import { useNoteSync } from '../hooks/useNoteSync';
import { useEditorGutter } from '../hooks/useEditorGutter';
import { useEditorInsertionLogic } from '../hooks/useEditorInsertionLogic';
import { useNoteEditorHandlers } from '../hooks/useNoteEditorHandlers';
import EditorPopups from './editor/EditorPopups';
import { getCursorPositionRect, getLineInfoForPosition } from '../lib/editorDOMUtils';
import { useToast } from '../context/ToastContext';
import { SparklesIcon } from './Icons';
import { useEditorPopupState } from '../hooks/useEditorPopupState';
import { useAutoResizeTextArea } from '../hooks/useAutoResizeTextArea';

// Lazy load sidebar
const VersionHistorySidebar = React.lazy(() => import('./VersionHistorySidebar'));

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
    
    const stateWhenLastSavedRef = useRef<NoteState | null>(null);

    // Use the extracted Sync Logic Hook
    useNoteSync({
        note,
        editorState,
        latestEditorStateRef,
        setPresent,
        resetEditorState,
        areStatesEqual: areNoteStatesEqual,
        showConfirmation,
        hideConfirmation,
        showToast,
        stateWhenLastSavedRef
    });

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
    const desiredCursorPosRef = useRef<number | { start: number; end: number } | null>(null);
    const hasAutoTitledRef = useRef(false);
    
    // Auto-resize logic using the new hook
    // We only enable this in 'edit' mode, controlled by passing `editorState.content` dependency
    useAutoResizeTextArea(textareaRef, viewMode === 'edit' ? editorState.content : '');

    const { handleKeyDown } = useAutoPairing({ 
        setEditorState, 
        desiredCursorPosRef 
    });

    const { 
        handleDrop, 
        handlePaste 
    } = useNoteInputHandlers({
        editorState,
        setEditorState,
        textareaRef,
        dispatch,
        noteId: note.id,
        session,
        isEffectivelyReadOnly,
        desiredCursorPosRef
    });

    const { paragraphGutterTarget, setParagraphGutterTarget } = useEditorGutter({
        textareaRef,
        editorPaneRef,
        cursorMeasureRef,
        content: editorState.content,
        viewMode,
        gutterMenu,
        isEffectivelyReadOnly,
        isAiEnabled,
        isApiKeyMissing
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
        dispatch({ type: 'RESET_STATE_FOR_NEW_NOTE' });
        resetAiSuggestions();
        setActiveSpellingError(null);
        hasAutoTitledRef.current = false;
        setParagraphGutterTarget(null);
        
        if (note.title === 'Untitled Note' && note.content === '') {
            dispatch({ type: 'SET_VIEW_MODE', payload: 'edit' });
            setTimeout(() => titleInputRef.current?.focus(), 100);
        }
    }, [note.id, resetAiSuggestions, setActiveSpellingError, dispatch, setParagraphGutterTarget]);
    
    useEffect(() => {
        if (editorState.content.trim() === '') {
            hasAutoTitledRef.current = false;
        }
    }, [editorState.content]);

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

    // Use the custom hook for all editor handlers
    const { 
        handleSave, 
        handleRestore, 
        handleCloseHistory, 
        handleApplyTemplate, 
        handleSaveAsTemplate,
        handleToggleTask, 
        handleAddTag, 
        handleApplyTitleSuggestion, 
        handleContentBlur 
    } = useNoteEditorHandlers({
        note,
        editorState,
        setEditorState,
        dispatch,
        saveStatus,
        stateWhenLastSavedRef,
        setSuggestedTags,
        setSuggestedTitle,
        hasAutoTitledRef,
        titleInputRef,
        isAiEnabled
    });

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
        save: handleSave,
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
    };
    
    const {
        handleInsertLink,
        handleInsertSyncedBlock,
        handleSelectCommand,
        handleFormatSelection,
        handleApplySuggestion
    } = useEditorInsertionLogic({
        setEditorState,
        dispatch,
        textareaRef,
        desiredCursorPosRef,
        uiState,
        activeSpellingError,
        summarizeAndFindActionForFullNote,
        applyAiActionToFullNote
    });

    const editorPaddingClass = 'px-4 sm:px-8';
    const sharedEditorClasses = 'w-full p-0 border-0 text-base sm:text-lg resize-none focus:outline-none leading-relaxed whitespace-pre-wrap break-words';

    const handleParagraphAiAction = useCallback((action: InlineAction, selection: { start: number; end: number }) => {
        performParagraphAiAction(action, selection, editorState.content);
    }, [performParagraphAiAction, editorState.content]);

    // Use logic hook to consolidate popup props
    const editorPopupsProps = useEditorPopupState({
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
        handlers: {
            handleInsertLink,
            handleInsertSyncedBlock,
            handleSelectCommand,
            handleInlineAiAction: (action, selection) => handleInlineAiAction(action, selection),
            handleFormatSelection,
            handleApplySuggestion,
            handleParagraphAiAction
        }
    });

    return (
        <div className="flex-1 flex flex-col h-full relative bg-light-background dark:bg-dark-background" onDragOver={(e) => { e.preventDefault(); if (!isEffectivelyReadOnly) dispatch({ type: 'SET_DRAG_OVER', payload: true }); }} onDragLeave={() => dispatch({ type: 'SET_DRAG_OVER', payload: false })} onDrop={handleDrop} onPaste={handlePaste}>
            <pre ref={cursorMeasureRef} style={{ position: 'absolute', visibility: 'hidden', top: -9999, left: -9999, pointerEvents: 'none' }} />
            <EditorHeader note={note} onToggleFavorite={() => toggleFavorite(note.id)} saveStatus={saveStatus} handleSave={handleSave} editorTitle={editorState.title} onEnhance={(tone) => handleEnhanceNote(tone, editorState.content)} onSummarize={() => summarizeAndFindActionForFullNote(editorState.content)} onToggleHistory={() => dispatch({type: 'SET_HISTORY_OPEN', payload: !isHistoryOpen})} isHistoryOpen={isHistoryOpen} onApplyTemplate={handleApplyTemplate} onSaveAsTemplate={() => handleSaveAsTemplate(editorState.title)} isMobileView={isMobileView} onToggleSidebar={onToggleSidebar} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} viewMode={viewMode} onToggleViewMode={() => dispatch({type: 'SET_VIEW_MODE', payload: viewMode === 'edit' ? 'preview' : 'edit'})} wordCount={wordCount} charCount={charCount} isFullAiActionLoading={isFullAiActionLoading} isApiKeyMissing={isApiKeyMissing} isAiEnabled={isAiEnabled} />
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

            <EditorPopups {...editorPopupsProps} />
            
            {isHistoryOpen && (
                <Suspense fallback={null}>
                    <VersionHistorySidebar history={note.history || []} onClose={handleCloseHistory} onPreview={(version) => dispatch({ type: 'SET_PREVIEW_VERSION', payload: version })} onRestore={handleRestore} activeVersionTimestamp={previewVersion?.savedAt} />
                </Suspense>
            )}
            {isDragOver && <div className="absolute inset-0 bg-light-primary/10 dark:bg-dark-primary/10 border-4 border-dashed border-light-primary dark:border-dark-primary rounded-2xl m-4 pointer-events-none flex items-center justify-center"><p className="text-light-primary dark:text-dark-primary font-bold text-2xl">Drop file to import</p></div>}
        </div>
    );
};

export default NoteEditor;