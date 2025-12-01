
import React, { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fromSupabase, processNote } from '../lib/supabaseUtils';
import { User } from '@supabase/supabase-js';
import { Note, Collection, SmartCollection, Template } from '../types';

export const useRealtimeSubscriptions = (
    user: User | undefined,
    setNotes: React.Dispatch<React.SetStateAction<Note[]>>,
    setCollections: React.Dispatch<React.SetStateAction<Collection[]>>,
    setSmartCollections: React.Dispatch<React.SetStateAction<SmartCollection[]>>,
    setTemplates: React.Dispatch<React.SetStateAction<Template[]>>
) => {
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
    }, [user, setNotes, setCollections, setSmartCollections, setTemplates]);
};
