import { useState, useEffect, useCallback } from 'react';
import { Note, NoteVersion, Collection, SmartCollection, Template } from '../types';
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

const MAX_HISTORY_LENGTH = 50;

const fromSupabase = <T extends { [key: string]: any }>(data: T) => {
    const result: { [key: string]: any } = {};
    for (const key in data) {
        const camelCaseKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        result[camelCaseKey] = data[key];
    }
    return result as T;
};

const toSupabase = <T extends { [key: string]: any }>(data: T) => {
    const result: { [key: string]: any } = {};
    for (const key in data) {
        const snakeCaseKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeCaseKey] = data[key];
    }
    return result;
};


export const useStore = (user: User | undefined) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [smartCollections, setSmartCollections] = useState<SmartCollection[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [notesRes, collectionsRes, smartCollectionsRes, templatesRes] = await Promise.all([
                supabase.from('notes').select('*'),
                supabase.from('collections').select('*'),
                supabase.from('smart_collections').select('*'),
                supabase.from('templates').select('*'),
            ]);

            if (notesRes.error) throw notesRes.error;
            if (collectionsRes.error) throw collectionsRes.error;
            if (smartCollectionsRes.error) throw smartCollectionsRes.error;
            if (templatesRes.error) throw templatesRes.error;
            
            setNotes((notesRes.data || []).map(fromSupabase));
            setCollections((collectionsRes.data || []).map(fromSupabase));
            setSmartCollections((smartCollectionsRes.data || []).map(fromSupabase));
            setTemplates((templatesRes.data || []).map(fromSupabase));

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

     useEffect(() => {
        if (!user) return;

        const notesChannel = supabase.channel('public:notes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, payload => {
                if (payload.eventType === 'INSERT') setNotes(prev => [...prev, fromSupabase(payload.new as Note)]);
                if (payload.eventType === 'UPDATE') setNotes(prev => prev.map(n => n.id === payload.new.id ? fromSupabase(payload.new as Note) : n));
                if (payload.eventType === 'DELETE') setNotes(prev => prev.filter(n => n.id !== payload.old.id));
            }).subscribe();
        
        const collectionsChannel = supabase.channel('public:collections')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, payload => {
                if (payload.eventType === 'INSERT') setCollections(prev => [...prev, fromSupabase(payload.new as Collection)]);
                if (payload.eventType === 'UPDATE') setCollections(prev => prev.map(c => c.id === payload.new.id ? fromSupabase(payload.new as Collection) : c));
                if (payload.eventType === 'DELETE') setCollections(prev => prev.filter(c => c.id !== payload.old.id));
            }).subscribe();
            
        const smartCollectionsChannel = supabase.channel('public:smart_collections')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'smart_collections' }, payload => {
                 if (payload.eventType === 'INSERT') setSmartCollections(prev => [...prev, fromSupabase(payload.new as SmartCollection)]);
                 if (payload.eventType === 'UPDATE') setSmartCollections(prev => prev.map(sc => sc.id === payload.new.id ? fromSupabase(payload.new as SmartCollection) : sc));
                 if (payload.eventType === 'DELETE') setSmartCollections(prev => prev.filter(sc => sc.id !== payload.old.id));
            }).subscribe();

        return () => {
            supabase.removeChannel(notesChannel);
            supabase.removeChannel(collectionsChannel);
            supabase.removeChannel(smartCollectionsChannel);
        };
    }, [user]);

    const addNote = useCallback(async (parentId: string | null = null) => {
        const siblings = notes.filter(n => n.parentId === parentId);
        const maxOrder = siblings.reduce((max, n) => Math.max(max, n.order || 0), 0);
        const newNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'history'> = { title: "Untitled Note", content: "", isFavorite: false, tags: [], parentId, order: maxOrder + 1 };
        const { data, error } = await supabase.from('notes').insert(toSupabase(newNote)).select().single();
        if (error) throw error;
        return data.id;
    }, [notes]);

    const addNoteFromFile = useCallback(async (title: string, content: string, parentId: string | null) => {
        const siblings = notes.filter(n => n.parentId === parentId);
        const maxOrder = siblings.reduce((max, n) => Math.max(max, n.order || 0), 0);
        const newNote = { title: title.replace(/\.(md|txt)$/i, ''), content, isFavorite: false, tags: [], parentId, order: maxOrder + 1 };
        const { data, error } = await supabase.from('notes').insert(toSupabase(newNote)).select().single();
        if (error) throw error;
        return data.id;
    }, [notes]);

    const updateNote = useCallback(async (id: string, updatedFields: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
        const noteToUpdate = notes.find(note => note.id === id);
        if (!noteToUpdate) return;
        
        const newVersion: Omit<NoteVersion, 'id'> = { noteId: id, savedAt: noteToUpdate.updatedAt, title: noteToUpdate.title, content: noteToUpdate.content, tags: noteToUpdate.tags };
        
        const { error: versionError } = await supabase.from('note_versions').insert(toSupabase(newVersion));
        if(versionError) console.error("Failed to save note version:", versionError);

        const { error } = await supabase.from('notes').update(toSupabase({ ...updatedFields, updatedAt: new Date().toISOString() })).eq('id', id);
        if (error) throw error;
    }, [notes]);
    
    const restoreNoteVersion = useCallback(async (noteId: string, version: NoteVersion) => {
        const { title, content, tags } = version;
        await updateNote(noteId, { title, content, tags });
    }, [updateNote]);

    const deleteNote = useCallback(async (id: string) => {
        const { error } = await supabase.from('notes').delete().eq('id', id);
        if (error) throw error;
    }, []);

    const getNoteById = useCallback((id: string) => notes.find(note => note.id === id), [notes]);
    const toggleFavorite = useCallback(async (id: string) => {
        const note = notes.find(n => n.id === id);
        if (!note) return;
        const { error } = await supabase.from('notes').update({ is_favorite: !note.isFavorite }).eq('id', id);
        if (error) throw error;
    }, [notes]);

    const addCollection = useCallback(async (name: string, parentId: string | null = null) => {
        const siblings = collections.filter(c => c.parentId === parentId);
        const maxOrder = siblings.reduce((max, c) => Math.max(max, c.order || 0), 0);
        const newCollection = { name, parentId, order: maxOrder + 1 };
        const { data, error } = await supabase.from('collections').insert(toSupabase(newCollection)).select().single();
        if (error) throw error;
        return data.id;
    }, [collections]);

    const updateCollection = useCallback(async (id: string, updatedFields: Partial<Omit<Collection, 'id'>>) => {
        const { error } = await supabase.from('collections').update(toSupabase(updatedFields)).eq('id', id);
        if (error) throw error;
    }, []);

    const deleteCollection = useCallback(async (collectionId: string) => {
        const { data, error } = await supabase.rpc('delete_collection_and_descendants', { p_collection_id: collectionId });
        if (error) throw error;
        // The realtime subscription should handle UI updates, but we can force a refresh if needed.
        // For now, we rely on realtime. The RPC returns deleted note IDs if we need them.
        return (data as any)?.deleted_note_ids || [];
    }, []);

    const getCollectionById = useCallback((id: string) => collections.find(c => c.id === id), [collections]);

    const moveItem = useCallback(async (draggedItemId: string, targetItemId: string | null, position: 'top' | 'bottom' | 'inside') => {
        const isNote = notes.some(n => n.id === draggedItemId);
        
        let newParentId: string | null;
        let newOrder: number;

        const allItems = [...notes, ...collections];
        
        if (targetItemId === null) {
            newParentId = null;
            const rootSiblings = allItems.filter(item => item.parentId === null && item.id !== draggedItemId);
            newOrder = (rootSiblings.reduce((max, item) => Math.max(max, item.order || 0), 0)) + 1;
        } else {
            const targetItem = allItems.find(item => item.id === targetItemId);
            if (!targetItem) return;

            if (position === 'inside') {
                newParentId = targetItem.id;
                const newSiblings = allItems.filter(item => item.parentId === newParentId && item.id !== draggedItemId);
                newOrder = (newSiblings.reduce((max, item) => Math.max(max, item.order || 0), 0)) + 1;
            } else {
                newParentId = targetItem.parentId;
                const siblings = allItems.filter(item => item.parentId === newParentId && item.id !== draggedItemId).sort((a, b) => (a.order || 0) - (b.order || 0));
                const targetIndex = siblings.findIndex(item => item.id === targetItemId);
                if (targetIndex === -1) return;

                const prevOrder = siblings[position === 'top' ? targetIndex - 1 : targetIndex]?.order || 0;
                const nextOrder = siblings[position === 'top' ? targetIndex : targetIndex + 1]?.order;

                if (nextOrder !== undefined) {
                    newOrder = (prevOrder + nextOrder) / 2;
                } else {
                    newOrder = prevOrder + 1;
                }
            }
        }
        
        const table = isNote ? 'notes' : 'collections';
        const { error } = await supabase.from(table).update({ parent_id: newParentId, order: newOrder }).eq('id', draggedItemId);
        if (error) throw error;
    }, [notes, collections]);

    const addSmartCollection = useCallback(async (name: string, query: string) => {
        const newSmartCollection = { name, query };
        const { error } = await supabase.from('smart_collections').insert(toSupabase(newSmartCollection));
        if (error) throw error;
    }, []);

    const updateSmartCollection = useCallback(async (id: string, updatedFields: Partial<Omit<SmartCollection, 'id'>>) => {
        const { error } = await supabase.from('smart_collections').update(toSupabase(updatedFields)).eq('id', id);
        if (error) throw error;
    }, []);

    const deleteSmartCollection = useCallback(async (id: string) => {
        const { error } = await supabase.from('smart_collections').delete().eq('id', id);
        if (error) throw error;
    }, []);
    
    // Templates still use localStorage as they are less critical and user-wide
    const { addTemplate, updateTemplate, deleteTemplate, importTemplates } = {
        addTemplate: async (title: string, content: string) => setTemplates(p => [...p, {id: crypto.randomUUID(), title, content}]),
        updateTemplate: async (id: string, data: any) => setTemplates(p => p.map(t => t.id === id ? {...t, ...data} : t)),
        deleteTemplate: async (id: string) => setTemplates(p => p.filter(t => t.id !== id)),
        importTemplates: async (data: Template[]) => setTemplates(data),
    };
    
    // Data import/export logic would need to be updated to handle async operations if it were to write to Supabase
    const importData = (n: Note[], c: Collection[], sc: SmartCollection[]) => { console.warn("Import data not implemented for Supabase store yet")};
    const copyNote = (id: string) => { console.warn("Copy note not implemented for Supabase store yet")};
    const renameNoteTitle = async (id: string, title: string) => await updateNote(id, { title });
    
    return { 
        loading,
        notes, collections, smartCollections, templates,
        addNote, addNoteFromFile, updateNote, deleteNote, getNoteById, toggleFavorite, restoreNoteVersion, copyNote, renameNoteTitle,
        addCollection, updateCollection, deleteCollection, getCollectionById, moveItem,
        addSmartCollection, updateSmartCollection, deleteSmartCollection,
        addTemplate, updateTemplate, deleteTemplate, importTemplates, importData,
    };
};