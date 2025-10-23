import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Note, NoteVersion, Template, SpellingError } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import Toolbar from './Toolbar';
import TagInput from './TagInput';
import VersionHistorySidebar from './VersionHistorySidebar';
import { useUndoableState } from '../hooks/useUndoableState';
import MarkdownPreview from './MarkdownPreview';
import { suggestTags, suggestTitle, performInlineEdit, InlineAction, findMisspelledWords, getSpellingSuggestions, summarizeAndExtractActions } from '../services/geminiService';
import TagSuggestions from './TagSuggestions';
import TitleSuggestion from './TitleSuggestion';
import InlineAiMenu from './InlineAiMenu';
import SpellcheckMenu from './SpellcheckMenu';
import { useEditorContext, useStoreContext, useUIContext, useAuthContext } from '../context/AppContext';
import NoteLinker from './NoteLinker';
import BacklinksDisplay from './BacklinksDisplay';
import { useBacklinks } from '../hooks/useBacklinks';
import SlashCommandMenu from './SlashCommandMenu';
import { uploadImage, getPublicUrl } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';

interface NoteEditorProps {
    note: Note;
    onRestoreVersion: (noteId: string, version: NoteVersion) => void;
    templates: Template[];
}

type NoteState = { title: string; content: string; tags: string[] };
type SelectionState = { start: number; end: number; text: string; rect: DOMRect } | null;
type ActiveSpellingError = { error: SpellingError; rect: DOMRect };
type NoteLinkerState = { query: string; position: { top: number; left: number } } | null;
type SlashCommandState = { query: string; position: { top: number; left: number }, range: { start: number, end: number } } | null;

const StatusBar: React.FC<{ wordCount: number; charCount: number }> = ({ wordCount, charCount }) => (
    <div className="flex-shrink-0 px-4 sm:px-8 py-1.5 border-t border-light-border dark:border-dark-border text-xs text-light-text/60 dark:text-dark-text/60 flex items-center justify-end space-x-4">
        <span>Words: {wordCount}</span>
        <span>Characters: {charCount}</span>
    </div>
);

const NoteEditor: React.FC<NoteEditorProps> = ({ note, onRestoreVersion, templates }) => {
    const { updateNote, deleteNote, toggleFavorite, notes } = useStoreContext();
    const { isMobileView, onToggleSidebar, isAiRateLimited } = useUIContext();
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
    
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [previewVersion, setPreviewVersion] = useState<NoteVersion | null>(null);
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
    
    const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
    const [isSuggestingTags, setIsSuggestingTags] = useState(false);
    const [tagSuggestionError, setTagSuggestionError] = useState<string | null>(null);
    const [suggestedTitle, setSuggestedTitle] = useState<string | null>(null);
    const [isSuggestingTitle, setIsSuggestingTitle] = useState(false);
    const [titleSuggestionError, setTitleSuggestionError] = useState<string | null>(null);
    const [selection, setSelection] = useState<SelectionState>(null);
    const [isAiActionLoading, setIsAiActionLoading] = useState(false);
    const [isFullAiActionLoading, setIsFullAiActionLoading] = useState<string | null>(null);
    const [aiActionError, setAiActionError] = useState<string | null>(null);
    
    const [spellingErrors, setSpellingErrors] = useState<SpellingError[]>([]);
    const [isCheckingSpelling, setIsCheckingSpelling] = useState(false);
    const [activeSpellingError, setActiveSpellingError] = useState<ActiveSpellingError | null>(null);
    const [spellingSuggestions, setSpellingSuggestions] = useState<string[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [suggestionError, setSuggestionError] = useState<string | null>(null);

    const [noteLinker, setNoteLinker] = useState<NoteLinkerState | null>(null);
    const [noteLinkerForSelection, setNoteLinkerForSelection] = useState<SelectionState | null>(null);
    const [slashCommand, setSlashCommand] = useState<SlashCommandState | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const backlinks = useBacklinks(note.id, notes);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const editorPaneRef = useRef<HTMLDivElement>(null);
    
    const lastAnalyzedContentForTagsRef = useRef<string | null>(null);
    const lastAnalyzedContentForTitleRef = useRef<string | null>(null);
    const lastAnalyzedContentForSpellingRef = useRef<string|null>(null);
    const tagSuggestionIdRef = useRef(0);
    const titleSuggestionIdRef = useRef(0);
    const spellingCheckIdRef = useRef(0);

    const MIN_CONTENT_LENGTH_FOR_SUGGESTIONS = 50;

    const debouncedEditorState = useDebounce(editorState, 5000);
    const debouncedContentForSpelling = useDebounce(editorState.content, 1500);

    const displayedTitle = previewVersion ? previewVersion.title : editorState.title;
    const displayedContent = previewVersion ? previewVersion.content : editorState.content;
    const displayedTags = previewVersion ? previewVersion.tags : editorState.tags;
    const isVersionPreviewing = !!previewVersion;
    const isEffectivelyReadOnly = isVersionPreviewing || viewMode === 'preview';
    
    const { wordCount, charCount } = useMemo(() => {
        const content = editorState.content;
        const words = content.trim().split(/\s+/).filter(Boolean).length;
        // If content is just whitespace, word count should be 0
        const finalWordCount = content.trim() === '' ? 0 : words;
        return {
            wordCount: finalWordCount,
            charCount: content.length,
        };
    }, [editorState.content]);

    // Auto-resize textarea to fit content
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea && viewMode === 'edit') {
            const resize = () => {
                textarea.style.height = 'auto'; // Reset height to calculate scrollHeight correctly
                const scrollHeight = textarea.scrollHeight;
                textarea.style.height = `${scrollHeight}px`;
            };
            resize(); // Initial resize
            window.addEventListener('resize', resize);
            return () => window.removeEventListener('resize', resize);
        }
    }, [editorState.content, viewMode]);

    // Reset all local state when switching to a new note
    useEffect(() => {
        // Prevent stale state when switching notes, especially from a version preview
        if (previewVersion && note.id !== note.id) {
            setPreviewVersion(null);
        }
        resetEditorState({ title: note.title, content: note.content, tags: note.tags });
        setViewMode('edit');
        setSuggestedTags([]);
        setTagSuggestionError(null);
        setSuggestedTitle(null);
        setTitleSuggestionError(null);
        setSpellingErrors([]);
        setSelection(null);
        setActiveSpellingError(null);
        setNoteLinker(null);
        setSlashCommand(null);
        
        // Prevent stale background tasks from updating the new note
        tagSuggestionIdRef.current += 1;
        titleSuggestionIdRef.current += 1;
        spellingCheckIdRef.current += 1;
        
        // Reset last analyzed content to prevent skipping analysis on the new note
        lastAnalyzedContentForTagsRef.current = null;
        lastAnalyzedContentForTitleRef.current = null;
        lastAnalyzedContentForSpellingRef.current = null;

        // Auto-focus title for new, empty notes
        if (note.title === 'Untitled Note' && note.content === '') {
            setTimeout(() => {
                titleInputRef.current?.focus();
                titleInputRef.current?.select();
            }, 100);
        }
    }, [note.id, resetEditorState, note.title, note.content, note.tags]);

    // Handle auto-saving
    useEffect(() => {
        if (previewVersion) return;
        const isDirty = JSON.stringify(editorState) !== JSON.stringify({ title: note.title, content: note.content, tags: note.tags });
        setSaveStatus(isDirty ? 'unsaved' : 'saved');
    }, [editorState, note.title, note.content, note.tags, previewVersion]);

    // Debounced actions: saving and AI suggestions
    useEffect(() => {
        if (isVersionPreviewing || isAiRateLimited) return;
        
        const isDifferentFromPersisted = JSON.stringify(debouncedEditorState) !== JSON.stringify({ title: note.title, content: note.content, tags: note.tags });

        if (saveStatus === 'unsaved' && isDifferentFromPersisted) {
            setSaveStatus('saving');
            updateNote(note.id, debouncedEditorState);
            setTimeout(() => setSaveStatus('saved'), 1000);
        }

        const contentForAnalysis = debouncedEditorState.content;
        if (contentForAnalysis.length >= MIN_CONTENT_LENGTH_FOR_SUGGESTIONS) {
            const isGenericTitle = debouncedEditorState.title.trim().toLowerCase() === 'untitled note';
            if (isGenericTitle && contentForAnalysis !== lastAnalyzedContentForTitleRef.current) {
                const currentSuggestionId = ++titleSuggestionIdRef.current;
                lastAnalyzedContentForTitleRef.current = contentForAnalysis;
                setIsSuggestingTitle(true);
                setTitleSuggestionError(null);
                suggestTitle(contentForAnalysis).then(title => {
                    if (currentSuggestionId === titleSuggestionIdRef.current && title) setSuggestedTitle(title);
                }).catch(err => {
                    if (currentSuggestionId === titleSuggestionIdRef.current) setTitleSuggestionError(err.message);
                }).finally(() => {
                    if (currentSuggestionId === titleSuggestionIdRef.current) setIsSuggestingTitle(false);
                });
            } else if (!isGenericTitle) {
                setSuggestedTitle(null);
            }
            if (contentForAnalysis !== lastAnalyzedContentForTagsRef.current && debouncedEditorState.tags.length === 0) {
                const currentSuggestionId = ++tagSuggestionIdRef.current;
                lastAnalyzedContentForTagsRef.current = contentForAnalysis;
                setIsSuggestingTags(true);
                setTagSuggestionError(null);
                suggestTags(debouncedEditorState.title, contentForAnalysis).then(tags => {
                    if (currentSuggestionId === tagSuggestionIdRef.current) {
                        const newSuggestions = tags.filter(tag => !debouncedEditorState.tags.includes(tag));
                        setSuggestedTags(newSuggestions);
                    }
                }).catch(err => {
                    if (currentSuggestionId === tagSuggestionIdRef.current) setTagSuggestionError(err.message);
                }).finally(() => {
                    if (currentSuggestionId === tagSuggestionIdRef.current) setIsSuggestingTags(false);
                });
            }
        }
    }, [debouncedEditorState, note.id, updateNote, saveStatus, isVersionPreviewing, isAiRateLimited, note.title, note.content, note.tags]);

    // Debounced spell check
    useEffect(() => {
        if (isVersionPreviewing || viewMode === 'preview' || isAiRateLimited) return;
        
        const contentForSpelling = debouncedContentForSpelling;
        if (contentForSpelling && contentForSpelling !== lastAnalyzedContentForSpellingRef.current) {
            const currentCheckId = ++spellingCheckIdRef.current;
            setIsCheckingSpelling(true);
            findMisspelledWords(contentForSpelling).then(errors => {
                if (currentCheckId === spellingCheckIdRef.current) {
                    lastAnalyzedContentForSpellingRef.current = contentForSpelling;
                    setSpellingErrors(errors);
                }
            }).finally(() => {
                if (currentCheckId === spellingCheckIdRef.current) {
                    setIsCheckingSpelling(false);
                }
            });
        } else if (!contentForSpelling) {
             setSpellingErrors([]);
        }
    }, [debouncedContentForSpelling, isVersionPreviewing, viewMode, isAiRateLimited]);
    
    const applyAiActionToFullNote = useCallback(async (action: InlineAction) => {
        setIsFullAiActionLoading(`Applying: ${action}...`);
        setAiActionError(null);
        try {
            const newContent = await performInlineEdit(editorState.content, action);
            setEditorState({ ...editorState, content: newContent });
        } catch (error) {
             setAiActionError(error instanceof Error ? error.message : 'An unknown error occurred.');
        } finally {
            setIsFullAiActionLoading(null);
        }
    }, [editorState, setEditorState]);
    
    const summarizeAndFindActionForFullNote = useCallback(async () => {
        setIsFullAiActionLoading('Summarizing...');
        setAiActionError(null);
        try {
            const { summary, actionItems } = await summarizeAndExtractActions(editorState.content);
            let formattedSummary = '';
            if (summary) formattedSummary += `### ✨ AI Summary\n\n${summary}\n\n`;
            if (actionItems && actionItems.length > 0) formattedSummary += `### ✅ Action Items\n\n${actionItems.map(item => `- [ ] ${item}`).join('\n')}\n\n`;
            if (formattedSummary) {
                const newContent = `---\n\n${formattedSummary}---\n\n${editorState.content}`;
                setEditorState({ ...editorState, content: newContent });
            }
        } catch (error) {
             setAiActionError(error instanceof Error ? error.message : 'An unknown error occurred.');
        } finally {
            setIsFullAiActionLoading(null);
        }
    }, [editorState, setEditorState]);
    
    const suggestTagsForFullNote = useCallback(() => {
        const currentContent = editorState.content;
        lastAnalyzedContentForTagsRef.current = currentContent;
        const currentSuggestionId = ++tagSuggestionIdRef.current;

        setIsSuggestingTags(true);
        setTagSuggestionError(null);
        setSuggestedTags([]);

        suggestTags(editorState.title, currentContent).then(tags => {
            if (currentSuggestionId === tagSuggestionIdRef.current) {
                const newSuggestions = tags.filter(tag => !editorState.tags.includes(tag));
                setSuggestedTags(newSuggestions);
            }
        }).catch(err => {
            if (currentSuggestionId === tagSuggestionIdRef.current) {
                setTagSuggestionError(err.message)
            }
        }).finally(() => {
            if (currentSuggestionId === tagSuggestionIdRef.current) {
                setIsSuggestingTags(false)
            }
        });
    }, [editorState.content, editorState.title, editorState.tags]);

    const suggestTitleForFullNote = useCallback(() => {
        const currentContent = editorState.content;
        lastAnalyzedContentForTitleRef.current = currentContent;
        const currentSuggestionId = ++titleSuggestionIdRef.current;

        setIsSuggestingTitle(true);
        setTitleSuggestionError(null);
        setSuggestedTitle(null);

        suggestTitle(currentContent).then(title => {
            if (currentSuggestionId === titleSuggestionIdRef.current) {
                if (title) setSuggestedTitle(title);
            }
        }).catch(err => {
            if (currentSuggestionId === titleSuggestionIdRef.current) {
                setTitleSuggestionError(err.message)
            }
        }).finally(() => {
            if (currentSuggestionId === titleSuggestionIdRef.current) {
                setIsSuggestingTitle(false)
            }
        });
    }, [editorState.content]);

    // Register editor actions with the App context
    const editorActions = useMemo(() => ({ 
        undo, redo, canUndo, canRedo, 
        applyAiActionToFullNote,
        suggestTagsForFullNote,
        suggestTitleForFullNote,
        summarizeAndFindActionForFullNote
    }), [
        undo, redo, canUndo, canRedo, 
        applyAiActionToFullNote, suggestTagsForFullNote, 
        suggestTitleForFullNote, summarizeAndFindActionForFullNote
    ]);

    useEffect(() => {
        registerEditorActions(editorActions);
        return () => unregisterEditorActions();
    }, [registerEditorActions, unregisterEditorActions, editorActions]);

    useEffect(() => {
        const pane = editorPaneRef.current;
        const handleScroll = () => {
            setSelection(null);
            setActiveSpellingError(null);
            setNoteLinker(null);
            setNoteLinkerForSelection(null);
            setSlashCommand(null);
        };
        pane?.addEventListener('scroll', handleScroll);
        return () => pane?.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleGlobalKeyDown = (event: KeyboardEvent) => {
            if (event.target !== textareaRef.current && event.target !== document.body) return;
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modKey = isMac ? event.metaKey : event.ctrlKey;
            
            if (modKey && event.key.toLowerCase() === 'z') {
                if (noteLinker) return;
                event.preventDefault();
                undo();
            } else if (modKey && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))) {
                if (noteLinker) return;
                event.preventDefault();
                redo();
            }
        };
        
        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }, [undo, redo, noteLinker]);

    useEffect(() => {
        if (!activeSpellingError) return;
        setIsLoadingSuggestions(true);
        setSuggestionError(null);
        getSpellingSuggestions(activeSpellingError.error.word)
            .then(setSpellingSuggestions)
            .catch(err => setSuggestionError(err.message))
            .finally(() => setIsLoadingSuggestions(false));
    }, [activeSpellingError]);
    
    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
         setSelection(null);
         setActiveSpellingError(null);
         setNoteLinker(null);
         setNoteLinkerForSelection(null);
         setSlashCommand(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value, selectionStart } = e.target;
        setEditorState({ ...editorState, content: value });
        // Hide popups that depend on selection, as content is changing
        setSelection(null); 
        setActiveSpellingError(null);

        const textBeforeCursor = value.substring(0, selectionStart);
        const slashMatch = textBeforeCursor.match(/(?:\s|^)\/([\w-]*)$/);
        const linkerMatch = textBeforeCursor.match(/\[\[([^\[\]]*)$/);

        // Mutually exclusive popups: only one can be active.
        if (slashMatch) {
            const query = slashMatch[1];
            const rect = getCursorPositionRect(e.target, selectionStart);
            const range = {
                start: selectionStart - query.length - 1,
                end: selectionStart,
            };
            setSlashCommand({ query, position: { top: rect.bottom, left: rect.left }, range });
            setNoteLinker(null);
        } else if (linkerMatch) {
            const rect = getCursorPositionRect(e.target, selectionStart);
            setNoteLinker({
                query: linkerMatch[1],
                position: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX },
            });
            setSlashCommand(null);
        } else {
            setSlashCommand(null);
            setNoteLinker(null);
        }
    };
    
    const handleInsertLink = (noteId: string, noteTitle: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        if (noteLinkerForSelection) {
            const { start, end, text } = noteLinkerForSelection;
            const newContent = `${editorState.content.substring(0, start)}[[${noteId}|${text}]]${editorState.content.substring(end)}`;
            setEditorState({ ...editorState, content: newContent });
            setNoteLinkerForSelection(null);
            setTimeout(() => {
                textarea.focus();
                const newCursorPos = start + noteId.length + text.length + 5;
                textarea.selectionStart = textarea.selectionEnd = newCursorPos;
            }, 0);
        } else if (noteLinker) {
            const { selectionStart } = textarea;
            const startIndex = selectionStart - noteLinker.query.length - 2;
            const newContent = `${editorState.content.substring(0, startIndex)}[[${noteId}|${noteTitle}]]${editorState.content.substring(selectionStart)}`;
            setEditorState({ ...editorState, content: newContent });
            setNoteLinker(null);
            setTimeout(() => {
                textarea.focus();
                const newCursorPos = startIndex + noteId.length + noteTitle.length + 5;
                textarea.selectionStart = textarea.selectionEnd = newCursorPos;
            }, 0);
        }
    };

    const getCursorPositionRect = (textarea: HTMLTextAreaElement, position: number): DOMRect => {
        const pre = document.createElement('pre');
        const styles = window.getComputedStyle(textarea);
        [...styles].forEach(key => pre.style.setProperty(key, styles.getPropertyValue(key)));
        pre.style.position = 'absolute';
        pre.style.visibility = 'hidden';
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.wordWrap = 'break-word';

        const before = editorState.content.substring(0, position);
        const span = document.createElement('span');
        span.textContent = '.';
        pre.textContent = before;
        pre.appendChild(span);
        
        document.body.appendChild(pre);
        const rect = span.getBoundingClientRect();
        document.body.removeChild(pre);
        return rect;
    };

    const handleSelect = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const { selectionStart, selectionEnd, value } = textarea;

        // Check if the current cursor position is still valid for a slash command.
        // Close the menu if the user makes a selection or moves the cursor away from the trigger.
        const textBeforeCursor = value.substring(0, selectionStart);
        const slashMatch = textBeforeCursor.match(/(?:\s|^)\/([\w-]*)$/);

        if (!slashMatch || selectionStart !== selectionEnd) {
            if (slashCommand) setSlashCommand(null);
        }

        if (isEffectivelyReadOnly || isAiActionLoading || isAiRateLimited) {
            setSelection(null);
            return;
        }

        const selectedText = value.substring(selectionStart, selectionEnd);
        if (selectedText.trim().length > 0) {
            // If a slash command is active, don't show the selection menu.
            if (!slashMatch || selectionStart !== selectionEnd) {
                setActiveSpellingError(null);
                const rect = getCursorPositionRect(textarea, selectionEnd);
                setSelection({ start: selectionStart, end: selectionEnd, text: selectedText, rect });
            }
        } else {
            // No text selected, so clear the selection state
            if (selection) setSelection(null);
        }

        if (selectionStart === selectionEnd) {
            const clickedError = spellingErrors.find(
                err => selectionStart >= err.index && selectionStart <= err.index + err.length
            );
            if (clickedError) {
                const rect = getCursorPositionRect(textarea, selectionStart);
                setActiveSpellingError({ error: clickedError, rect });
            } else {
                if (activeSpellingError) setActiveSpellingError(null);
            }
        }
    };
    
    const handleSelectCommand = (commandId: string) => {
        if (!slashCommand) return;
        
        const { range } = slashCommand;
        const currentContent = editorState.content;

        const replaceCommandText = (replacement: string, cursorOffset = replacement.length) => {
            const newContent = currentContent.substring(0, range.start) + replacement + currentContent.substring(range.end);
            setEditorState({ ...editorState, content: newContent });

            setTimeout(() => {
                textareaRef.current?.focus();
                const newCursorPos = range.start + cursorOffset;
                textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
        };

        switch(commandId) {
            case 'h1': replaceCommandText('# '); break;
            case 'h2': replaceCommandText('## '); break;
            case 'h3': replaceCommandText('### '); break;
            case 'list': replaceCommandText('- '); break;
            case 'todo': replaceCommandText('- [ ] '); break;
            case 'divider': replaceCommandText('---\n'); break;
            case 'ai-summarize':
                summarizeAndFindActionForFullNote();
                replaceCommandText('', 0);
                break;
            case 'ai-fix':
                applyAiActionToFullNote('fix');
                replaceCommandText('', 0);
                break;
            default: break;
        }
        
        setSlashCommand(null);
    };

    const handleAiAction = async (action: InlineAction) => {
        if (!selection) return;
        setIsAiActionLoading(true);
        setAiActionError(null);
        // Use a local copy of selection state to prevent it from being cleared by a re-render
        const currentSelection = selection;
        setSelection(null); 
        try {
            const newText = await performInlineEdit(currentSelection.text, action);
            const currentContent = editorState.content;
            const updatedContent = currentContent.substring(0, currentSelection.start) + newText + currentContent.substring(currentSelection.end);
            setEditorState({ ...editorState, content: updatedContent });
            if (textareaRef.current) {
                const newCursorPos = currentSelection.start + newText.length;
                textareaRef.current.focus();
                setTimeout(() => textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos), 0);
            }
        } catch (error) {
            setAiActionError(error instanceof Error ? error.message : 'An unknown error occurred.');
        } finally {
            setIsAiActionLoading(false);
        }
    };

    const handleFormatSelection = (format: 'bold' | 'italic' | 'code' | 'link') => {
        if (!selection) return;

        if (format === 'link') {
            setNoteLinkerForSelection(selection);
            setSelection(null);
            return;
        }
        
        const { start, end, text } = selection;
        let prefix = '';
        let suffix = '';
        switch(format) {
            case 'bold': prefix = suffix = '**'; break;
            case 'italic': prefix = suffix = '*'; break;
            case 'code': prefix = suffix = '`'; break;
        }

        const newContent = editorState.content.substring(0, start) + prefix + text + suffix + editorState.content.substring(end);
        setEditorState({...editorState, content: newContent });
        setSelection(null);

        setTimeout(() => {
            textareaRef.current?.focus();
            const newCursorPos = end + prefix.length + suffix.length;
            textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };
    
    const handleApplySuggestion = (suggestion: string) => {
        if (!activeSpellingError) return;
        const { index, length } = activeSpellingError.error;
        const newContent = editorState.content.substring(0, index) + suggestion + editorState.content.substring(index + length);
        setEditorState({ ...editorState, content: newContent });
        setActiveSpellingError(null);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
        if (isEffectivelyReadOnly || !session?.user) return;

        const file = e.dataTransfer.files[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                showToast({ message: 'Uploading image...', type: 'info' });
                uploadImage(session.user.id, note.id, file)
                    .then(path => {
                        const publicUrl = getPublicUrl(path);
                        const markdownImage = `\n![${file.name}](${publicUrl})\n`;
                        const { selectionStart } = textareaRef.current!;
                        const newContent = editorState.content.slice(0, selectionStart) + markdownImage + editorState.content.slice(selectionStart);
                        setEditorState({ ...editorState, content: newContent });
                        showToast({ message: 'Image uploaded successfully!', type: 'success' });
                    })
                    .catch(err => {
                        console.error(err);
                        showToast({ message: err.message || 'Failed to upload image.', type: 'error' });
                    });
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
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const pairs: { [key: string]: string } = { '(': ')', '[': ']', '{': '}', '"': '"', '*': '*', '_': '_' };
        const textarea = e.currentTarget;
        const { selectionStart, selectionEnd, value } = textarea;

        // Auto-pairing on key press
        if (pairs[e.key]) {
            e.preventDefault();
            const char = e.key;
            const closingChar = pairs[char];
            
            // Wrap selection
            if (selectionStart !== selectionEnd) {
                const selectedText = value.substring(selectionStart, selectionEnd);
                const newContent = `${value.substring(0, selectionStart)}${char}${selectedText}${closingChar}${value.substring(selectionEnd)}`;
                setEditorState({ ...editorState, content: newContent });
                
                setTimeout(() => {
                    textarea.selectionStart = selectionStart + 1;
                    textarea.selectionEnd = selectionEnd + 1;
                }, 0);
            } else { // Insert pair and move cursor
                const newContent = `${value.substring(0, selectionStart)}${char}${closingChar}${value.substring(selectionStart)}`;
                setEditorState({ ...editorState, content: newContent });

                setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
                }, 0);
            }
        }

        // Smart backspace to delete pairs
        if (e.key === 'Backspace' && selectionStart === selectionEnd) {
            const charBefore = value[selectionStart - 1];
            const charAfter = value[selectionStart];
            if (charBefore && pairs[charBefore] === charAfter) {
                e.preventDefault();
                const newContent = value.substring(0, selectionStart - 1) + value.substring(selectionStart + 1);
                setEditorState({ ...editorState, content: newContent });
                setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = selectionStart - 1;
                }, 0);
            }
        }
    };
    
    const handleRestore = (version: NoteVersion) => { onRestoreVersion(note.id, version); setPreviewVersion(null); setIsHistoryOpen(false); };
    const handleCloseHistory = () => { setPreviewVersion(null); setIsHistoryOpen(false); };
    const handleApplyTemplate = (template: Template) => { if (editorState.content.trim() !== '' && !window.confirm('Applying a template will replace the current note content. Are you sure?')) { return; } setEditorState({ title: template.title, content: template.content, tags: []}); setViewMode('edit'); };
    const handleToggleTask = (lineNumber: number) => { const lines = editorState.content.split('\n'); if (lineNumber >= lines.length) return; const line = lines[lineNumber]; const toggledLine = line.includes('[ ]') ? line.replace('[ ]', '[x]') : line.replace(/\[(x|X)\]/, '[ ]'); lines[lineNumber] = toggledLine; const newContent = lines.join('\n'); setEditorState({ ...editorState, content: newContent }); };
    const handleAddTag = (tagToAdd: string) => { if (!editorState.tags.includes(tagToAdd)) { setEditorState({ ...editorState, tags: [...editorState.tags, tagToAdd] }); } setSuggestedTags(prev => prev.filter(t => t !== tagToAdd)); };
    const handleApplyTitleSuggestion = (title: string) => { setEditorState({ ...editorState, title }); setSuggestedTitle(null); setTitleSuggestionError(null); };

    const editorPaddingClass = 'px-4 sm:px-8';
    const sharedEditorClasses = 'w-full p-0 border-0 text-base sm:text-lg resize-none focus:outline-none leading-relaxed whitespace-pre-wrap break-words font-sans';

    return (
        <div className="flex-1 flex flex-col h-full relative bg-light-background dark:bg-dark-background" onDragOver={(e) => { e.preventDefault(); if (!isEffectivelyReadOnly) setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop}>
             <Toolbar note={note} onDelete={() => deleteNote(note.id)} onToggleFavorite={() => toggleFavorite(note.id)} saveStatus={saveStatus} editorTitle={editorState.title} contentToEnhance={editorState.content} onContentUpdate={(content) => setEditorState({...editorState, content})} onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)} isHistoryOpen={isHistoryOpen} templates={templates} onApplyTemplate={handleApplyTemplate} isMobileView={isMobileView} onToggleSidebar={onToggleSidebar} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} viewMode={viewMode} onToggleViewMode={() => setViewMode(prev => prev === 'edit' ? 'preview' : 'edit')} isCheckingSpelling={isCheckingSpelling} isAiRateLimited={isAiRateLimited} wordCount={wordCount} charCount={charCount} />
             {isAiRateLimited && <div className="bg-yellow-100 dark:bg-yellow-900/30 border-b border-yellow-300 dark:border-yellow-700/50 py-2 px-4 text-center text-sm text-yellow-800 dark:text-yellow-200 flex-shrink-0">AI features are temporarily paused due to high usage. They will be available again shortly.</div>}
            
            <div ref={editorPaneRef} className="flex-1 overflow-y-auto relative">
                 {isFullAiActionLoading && (
                    <div className="absolute inset-0 bg-light-background/80 dark:bg-dark-background/80 z-30 flex flex-col items-center justify-center backdrop-blur-sm">
                        <div className="w-8 h-8 border-4 border-light-ui dark:border-dark-ui border-t-light-primary dark:border-t-dark-primary rounded-full animate-spin mb-4"></div>
                        <p className="text-lg font-semibold text-light-text dark:text-dark-text">{isFullAiActionLoading}</p>
                    </div>
                 )}
                 {isVersionPreviewing && previewVersion && <div className={`bg-yellow-100 dark:bg-yellow-900/30 py-2 text-center text-sm text-yellow-800 dark:text-yellow-200 max-w-3xl mx-auto ${editorPaddingClass}`}>You are previewing a version from {new Date(previewVersion.savedAt).toLocaleString()}.</div>}

                <div className={`max-w-3xl mx-auto py-12 ${editorPaddingClass}`}>
                    {viewMode === 'edit' ? (
                        <>
                            <input
                                ref={titleInputRef}
                                type="text"
                                value={displayedTitle}
                                onChange={(e) => setEditorState({ ...editorState, title: e.target.value })}
                                placeholder="Note Title"
                                className={`w-full bg-transparent text-3xl sm:text-4xl font-bold focus:outline-none mb-2 rounded-md ${isVersionPreviewing ? 'cursor-not-allowed opacity-70' : ''}`}
                                readOnly={isVersionPreviewing}
                            />
                            {!isEffectivelyReadOnly && <TitleSuggestion suggestion={suggestedTitle} onApply={handleApplyTitleSuggestion} isLoading={isSuggestingTitle} error={titleSuggestionError} />}
                            <div className="relative mt-4">
                                <textarea
                                    ref={textareaRef}
                                    onSelect={handleSelect}
                                    onScroll={handleScroll}
                                    onKeyDown={handleKeyDown}
                                    value={displayedContent}
                                    onChange={handleChange}
                                    placeholder="Start writing, drop a file, or type / for commands..."
                                    className={`${sharedEditorClasses} relative z-10 caret-light-text dark:caret-dark-text bg-transparent block`}
                                    readOnly={isVersionPreviewing}
                                    spellCheck={false}
                                />
                            </div>
                        </>
                    ) : <MarkdownPreview title={displayedTitle} content={displayedContent} onToggleTask={handleToggleTask} />}

                    <div className="mt-12 space-y-8">
                        <BacklinksDisplay backlinks={backlinks} />
                         <div className={`pt-6 border-t border-light-border dark:border-dark-border ${isEffectivelyReadOnly ? 'opacity-60' : ''}`}>
                            <TagInput tags={displayedTags} setTags={(tags) => setEditorState({ ...editorState, tags })} readOnly={isEffectivelyReadOnly} />
                            {!isEffectivelyReadOnly && <TagSuggestions suggestions={suggestedTags} onAddTag={handleAddTag} isLoading={isSuggestingTags} error={tagSuggestionError} />}
                        </div>
                    </div>
                </div>
            </div>
            
            <StatusBar wordCount={wordCount} charCount={charCount} />

            {(noteLinker || noteLinkerForSelection) && <NoteLinker query={noteLinker?.query || ''} onSelect={handleInsertLink} onClose={() => { setNoteLinker(null); setNoteLinkerForSelection(null); }} position={noteLinker?.position || { top: noteLinkerForSelection!.rect.bottom, left: noteLinkerForSelection!.rect.left }} />}
            {slashCommand && <SlashCommandMenu query={slashCommand.query} position={slashCommand.position} onSelect={handleSelectCommand} onClose={() => setSlashCommand(null)} textareaRef={textareaRef} />}
            <InlineAiMenu selection={selection} onAction={handleAiAction} onFormat={handleFormatSelection} isLoading={isAiActionLoading} onClose={() => setSelection(null)} />
            <SpellcheckMenu activeError={activeSpellingError} suggestions={spellingSuggestions} onSelect={handleApplySuggestion} isLoading={isLoadingSuggestions} error={suggestionError} onClose={() => setActiveSpellingError(null)} />
            {isHistoryOpen && <VersionHistorySidebar history={note.history || []} onClose={handleCloseHistory} onPreview={setPreviewVersion} onRestore={handleRestore} activeVersionTimestamp={previewVersion?.savedAt} />}
            {isDragOver && <div className="absolute inset-0 bg-light-primary/10 dark:bg-dark-primary/10 border-4 border-dashed border-light-primary dark:border-dark-primary rounded-2xl m-4 pointer-events-none flex items-center justify-center"><p className="text-light-primary dark:text-dark-primary font-bold text-2xl">Drop file to import</p></div>}
        </div>
    );
};

export default NoteEditor;