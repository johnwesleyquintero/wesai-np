import { useState, useEffect, useCallback } from 'react';
import { Note, NoteVersion, Collection, SmartCollection, Template } from '../types';
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

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

        const handleNoteChange = (payload: any) => {
            const record = payload.new || payload.old;
            if ((record as any)?.user_id !== user.id) return;
            
            if (payload.eventType === 'INSERT') setNotes(prev => [...prev, fromSupabase(payload.new as Note)]);
            if (payload.eventType === 'UPDATE') setNotes(prev => prev.map(n => n.id === payload.new.id ? fromSupabase(payload.new as Note) : n));
            if (payload.eventType === 'DELETE') setNotes(prev => prev.filter(n => n.id !== (payload.old as any).id));
        };
        
        const handleCollectionChange = (payload: any) => {
            const record = payload.new || payload.old;
            if ((record as any)?.user_id !== user.id) return;

            if (payload.eventType === 'INSERT') setCollections(prev => [...prev, fromSupabase(payload.new as Collection)]);
            if (payload.eventType === 'UPDATE') setCollections(prev => prev.map(c => c.id === payload.new.id ? fromSupabase(payload.new as Collection) : c));
            if (payload.eventType === 'DELETE') setCollections(prev => prev.filter(c => c.id !== (payload.old as any).id));
        };

        const handleSmartCollectionChange = (payload: any) => {
            const record = payload.new || payload.old;
            if ((record as any)?.user_id !== user.id) return;
            
            if (payload.eventType === 'INSERT') setSmartCollections(prev => [...prev, fromSupabase(payload.new as SmartCollection)]);
            if (payload.eventType === 'UPDATE') setSmartCollections(prev => prev.map(sc => sc.id === payload.new.id ? fromSupabase(payload.new as SmartCollection) : sc));
            if (payload.eventType === 'DELETE') setSmartCollections(prev => prev.filter(sc => sc.id !== (payload.old as any).id));
        };

        const handleTemplateChange = (payload: any) => {
            const record = payload.new || payload.old;
            if ((record as any)?.user_id !== user.id) return;

            if (payload.eventType === 'INSERT') setTemplates(prev => [...prev, fromSupabase(payload.new as Template)]);
            if (payload.eventType === 'UPDATE') setTemplates(prev => prev.map(t => t.id === payload.new.id ? fromSupabase(payload.new as Template) : t));
            if (payload.eventType === 'DELETE') setTemplates(prev => prev.filter(t => t.id !== (payload.old as any).id));
        };

        const notesChannel = supabase.channel('public:notes').on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, handleNoteChange).subscribe();
        const collectionsChannel = supabase.channel('public:collections').on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, handleCollectionChange).subscribe();
        const smartCollectionsChannel = supabase.channel('public:smart_collections').on('postgres_changes', { event: '*', schema: 'public', table: 'smart_collections' }, handleSmartCollectionChange).subscribe();
        const templatesChannel = supabase.channel('public:templates').on('postgres_changes', { event: '*', schema: 'public', table: 'templates' }, handleTemplateChange).subscribe();

        return () => {
            supabase.removeChannel(notesChannel);
            supabase.removeChannel(collectionsChannel);
            supabase.removeChannel(smartCollectionsChannel);
            supabase.removeChannel(templatesChannel);
        };
    }, [user]);

    const addNote = useCallback(async (parentId: string | null = null) => {
        if (!user) throw new Error("User must be logged in to create a note.");
        const newNoteForDb = { 
            title: "Untitled Note", 
            content: "", 
            is_favorite: false, 
            tags: [], 
            parent_id: parentId,
            user_id: user.id,
        };
        const { data, error } = await supabase.from('notes').insert(newNoteForDb).select().single();
        if (error) throw error;
        return data.id;
    }, [user]);

    const addNoteFromFile = useCallback(async (title: string, content: string, parentId: string | null) => {
        if (!user) throw new Error("User must be logged in to create a note.");
        const newNoteForDb = { 
            title: title.replace(/\.(md|txt)$/i, ''), 
            content, 
            is_favorite: false, 
            tags: [], 
            parent_id: parentId,
            user_id: user.id,
        };
        const { data, error } = await supabase.from('notes').insert(newNoteForDb).select().single();
        if (error) throw error;
        return data.id;
    }, [user]);

    const updateNote = useCallback(async (id: string, updatedFields: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
        const noteToUpdate = notes.find(note => note.id === id);
        if (!noteToUpdate) return;

        // Create a version based on the state *before* the update
        const newVersion: Omit<NoteVersion, 'id'> = {
            userId: noteToUpdate.userId,
            noteId: id,
            savedAt: noteToUpdate.updatedAt,
            title: noteToUpdate.title,
            content: noteToUpdate.content,
            tags: noteToUpdate.tags
        };
        
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
        if (!user) throw new Error("User must be logged in to create a collection.");
        const newCollection = { name, parentId, userId: user.id };
        const { data, error } = await supabase.from('collections').insert(toSupabase(newCollection)).select().single();
        if (error) throw error;
        return data.id;
    }, [user]);

    const updateCollection = useCallback(async (id: string, updatedFields: Partial<Omit<Collection, 'id'>>) => {
        const { error } = await supabase.from('collections').update(toSupabase(updatedFields)).eq('id', id);
        if (error) throw error;
    }, []);

    const deleteCollection = useCallback(async (collectionId: string) => {
        const { data, error } = await supabase.rpc('delete_collection_and_descendants', { p_collection_id: collectionId });
        if (error) throw error;
        return (data as any)?.deleted_note_ids || [];
    }, []);

    const getCollectionById = useCallback((id: string) => collections.find(c => c.id === id), [collections]);

    const moveItem = useCallback(async (draggedItemId: string, targetItemId: string | null, position: 'top' | 'bottom' | 'inside') => {
        const isNote = notes.some(n => n.id === draggedItemId);
        
        let newParentId: string | null;

        if (position === 'inside') {
            newParentId = targetItemId; // Target is a folder, move inside it.
        } else {
            // Dropping at root, or above/below another item.
            if (targetItemId === null) {
                newParentId = null; // Dropped at root.
            } else {
                 const allItems = [...notes, ...collections];
                 const targetItem = allItems.find(item => item.id === targetItemId);
                 if (!targetItem) return;
                 newParentId = targetItem.parentId; // Becomes a sibling of the target.
            }
        }
        
        const table = isNote ? 'notes' : 'collections';
        // Only update the parent_id, as item_order does not exist.
        const { error } = await supabase.from(table).update({ parent_id: newParentId }).eq('id', draggedItemId);
        if (error) throw error;
    }, [notes, collections]);

    const addSmartCollection = useCallback(async (name: string, query: string) => {
        if (!user) throw new Error("User must be logged in to create a smart collection.");
        const newSmartCollection = { name, query, userId: user.id };
        const { error } = await supabase.from('smart_collections').insert(toSupabase(newSmartCollection));
        if (error) throw error;
    }, [user]);

    const updateSmartCollection = useCallback(async (id: string, updatedFields: Partial<Omit<SmartCollection, 'id'>>) => {
        const { error } = await supabase.from('smart_collections').update(toSupabase(updatedFields)).eq('id', id);
        if (error) throw error;
    }, []);

    const deleteSmartCollection = useCallback(async (id: string) => {
        const { error } = await supabase.from('smart_collections').delete().eq('id', id);
        if (error) throw error;
    }, []);
    
    const addTemplate = useCallback(async (title: string, content: string) => {
        if (!user) throw new Error("User must be logged in to create a template.");
        const { error } = await supabase.from('templates').insert(toSupabase({ title, content, userId: user.id }));
        if (error) throw error;
    }, [user]);

    const updateTemplate = useCallback(async (id: string, updatedFields: Partial<Omit<Template, 'id'>>) => {
        const { error } = await supabase.from('templates').update(toSupabase(updatedFields)).eq('id', id);
        if (error) throw error;
    }, []);

    const deleteTemplate = useCallback(async (id: string) => {
        const { error } = await supabase.from('templates').delete().eq('id', id);
        if (error) throw error;
    }, []);

    const importData = useCallback(async (data: { notes: Note[], collections: Collection[], smartCollections: SmartCollection[], templates: Template[] }) => {
        if (!user) throw new Error("User must be logged in to import data.");
    
        const { id: currentUserId } = user;
    
        try {
            // Delete all existing data for the user.
            await supabase.from('note_versions').delete().eq('user_id', currentUserId);
            await supabase.from('notes').delete().eq('user_id', currentUserId);
            await supabase.from('collections').delete().eq('user_id', currentUserId);
            await supabase.from('smart_collections').delete().eq('user_id', currentUserId);
            await supabase.from('templates').delete().eq('user_id', currentUserId);
            
            // Insert new data, ensuring the user_id is correct and preserving original IDs.
            if (data.collections?.length > 0) {
                const collectionsToInsert = data.collections.map(c => toSupabase({ ...c, userId: currentUserId }));
                const { error } = await supabase.from('collections').insert(collectionsToInsert);
                if (error) throw new Error(`Failed to import collections: ${error.message}`);
            }
    
            if (data.notes?.length > 0) {
                // Whitelist properties to prevent inserting unknown columns like 'order' or 'history'.
                const notesToInsert = data.notes.map(note => ({
                    id: note.id,
                    user_id: currentUserId,
                    title: note.title,
                    content: note.content,
                    created_at: note.createdAt,
                    updated_at: note.updatedAt,
                    is_favorite: note.isFavorite,
                    tags: note.tags,
                    parent_id: note.parentId,
                }));

                // Whitelist properties for versions as well.
                const allVersionsToInsert = data.notes.flatMap(note =>
                    (note.history || []).map(version => ({
                        note_id: note.id,
                        user_id: currentUserId,
                        saved_at: version.savedAt,
                        title: version.title,
                        content: version.content,
                        tags: version.tags
                    }))
                );

                // Insert the notes first
                const { error: notesError } = await supabase.from('notes').insert(notesToInsert);
                if (notesError) throw new Error(`Failed to import notes: ${notesError.message}`);

                // Then insert the note versions
                if (allVersionsToInsert.length > 0) {
                    const { error: versionsError } = await supabase.from('note_versions').insert(allVersionsToInsert);
                    if (versionsError) throw new Error(`Failed to import note versions: ${versionsError.message}`);
                }
            }
    
            if (data.smartCollections?.length > 0) {
                const smartCollectionsToInsert = data.smartCollections.map(sc => toSupabase({ ...sc, userId: currentUserId }));
                const { error } = await supabase.from('smart_collections').insert(smartCollectionsToInsert);
                if (error) throw new Error(`Failed to import smart collections: ${error.message}`);
            }
    
            if (data.templates?.length > 0) {
                const templatesToInsert = data.templates.map(t => toSupabase({ ...t, userId: currentUserId }));
                const { error } = await supabase.from('templates').insert(templatesToInsert);
                if (error) throw new Error(`Failed to import templates: ${error.message}`);
            }
        } catch (error) {
            console.error("Import failed:", error);
            throw error; // Re-throw to be caught by the UI
        }
    }, [user]);
    
    const copyNote = (id: string) => { console.warn("Copy note not implemented for Supabase store yet")};
    const renameNoteTitle = async (id: string, title: string) => await updateNote(id, { title });
    
    return { 
        loading,
        notes, collections, smartCollections, templates,
        addNote, addNoteFromFile, updateNote, deleteNote, getNoteById, toggleFavorite, restoreNoteVersion, copyNote, renameNoteTitle,
        addCollection, updateCollection, deleteCollection, getCollectionById, moveItem,
        addSmartCollection, updateSmartCollection, deleteSmartCollection,
        addTemplate, updateTemplate, deleteTemplate,
        importData,
    };
};