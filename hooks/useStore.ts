import { useState, useEffect, useCallback } from 'react';
import { Note, NoteVersion, Collection, SmartCollection, Template } from '../types';
import { User } from '@supabase/supabase-js';
import { useSupabase } from '../context/AppContext';

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


// Sanitizes a note object fetched from Supabase to prevent crashes from null fields.
const processNote = (noteData: any): Note => {
    const note = fromSupabase(noteData) as Note;
    note.content = note.content || '';
    note.tags = note.tags || [];
    // The notes table doesn't have a history column by default, but we safeguard it here
    // in case it's added by joins or other logic in the future.
    note.history = (note as any).history || [];
    return note;
};


export const useStore = (user: User | undefined) => {
    const { supabase } = useSupabase();
    const [notes, setNotes] = useState<Note[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [smartCollections, setSmartCollections] = useState<SmartCollection[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user) {
            setLoading(false);
            setNotes([]);
            setCollections([]);
            setSmartCollections([]);
            setTemplates([]);
            return;
        }
        setLoading(true);
        try {
            const [notesRes, collectionsRes, smartCollectionsRes, templatesRes] = await Promise.all([
                supabase.from('notes').select('*').eq('user_id', user.id),
                supabase.from('collections').select('*').eq('user_id', user.id),
                supabase.from('smart_collections').select('*').eq('user_id', user.id),
                supabase.from('templates').select('*').eq('user_id', user.id),
            ]);

            if (notesRes.error) throw notesRes.error;
            if (collectionsRes.error) throw collectionsRes.error;
            if (smartCollectionsRes.error) throw smartCollectionsRes.error;
            if (templatesRes.error) throw templatesRes.error;

            setNotes((notesRes.data || []).map(processNote));
            setCollections((collectionsRes.data || []).map(fromSupabase));
            setSmartCollections((smartCollectionsRes.data || []).map(fromSupabase));
            setTemplates((templatesRes.data || []).map(fromSupabase));

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }, [user, supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

     useEffect(() => {
        if (!user) return;

        const handleNoteChanges = (payload: any) => {
            if (payload.eventType === 'INSERT') {
                setNotes(prev => [...prev, processNote(payload.new)]);
            } else if (payload.eventType === 'UPDATE') {
                setNotes(prev => prev.map(n => n.id === payload.new.id ? processNote(payload.new) : n));
            } else if (payload.eventType === 'DELETE') {
                setNotes(prev => prev.filter(n => n.id !== payload.old.id));
            }
        };
        
        const handleCollectionChanges = (payload: any) => {
            if (payload.eventType === 'INSERT') {
                setCollections(prev => [...prev, fromSupabase(payload.new)]);
            } else if (payload.eventType === 'UPDATE') {
                setCollections(prev => prev.map(c => c.id === payload.new.id ? fromSupabase(payload.new) : c));
            } else if (payload.eventType === 'DELETE') {
                setCollections(prev => prev.filter(c => c.id !== payload.old.id));
            }
        };

        const handleSmartCollectionChanges = (payload: any) => {
            if (payload.eventType === 'INSERT') {
                setSmartCollections(prev => [...prev, fromSupabase(payload.new)]);
            } else if (payload.eventType === 'UPDATE') {
                setSmartCollections(prev => prev.map(sc => sc.id === payload.new.id ? fromSupabase(payload.new) : sc));
            } else if (payload.eventType === 'DELETE') {
                setSmartCollections(prev => prev.filter(sc => sc.id !== payload.old.id));
            }
        };

        const handleTemplateChanges = (payload: any) => {
            if (payload.eventType === 'INSERT') {
                setTemplates(prev => [...prev, fromSupabase(payload.new)]);
            } else if (payload.eventType === 'UPDATE') {
                setTemplates(prev => prev.map(t => t.id === payload.new.id ? fromSupabase(payload.new) : t));
            } else if (payload.eventType === 'DELETE') {
                setTemplates(prev => prev.filter(t => t.id !== payload.old.id));
            }
        };

        const notesChannel = supabase.channel(`notes-user-${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${user.id}` }, handleNoteChanges)
          .subscribe();

        const collectionsChannel = supabase.channel(`collections-user-${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'collections', filter: `user_id=eq.${user.id}` }, handleCollectionChanges)
          .subscribe();

        const smartCollectionsChannel = supabase.channel(`smart-collections-user-${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'smart_collections', filter: `user_id=eq.${user.id}` }, handleSmartCollectionChanges)
          .subscribe();

        const templatesChannel = supabase.channel(`templates-user-${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'templates', filter: `user_id=eq.${user.id}` }, handleTemplateChanges)
          .subscribe();

        return () => {
            supabase.removeChannel(notesChannel);
            supabase.removeChannel(collectionsChannel);
            supabase.removeChannel(smartCollectionsChannel);
            supabase.removeChannel(templatesChannel);
        };
    }, [user, fetchData, supabase]);

    const addNote = useCallback(async (parentId: string | null = null, title = "Untitled Note", content = "") => {
        if (!user) throw new Error("User must be logged in to create a note.");
        const newNoteForDb = { 
            title, 
            content, 
            is_favorite: false, 
            tags: [], 
            parent_id: parentId,
            user_id: user.id,
        };
        const { data, error } = await supabase.from('notes').insert(newNoteForDb).select().single();
        if (error) throw error;
        return data.id;
    }, [user, supabase]);

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
    }, [user, supabase]);

    const updateNote = useCallback(async (id: string, updatedFields: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
        if (!user) throw new Error("User must be logged in to update a note.");
        const noteToUpdate = notes.find(note => note.id === id);
        if (!noteToUpdate) return;

        const newVersion: Omit<NoteVersion, 'id'> = {
            userId: user.id,
            noteId: id,
            savedAt: noteToUpdate.updatedAt,
            title: noteToUpdate.title,
            content: noteToUpdate.content,
            tags: noteToUpdate.tags
        };
        
        const { error: versionError } = await supabase.from('note_versions').insert(toSupabase(newVersion));
        if(versionError) console.error("Failed to save note version:", versionError);

        const { error } = await supabase.from('notes').update(toSupabase({ ...updatedFields, updatedAt: new Date().toISOString() })).eq('id', id).eq('user_id', user.id);
        if (error) throw error;
    }, [notes, user, supabase]);
    
    const restoreNoteVersion = useCallback(async (noteId: string, version: NoteVersion) => {
        const { title, content, tags } = version;
        await updateNote(noteId, { title, content, tags });
    }, [updateNote]);

    const deleteNote = useCallback(async (id: string) => {
        if (!user) throw new Error("User must be logged in to delete a note.");
        const { error } = await supabase.from('notes').delete().eq('id', id).eq('user_id', user.id);
        if (error) throw error;
    }, [user, supabase]);

    const getNoteById = useCallback((id: string) => notes.find(note => note.id === id), [notes]);

    const toggleFavorite = useCallback(async (id: string) => {
        if (!user) throw new Error("User must be logged in to update a note.");
        const note = notes.find(n => n.id === id);
        if (!note) return;
        const { error } = await supabase.from('notes').update({ is_favorite: !note.isFavorite }).eq('id', id).eq('user_id', user.id);
        if (error) throw error;
    }, [notes, user, supabase]);

    const addCollection = useCallback(async (name: string, parentId: string | null = null) => {
        if (!user) throw new Error("User must be logged in to create a collection.");
        const newCollection = { name, parentId, userId: user.id };
        const { data, error } = await supabase.from('collections').insert(toSupabase(newCollection)).select().single();
        if (error) throw error;
        return data.id;
    }, [user, supabase]);

    const updateCollection = useCallback(async (id: string, updatedFields: Partial<Omit<Collection, 'id'>>) => {
        if (!user) throw new Error("User must be logged in to update a collection.");
        const { error } = await supabase.from('collections').update(toSupabase(updatedFields)).eq('id', id).eq('user_id', user.id);
        if (error) throw error;
    }, [user, supabase]);

    const deleteCollection = useCallback(async (collectionId: string) => {
        if (!user) throw new Error("User must be logged in to delete a collection.");
        const { data, error } = await supabase.rpc('delete_collection_and_descendants', { p_collection_id: collectionId });
        if (error) throw error;
        return (data as any)?.deleted_note_ids || [];
    }, [user, supabase]);

    const getCollectionById = useCallback((id: string) => collections.find(c => c.id === id), [collections]);

    const moveItem = useCallback(async (draggedItemId: string, targetItemId: string | null, position: 'top' | 'bottom' | 'inside') => {
        if (!user) throw new Error("User must be logged in to move items.");
        const isNote = notes.some(n => n.id === draggedItemId);
        
        let newParentId: string | null;

        if (position === 'inside') {
            newParentId = targetItemId;
        } else {
            if (targetItemId === null) {
                newParentId = null;
            } else {
                 const allItems = [...notes, ...collections];
                 const targetItem = allItems.find(item => item.id === targetItemId);
                 if (!targetItem) return;
                 newParentId = targetItem.parentId;
            }
        }
        
        const table = isNote ? 'notes' : 'collections';
        const { error } = await supabase.from(table).update({ parent_id: newParentId }).eq('id', draggedItemId).eq('user_id', user.id);
        if (error) throw error;
    }, [notes, collections, user, supabase]);

    const addSmartCollection = useCallback(async (name: string, query: string) => {
        if (!user) throw new Error("User must be logged in to create a smart collection.");
        const newSmartCollection = { name, query, userId: user.id };
        const { error } = await supabase.from('smart_collections').insert(toSupabase(newSmartCollection));
        if (error) throw error;
    }, [user, supabase]);

    const updateSmartCollection = useCallback(async (id: string, updatedFields: Partial<Omit<SmartCollection, 'id'>>) => {
        if (!user) throw new Error("User must be logged in to update a smart collection.");
        const { error } = await supabase.from('smart_collections').update(toSupabase(updatedFields)).eq('id', id).eq('user_id', user.id);
        if (error) throw error;
    }, [user, supabase]);

    const deleteSmartCollection = useCallback(async (id: string) => {
        if (!user) throw new Error("User must be logged in to delete a smart collection.");
        const { error } = await supabase.from('smart_collections').delete().eq('id', id).eq('user_id', user.id);
        if (error) throw error;
    }, [user, supabase]);
    
    const addTemplate = useCallback(async (title: string, content: string) => {
        if (!user) throw new Error("User must be logged in to create a template.");
        const { error } = await supabase.from('templates').insert(toSupabase({ title, content, userId: user.id }));
        if (error) throw error;
    }, [user, supabase]);

    const updateTemplate = useCallback(async (id: string, updatedFields: Partial<Omit<Template, 'id'>>) => {
        if (!user) throw new Error("User must be logged in to update a template.");
        const { error } = await supabase.from('templates').update(toSupabase(updatedFields)).eq('id', id).eq('user_id', user.id);
        if (error) throw error;
    }, [user, supabase]);

    const deleteTemplate = useCallback(async (id: string) => {
        if (!user) throw new Error("User must be logged in to delete a template.");
        const { error } = await supabase.from('templates').delete().eq('id', id).eq('user_id', user.id);
        if (error) throw error;
    }, [user, supabase]);

    const importData = useCallback(async (data: { notes: Note[], collections: Collection[], smartCollections: SmartCollection[], templates: Template[] }) => {
        if (!user) throw new Error("User must be logged in to import data.");
    
        const { id: currentUserId } = user;
    
        try {
            await supabase.from('note_versions').delete().eq('user_id', currentUserId);
            await supabase.from('notes').delete().eq('user_id', currentUserId);
            await supabase.from('collections').delete().eq('user_id', currentUserId);
            await supabase.from('smart_collections').delete().eq('user_id', currentUserId);
            await supabase.from('templates').delete().eq('user_id', currentUserId);
            
            if (data.collections?.length > 0) {
                const collectionsToInsert = data.collections.map(c => toSupabase({ ...c, userId: currentUserId }));
                const { error } = await supabase.from('collections').insert(collectionsToInsert);
                if (error) throw new Error(`Failed to import collections: ${error.message}`);
            }
    
            if (data.notes?.length > 0) {
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

                const { error: notesError } = await supabase.from('notes').insert(notesToInsert);
                if (notesError) throw new Error(`Failed to import notes: ${notesError.message}`);

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
            throw error;
        }
    }, [user, supabase]);
    
    const copyNote = useCallback(async (id: string): Promise<string> => {
        if (!user) throw new Error("User must be logged in to copy a note.");

        const sourceNote = notes.find(n => n.id === id);
        if (!sourceNote) {
            throw new Error("Source note not found.");
        }

        const newNoteData = {
            user_id: user.id,
            parent_id: sourceNote.parentId,
            title: `Copy of ${sourceNote.title}`,
            content: sourceNote.content,
            tags: sourceNote.tags,
            is_favorite: false,
        };

        const { data, error } = await supabase.from('notes').insert(newNoteData).select().single();

        if (error) {
            throw new Error(`Failed to copy note: ${error.message}`);
        }
        return data.id;
    }, [user, notes, supabase]);

    const renameNoteTitle = async (id: string, title: string) => await updateNote(id, { title });

    const logAiSuggestionEvent = useCallback(async (sourceNoteId: string, suggestedNoteId: string, wasClicked: boolean) => {
        if (!user) return;
        // This is a fire-and-forget call; we don't await it or handle errors in the UI
        // to prevent blocking user interaction. Errors are logged to the console for debugging.
        supabase.from('ai_suggestion_feedback').insert({
            user_id: user.id,
            source_note_id: sourceNoteId,
            suggested_note_id: suggestedNoteId,
            was_clicked: wasClicked,
        }).then(({ error }) => {
            if (error) {
                console.warn('Failed to log AI suggestion event:', error);
            }
        });
    }, [user, supabase]);
    
    const getSuggestionAnalytics = useCallback(async () => {
        if (!user) return [];
        const { data, error } = await supabase
            .from('ai_suggestion_feedback')
            .select('source_note_id, suggested_note_id, was_clicked');
        
        if (error) {
            console.error('Error fetching suggestion analytics:', error);
            return [];
        }

        if (!data) return [];
        
        const aggregation: Record<string, { impressions: number; clicks: number }> = {};

        data.forEach(row => {
            const key = `${row.source_note_id}|${row.suggested_note_id}`;
            if (!aggregation[key]) {
                aggregation[key] = { impressions: 0, clicks: 0 };
            }
            aggregation[key].impressions += 1;
            if (row.was_clicked) {
                aggregation[key].clicks += 1;
            }
        });

        return Object.entries(aggregation).map(([key, value]) => {
            const [sourceNoteId, suggestedNoteId] = key.split('|');
            return {
                sourceNoteId,
                suggestedNoteId,
                impressions: value.impressions,
                clicks: value.clicks,
                ctr: value.impressions > 0 ? (value.clicks / value.impressions) * 100 : 0,
            };
        });
    }, [user, supabase]);

    const getTrendAnalytics = useCallback(async () => {
        if (!user) return { hotTopics: [], mostFrequentConnections: [] };
        const { data, error } = await supabase.rpc('get_trend_analytics', { p_user_id: user.id });

        if (error) {
            console.error('Error fetching trend analytics:', error);
            return { hotTopics: [], mostFrequentConnections: [] };
        }
        
        return {
            hotTopics: data?.hot_topics || [],
            mostFrequentConnections: data?.most_frequent_connections || []
        };
    }, [user, supabase]);

    return { 
        loading,
        notes, collections, smartCollections, templates,
        addNote, addNoteFromFile, updateNote, deleteNote, getNoteById, toggleFavorite, restoreNoteVersion, copyNote, renameNoteTitle,
        addCollection, updateCollection, deleteCollection, getCollectionById, moveItem,
        addSmartCollection, updateSmartCollection, deleteSmartCollection,
        addTemplate, updateTemplate, deleteTemplate,
        importData,
        logAiSuggestionEvent,
        getSuggestionAnalytics,
        getTrendAnalytics,
    };
};
