import React, { useState } from 'react';
import { Note, Template } from '../../types';
import { StarIcon, TrashIcon, SparklesIcon, HistoryIcon, Bars3Icon, ArrowUturnLeftIcon, ArrowUturnRightIcon, EyeIcon, PencilSquareIcon, FocusIcon, UnfocusIcon } from '../Icons';
import { useToast } from '../../context/ToastContext';
import { useStoreContext, useUIContext } from '../../context/AppContext';
import MoreActionsMenu from './MoreActionsMenu';

interface EditorHeaderProps {
    note: Note;
    onToggleFavorite: (id: string) => void;
    saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
    handleSave: () => void;
    editorTitle: string;
    onEnhance: (tone: string) => Promise<void>;
    onSummarize: () => Promise<void>;
    onToggleHistory: () => void;
    isHistoryOpen: boolean;
    onApplyTemplate: (template: Template) => void;
    isMobileView: boolean;
    onToggleSidebar: () => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    viewMode: 'edit' | 'preview';
    onToggleViewMode: () => void;
    wordCount: number;
    charCount: number;
    isFullAiActionLoading: string | null;
    isApiKeyMissing: boolean;
    isAiEnabled: boolean;
}

interface StatusIndicatorProps {
    saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
    isFullAiActionLoading: string | null;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
    saveStatus,
    isFullAiActionLoading
}) => {
    if (isFullAiActionLoading) {
        return (
            <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-light-ui dark:border-dark-ui border-t-light-primary dark:border-t-dark-primary rounded-full animate-spin"></div>
                <span className="text-sm text-light-text/60 dark:text-dark-text/60">{isFullAiActionLoading}</span>
            </div>
        );
    }

    let colorClass = 'bg-yellow-500';
    let text: string | null = 'Unsaved changes';
    let pulse = false;

    switch (saveStatus) {
        case 'saving':
            colorClass = 'bg-yellow-500';
            text = 'Saving...';
            pulse = true;
            break;
        case 'saved':
            return null; // Don't show anything when saved
        case 'error':
            colorClass = 'bg-red-500';
            text = 'Save Failed';
            break;
        case 'unsaved':
            // No need to render anything here, the Save button will appear
            return null;
    }


    return (
        <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${colorClass} ${pulse ? 'animate-pulse' : ''}`}></span>
            <span className="text-sm text-light-text/60 dark:text-dark-text/60">{text}</span>
        </div>
    );
};

const AiMenu: React.FC<{
    onEnhance: (tone: string) => Promise<void>;
    onSummarize: () => Promise<void>;
    isDisabled: boolean;
}> = ({ onEnhance, onSummarize, isDisabled }) => {
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
            <button onClick={() => setIsOpen(prev => !prev)} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed" disabled={isDisabled}>
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

const EditorHeader: React.FC<EditorHeaderProps> = ({ 
    note, onToggleFavorite, saveStatus, handleSave, editorTitle, onEnhance, onSummarize, onToggleHistory, isHistoryOpen, 
    onApplyTemplate, isMobileView, onToggleSidebar, onUndo, onRedo, canUndo, canRedo,
    viewMode, onToggleViewMode, wordCount, charCount,
    isFullAiActionLoading, isApiKeyMissing, isAiEnabled,
}) => {
    const { addTemplate, handleDeleteNoteConfirm } = useStoreContext();
    const { showConfirmation, isFocusMode, toggleFocusMode } = useUIContext();
    const { showToast } = useToast();

    const isDisabled = !!isFullAiActionLoading || saveStatus === 'saving';

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
            <div className="flex items-center justify-between p-2 sm:p-4 border-b border-light-border dark:border-dark-border flex-shrink-0">
                <div className="flex items-center space-x-2">
                     {isMobileView && (
                        <button onClick={onToggleSidebar} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">
                            <Bars3Icon />
                        </button>
                    )}
                    <StatusIndicator 
                        saveStatus={saveStatus} 
                        isFullAiActionLoading={isFullAiActionLoading}
                    />
                    {(saveStatus === 'unsaved' || saveStatus === 'error') && (
                        <button 
                            onClick={handleSave} 
                            className="px-3 py-1 text-sm font-semibold rounded-md bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900 hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover disabled:opacity-50"
                            disabled={isDisabled}
                        >
                            {saveStatus === 'error' ? 'Retry Save' : 'Save'}
                        </button>
                    )}
                </div>
                <div className="flex items-center space-x-0.5 sm:space-x-2">
                    {!isFocusMode && (
                        <>
                            <button onClick={onUndo} disabled={!canUndo || isDisabled} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Undo">
                                <ArrowUturnLeftIcon />
                            </button>
                            <button onClick={onRedo} disabled={!canRedo || isDisabled} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Redo">
                                <ArrowUturnRightIcon />
                            </button>
                            <div className="w-px h-6 bg-light-border dark:border-dark-border mx-1"></div>
                            
                            {!isApiKeyMissing && isAiEnabled && <AiMenu 
                                onEnhance={onEnhance}
                                onSummarize={onSummarize}
                                isDisabled={isDisabled}
                            />}
                            
                            <button onClick={onToggleHistory} disabled={isDisabled} className={`p-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isHistoryOpen ? 'bg-light-ui dark:bg-dark-ui' : 'hover:bg-light-ui dark:hover:bg-dark-ui'}`} aria-label="Toggle Version History">
                                <HistoryIcon />
                            </button>
                            <button onClick={onToggleViewMode} disabled={isDisabled} className={`p-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${viewMode === 'preview' ? 'bg-light-ui dark:bg-dark-ui' : 'hover:bg-light-ui dark:hover:bg-dark-ui'}`} aria-label={viewMode === 'preview' ? 'Switch to Edit Mode' : 'Switch to Preview Mode'}>
                                {viewMode === 'preview' ? <PencilSquareIcon /> : <EyeIcon />}
                            </button>
                            <div className="w-px h-6 bg-light-border dark:border-dark-border mx-1"></div>
                        </>
                    )}

                    <button onClick={toggleFocusMode} disabled={isDisabled} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label={isFocusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}>
                       {isFocusMode ? <UnfocusIcon /> : <FocusIcon />}
                    </button>

                    <button onClick={() => onToggleFavorite(note.id)} disabled={isDisabled} className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label={note.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                        <StarIcon className={`w-5 h-5 ${note.isFavorite ? 'text-yellow-500' : ''}`} filled={note.isFavorite} />
                    </button>
                    <button 
                        onClick={() => showConfirmation({
                            title: 'Delete Note',
                            message: `Are you sure you want to permanently delete "${note.title}"? This action cannot be undone.`,
                            onConfirm: () => handleDeleteNoteConfirm(note),
                            confirmText: 'Delete',
                        })} 
                        disabled={isDisabled} 
                        className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors text-red-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                        aria-label="Delete note"
                    >
                        <TrashIcon />
                    </button>

                    {!isFocusMode && (
                        <MoreActionsMenu 
                            note={note}
                            onApplyTemplate={onApplyTemplate}
                            onSaveAsTemplate={handleSaveAsTemplate}
                            isDisabled={isDisabled}
                            wordCount={wordCount}
                            charCount={charCount}
                        />
                    )}
                </div>
            </div>
        </>
    );
};

export default EditorHeader;