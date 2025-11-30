
import { Note, NoteVersion } from '../types';

export const fromSupabase = <T extends { [key: string]: any }>(data: T) => {
    const result: { [key: string]: any } = {};
    for (const key in data) {
        const camelCaseKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        result[camelCaseKey] = data[key];
    }
    return result as T;
};

export const toSupabase = <T extends { [key: string]: any }>(data: T) => {
    const result: { [key: string]: any } = {};
    for (const key in data) {
        const snakeCaseKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeCaseKey] = data[key];
    }
    return result;
};

// Sanitizes a note object fetched from Supabase to prevent crashes from null fields.
export const processNote = (noteData: any): Note => {
    const note = fromSupabase(noteData) as Note;
    note.content = note.content || '';
    note.tags = note.tags || [];
    // When fetching via RPC, history will be a JSONB array.
    // When a note is updated via subscription, it won't have history, so we default to [].
    note.history = (note as any).history || [];
    return note;
};
