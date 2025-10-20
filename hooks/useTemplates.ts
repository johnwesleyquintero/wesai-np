import { useState, useEffect, useCallback } from 'react';
import { Template } from '../types';

const TEMPLATES_STORAGE_KEY = 'wesai-templates';

export const useTemplates = () => {
    const [templates, setTemplates] = useState<Template[]>(() => {
        try {
            const storedTemplates = localStorage.getItem(TEMPLATES_STORAGE_KEY);
            if (!storedTemplates) {
                const defaultTemplates: Template[] = [
                    { id: crypto.randomUUID(), title: 'Meeting Notes', content: '# Meeting Title\n\n**Date:** \n**Attendees:** \n\n## Agenda\n\n- \n\n## Discussion\n\n- \n\n## Action Items\n\n- ' },
                    { id: crypto.randomUUID(), title: 'Project Plan', content: '# Project: [Project Name]\n\n## Goals\n\n- \n\n## Timeline\n\n- **Phase 1:** \n- **Phase 2:** \n\n## Key Deliverables\n\n- ' },
                ];
                localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(defaultTemplates));
                return defaultTemplates;
            }
            return JSON.parse(storedTemplates);
        } catch (error) {
            console.error("Error parsing templates from localStorage", error);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
        } catch (error) {
            console.error("Error saving templates to localStorage", error);
        }
    }, [templates]);

    const addTemplate = useCallback((title: string, content: string) => {
        const newTemplate: Template = {
            id: crypto.randomUUID(),
            title,
            content,
        };
        setTemplates(prev => [...prev, newTemplate]);
    }, []);

    const updateTemplate = useCallback((id: string, updatedFields: Partial<Omit<Template, 'id'>>) => {
        setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updatedFields } : t));
    }, []);

    const deleteTemplate = useCallback((id: string) => {
        setTemplates(prev => prev.filter(t => t.id !== id));
    }, []);

    const importTemplates = useCallback((importedTemplates: Template[]) => {
        setTemplates(importedTemplates || []);
    }, []);

    return { templates, addTemplate, updateTemplate, deleteTemplate, importTemplates };
};