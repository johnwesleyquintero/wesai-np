import { useState, useEffect, useCallback } from 'react';
import { Note, NoteVersion, Collection, SmartCollection } from '../types';

const NOTES_STORAGE_key = 'wesai-notes';
const COLLECTIONS_STORAGE_KEY = 'wesai-collections';
const SMART_COLLECTIONS_STORAGE_KEY = 'wesai-smart-collections';
const MAX_HISTORY_LENGTH = 50;

export const useStore = () => {
    const [notes, setNotes] = useState<Note[]>(() => {
        try {
            const storedNotes = localStorage.getItem(NOTES_STORAGE_key);
            const parsedNotes = storedNotes ? JSON.parse(storedNotes) : [];
            // Data migration for old notes without parentId
            return parsedNotes.map((note: Note) => ({
                ...note,
                parentId: note.parentId !== undefined ? note.parentId : null,
            }));
        } catch (error) {
            console.error("Error parsing notes from localStorage", error);
            return [];
        }
    });

    const [collections, setCollections] = useState<Collection[]>(() => {
        try {
            const storedCollections = localStorage.getItem(COLLECTIONS_STORAGE_KEY);
            return storedCollections ? JSON.parse(storedCollections) : [];
        } catch (error) {
            console.error("Error parsing collections from localStorage", error);
            return [];
        }
    });

    const [smartCollections, setSmartCollections] = useState<SmartCollection[]>(() => {
        try {
            const stored = localStorage.getItem(SMART_COLLECTIONS_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error("Error parsing smart collections from localStorage", error);
            return [];
        }
    });


    useEffect(() => {
        try {
            localStorage.setItem(NOTES_STORAGE_key, JSON.stringify(notes));
        } catch (error) {
            console.error("Error saving notes to localStorage", error);
        }
    }, [notes]);

    useEffect(() => {
        try {
            localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(collections));
        } catch (error) {
            console.error("Error saving collections to localStorage", error);
        }
    }, [collections]);
    
    useEffect(() => {
        try {
            localStorage.setItem(SMART_COLLECTIONS_STORAGE_KEY, JSON.stringify(smartCollections));
        } catch (error) {
            console.error("Error saving smart collections to localStorage", error);
        }
    }, [smartCollections]);

    const addNote = useCallback((parentId: string | null = null) => {
        const newNote: Note = {
            id: crypto.randomUUID(),
            title: "Untitled Note",
            content: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isFavorite: false,
            tags: [],
            history: [],
            parentId,
        };
        setNotes(prevNotes => [newNote, ...prevNotes]);
        return newNote.id;
    }, []);

    const copyNote = useCallback((noteId: string) => {
        const noteToCopy = notes.find(n => n.id === noteId);
        if (!noteToCopy) return;

        const newNote: Note = {
            id: crypto.randomUUID(),
            title: `Copy of ${noteToCopy.title}`,
            content: noteToCopy.content,
            tags: [...noteToCopy.tags], // Create a new array for tags
            parentId: noteToCopy.parentId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isFavorite: false, // Copied notes are not favorited by default
            history: [],
        };

        setNotes(prev => [newNote, ...prev]);
        return newNote.id;
    }, [notes]);

    const updateNote = useCallback((id: string, updatedFields: Partial<Omit<Note, 'id' | 'createdAt' | 'history'>>) => {
        setNotes(prevNotes => {
            const noteToUpdate = prevNotes.find(note => note.id === id);
            if (!noteToUpdate) return prevNotes;

            const newVersion: NoteVersion = {
                savedAt: noteToUpdate.updatedAt,
                title: noteToUpdate.title,
                content: noteToUpdate.content,
                tags: noteToUpdate.tags,
            };

            const newHistory = [newVersion, ...(noteToUpdate.history || [])];
            if (newHistory.length > MAX_HISTORY_LENGTH) {
                newHistory.pop();
            }

            return prevNotes.map(note =>
                note.id === id ? { ...note, ...updatedFields, updatedAt: new Date().toISOString(), history: newHistory } : note
            );
        });
    }, []);

    const renameNoteTitle = useCallback((id: string, newTitle: string) => {
        setNotes(prevNotes =>
            prevNotes.map(note =>
                note.id === id ? { ...note, title: newTitle, updatedAt: new Date().toISOString() } : note
            )
        );
    }, []);


    const restoreNoteVersion = useCallback((noteId: string, version: NoteVersion) => {
        const { title, content, tags } = version;
        updateNote(noteId, { title, content, tags });
    }, [updateNote]);

    const deleteNote = useCallback((id: string) => {
        setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
    }, []);

    const getNoteById = useCallback((id: string) => {
        return notes.find(note => note.id === id);
    }, [notes]);

    const toggleFavorite = useCallback((id: string) => {
        setNotes(prevNotes =>
            prevNotes.map(note =>
                note.id === id ? { ...note, isFavorite: !note.isFavorite, updatedAt: new Date().toISOString() } : note
            )
        );
    }, []);

    // Collection Management
    const addCollection = useCallback((name: string, parentId: string | null = null) => {
        const newCollection: Collection = {
            id: crypto.randomUUID(),
            name,
            parentId,
        };
        setCollections(prev => [...prev, newCollection]);
        return newCollection.id;
    }, []);
    
    const updateCollection = useCallback((id: string, updatedFields: Partial<Omit<Collection, 'id'>>) => {
        setCollections(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields } : c));
    }, []);

    const deleteCollection = useCallback((collectionId: string) => {
        const collectionsToDelete = new Set<string>([collectionId]);
        const notesToDelete = new Set<string>();

        const findDescendants = (parentId: string) => {
            collections.forEach(collection => {
                if (collection.parentId === parentId) {
                    collectionsToDelete.add(collection.id);
                    findDescendants(collection.id);
                }
            });
            notes.forEach(note => {
                if (note.parentId === parentId) {
                    notesToDelete.add(note.id);
                }
            });
        };

        findDescendants(collectionId);
        
        // Find all notes directly in the top-level folder
        notes.forEach(note => {
            if (note.parentId === collectionId) {
                notesToDelete.add(note.id);
            }
        });


        setCollections(prev => prev.filter(c => !collectionsToDelete.has(c.id)));
        setNotes(prev => prev.filter(n => !notesToDelete.has(n.id)));
    }, [notes, collections]);
    
    const getCollectionById = useCallback((id: string) => {
        return collections.find(c => c.id === id);
    }, [collections]);

    const moveItem = useCallback((itemId: string, newParentId: string | null) => {
        const isNote = notes.some(n => n.id === itemId);
        const isCollection = collections.some(c => c.id === itemId);

        if (isNote) {
            setNotes(prev => prev.map(n => n.id === itemId ? { ...n, parentId: newParentId } : n));
        } else if (isCollection) {
            if (itemId === newParentId) return; // Can't drop on self

            // Circular dependency check
            let currentParentId = newParentId;
            while (currentParentId) {
                if (currentParentId === itemId) {
                    console.error("Cannot move a folder into itself or a descendant.");
                    return; // Abort move
                }
                const parent = collections.find(c => c.id === currentParentId);
                currentParentId = parent ? parent.parentId : null;
            }

            setCollections(prev => prev.map(c => c.id === itemId ? { ...c, parentId: newParentId } : c));
        }
    }, [notes, collections]);

    // Smart Collection Management
    const addSmartCollection = useCallback((name: string, query: string) => {
        const newSmartCollection: SmartCollection = {
            id: crypto.randomUUID(),
            name,
            query,
        };
        setSmartCollections(prev => [...prev, newSmartCollection]);
    }, []);

    const updateSmartCollection = useCallback((id: string, updatedFields: Partial<Omit<SmartCollection, 'id'>>) => {
        setSmartCollections(prev => prev.map(sc => sc.id === id ? { ...sc, ...updatedFields } : sc));
    }, []);

    const deleteSmartCollection = useCallback((id: string) => {
        setSmartCollections(prev => prev.filter(sc => sc.id !== id));
    }, []);

    const importData = useCallback((
        importedNotes: Note[],
        importedCollections: Collection[],
        importedSmartCollections: SmartCollection[]
    ) => {
        setNotes(importedNotes || []);
        setCollections(importedCollections || []);
        setSmartCollections(importedSmartCollections || []);
    }, []);


    return { 
        notes, 
        addNote, 
        copyNote,
        updateNote, 
        renameNoteTitle,
        deleteNote, 
        getNoteById, 
        toggleFavorite, 
        restoreNoteVersion,
        collections,
        addCollection,
        updateCollection,
        deleteCollection,
        getCollectionById,
        moveItem,
        smartCollections,
        addSmartCollection,
        updateSmartCollection,
        deleteSmartCollection,
        importData,
    };
};