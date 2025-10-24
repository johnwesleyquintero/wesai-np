import React, { useState } from 'react';
import { Note, Template } from '../types';
import { StarIcon, TrashIcon, SparklesIcon, HistoryIcon, ArrowDownTrayIcon, DocumentDuplicateIcon, Bars3Icon, ArrowUturnLeftIcon, ArrowUturnRightIcon, EyeIcon, PencilSquareIcon, CheckBadgeIcon, ClipboardDocumentIcon, InformationCircleIcon, EllipsisVerticalIcon, DocumentPlusIcon } from './Icons';
import { useToast } from '../context/ToastContext';
import NoteInfoPopover from './NoteInfoPopover';
import { useStoreContext } from '../context/AppContext';

interface ToolbarProps {
    note: Note;
    onDelete: (noteId: string) => void;
    onToggleFavorite: (id: string) => void;
    saveStatus: 'saved' | 'saving' | 'unsaved';
    editorTitle: string;
    onEnhance: (tone: string) => Promise<void>;
    onSummarize: () => Promise<void>;
    onToggleHistory: () => void;
    isHistoryOpen: boolean;
    templates: Template[];
    onApplyTemplate: (template: Template) => void;
    isMobileView: boolean;
    onToggleSidebar: () => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    viewMode: 'edit' | 'preview';
    onToggleViewMode: () => void;
    isCheckingSpelling: boolean;
    isAiRateLimited: boolean;
    wordCount: number;
    charCount: number;
    aiActionError: string | null;
    setAiActionError: (error: string | null) => void;
}

interface StatusIndicatorProps {
    saveStatus: 'saved' | 'saving' | 'unsaved';
    isAiRateLimited: boolean;
    isCheckingSpelling: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
    saveStatus,
    isAiRateLimited,
    isCheckingSpelling,
}) => {
    let colorClass = 'bg-yellow-500';
    let text = 'Unsaved changes';
    let pulse = false;

    if (isAiRateLimited) {
        colorClass = 'bg-red-500';
        text = 'AI Paused';
    } else if (isCheckingSpelling) {
        colorClass = 'bg-blue-500';
        text = 'Checking...';
        pulse = true;
    } else {
        switch (saveStatus) {
            case 'saving':
                colorClass = 'bg-yellow-500';
                text = 'Saving...';
                pulse = true;
                break;
            case 'saved':
                colorClass = 'bg-green-500';
                text = 'Saved';
                break;
        }
    }

    return (
        <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${colorClass} ${pulse ? 'animate-pulse' : ''}`}></span>
            <span className="text-sm text-light-text/60 dark:text-dark-text/60">{text}</span>
        </div>
    );
};

const ErrorIcon = () => (
    <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
        <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM11.414 10l2.829-2.828-1.414-1.414L10 8.586 7.172 5.757 5.757 7.172 8.586 10l-2.829 2.828 1.414 1.414L10 11.414l2.828 2.829 1.414-1.414L11.414 10z"/>
    </svg>
);

const AiMenu: React.FC<{
    onEnhance: (tone: string) => Promise<void>;
    onSummarize: () => Promise<void>;
    isAiRateLimited: boolean;
}> = ({ onEnhance, onSummarize, isAiRateLimited }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [customTone, setCustomTone] = useState('');
    const [isCustomTone, setIsCustomTone] = useState(false);

    const handleEnhanceClick = async (tone: string) => {
        setIsOpen(false);
        if (!tone.trim()) return;
        await onEnhance(tone);
        setCustomTone('');
        setIsCustomTone(false);
    };

    const handleSummarizeClick = async () => {
        setIsOpen(false);
        await onSummarize();
    };

    const tones = ["Professional", "Casual", "Poetic", "Concise", "Expanded"];

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(prev => !prev)} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed" disabled={isAiRateLimited}>
                <SparklesIcon className="mr-0 sm:mr-1 text-light-primary dark:text-dark-primary" />
                <span className="hidden sm:inline">Enhance</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-light-background dark:bg-dark-background rounded-md shadow-lg border border-light-border dark:border-dark-border z-10">
                    {isCustomTone ? (
                        <div className="p-2">
                            <input type="text" placeholder="Enter custom tone..." value={customTone} onChange={(e) => setCustomTone(e.target.value)} className="w-full text-sm p-2 bg-light-ui dark:bg-dark-ui rounded-md border border-light-border dark:border-dark-border focus:ring-1 focus:ring-light-primary" />
                            <button onClick={() => handleEnhanceClick(customTone)} className="w-full text-left p-2 text-sm mt-1 rounded-md bg-light-primary text-white text-center">Enhance</button>
                            <button onClick={() => { setIsCustomTone(false); setCustomTone(''); }} className="w-full text-left p-2 text-sm mt-1 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui text-center">Back</button>
                        </div>
                    ) : (
                        <>
                            {tones.map(tone => <button key={tone} onClick={() => handleEnhanceClick(tone)} className="w-full text-left block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui">Rewrite as {tone}</button>)}
                            <div className="border-t border-light-border dark:border-dark-border my-1"></div>
                            <button onClick={() => setIsCustomTone(true)} className="w-full text-left block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui">Custom Rewrite...</button>
                            <div className="border-t border-light-border dark:border-dark-border my-1"></div>
                            <button onClick={handleSummarizeClick} className="w-full text-left block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui">Summarize & Find Actions</button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

const MoreActionsMenu: React.FC<{
    note: Note;
    templates: Template[];
    onApplyTemplate: (template: Template) => void;
    onSaveAsTemplate: () => void;
}> = ({ note, templates, onApplyTemplate, onSaveAsTemplate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isTemplatesSubMenuOpen, setIsTemplatesSubMenuOpen] = useState(false);
    const { showToast } = useToast();

    const sanitizeFilename = (name: string) => name.replace(/[\/\\?%*:|"<>]/g, '-').trim() || 'Untitled';
    
    const handleExport = (format: 'md' | 'json') => {
        setIsOpen(false);
        const filename = `${sanitizeFilename(note.title)}.${format}`;
        let content = '';
        let mimeType = '';

        if (format === 'md') {
            const tagsLine = note.tags.length > 0 ? `**Tags:** ${note.tags.join(', ')}\n\n` : '';
            content = `# ${note.title}\n\n${tagsLine}---\n\n${note.content}`;
            mimeType = 'text/markdown';
        } else {
            content = JSON.stringify(note, null, 2);
            mimeType = 'application/json';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleCopyMarkdown = () => {
        setIsOpen(false);
        const markdownContent = `# ${note.title}\n\n${note.content}`;
        navigator.clipboard.writeText(markdownContent)
            .then(() => showToast({ message: "Note copied as Markdown!", type: 'success' }))
            .catch(err => showToast({ message: "Failed to copy note.", type: 'error' }));
    };

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(prev => !prev)} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors">
                <EllipsisVerticalIcon />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-light-background dark:bg-dark-background rounded-md shadow-lg border border-light-border dark:border-dark-border z-10 py-1">
                    <div
                        onMouseEnter={() => setIsTemplatesSubMenuOpen(true)}
                        onMouseLeave={() => setIsTemplatesSubMenuOpen(false)}
                        className="relative"
                    >
                        <button className="w-full text-left flex items-center justify-between gap-2 block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui">
                           <span className="flex items-center gap-2"><DocumentDuplicateIcon /> Apply Template</span> &rarr;
                        </button>
                        {isTemplatesSubMenuOpen && (
                             <div className="absolute right-full -top-1 mr-1 w-56 bg-light-background dark:bg-dark-background rounded-md shadow-lg border border-light-border dark:border-dark-border py-1">
                                {templates.length > 0 ? (
                                    templates.map(template => <button key={template.id} onClick={() => { onApplyTemplate(template); setIsOpen(false); }} className="w-full text-left block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui">{template.title}</button>)
                                ) : (
                                    <p className="px-4 py-2 text-sm text-light-text/60 dark:text-dark-text/60">No templates.</p>
                                )}
                            </div>
                        )}
                    </div>
                    <button onClick={() => { onSaveAsTemplate(); setIsOpen(false); }} className="w-full text-left flex items-center gap-2 block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui"><DocumentPlusIcon /> Save as Template</button>
                    <div className="my-1 border-t border-light-border dark:border-dark-border"></div>
                    <button onClick={handleCopyMarkdown} className="w-full text-left flex items-center gap-2 block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui"><ClipboardDocumentIcon /> Copy as Markdown</button>
                    <button onClick={() => handleExport('md')} className="w-full text-left flex items-center gap-2 block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui"><ArrowDownTrayIcon /> Export as .md</button>
                    <button onClick={() => handleExport('json')} className="w-full text-left flex items-center gap-2 block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui"><ArrowDownTrayIcon /> Export as .json</button>
                </div>
            )}
        </div>
    );
};

const Toolbar: React.FC<ToolbarProps> = ({ 
    note, onDelete, onToggleFavorite, saveStatus, editorTitle, onEnhance, onSummarize, onToggleHistory, isHistoryOpen, 
    templates, onApplyTemplate, isMobileView, onToggleSidebar, onUndo, onRedo, canUndo, canRedo,
    viewMode, onToggleViewMode, isCheckingSpelling, isAiRateLimited, wordCount, charCount,
    aiActionError, setAiActionError,
}) => {
    const { setNoteToDelete, addTemplate } = useStoreContext();
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const { showToast } = useToast();

    // Clear error after a delay
    React.useEffect(() => {
        if (aiActionError) {
            const timer = setTimeout(() => setAiActionError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [aiActionError, setAiActionError]);

    const handleSaveAsTemplate = () => {
        addTemplate(editorTitle, note.content)
            .then(() => {
                showToast({ message: `Template "${editorTitle}" saved!`, type: 'success' });
            })
            .catch((err) => {
                showToast({ message: `Failed to save template: ${err.message}`, type: 'error' });
            });
    };
    
    return (
        <>
            {aiActionError && (
                <div className="absolute top-16 right-4 bg-red-100 dark:bg-red-900/60 border border-red-400 dark:border-red-500/50 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg shadow-xl z-20 w-auto max-w-md animate-fade-in-down" role="alert">
                    <div className="flex">
                        <div className="py-1"><ErrorIcon /></div>
                        <div>
                            <p className="font-bold">AI Action Failed</p>
                            <p className="text-sm">{aiActionError}</p>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex items-center justify-between p-2 sm:p-4 border-b border-light-border dark:border-dark-border flex-shrink-0">
                <div className="flex items-center space-x-2">
                     {isMobileView && (
                        <button onClick={onToggleSidebar} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">
                            <Bars3Icon />
                        </button>
                    )}
                    <StatusIndicator 
                        saveStatus={saveStatus} 
                        isAiRateLimited={isAiRateLimited}
                        isCheckingSpelling={isCheckingSpelling}
                    />
                </div>
                <div className="flex items-center space-x-0.5 sm:space-x-2">
                    <button onClick={onUndo} disabled={!canUndo} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Undo">
                        <ArrowUturnLeftIcon />
                    </button>
                    <button onClick={onRedo} disabled={!canRedo} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Redo">
                        <ArrowUturnRightIcon />
                    </button>
                     <div className="w-px h-6 bg-light-border dark:border-dark-border mx-1"></div>
                    
                    <AiMenu 
                        onEnhance={onEnhance}
                        onSummarize={onSummarize}
                        isAiRateLimited={isAiRateLimited}
                    />
                    
                     <button onClick={onToggleHistory} className={`p-2 rounded-md transition-colors ${isHistoryOpen ? 'bg-light-ui dark:bg-dark-ui' : 'hover:bg-light-ui dark:hover:bg-dark-ui'}`} aria-label="Toggle Version History">
                        <HistoryIcon />
                    </button>
                     <button onClick={onToggleViewMode} className={`p-2 rounded-md transition-colors ${viewMode === 'preview' ? 'bg-light-ui dark:bg-dark-ui' : 'hover:bg-light-ui dark:hover:bg-dark-ui'}`} aria-label={viewMode === 'preview' ? 'Switch to Edit Mode' : 'Switch to Preview Mode'}>
                        {viewMode === 'preview' ? <PencilSquareIcon /> : <EyeIcon />}
                    </button>
                    
                    <div className="relative">
                        <button onClick={() => setIsInfoOpen(prev => !prev)} className={`p-2 rounded-md transition-colors ${isInfoOpen ? 'bg-light-ui dark:bg-dark-ui' : 'hover:bg-light-ui dark:hover:bg-dark-ui'}`} aria-label="Note Information">
                            <InformationCircleIcon />
                        </button>
                        {isInfoOpen && <NoteInfoPopover note={note} wordCount={wordCount} charCount={charCount} />}
                    </div>

                    <div className="w-px h-6 bg-light-border dark:border-dark-border mx-1"></div>

                    <button onClick={() => onToggleFavorite(note.id)} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors" aria-label={note.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                        <StarIcon className={`w-5 h-5 ${note.isFavorite ? 'text-yellow-500' : ''}`} filled={note.isFavorite} />
                    </button>
                    <button onClick={() => setNoteToDelete(note)} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors text-red-500" aria-label="Delete note">
                        <TrashIcon />
                    </button>

                    <MoreActionsMenu 
                        note={note}
                        templates={templates}
                        onApplyTemplate={onApplyTemplate}
                        onSaveAsTemplate={handleSaveAsTemplate}
                    />
                </div>
            </div>
        </>
    );
};

export default Toolbar;
