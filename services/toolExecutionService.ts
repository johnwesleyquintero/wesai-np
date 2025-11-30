import { Note, Collection, Template } from '../types';

export interface ToolExecutionContext {
    notes: Note[];
    collections: Collection[];
    templates: Template[];
    activeNoteId: string | null;
    getNoteById: (id: string) => Note | undefined;
    getCollectionById: (id: string) => Collection | undefined;
    onAddNote: (parentId: string | null, title: string, content: string) => Promise<string>;
    updateNoteInStore: (id: string, updates: any) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;
    setActiveNoteId: (id: string | null) => void;
    addCollection: (name: string, parentId: string | null) => Promise<string>;
    moveItem: (itemId: string, targetId: string | null, position: 'inside') => Promise<void>;
    addTemplate: (title: string, content: string) => Promise<void>;
}

export interface ToolExecutionResult {
    result: any;
    status: 'complete' | 'error';
    touchedNoteIds: string[];
}

export const executeTool = async (
    name: string, 
    args: any, 
    context: ToolExecutionContext
): Promise<ToolExecutionResult> => {
    const touchedNoteIds: string[] = [];
    let result: any;
    let status: 'complete' | 'error' = 'complete';

    try {
        switch (name) {
            case 'createNote':
                const title = String(args.title || 'Untitled Note');
                const content = String(args.content || '');
                const newNoteId = await context.onAddNote(null, title, content);
                result = { success: true, noteId: newNoteId };
                touchedNoteIds.push(newNoteId);
                break;
            case 'findNotes':
                const queryToSearch = String(args.query || '');
                const foundNotes = context.notes
                    .filter(n => n.title.toLowerCase().includes(queryToSearch.toLowerCase()))
                    .map(n => ({ id: n.id, title: n.title }));
                result = { notes: foundNotes };
                break;
            case 'getNoteContent':
                const noteIdToRead = String(args.noteId || '');
                const noteToRead = context.getNoteById(noteIdToRead);
                if (noteToRead) {
                    result = { success: true, title: noteToRead.title, content: noteToRead.content };
                } else {
                    throw new Error("Note not found.");
                }
                break;
            case 'updateNote':
                const noteIdToUpdate = String(args.noteId || '');
                const noteToUpdate = context.getNoteById(noteIdToUpdate);
                if (noteToUpdate) {
                    const updatedFields: { title?: string, content?: string } = {};
                    if (args.title) updatedFields.title = String(args.title);
                    if (args.content) updatedFields.content = String(args.content);
                    
                    if (Object.keys(updatedFields).length > 0) {
                        await context.updateNoteInStore(noteIdToUpdate, updatedFields);
                        result = { success: true, noteId: noteIdToUpdate };
                        touchedNoteIds.push(noteIdToUpdate);
                    } else {
                        throw new Error("No fields to update were provided.");
                    }
                } else {
                    throw new Error("Note not found.");
                }
                break;
            case 'deleteNote':
                const noteIdToDelete = String(args.noteId || '');
                const noteToDeleteInstance = context.getNoteById(noteIdToDelete);
                if (noteToDeleteInstance) {
                    await context.deleteNote(noteIdToDelete);
                    if (context.activeNoteId === noteIdToDelete) context.setActiveNoteId(null);
                    result = { success: true, noteId: noteIdToDelete };
                } else {
                    throw new Error("Note not found.");
                }
                break;
            case 'createCollection':
                const name = String(args.name || 'New Folder');
                const parentId = args.parentId ? String(args.parentId) : null;
                const newCollectionId = await context.addCollection(name, parentId);
                result = { success: true, collectionId: newCollectionId };
                break;
            case 'findCollections':
                const collectionQuery = String(args.query || '').toLowerCase();
                const foundCollections = context.collections
                    .filter(c => c.name.toLowerCase().includes(collectionQuery))
                    .map(c => ({ id: c.id, name: c.name }));
                result = { collections: foundCollections };
                break;
            case 'moveNoteToCollection':
                const noteIdToMove = String(args.noteId || '');
                const collectionId = args.collectionId === null || args.collectionId === 'null' ? null : String(args.collectionId);
                const noteToMove = context.getNoteById(noteIdToMove);
                const collection = collectionId ? context.getCollectionById(collectionId) : { name: 'root' };
                
                if (noteToMove && (collection || collectionId === null)) {
                    await context.moveItem(noteIdToMove, collectionId, 'inside');
                    result = { success: true };
                } else {
                    throw new Error("Note or destination folder not found.");
                }
                break;
            case 'findTemplates':
                const templateQuery = String(args.query || '').toLowerCase();
                const foundTemplates = context.templates
                    .filter(t => t.title.toLowerCase().includes(templateQuery))
                    .map(t => ({ id: t.id, title: t.title }));
                result = { templates: foundTemplates };
                break;
            case 'createTemplateFromNote':
                const noteIdForTemplate = String(args.noteId || '');
                const noteForTemplate = context.getNoteById(noteIdForTemplate);
                if (noteForTemplate) {
                    await context.addTemplate(noteForTemplate.title, noteForTemplate.content);
                    result = { success: true, templateTitle: noteForTemplate.title };
                } else {
                    throw new Error("Note not found.");
                }
                break;
            case 'applyTemplateToNote':
                const templateIdToApply = String(args.templateId || '');
                const noteIdToApplyTo = String(args.noteId || '');
                const templateToApply = context.templates.find(t => t.id === templateIdToApply);
                const noteToApplyToInstance = context.getNoteById(noteIdToApplyTo);

                if (templateToApply && noteToApplyToInstance) {
                    await context.updateNoteInStore(noteIdToApplyTo, {
                        title: templateToApply.title,
                        content: templateToApply.content,
                    });
                    result = { success: true, noteId: noteIdToApplyTo };
                    touchedNoteIds.push(noteIdToApplyTo);
                } else {
                    if (!templateToApply) throw new Error("Template not found.");
                    if (!noteToApplyToInstance) throw new Error("Note not found.");
                }
                break;
            case 'findAndReplaceInNotes':
                const { searchQuery, newText, caseSensitive = false } = args;
                if (typeof searchQuery !== 'string' || typeof newText !== 'string') {
                    throw new Error("searchQuery and newText must be provided as strings.");
                }
                const regex = new RegExp(searchQuery, caseSensitive ? 'g' : 'gi');
                const notesToUpdate = context.notes.filter(note => regex.test(note.content));
                
                const updatePromises = notesToUpdate.map(note => {
                    const newContent = note.content.replace(regex, newText);
                    return context.updateNoteInStore(note.id, { content: newContent });
                });

                await Promise.all(updatePromises);

                result = { success: true, notesUpdated: notesToUpdate.length, updatedNoteIds: notesToUpdate.map(n => n.id) };
                // We don't push to touchedNoteIds here as it might be too many, 
                // but the result object conveys the info.
                break;
            default:
                throw new Error(`Unknown function: ${name}`);
        }
    } catch (error) {
        result = { success: false, error: (error as Error).message };
        status = 'error';
    }

    return { result, status, touchedNoteIds };
};