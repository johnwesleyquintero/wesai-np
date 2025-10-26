import { useState, useCallback } from 'react';
import { Note, Collection, SmartCollection, Template } from '../types';
import { demoNotes, demoCollections, demoTemplates, demoSmartCollections } from '../lib/demoData';

// This hook mimics the return signature of useStore for the demo mode.
// "Write" operations modify local state and are lost on refresh.
export const useLocalNotes = () => {
    const [notes, setNotes] = useState<Note[]>(demoNotes);
    const [collections, setCollections] = useState<Collection[]>(demoCollections);
    const [smartCollections, setSmartCollections] = useState<SmartCollection[]>(demoSmartCollections);
    const [templates, setTemplates] = useState<Template[]>(demoTemplates);

    const addNote = useCallback(async (parentId: string | null = null, title = "Untitled Note", content = ""): Promise<string> => {
        const newNote: Note = {
            id: `demo-note-${Date.now()}`,
            title,
            content,
            isFavorite: false,
            tags: [],
            parentId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            history: [],
        };
        setNotes(prev => [...prev, newNote]);
        return newNote.id;
    }, []);

    const updateNote = useCallback(async (id: string, updatedFields: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updatedFields, updatedAt: new Date().toISOString() } : n));
    }, []);

    const deleteNote = useCallback(async (id: string) => {
        setNotes(prev => prev.filter(n => n.id !== id));
    }, []);

    const getNoteById = useCallback((id: string) => notes.find(note => note.id === id), [notes]);
    
    // Stub out other functions to prevent errors.
    const noOpAsync = async () => {};
    const noOpAsyncCopy = async (id: string): Promise<string> => {
        const noteToCopy = notes.find(n => n.id === id);
        if (noteToCopy) {
            return addNote(noteToCopy.parentId, `Copy of ${noteToCopy.title}`, noteToCopy.content);
        }
        return '';
    };

    return {
        loading: false,
        notes,
        collections,
        smartCollections,
        templates,
        addNote,
        addNoteFromFile: (title: string, content: string, parentId: string | null) => addNote(parentId, title, content),
        updateNote,
        deleteNote,
        getNoteById,
        toggleFavorite: (id: string) => updateNote(id, { isFavorite: !notes.find(n => n.id === id)?.isFavorite }),
        restoreNoteVersion: noOpAsync,
        copyNote: noOpAsyncCopy,
        renameNoteTitle: (id: string, title: string) => updateNote(id, { title }),
        addCollection: async (name: string, parentId: string | null) => {
            const newCollection: Collection = { id: `demo-collection-${Date.now()}`, name, parentId };
            setCollections(prev => [...prev, newCollection]);
            return newCollection.id;
        },
        updateCollection: async (id: string, updatedFields: Partial<Omit<Collection, 'id'>>) => {
             setCollections(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields } : c));
        },
        deleteCollection: async (id: string) => {
            setCollections(prev => prev.filter(c => c.id !== id));
            setNotes(prev => prev.map(n => n.parentId === id ? { ...n, parentId: null } : n));
        },
        getCollectionById: (id: string) => collections.find(c => c.id === id),
        moveItem: async (draggedItemId: string, targetItemId: string | null, position: 'top' | 'bottom' | 'inside') => {
            const isNote = notes.some(n => n.id === draggedItemId);
            if (position !== 'inside') {
                // For simplicity, demo drag-and-drop between items in the same folder is not implemented.
                // It only supports moving an item inside a folder.
                return;
            }
            if (isNote) {
                setNotes(prev => prev.map(n => n.id === draggedItemId ? { ...n, parentId: targetItemId } : n));
            } else {
                 setCollections(prev => prev.map(c => c.id === draggedItemId ? { ...c, parentId: targetItemId } : c));
            }
        },
        addSmartCollection: async (name: string, query: string) => {
            setSmartCollections(prev => [...prev, { id: `demo-sc-${Date.now()}`, name, query }]);
        },
        updateSmartCollection: async (id: string, updatedFields: Partial<Omit<SmartCollection, 'id'>>) => {
            setSmartCollections(prev => prev.map(sc => sc.id === id ? { ...sc, ...updatedFields } : sc));
        },
        deleteSmartCollection: async (id: string) => setSmartCollections(prev => prev.filter(sc => sc.id !== id)),
        addTemplate: async (title: string, content: string) => {
            setTemplates(prev => [...prev, { id: `demo-template-${Date.now()}`, title, content }]);
        },
        updateTemplate: async (id: string, updatedFields: Partial<Omit<Template, 'id'>>) => {
            setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updatedFields } : t));
        },
        deleteTemplate: async (id: string) => setTemplates(prev => prev.filter(t => t.id !== id)),
        importData: noOpAsync,
        logAiSuggestionEvent: noOpAsync,
        getSuggestionAnalytics: async () => [],
        getTrendAnalytics: async () => ({ hotTopics: [], mostFrequentConnections: [] }),
    };
};
