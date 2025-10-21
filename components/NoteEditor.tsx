import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { useAppContext } from '../context/AppContext';
import MarkdownHighlighter from './MarkdownHighlighter';
import NoteLinker from './NoteLinker';
import BacklinksDisplay from './BacklinksDisplay';
import { useBacklinks } from '../hooks/useBacklinks';

interface NoteEditorProps {
    note: Note;
    onUpdate: (id: string, updatedFields: Partial<Omit<Note, 'id' | 'createdAt'>>) => void;
    onDelete: (note: Note) => void;
    onToggleFavorite: (id: string) => void;
    onRestoreVersion: (noteId: string, version: NoteVersion) => void;
    templates: Template[];
    isMobileView: boolean;
    onToggleSidebar: () => void;
    isAiRateLimited: boolean;
}

type NoteState = { title: string; content: string; tags: string[] };
type SelectionState = { start: number; end: number; text: string; rect: DOMRect } | null;
type ActiveSpellingError = { error: SpellingError; rect: DOMRect };
type NoteLinkerState = { query: string; position: { top: number; left: number } } | null;

const NoteEditor: React.FC<NoteEditorProps> = ({ note, onUpdate, onDelete, onToggleFavorite, onRestoreVersion, templates, isMobileView, onToggleSidebar, isAiRateLimited }) => {
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

    const [noteLinker, setNoteLinker] = useState<NoteLinkerState>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const { registerEditorActions, unregisterEditorActions, notes } = useAppContext();
    const backlinks = useBacklinks(note.id, notes);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const editorPaneRef = useRef<HTMLDivElement>(null);
    const highlighterRef = useRef<HTMLDivElement>(null);
    const lastAnalyzedContentForTagsRef = useRef<string | null>(null);
    const lastAnalyzedContentForTitleRef = useRef<string | null>(null);
    const lastAnalyzedContentForSpellingRef = useRef<string|null>(null);
    const MIN_CONTENT_LENGTH_FOR_SUGGESTIONS = 50;

    const debouncedEditorState = useDebounce(editorState, 5000);
    const displayedTitle = previewVersion ? previewVersion.title : editorState.title;
    const displayedContent = previewVersion ? previewVersion.content : editorState.content;
    const displayedTags = previewVersion ? previewVersion.tags : editorState.tags;
    const isVersionPreviewing = !!previewVersion;
    const isEffectivelyReadOnly = isVersionPreviewing || viewMode === 'preview';

    // Auto-resize textarea to fit content
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea && viewMode === 'edit') {
            const resize = () => {
                textarea.style.height = 'auto'; // Reset height to calculate scrollHeight correctly
                const scrollHeight = textarea.scrollHeight;
                textarea.style.height = `${scrollHeight}px`;
                if (highlighterRef.current) {
                    highlighterRef.current.style.height = `${scrollHeight}px`;
                }
            };
            resize(); // Initial resize
            window.addEventListener('resize', resize);
            return () => window.removeEventListener('resize', resize);
        }
    }, [editorState.content, viewMode]);


    useEffect(() => {
        if (!previewVersion) {
            resetEditorState({ title: note.title, content: note.content, tags: note.tags });
            setViewMode('edit');
            setSuggestedTags([]);
            setTagSuggestionError(null);
            setSuggestedTitle(null);
            setTitleSuggestionError(null);
            setSpellingErrors([]);
            lastAnalyzedContentForTagsRef.current = note.content;
            lastAnalyzedContentForTitleRef.current = note.content;
            lastAnalyzedContentForSpellingRef.current = note.content;
        }
    }, [note.id, previewVersion, resetEditorState, note.title, note.content, note.tags]);

    useEffect(() => {
        if (previewVersion) return;
        const isDirty = JSON.stringify(editorState) !== JSON.stringify({ title: note.title, content: note.content, tags: note.tags });
        setSaveStatus(isDirty ? 'unsaved' : 'saved');
    }, [editorState, note.title, note.content, note.tags, previewVersion]);

    useEffect(() => {
        if (previewVersion || isAiRateLimited) return;
        const isDifferentFromPersisted = JSON.stringify(debouncedEditorState) !== JSON.stringify({ title: note.title, content: note.content, tags: note.tags });

        if (saveStatus === 'unsaved' && isDifferentFromPersisted) {
            setSaveStatus('saving');
            onUpdate(note.id, debouncedEditorState);
            setTimeout(() => setSaveStatus('saved'), 1000);
        }

        const contentForAnalysis = debouncedEditorState.content;
        if (contentForAnalysis.length >= MIN_CONTENT_LENGTH_FOR_SUGGESTIONS) {
             const isGenericTitle = debouncedEditorState.title.trim().toLowerCase() === 'untitled note';
            if (isGenericTitle && contentForAnalysis !== lastAnalyzedContentForTitleRef.current) {
                suggestTitleForFullNote();
            } else if (!isGenericTitle) {
                setSuggestedTitle(null);
            }
            if (contentForAnalysis !== lastAnalyzedContentForTagsRef.current && editorState.tags.length === 0) {
                suggestTagsForFullNote();
            }
        }
    }, [debouncedEditorState, note.id, onUpdate, saveStatus, previewVersion, isAiRateLimited, editorState.tags]);

    useEffect(() => {
        if (previewVersion || viewMode === 'preview' || isAiRateLimited) return;
        
        const contentForSpelling = debouncedEditorState.content;
        if (contentForSpelling && contentForSpelling !== lastAnalyzedContentForSpellingRef.current) {
            setIsCheckingSpelling(true);
            findMisspelledWords(contentForSpelling).then(errors => {
                lastAnalyzedContentForSpellingRef.current = contentForSpelling;
                setSpellingErrors(errors);
            }).finally(() => setIsCheckingSpelling(false));
        } else if (!contentForSpelling) {
             setSpellingErrors([]);
        }
    }, [debouncedEditorState, previewVersion, viewMode, isAiRateLimited]);

    useEffect(() => {
        registerEditorActions({ 
            undo, 
            redo, 
            canUndo, 
            canRedo, 
            applyAiActionToFullNote,
            suggestTagsForFullNote,
            suggestTitleForFullNote,
            summarizeAndFindActionForFullNote
        });
        return () => unregisterEditorActions();
    }, [undo, redo, canUndo, canRedo, editorState]);

    useEffect(() => {
        const pane = editorPaneRef.current;
        const handleScroll = () => {
            setSelection(null);
            setActiveSpellingError(null);
            setNoteLinker(null);
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
        if (highlighterRef.current) {
            highlighterRef.current.scrollTop = e.currentTarget.scrollTop;
            highlighterRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
         setSelection(null);
         setActiveSpellingError(null);
         setNoteLinker(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value, selectionStart } = e.target;
        setEditorState({ ...editorState, content: value });
        setSelection(null); 
        setActiveSpellingError(null);

        const linkerMatch = value.substring(0, selectionStart).match(/\[\[([^\[\]]*)$/);
        if (linkerMatch) {
            const rect = getCursorPositionRect(e.target, selectionStart);
            setNoteLinker({
                query: linkerMatch[1],
                position: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX },
            });
        } else {
            setNoteLinker(null);
        }
    };
    
    const handleInsertLink = (noteId: string, noteTitle: string) => {
        const textarea = textareaRef.current;
        if (!textarea || !noteLinker) return;
        const { selectionStart } = textarea;
        const currentContent = editorState.content;

        const startIndex = selectionStart - noteLinker.query.length - 2;
        const newContent = `${currentContent.substring(0, startIndex)}[[${noteId}|${noteTitle}]]${currentContent.substring(selectionStart)}`;
        
        setEditorState({ ...editorState, content: newContent });
        setNoteLinker(null);

        setTimeout(() => {
            textarea.focus();
            const newCursorPos = startIndex + noteId.length + noteTitle.length + 5;
            textarea.selectionStart = textarea.selectionEnd = newCursorPos;
        }, 0);
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
        if (isEffectivelyReadOnly || isAiActionLoading || isAiRateLimited) {
            setSelection(null); return;
        }
        const textarea = textareaRef.current;
        if (!textarea) return;
        const { selectionStart, selectionEnd, value } = textarea;
        
        const selectedText = value.substring(selectionStart, selectionEnd);
        if (selectedText.trim().length > 0) {
            setActiveSpellingError(null);
            const rect = getCursorPositionRect(textarea, selectionEnd);
            setSelection({ start: selectionStart, end: selectionEnd, text: selectedText, rect });
        } else {
            setSelection(null);
        }

        if (selectionStart === selectionEnd) {
            const clickedError = spellingErrors.find(
                err => selectionStart >= err.index && selectionStart <= err.index + err.length
            );
            if (clickedError) {
                const rect = getCursorPositionRect(textarea, selectionStart);
                setActiveSpellingError({ error: clickedError, rect });
            } else {
                setActiveSpellingError(null);
            }
        }
    };

    const handleAiAction = async (action: InlineAction) => {
        if (!selection) return;
        setIsAiActionLoading(true);
        setAiActionError(null);
        const { start, end, text } = selection;
        try {
            const newText = await performInlineEdit(text, action);
            const currentContent = editorState.content;
            const updatedContent = currentContent.substring(0, start) + newText + currentContent.substring(end);
            setEditorState({ ...editorState, content: updatedContent });
            if (textareaRef.current) {
                const newCursorPos = start + newText.length;
                textareaRef.current.focus();
                setTimeout(() => textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos), 0);
            }
        } catch (error) {
            setAiActionError(error instanceof Error ? error.message : 'An unknown error occurred.');
        } finally {
            setIsAiActionLoading(false);
            setSelection(null);
        }
    };
    
    const applyAiActionToFullNote = async (action: InlineAction) => {
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
    };
    
    const summarizeAndFindActionForFullNote = async () => {
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
    };
    
    const suggestTagsForFullNote = () => {
        setIsSuggestingTags(true);
        setTagSuggestionError(null);
        setSuggestedTags([]);
        suggestTags(editorState.title, editorState.content).then(tags => {
            lastAnalyzedContentForTagsRef.current = editorState.content;
            const newSuggestions = tags.filter(tag => !editorState.tags.includes(tag));
            setSuggestedTags(newSuggestions);
        }).catch(err => setTagSuggestionError(err.message)).finally(() => setIsSuggestingTags(false));
    };

    const suggestTitleForFullNote = () => {
        setIsSuggestingTitle(true);
        setTitleSuggestionError(null);
        setSuggestedTitle(null);
        suggestTitle(editorState.content).then(title => {
            lastAnalyzedContentForTitleRef.current = editorState.content;
            if (title) setSuggestedTitle(title);
        }).catch(err => setTitleSuggestionError(err.message)).finally(() => setIsSuggestingTitle(false));
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
        if (isEffectivelyReadOnly) return;

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const base64 = loadEvent.target?.result;
                if (typeof base64 === 'string') {
                    const markdownImage = `\n![${file.name}](${base64})\n`;
                    const { selectionStart } = textareaRef.current!;
                    const newContent = editorState.content.slice(0, selectionStart) + markdownImage + editorState.content.slice(selectionStart);
                    setEditorState({ ...editorState, content: newContent });
                }
            };
            reader.readAsDataURL(file);
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
             <Toolbar note={note} onDelete={onDelete} onToggleFavorite={onToggleFavorite} saveStatus={saveStatus} contentToEnhance={editorState.content} onContentUpdate={(content) => setEditorState({...editorState, content})} onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)} isHistoryOpen={isHistoryOpen} templates={templates} onApplyTemplate={handleApplyTemplate} isMobileView={isMobileView} onToggleSidebar={onToggleSidebar} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} viewMode={viewMode} onToggleViewMode={() => setViewMode(prev => prev === 'edit' ? 'preview' : 'edit')} isCheckingSpelling={isCheckingSpelling} isAiRateLimited={isAiRateLimited} />
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
                                type="text"
                                value={displayedTitle}
                                onChange={(e) => setEditorState({ ...editorState, title: e.target.value })}
                                placeholder="Note Title"
                                className={`w-full bg-transparent text-3xl sm:text-4xl font-bold focus:outline-none mb-2 rounded-md ${isVersionPreviewing ? 'cursor-not-allowed opacity-70' : ''}`}
                                readOnly={isVersionPreviewing}
                            />
                            {!isEffectivelyReadOnly && <TitleSuggestion suggestion={suggestedTitle} onApply={handleApplyTitleSuggestion} isLoading={isSuggestingTitle} error={titleSuggestionError} />}
                            <div className="relative mt-4">
                                <div ref={highlighterRef} className={`${sharedEditorClasses} markdown-highlighter absolute top-0 left-0 text-transparent pointer-events-none z-0 overflow-y-hidden`}>
                                   <MarkdownHighlighter content={editorState.content} spellingErrors={spellingErrors} />
                                </div>
                                <textarea
                                    ref={textareaRef}
                                    onSelect={handleSelect}
                                    onScroll={handleScroll}
                                    value={displayedContent}
                                    onChange={handleChange}
                                    placeholder="Start writing, drop an image, or type [[ to link notes..."
                                    className={`${sharedEditorClasses} relative z-10 caret-light-text dark:caret-dark-text bg-transparent block overflow-y-hidden`}
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

            {noteLinker && <NoteLinker notes={notes} query={noteLinker.query} onSelect={handleInsertLink} onClose={() => setNoteLinker(null)} position={noteLinker.position} />}
            <InlineAiMenu selection={selection} onAction={handleAiAction} isLoading={isAiActionLoading} onClose={() => setSelection(null)} />
            <SpellcheckMenu activeError={activeSpellingError} suggestions={spellingSuggestions} onSelect={handleApplySuggestion} isLoading={isLoadingSuggestions} error={suggestionError} onClose={() => setActiveSpellingError(null)} />
            {isHistoryOpen && <VersionHistorySidebar history={note.history || []} onClose={handleCloseHistory} onPreview={setPreviewVersion} onRestore={handleRestore} activeVersionTimestamp={previewVersion?.savedAt} />}
            {isDragOver && <div className="absolute inset-0 bg-light-primary/10 dark:bg-dark-primary/10 border-4 border-dashed border-light-primary dark:border-dark-primary rounded-2xl m-4 pointer-events-none flex items-center justify-center"><p className="text-light-primary dark:text-dark-primary font-bold text-2xl">Drop image to upload</p></div>}
        </div>
    );
};

export default NoteEditor;