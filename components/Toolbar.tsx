import React, { useState } from 'react';
import { Note, Template } from '../types';
import { enhanceText, summarizeAndExtractActions } from '../services/geminiService';
import { StarIcon, TrashIcon, SparklesIcon, HistoryIcon, ArrowDownTrayIcon, DocumentDuplicateIcon, Bars3Icon, ArrowUturnLeftIcon, ArrowUturnRightIcon, EyeIcon, PencilSquareIcon, CheckBadgeIcon } from './Icons';

interface StatusIndicatorProps {
    saveStatus: 'saved' | 'saving' | 'unsaved';
    isAiRateLimited: boolean;
    isCheckingSpelling: boolean;
    aiActionInProgress: 'enhancing' | 'summarizing' | null;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
    saveStatus,
    isAiRateLimited,
    isCheckingSpelling,
    aiActionInProgress,
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
    } else if (aiActionInProgress) {
        colorClass = 'bg-blue-500';
        text = aiActionInProgress === 'enhancing' ? 'Enhancing...' : 'Summarizing...';
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

interface ToolbarProps {
    note: Note;
    onDelete: (note: Note) => void;
    onToggleFavorite: (id: string) => void;
    saveStatus: 'saved' | 'saving' | 'unsaved';
    contentToEnhance: string;
    onContentUpdate: (newContent: string) => void;
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
}

const ErrorIcon = () => (
    <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
        <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM11.414 10l2.829-2.828-1.414-1.414L10 8.586 7.172 5.757 5.757 7.172 8.586 10l-2.829 2.828 1.414 1.414L10 11.414l2.828 2.829 1.414-1.414L11.414 10z"/>
    </svg>
);

const Toolbar: React.FC<ToolbarProps> = ({ 
    note, onDelete, onToggleFavorite, saveStatus, contentToEnhance, onContentUpdate, onToggleHistory, isHistoryOpen, 
    templates, onApplyTemplate, isMobileView, onToggleSidebar, onUndo, onRedo, canUndo, canRedo,
    viewMode, onToggleViewMode, isCheckingSpelling, isAiRateLimited
}) => {
    const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
    const [aiActionInProgress, setAiActionInProgress] = useState<'enhancing' | 'summarizing' | null>(null);
    const [customTone, setCustomTone] = useState('');
    const [isCustomTone, setIsCustomTone] = useState(false);
    const [aiActionError, setAiActionError] = useState<string | null>(null);
    
    const handleEnhance = async (tone: string) => {
        setAiActionInProgress('enhancing');
        setIsAiMenuOpen(false);
        setAiActionError(null);
        try {
            const enhancedContent = await enhanceText(contentToEnhance, tone);
            onContentUpdate(enhancedContent);
        } catch (error) {
            console.error("Enhancement failed", error);
            if (error instanceof Error) {
                setAiActionError(error.message);
                setTimeout(() => setAiActionError(null), 5000);
            }
        } finally {
            setAiActionInProgress(null);
            setCustomTone('');
            setIsCustomTone(false);
        }
    };

    const handleSummarize = async () => {
        setAiActionInProgress('summarizing');
        setIsAiMenuOpen(false);
        setAiActionError(null);
        try {
            const { summary, actionItems } = await summarizeAndExtractActions(contentToEnhance);
            
            let formattedSummary = '';
            if (summary) {
                formattedSummary += `### ✨ AI Summary\n\n${summary}\n\n`;
            }
            if (actionItems && actionItems.length > 0) {
                formattedSummary += `### ✅ Action Items\n\n${actionItems.map(item => `- [ ] ${item}`).join('\n')}\n\n`;
            }

            if (formattedSummary) {
                const newContent = `---\n\n${formattedSummary}---\n\n${contentToEnhance}`;
                onContentUpdate(newContent);
            } else {
                 setAiActionError("The AI couldn't find anything to summarize or any action items in this note.");
                 setTimeout(() => setAiActionError(null), 5000);
            }

        } catch (error) {
            console.error("Summarization failed", error);
            if (error instanceof Error) {
                setAiActionError(error.message);
                setTimeout(() => setAiActionError(null), 5000);
            }
        } finally {
            setAiActionInProgress(null);
        }
    };

    const sanitizeFilename = (name: string) => {
        return name.replace(/[\/\\?%*:|"<>]/g, '-').trim() || 'Untitled';
    }
    
    const handleTemplateClick = (template: Template) => {
        onApplyTemplate(template);
        setIsTemplateMenuOpen(false);
    }

    const handleExport = (format: 'md' | 'json') => {
        setIsExportMenuOpen(false);
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
    
    const tones = ["Professional", "Casual", "Poetic", "Concise", "Expanded"];

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
                        aiActionInProgress={aiActionInProgress}
                    />
                </div>
                <div className="flex items-center space-x-0.5 sm:space-x-2">
                    <button onClick={onUndo} disabled={!canUndo} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <ArrowUturnLeftIcon />
                    </button>
                    <button onClick={onRedo} disabled={!canRedo} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <ArrowUturnRightIcon />
                    </button>
                     <div className="w-px h-6 bg-light-border dark:border-dark-border mx-1 hidden sm:block"></div>
                    <div className="relative">
                        <button
                            onClick={() => setIsAiMenuOpen(!isAiMenuOpen)}
                            className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!!aiActionInProgress || isAiRateLimited}
                        >
                            <SparklesIcon className="mr-0 sm:mr-1 text-light-primary dark:text-dark-primary" />
                            <span className="hidden sm:inline">Enhance</span>
                        </button>
                        {isAiMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-light-background dark:bg-dark-background rounded-md shadow-lg border border-light-border dark:border-dark-border z-10">
                                {isCustomTone ? (
                                    <div className="p-2">
                                        <input
                                            type="text"
                                            placeholder="Enter custom tone..."
                                            value={customTone}
                                            onChange={(e) => setCustomTone(e.target.value)}
                                            className="w-full text-sm p-2 bg-light-ui dark:bg-dark-ui rounded-md border border-light-border dark:border-dark-border focus:ring-1 focus:ring-light-primary"
                                        />
                                        <button onClick={() => handleEnhance(customTone)} className="w-full text-left p-2 text-sm mt-1 rounded-md bg-light-primary text-white text-center">
                                            Enhance
                                        </button>
                                        <button onClick={() => setIsCustomTone(false)} className="w-full text-left p-2 text-sm mt-1 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui text-center">
                                            Back
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {tones.map(tone => (
                                            <button key={tone} onClick={() => handleEnhance(tone)} className="w-full text-left block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui">
                                                Rewrite as {tone}
                                            </button>
                                        ))}
                                        <div className="border-t border-light-border dark:border-dark-border my-1"></div>
                                        <button onClick={() => setIsCustomTone(true)} className="w-full text-left block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui">
                                            Custom Rewrite...
                                        </button>
                                        <div className="border-t border-light-border dark:border-dark-border my-1"></div>
                                        <button onClick={handleSummarize} className="w-full text-left block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui">
                                            Summarize & Find Actions
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="relative hidden sm:block">
                        <button
                            onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
                            className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors flex items-center"
                        >
                            <DocumentDuplicateIcon className="mr-1" />
                            Template
                        </button>
                        {isTemplateMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-light-background dark:bg-dark-background rounded-md shadow-lg border border-light-border dark:border-dark-border z-10">
                                {templates.length > 0 ? (
                                    templates.map(template => (
                                        <button key={template.id} onClick={() => handleTemplateClick(template)} className="w-full text-left block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui">
                                            {template.title}
                                        </button>
                                    ))
                                ) : (
                                    <p className="px-4 py-2 text-sm text-light-text/60 dark:text-dark-text/60">No templates found.</p>
                                )}
                            </div>
                        )}
                    </div>
                     <button onClick={onToggleHistory} className={`p-2 rounded-md transition-colors ${isHistoryOpen ? 'bg-light-ui dark:bg-dark-ui' : 'hover:bg-light-ui dark:hover:bg-dark-ui'}`}>
                        <HistoryIcon />
                    </button>
                     <button onClick={onToggleViewMode} className={`p-2 rounded-md transition-colors ${viewMode === 'preview' ? 'bg-light-ui dark:bg-dark-ui' : 'hover:bg-light-ui dark:hover:bg-dark-ui'}`}>
                        {viewMode === 'preview' ? <PencilSquareIcon /> : <EyeIcon />}
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                            className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors"
                        >
                            <ArrowDownTrayIcon />
                        </button>
                        {isExportMenuOpen && (
                             <div className="absolute right-0 mt-2 w-56 bg-light-background dark:bg-dark-background rounded-md shadow-lg border border-light-border dark:border-dark-border z-10">
                                <button onClick={() => handleExport('md')} className="w-full text-left block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui">
                                    Export as Markdown (.md)
                                </button>
                                <button onClick={() => handleExport('json')} className="w-full text-left block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui">
                                    Export as JSON (.json)
                                </button>
                             </div>
                        )}
                    </div>
                    <button onClick={() => onToggleFavorite(note.id)} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors">
                        <StarIcon className={`w-5 h-5 ${note.isFavorite ? 'text-yellow-500' : ''}`} filled={note.isFavorite} />
                    </button>
                    <button onClick={() => onDelete(note)} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors text-red-500">
                        <TrashIcon />
                    </button>
                </div>
            </div>
        </>
    );
};

export default Toolbar;