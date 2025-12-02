
import { Part } from "@google/genai";
import { NoteState } from "../types";

/**
 * Normalizes the 'contents' part of a Gemini request by trimming whitespace 
 * from any text parts. This increases cache hits for semantically identical prompts.
 */
export function normalizeContents(contents: string | Part | (string | Part)[]): string | Part | (string | Part)[] {
    if (typeof contents === 'string') {
        return contents.trim();
    }

    if (Array.isArray(contents)) {
        return contents.map(part => {
            if (typeof part === 'string') {
                return part.trim();
            }
            if (part.text) {
                return { ...part, text: part.text.trim() };
            }
            return part;
        });
    }

    if (typeof contents === 'object' && 'text' in contents && typeof contents.text === 'string') {
         return { ...contents, text: contents.text.trim() };
    }

    return contents;
}

/**
 * Recursively sorts the keys of an object to create a canonical representation.
 * This ensures that objects with the same keys and values produce an identical
 * string when stringified, improving cache key stability.
 */
export function sortObjectKeys(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(sortObjectKeys);
    }
    const sortedKeys = Object.keys(obj).sort();
    const result: { [key: string]: any } = {};
    for (const key of sortedKeys) {
        result[key] = sortObjectKeys(obj[key]);
    }
    return result;
}

/**
 * Deep equality check for NoteState objects (title, content, tags).
 */
export const areNoteStatesEqual = (a: NoteState, b: NoteState): boolean => {
    if (!a || !b) return a === b;
    if (a.title !== b.title || a.content !== b.content) {
        return false;
    }
    if (a.tags.length !== b.tags.length) {
        return false;
    }
    const tagsSetA = new Set(a.tags);
    for (const tag of b.tags) {
        if (!tagsSetA.has(tag)) {
            return false;
        }
    }
    return true;
};
