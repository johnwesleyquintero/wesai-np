import React from 'react';
import { Note, Template } from '../../types';
import { StarIcon, TrashIcon, HistoryIcon, Bars3Icon, ArrowUturnLeftIcon, ArrowUturnRightIcon, EyeIcon, PencilSquareIcon, FocusIcon, UnfocusIcon } from '../Icons';
import { useToast } from '../../context/ToastContext';
import { useStoreContext, useUIContext } from '../../context/AppContext';
import MoreActionsMenu from './MoreActionsMenu';
import StatusIndicator from './StatusIndicator';
import AiMenu from './AiMenu';

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