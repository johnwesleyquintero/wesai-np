import React from 'react';
import { SlashCommand } from '../types';
import { 
    Heading1Icon, Heading2Icon, Heading3Icon, ListBulletIcon, CheckBadgeIcon, MinusIcon, 
    SparklesIcon,
} from './Icons';

export const slashCommands: SlashCommand[] = [
    // Formatting
    {
        id: 'h1',
        name: 'Heading 1',
        description: 'Large section heading',
        section: 'Formatting',
        icon: React.createElement(Heading1Icon),
        keywords: 'header title',
    },
    {
        id: 'h2',
        name: 'Heading 2',
        description: 'Medium section heading',
        section: 'Formatting',
        icon: React.createElement(Heading2Icon),
        keywords: 'header subtitle',
    },
    {
        id: 'h3',
        name: 'Heading 3',
        description: 'Small section heading',
        section: 'Formatting',
        icon: React.createElement(Heading3Icon),
        keywords: 'header sub-subtitle',
    },
    {
        id: 'list',
        name: 'Bulleted List',
        description: 'Create a simple bulleted list',
        section: 'Formatting',
        icon: React.createElement(ListBulletIcon),
        keywords: 'ul bullets',
    },
    {
        id: 'todo',
        name: 'To-do List',
        description: 'Track tasks with a checklist',
        section: 'Formatting',
        icon: React.createElement(CheckBadgeIcon),
        keywords: 'checklist task checkbox todo',
    },

    // Insert
    {
        id: 'divider',
        name: 'Divider',
        description: 'Visually divide sections',
        section: 'Insert',
        icon: React.createElement(MinusIcon),
        keywords: 'hr horizontal rule line',
    },
    
    // AI Actions
    {
        id: 'ai-summarize',
        name: 'Summarize',
        description: 'AI summary of the entire note',
        section: 'AI Actions',
        icon: React.createElement(SparklesIcon),
        keywords: 'ai summary tldr',
    },
    {
        id: 'ai-fix',
        name: 'Fix Spelling & Grammar',
        description: 'Corrects the entire note',
        section: 'AI Actions',
        icon: React.createElement(SparklesIcon),
        keywords: 'ai proofread correct',
    },
];
