import { useMemo } from 'react';
import { Note } from '../types';

// Regular expression to find links in the format [[note-id]] or [[note-id|display-text]]
const noteLinkRegex = /\[\[([a-zA-Z0-9-]+)(?:\|.*?)?\]\]/g;

interface Backlink {
    sourceNoteId: string;
    sourceNoteTitle: string;
}

export const useBacklinks = (activeNoteId: string | null, notes: Note[]): Backlink[] => {
    return useMemo(() => {
        if (!activeNoteId) {
            return [];
        }

        const backlinks: Backlink[] = [];
        const noteMap = new Map(notes.map(note => [note.id, note]));

        for (const note of notes) {
            // Don't check the active note against itself
            if (note.id === activeNoteId) {
                continue;
            }

            // Find all link matches in the note's content
            const matches = [...note.content.matchAll(noteLinkRegex)];
            for (const match of matches) {
                const linkedNoteId = match[1];
                if (linkedNoteId === activeNoteId) {
                    // This note links to the active note
                    backlinks.push({
                        sourceNoteId: note.id,
                        sourceNoteTitle: note.title,
                    });
                    // We only need to know once if it links, so we can break
                    break;
                }
            }
        }

        return backlinks;
    }, [activeNoteId, notes]);
};
