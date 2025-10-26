import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { Note, NoteVersion, Template } from '../types';
import Toolbar from './Toolbar';
import TagInput from './TagInput';
import VersionHistorySidebar from './VersionHistorySidebar';
import { useUndoableState } from '../hooks/useUndoableState';
import MarkdownPreview from './MarkdownPreview';
import TagSuggestions from './TagSuggestions';
import TitleSuggestion from './TitleSuggestion';
import InlineAiMenu from './InlineAiMenu';
import SpellcheckMenu from './SpellcheckMenu';
import { useEditorContext, useStoreContext, useUIContext, useAuthContext } from '../context/AppContext';
import NoteLinker from './NoteLinker';
import TemplateLinker from './TemplateLinker';
import BacklinksDisplay from './BacklinksDisplay';
import { useBacklinks } from '../hooks/useBacklinks';
import SlashCommandMenu from './SlashCommandMenu';
import { uploadImage, getPublicUrl } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { useSpellcheck } from '../hooks/useSpellcheck';
import RelatedNotes from './RelatedNotes';
import { useNoteEditorReducer, initialNoteEditorUIState } from '../hooks/useNoteEditorReducer';
import { useAiSuggestions } from '../hooks/useAiSuggestions';
import { useAiActions } from '../hooks/useAiActions';
import { useDebounce } from '../hooks/useDebounce';
import { useEditorHotkeys } from '../hooks/useEditorHotkeys';

interface NoteEditorProps {
    note: Note;
}

type NoteState = { title: string; content: string; tags: string[] };

const StatusBar: React.FC<{ wordCount: number; charCount: number; readingTime: number; isCheckingSpelling: boolean }> = ({ wordCount, charCount, readingTime, isCheckingSpelling }) => (
    <div className="flex-shrink-0 px-4 sm:px-8 py-1.5 border-t border-light-border dark:border-dark-border text-xs text-light-text/60 dark:text-dark-text/60 flex items-center justify-end space-x-4">
        {isCheckingSpelling && (
            <div className="flex items-center space-x-1.5 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-blue-500">Checking...</span>
            </div>
        )}
        <span>~{readingTime} min read</span>
        <span>Words: {wordCount}</span>
        <span>Characters: {charCount}</span>
    </div>
);

const NoteEditor: React.FC<NoteEditorProps> = ({ note }) => {
    const { updateNote, toggleFavorite, notes, restoreNoteVersion } = useStoreContext();
    const { isMobileView, onToggleSidebar, isAiRateLimited, isSettingsOpen, isCommandPaletteOpen, isSmartFolderModalOpen, isWelcomeModalOpen, isApiKeyMissing } = useUIContext();
    const { session } = useAuthContext();
    const { showToast } = useToast();
    const { registerEditorActions, unregisterEditorActions } = useEditorContext();

    const {
        state: editorState,
        set: setEditorState,
        reset: resetEditorState,
        undo,
        redo,
        canUndo,
        canRedo,
    } = useUndoableState<NoteState>({
        title: note.title,
        content: note.content,
        tags: note.tags,
    });
    
    const debouncedEditorState = useDebounce(editorState, 1500);

    const latestEditorStateRef = useRef(editorState);
    useEffect(() => {
        latestEditorStateRef.current = editorState;
    }, [editorState]);
    
    const prevNoteRef = useRef(note);
    const [lastWarnedTimestamp, setLastWarnedTimestamp] = useState<string | null>(null);

    const [uiState, dispatch] = useNoteEditorReducer();
    const {
        saveStatus, isHistoryOpen, previewVersion, viewMode, selection, noteLinker, templateLinker, noteLinkerForSelection,
        slashCommand, isDragOver, isAiActionLoading, isFullAiActionLoading, aiActionError
    } = uiState;

    const { 
        suggestedTags, isSuggestingTags, tagSuggestionError,
        suggestedTitle, isSuggestingTitle, titleSuggestionError,
        setSuggestedTags, setSuggestedTitle, setTitleSuggestionError,
        suggestTagsForFullNote, suggestTitleForFullNote, resetAiSuggestions
    } = useAiSuggestions(editorState, isAiRateLimited);
    
    const {
        applyAiActionToFullNote,
        summarizeAndFindActionForFullNote,
        handleEnhanceNote,
        handleInlineAiAction
    } = useAiActions(editorState, setEditorState, dispatch);

    const isEffectivelyReadOnly = !!previewVersion || viewMode === 'preview' || !!isFullAiActionLoading;

    const { 
        spellingErrors, isCheckingSpelling, activeSpellingError, setActiveSpellingError,
        spellingSuggestions, isLoadingSuggestions, suggestionError 
    } = useSpellcheck(editorState.content, isEffectivelyReadOnly || isAiRateLimited || isApiKeyMissing);

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
    const hasAutoTitledRef = useRef(false);

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

    // Auto-resize textarea
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

    // Reset all local state when switching to a new note
    useEffect(() => {
        resetEditorState({ title: note.title, content: note.content, tags: note.tags });
        dispatch({ type: 'RESET_STATE_FOR_NEW_NOTE' });
        resetAiSuggestions();
        setActiveSpellingError(null);
        hasAutoTitledRef.current = false;
        setLastWarnedTimestamp(null);
        
        if (note.title === 'Untitled Note' && note.content === '') {
            setTimeout(() => titleInputRef.current?.focus(), 100);
        }
    }, [note.id, resetEditorState, resetAiSuggestions, setActiveSpellingError]);
    
    // Effect to handle external note updates (e.g., from another tab)
    useEffect(() => {
        // If the note ID has changed, it's a new note loading.
        // The main reset effect handles this, so we update our ref and exit.
        if (note.id !== prevNoteRef.current.id) {
            prevNoteRef.current = note;
            return;
        }

        // If updatedAt has changed, a modification occurred.
        if (note.updatedAt !== prevNoteRef.current.updatedAt) {
            // Check if the incoming update matches the current editor state.
            // If it does, it's just our own save reflecting back. Do nothing.
            const isSelfUpdate = JSON.stringify(latestEditorStateRef.current) === JSON.stringify({
                title: note.title,
                content: note.content,
                tags: note.tags,
            });

            if (isSelfUpdate) {
                setLastWarnedTimestamp(null); // Reset warning on self-update
                prevNoteRef.current = note; // Update ref and continue
                return;
            }

            // The update is external. Now check if the user has local, unsaved changes.
            // "Dirty" is defined as the current editor state differing from the *previous* note prop state.
            const hasLocalChanges = JSON.stringify(latestEditorStateRef.current) !== JSON.stringify({
                title: prevNoteRef.current.title,
                content: prevNoteRef.current.content,
                tags: prevNoteRef.current.tags,
            });

            if (hasLocalChanges) {
                // User is actively editing. Warn them but preserve their work.
                // Only show toast if we haven't already warned for this specific update.
                if (lastWarnedTimestamp !== note.updatedAt) {
                    showToast({
                        message: `"${note.title}" was updated in another tab. Your next save will overwrite.`,
                        type: 'info',
                    });
                    setLastWarnedTimestamp(note.updatedAt);
                }
            } else {
                // Editor is "clean", so it's safe to load the external changes.
                resetEditorState({ title: note.title, content: note.content, tags: note.tags });
                setLastWarnedTimestamp(null); // Reset warning state on successful sync
                showToast({
                    message: `"${note.title}" was synced from an external change.`,
                    type: 'info',
                });
            }
        }

        // Update the ref for the next comparison.
        prevNoteRef.current = note;
    }, [note, resetEditorState, showToast, lastWarnedTimestamp]);


    // Auto-save and status handling logic
    useEffect(() => {
        if (previewVersion) return; // Don't save while previewing history

        const isLiveDirty = JSON.stringify(editorState) !== JSON.stringify({
            title: note.title,
            content: note.content,
            tags: note.tags,
        });

        if (!isLiveDirty) {
            if (saveStatus !== 'saved') {
                dispatch({ type: 'SET_SAVE_STATUS', payload: 'saved' });
            }
            return;
        }

        // If it's dirty, it's at least 'unsaved'
        if (saveStatus === 'saved') {
            dispatch({ type: 'SET_SAVE_STATUS', payload: 'unsaved' });
        }

        const userHasStoppedTyping = JSON.stringify(editorState) === JSON.stringify(debouncedEditorState);

        if (userHasStoppedTyping && saveStatus !== 'saving') {
            dispatch({ type: 'SET_SAVE_STATUS', payload: 'saving' });
            
            updateNote(note.id, editorState).then(() => {
                dispatch({ type: 'SET_SAVE_STATUS', payload: 'saved' });
            }).catch(error => {
                console.error("Auto-save failed:", error);
                showToast({ message: `Auto-save failed. Your changes are safe here.`, type: 'error' });
                dispatch({ type: 'SET_SAVE_STATUS', payload: 'error' });
            });
        }
    }, [editorState, debouncedEditorState, note, updateNote, showToast, dispatch, previewVersion, saveStatus]);

    // Robust saving on navigation/unmount
    useEffect(() => {
        const noteAtMount = note;

        return () => {
            // Use the state from the ref, which is always up-to-date
            const latestStateForNote = latestEditorStateRef.current;
            
            const isDirty = JSON.stringify(latestStateForNote) !== JSON.stringify({
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
        };
    }, [note.id, updateNote, showToast]);


    // Register editor actions with the App context
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
    
    const handleScroll = useCallback(() => {
        dispatch({ type: 'SET_SELECTION', payload: null });
        setActiveSpellingError(null);
        dispatch({ type: 'SET_NOTE_LINKER', payload: null });
        dispatch({ type: 'SET_TEMPLATE_LINKER', payload: null });
        dispatch({ type: 'SET_NOTE_LINKER_FOR_SELECTION', payload: null });
        dispatch({ type: 'SET_SLASH_COMMAND', payload: null });
    }, [dispatch, setActiveSpellingError]);
    
    // Effect for closing popups on scroll
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

    const getCursorPositionRect = (textarea: HTMLTextAreaElement, position: number): DOMRect => {
        const pre = document.createElement('pre');
        const styles = window.getComputedStyle(textarea);
        [...styles].forEach(key => pre.style.setProperty(key, styles.getPropertyValue(key)));
        pre.style.position = 'absolute'; pre.style.visibility = 'hidden';
        pre.style.whiteSpace = 'pre-wrap'; pre.style.wordWrap = 'break-word';
        const before = editorState.content.substring(0, position);
        const span = document.createElement('span'); span.textContent = '.';
        pre.textContent = before; pre.appendChild(span);
        document.body.appendChild(pre);
        const rect = span.getBoundingClientRect();
        document.body.removeChild(pre);
        return rect;
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value, selectionStart } = e.target;
        setEditorState({ ...editorState, content: value });
        dispatch({ type: 'SET_SELECTION', payload: null }); 
        setActiveSpellingError(null);

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
                setTimeout(() => { textarea.selectionStart = selectionStart + 1; textarea.selectionEnd = selectionEnd + 1; }, 0);
            } else {
                const newContent = `${value.substring(0, selectionStart)}${char}${closingChar}${value.substring(selectionStart)}`;
                setEditorState({ ...editorState, content: newContent });
                setTimeout(() => { textarea.selectionStart = textarea.selectionEnd = selectionStart + 1; }, 0);
            }
        }
        if (e.key === 'Backspace' && selectionStart === selectionEnd) {
            const charBefore = value[selectionStart - 1];
            const charAfter = value[selectionStart];
            if (charBefore && pairs[charBefore] === charAfter) {
                e.preventDefault();
                const newContent = value.substring(0, selectionStart - 1) + value.substring(selectionStart + 1);
                setEditorState({ ...editorState, content: newContent });
                setTimeout(() => { textarea.selectionStart = textarea.selectionEnd = selectionStart - 1; }, 0);
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
    
    const handleContentBlur = () => {
        if (!hasAutoTitledRef.current && editorState.title === 'Untitled Note' && editorState.content.trim()) {
            const firstLine = editorState.content.split('\n')[0].trim().replace(/^#+\s*/, '');
            if (firstLine) {
                const newTitle = firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;
                setEditorState({ ...editorState, title: newTitle });
                hasAutoTitledRef.current = true;
            }
        }
    };

    // --- Action Handlers ---
    const handleInsertLink = (noteId: string, noteTitle: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        if (noteLinkerForSelection) {
            const { start, end, text } = noteLinkerForSelection;
            const newContent = `${editorState.content.substring(0, start)}[[${noteId}|${text}]]${editorState.content.substring(end)}`;
            setEditorState({ ...editorState, content: newContent });
            dispatch({ type: 'SET_NOTE_LINKER_FOR_SELECTION', payload: null });
            setTimeout(() => { textarea.focus(); const pos = start + noteId.length + text.length + 5; textarea.selectionStart = textarea.selectionEnd = pos; }, 0);
        } else if (noteLinker) {
            const { selectionStart } = textarea; const startIndex = selectionStart - noteLinker.query.length - 2;
            const newContent = `${editorState.content.substring(0, startIndex)}[[${noteId}|${noteTitle}]]${editorState.content.substring(selectionStart)}`;
            setEditorState({ ...editorState, content: newContent });
            dispatch({ type: 'SET_NOTE_LINKER', payload: null });
            setTimeout(() => { textarea.focus(); const pos = startIndex + noteId.length + noteTitle.length + 5; textarea.selectionStart = textarea.selectionEnd = pos; }, 0);
        }
    };
    
    const handleInsertSyncedBlock = (templateId: string) => {
        if (!templateLinker) return;
        const textarea = textareaRef.current;
        if (!textarea) return;
        const { selectionStart } = textarea;
        const startIndex = selectionStart - templateLinker.query.length; // Assumes it was triggered from a slash command with no '/'
        const newContent = `${editorState.content.substring(0, startIndex)}[[sync:${templateId}]]${editorState.content.substring(selectionStart)}`;
        setEditorState({ ...editorState, content: newContent });
        dispatch({ type: 'SET_TEMPLATE_LINKER', payload: null });
        setTimeout(() => {
            textarea.focus();
            const pos = startIndex + `[[sync:${templateId}]]`.length;
            textarea.selectionStart = textarea.selectionEnd = pos;
        }, 0);
    };

    const handleSelectCommand = (commandId: string) => {
        if (!slashCommand) return;
        const { range, position } = slashCommand;
        const currentContent = editorState.content;
        const replaceCommandText = (replacement: string, cursorOffset = replacement.length) => {
            const newContent = currentContent.substring(0, range.start) + replacement + currentContent.substring(range.end);
            setEditorState({ ...editorState, content: newContent });
            setTimeout(() => {
                textareaRef.current?.focus(); const pos = range.start + cursorOffset;
                textareaRef.current?.setSelectionRange(pos, pos);
            }, 0);
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
        setTimeout(() => {
            textareaRef.current?.focus(); const pos = end + prefix.length + suffix.length;
            textareaRef.current?.setSelectionRange(pos, pos);
        }, 0);
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
    const handleApplyTemplate = (template: Template) => { if (editorState.content.trim() !== '' && !window.confirm('Applying a template will replace the current note content. Are you sure?')) { return; } setEditorState({ title: template.title, content: template.content, tags: []}); dispatch({ type: 'SET_VIEW_MODE', payload: 'edit' }); };
    const handleToggleTask = (lineNumber: number) => { const lines = editorState.content.split('\n'); if (lineNumber >= lines.length) return; const line = lines[lineNumber]; const toggledLine = line.includes('[ ]') ? line.replace('[ ]', '[x]') : line.replace(/\[(x|X)\]/, '[ ]'); lines[lineNumber] = toggledLine; const newContent = lines.join('\n'); setEditorState({ ...editorState, content: newContent }); };
    const handleAddTag = (tagToAdd: string) => { if (!editorState.tags.includes(tagToAdd)) { setEditorState({ ...editorState, tags: [...editorState.tags, tagToAdd] }); } setSuggestedTags(prev => prev.filter(t => t !== tagToAdd)); };
    const handleApplyTitleSuggestion = (title: string) => { setEditorState({ ...editorState, title }); setSuggestedTitle(null); setTitleSuggestionError(null); };

    const editorPaddingClass = 'px-4 sm:px-8';
    const sharedEditorClasses = 'w-full p-0 border-0 text-base sm:text-lg resize-none focus:outline-none leading-relaxed whitespace-pre-wrap break-words';

    return (
        <div className="flex-1 flex flex-col h-full relative bg-light-background dark:bg-dark-background" onDragOver={(e) => { e.preventDefault(); if (!isEffectivelyReadOnly) dispatch({ type: 'SET_DRAG_OVER', payload: true }); }} onDragLeave={() => dispatch({ type: 'SET_DRAG_OVER', payload: false })} onDrop={handleDrop}>
             <Toolbar note={note} onToggleFavorite={() => toggleFavorite(note.id)} saveStatus={saveStatus} editorTitle={editorState.title} onEnhance={handleEnhanceNote} onSummarize={summarizeAndFindActionForFullNote} onToggleHistory={() => dispatch({type: 'SET_HISTORY_OPEN', payload: !isHistoryOpen})} isHistoryOpen={isHistoryOpen} onApplyTemplate={handleApplyTemplate} isMobileView={isMobileView} onToggleSidebar={onToggleSidebar} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} viewMode={viewMode} onToggleViewMode={() => dispatch({type: 'SET_VIEW_MODE', payload: viewMode === 'edit' ? 'preview' : 'edit'})} wordCount={wordCount} charCount={charCount} aiActionError={aiActionError} setAiActionError={(err) => dispatch({ type: 'SET_AI_ACTION_ERROR', payload: err })} isFullAiActionLoading={isFullAiActionLoading} isApiKeyMissing={isApiKeyMissing} />
             {isAiRateLimited && <div className="bg-yellow-100 dark:bg-yellow-900/30 border-b border-yellow-300 dark:border-yellow-700/50 py-2 px-4 text-center text-sm text-yellow-800 dark:text-yellow-200 flex-shrink-0">AI features are temporarily paused due to high usage. They will be available again shortly.</div>}
            
            <div ref={editorPaneRef} className="flex-1 overflow-y-auto relative">
                 {!!previewVersion && <div className={`bg-yellow-100 dark:bg-yellow-900/30 py-2 text-center text-sm text-yellow-800 dark:text-yellow-200 max-w-3xl mx-auto ${editorPaddingClass}`}>You are previewing a version from {new Date(previewVersion.savedAt).toLocaleString()}.</div>}

                <div className={`max-w-3xl mx-auto py-12 ${editorPaddingClass} transition-opacity duration-300 ${isFullAiActionLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {viewMode === 'edit' ? (
                        <>
                            <input
                                ref={titleInputRef} type="text" value={displayedTitle}
                                onChange={(e) => setEditorState({ ...editorState, title: e.target.value })}
                                placeholder="Note Title"
                                className={`w-full bg-transparent text-3xl sm:text-4xl font-bold focus:outline-none rounded-md ${isEffectivelyReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                                readOnly={isEffectivelyReadOnly}
                            />
                            {!isApiKeyMissing && !isEffectivelyReadOnly && <TitleSuggestion suggestion={suggestedTitle} onApply={handleApplyTitleSuggestion} isLoading={isSuggestingTitle} error={titleSuggestionError} />}
                            <div className="relative mt-4">
                                <textarea
                                    ref={textareaRef} onSelect={handleSelect} onScroll={handleScroll} onKeyDown={handleKeyDown}
                                    onBlur={handleContentBlur}
                                    value={displayedContent} onChange={handleChange}
                                    placeholder="Start writing, drop a file, or type / for commands..."
                                    className={`${sharedEditorClasses} font-serif-editor relative z-10 caret-light-text dark:caret-dark-text bg-transparent block`}
                                    readOnly={isEffectivelyReadOnly} spellCheck={false}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="font-serif-editor">
                             <MarkdownPreview title={displayedTitle} content={displayedContent} onToggleTask={handleToggleTask} />
                        </div>
                    )}

                    <div className="mt-12 space-y-8">
                        <BacklinksDisplay backlinks={backlinks} />
                        {!isApiKeyMissing && <RelatedNotes note={note} />}
                         <div id="onboarding-tag-input" className={`pt-6 border-t border-light-border dark:border-dark-border ${isEffectivelyReadOnly ? 'opacity-60' : ''}`}>
                            <TagInput tags={displayedTags} setTags={(tags) => setEditorState({ ...editorState, tags })} readOnly={isEffectivelyReadOnly} allExistingTags={allTags} />
                            {!isApiKeyMissing && !isEffectivelyReadOnly && <TagSuggestions suggestions={suggestedTags} onAddTag={handleAddTag} isLoading={isSuggestingTags} error={tagSuggestionError} />}
                        </div>
                    </div>
                </div>
            </div>
            
            <StatusBar wordCount={wordCount} charCount={charCount} readingTime={readingTime} isCheckingSpelling={isCheckingSpelling} />

            {(noteLinker || noteLinkerForSelection) && <NoteLinker query={noteLinker?.query || ''} onSelect={handleInsertLink} onClose={() => { dispatch({ type: 'SET_NOTE_LINKer', payload: null }); dispatch({ type: 'SET_NOTE_LINKER_FOR_SELECTION', payload: null }); }} position={noteLinker?.position || { top: noteLinkerForSelection!.rect.bottom, left: noteLinkerForSelection!.rect.left }} />}
            {templateLinker && <TemplateLinker query={templateLinker.query} onSelect={handleInsertSyncedBlock} onClose={() => dispatch({ type: 'SET_TEMPLATE_LINKER', payload: null })} position={templateLinker.position} />}
            {slashCommand && <SlashCommandMenu query={slashCommand.query} position={slashCommand.position} onSelect={handleSelectCommand} onClose={() => dispatch({ type: 'SET_SLASH_COMMAND', payload: null })} textareaRef={textareaRef} />}
            <InlineAiMenu selection={selection} onAction={async (action) => { if (selection) { const newPos = await handleInlineAiAction(action, selection); if (newPos !== null && textareaRef.current) { textareaRef.current.focus(); setTimeout(() => textareaRef.current?.setSelectionRange(newPos, newPos), 0); } } }} onFormat={handleFormatSelection} isLoading={isAiActionLoading} onClose={() => dispatch({ type: 'SET_SELECTION', payload: null })} isApiKeyMissing={isApiKeyMissing} />
            <SpellcheckMenu activeError={activeSpellingError} suggestions={spellingSuggestions} onSelect={handleApplySuggestion} isLoading={isLoadingSuggestions} error={suggestionError} onClose={() => setActiveSpellingError(null)} />
            {isHistoryOpen && <VersionHistorySidebar history={note.history || []} onClose={handleCloseHistory} onPreview={(version) => dispatch({ type: 'SET_PREVIEW_VERSION', payload: version })} onRestore={handleRestore} activeVersionTimestamp={previewVersion?.savedAt} />}
            {isDragOver && <div className="absolute inset-0 bg-light-primary/10 dark:bg-dark-primary/10 border-4 border-dashed border-light-primary dark:border-dark-primary rounded-2xl m-4 pointer-events-none flex items-center justify-center"><p className="text-light-primary dark:text-dark-primary font-bold text-2xl">Drop file to import</p></div>}
        </div>
    );
};

export default NoteEditor;