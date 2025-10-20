import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Command } from '../types';
import {
    PencilSquareIcon, Bars3Icon, SunIcon, Cog6ToothIcon, SparklesIcon, TrashIcon, StarIcon,
    HistoryIcon, ArrowUturnLeftIcon, ArrowUturnRightIcon, DocumentTextIcon, TagIcon, LightBulbIcon
} from '../components/Icons';

export const useCommands = (onComplete: () => void): Command[] => {
    const {
        onAddNote,
        setIsSidebarOpen,
        toggleTheme,
        openSettings,
        onSetView,
        view,
        activeNote,
        onDeleteNote,
        onToggleFavorite,
        editorActions,
        isAiRateLimited,
    } = useAppContext();

    const commands = useMemo<Command[]>(() => {
        const allCommands: Command[] = [];

        // Section: Navigation
        allCommands.push(
            {
                id: 'new-note',
                name: 'New Note',
                action: () => { onAddNote(); onComplete(); },
                icon: React.createElement(PencilSquareIcon),
                keywords: 'create new write',
                section: 'Navigation',
            },
            {
                id: 'toggle-sidebar',
                name: 'Toggle Sidebar',
                action: () => { setIsSidebarOpen(prev => !prev); onComplete(); },
                icon: React.createElement(Bars3Icon),
                keywords: 'panel menu hide show',
                section: 'Navigation',
            },
            {
                id: 'switch-to-notes',
                name: 'Switch to Notes',
                action: () => { onSetView('NOTES'); onComplete(); },
                icon: React.createElement(DocumentTextIcon),
                keywords: 'view notes editor',
                section: 'Navigation',
            },
            {
                id: 'switch-to-chat',
                name: 'Switch to Chat',
                action: () => { onSetView('CHAT'); onComplete(); },
                icon: React.createElement(SparklesIcon),
                keywords: 'view chat ask ai',
                section: 'Navigation',
            }
        );

        // Section: Note (Contextual)
        if (activeNote && view === 'NOTES') {
            allCommands.push(
                {
                    id: 'delete-note',
                    name: 'Delete Note',
                    action: () => { onDeleteNote(activeNote); onComplete(); },
                    icon: React.createElement(TrashIcon),
                    keywords: 'remove trash',
                    section: 'Note',
                },
                {
                    id: 'toggle-favorite',
                    name: 'Toggle Favorite',
                    action: () => { onToggleFavorite(activeNote.id); onComplete(); },
                    icon: React.createElement(StarIcon, { filled: activeNote.isFavorite }),
                    keywords: 'star favorite pin',
                    section: 'Note',
                }
            );

            if (editorActions) {
                 allCommands.push(
                    {
                        id: 'undo',
                        name: 'Undo',
                        action: () => { if (editorActions.canUndo) editorActions.undo(); onComplete(); },
                        icon: React.createElement(ArrowUturnLeftIcon),
                        keywords: 'undo revert back',
                        section: 'Note',
                    },
                    {
                        id: 'redo',
                        name: 'Redo',
                        action: () => { if (editorActions.canRedo) editorActions.redo(); onComplete(); },
                        icon: React.createElement(ArrowUturnRightIcon),
                        keywords: 'redo forward',
                        section: 'Note',
                    }
                );
            }
        }
        
        // Section: AI (Contextual)
        if (activeNote && view === 'NOTES' && editorActions && !isAiRateLimited) {
            allCommands.push(
                {
                    id: 'ai-fix',
                    name: 'Fix Spelling & Grammar',
                    action: () => { editorActions.applyAiActionToFullNote('fix'); onComplete(); },
                    icon: React.createElement(SparklesIcon),
                    keywords: 'ai fix grammar spelling proofread',
                    section: 'AI',
                },
                {
                    id: 'ai-shorten',
                    name: 'Make Shorter',
                    action: () => { editorActions.applyAiActionToFullNote('shorten'); onComplete(); },
                    icon: React.createElement(SparklesIcon),
                    keywords: 'ai shorten concise summarize',
                    section: 'AI',
                },
                 {
                    id: 'ai-expand',
                    name: 'Make Longer',
                    action: () => { editorActions.applyAiActionToFullNote('expand'); onComplete(); },
                    icon: React.createElement(SparklesIcon),
                    keywords: 'ai expand elaborate detail',
                    section: 'AI',
                },
                {
                    id: 'ai-simplify',
                    name: 'Simplify Language',
                    action: () => { editorActions.applyAiActionToFullNote('simplify'); onComplete(); },
                    icon: React.createElement(SparklesIcon),
                    keywords: 'ai simplify easy plain language',
                    section: 'AI',
                },
                {
                    id: 'ai-summarize-actions',
                    name: 'Summarize & Find Actions',
                    action: () => { editorActions.summarizeAndFindActionForFullNote(); onComplete(); },
                    icon: React.createElement(SparklesIcon),
                    keywords: 'ai summary actions todo list',
                    section: 'AI',
                },
                {
                    id: 'ai-suggest-title',
                    name: 'Suggest Title',
                    action: () => { editorActions.suggestTitleForFullNote(); onComplete(); },
                    icon: React.createElement(LightBulbIcon),
                    keywords: 'ai title suggestion',
                    section: 'AI',
                },
                {
                    id: 'ai-suggest-tags',
                    name: 'Suggest Tags',
                    action: () => { editorActions.suggestTagsForFullNote(); onComplete(); },
                    icon: React.createElement(TagIcon),
                    keywords: 'ai tags keywords suggestions',
                    section: 'AI',
                }
            );
        }

        // Section: Settings
        allCommands.push(
            {
                id: 'toggle-theme',
                name: 'Toggle Theme',
                action: () => { toggleTheme(); onComplete(); },
                icon: React.createElement(SunIcon),
                keywords: 'dark light mode theme appearance',
                section: 'Settings',
            },
            {
                id: 'settings',
                name: 'View Settings',
                action: () => { openSettings(); onComplete(); },
                icon: React.createElement(Cog6ToothIcon),
                keywords: 'settings options preferences templates',
                section: 'Settings',
            }
        );

        return allCommands;
    }, [
        onAddNote,
        setIsSidebarOpen,
        toggleTheme,
        openSettings,
        onSetView,
        view,
        activeNote,
        onDeleteNote,
        onToggleFavorite,
        editorActions,
        isAiRateLimited,
        onComplete
    ]);

    return commands;
};