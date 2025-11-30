import { FunctionDeclaration, Type } from "@google/genai";

export const wesCoreToolDefinitions: FunctionDeclaration[] = [
    { name: 'createNote', parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING } }, required: ['title'] } },
    { name: 'findNotes', parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING } }, required: ['query'] } },
    { name: 'getNoteContent', parameters: { type: Type.OBJECT, properties: { noteId: { type: Type.STRING } }, required: ['noteId'] } },
    { name: 'updateNote', parameters: { type: Type.OBJECT, properties: { noteId: { type: Type.STRING }, title: { type: Type.STRING }, content: { type: Type.STRING } }, required: ['noteId'] } },
    { name: 'deleteNote', parameters: { type: Type.OBJECT, properties: { noteId: { type: Type.STRING } }, required: ['noteId'] } },
    { name: 'createCollection', parameters: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, parentId: { type: Type.STRING } }, required: ['name'] } },
    { name: 'findCollections', parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING } }, required: ['query'] } },
    { name: 'moveNoteToCollection', parameters: { type: Type.OBJECT, properties: { noteId: { type: Type.STRING }, collectionId: { type: Type.STRING } }, required: ['noteId', 'collectionId'] } },
    {
        name: 'findTemplates',
        description: "Finds templates by searching their titles.",
        parameters: {
            type: Type.OBJECT,
            properties: { query: { type: Type.STRING, description: "The text to search for within template titles." } },
            required: ['query']
        }
    },
    {
        name: 'createTemplateFromNote',
        description: "Creates a new template from the content and title of an existing note.",
        parameters: {
            type: Type.OBJECT,
            properties: { noteId: { type: Type.STRING, description: "The ID of the note to use for the template." } },
            required: ['noteId']
        }
    },
    {
        name: 'applyTemplateToNote',
        description: "Applies a template to an existing note, overwriting its title and content.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                templateId: { type: Type.STRING, description: "The ID of the template to apply." },
                noteId: { type: Type.STRING, description: "The ID of the note to apply the template to." }
            },
            required: ['templateId', 'noteId']
        }
    },
    {
        name: 'findAndReplaceInNotes',
        description: "Finds and replaces text within the content of all notes. This is a bulk operation.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                searchQuery: { type: Type.STRING, description: "The text to search for." },
                newText: { type: Type.STRING, description: "The text to replace the found text with." },
                caseSensitive: { type: Type.BOOLEAN, description: "Optional. Whether the search should be case-sensitive. Defaults to false." }
            },
            required: ['searchQuery', 'newText']
        }
    },
];