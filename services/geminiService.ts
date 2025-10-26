import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Type, FunctionDeclaration, Content, GenerateContentResponse, Chat, Part } from "@google/genai";
import { Note, ChatMessage, InlineAction, SpellingError } from '../types';
import { MODEL_NAMES } from '../lib/config';

const API_KEY_STORAGE_KEY = 'wesai-api-key';

// Cache for the GenAI instance to avoid re-creating it on every call.
let genAI: GoogleGenAI | null = null;
let cachedApiKey: string | null = null;

const getGenAI = (): GoogleGenAI => {
    let apiKey: string | null = null;
    try {
        apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    } catch (e) {
        console.error("Could not access localStorage for API key.", e);
    }
    
    if (!apiKey) {
        // Clear cached instance if API key is removed
        genAI = null;
        cachedApiKey = null;
        window.dispatchEvent(new CustomEvent('ai-rate-limit'));
        throw new Error("Gemini API key not found. Please set it in the settings.");
    }

    // If we have a cached instance and the key hasn't changed, return it.
    if (genAI && apiKey === cachedApiKey) {
        return genAI;
    }

    // Otherwise, create a new instance and cache it.
    genAI = new GoogleGenAI({ apiKey });
    cachedApiKey = apiKey;
    return genAI;
};

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const fireRateLimitEvent = (error: any) => {
    if (error?.message?.includes('429') || error?.message?.includes('API key not valid')) {
        window.dispatchEvent(new CustomEvent('ai-rate-limit'));
    }
};

/**
 * A centralized wrapper for making Gemini API calls to reduce boilerplate.
 * It handles getting the genAI instance, try/catch, error logging, and rate limit event firing.
 * @param apiCall The async function that makes the actual API call.
 * @param options Configuration for processing the response and handling errors.
 * @returns The processed response or the result of the error handler.
 */
async function _callGemini<T>(
    apiCall: (ai: GoogleGenAI) => Promise<any>,
    options: {
        errorMessage: string;
        processResponse: (response: any) => T;
        onError: () => T | never; // Can return a default value OR throw
    }
): Promise<T> {
    try {
        const ai = getGenAI();
        const response = await apiCall(ai);
        return options.processResponse(response);
    } catch (e) {
        console.error(options.errorMessage, e);
        fireRateLimitEvent(e);
        return options.onError();
    }
}


// --- Spellcheck ---
export const findMisspelledWords = async (text: string): Promise<SpellingError[]> => {
    if (!text.trim()) return [];
    return _callGemini(
        (ai) => ai.models.generateContent({
            model: MODEL_NAMES.FLASH,
            contents: `Analyze the following text and identify all misspelled words. For each misspelled word, provide its exact text, its starting index in the original text, and its length.
Text: "${text}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            word: { type: Type.STRING },
                            index: { type: Type.INTEGER },
                            length: { type: Type.INTEGER },
                        },
                        required: ["word", "index", "length"],
                    },
                },
            },
        }),
        {
            errorMessage: 'Error in findMisspelledWords:',
            processResponse: (res) => JSON.parse(res.text.trim()),
            onError: () => [] // Fail gracefully
        }
    );
};

export const getSpellingSuggestions = async (word: string): Promise<string[]> => {
    return _callGemini(
        (ai) => ai.models.generateContent({
            model: MODEL_NAMES.FLASH,
            contents: `Provide up to 5 spelling suggestions for the word "${word}".`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                },
            },
        }),
        {
            errorMessage: 'Error in getSpellingSuggestions:',
            processResponse: (res) => JSON.parse(res.text.trim()),
            onError: () => []
        }
    );
};


// --- Semantic Search ---
export const semanticSearchNotes = async (query: string, notes: Note[], limit: number = 5): Promise<string[]> => {
    if (notes.length === 0) return [];

    const notesContext = notes
        .filter(n => n.id)
        .map(note => `ID: ${note.id}\nTITLE: ${note.title}\nCONTENT: ${note.content.substring(0, 200)}...`)
        .join('\n---\n');

    return _callGemini(
        (ai) => ai.models.generateContent({
            model: MODEL_NAMES.FLASH,
            contents: `Based on the user's query, which of the following notes are the most relevant? List the top ${limit} most relevant note IDs.
QUERY: "${query}"

NOTES:
${notesContext}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    description: `An array of the top ${limit} most relevant note IDs.`,
                    items: { type: Type.STRING },
                },
            },
        }),
        {
            errorMessage: 'Error in semanticSearchNotes:',
            processResponse: (res) => JSON.parse(res.text.trim()),
            onError: () => { throw new Error("AI search failed. Please check your API key and try again."); }
        }
    );
};

// --- Note Actions ---
export const suggestNoteConsolidation = async (note1: Note, note2: Note): Promise<{ title: string, content: string }> => {
    return _callGemini(
        (ai) => ai.models.generateContent({
            model: MODEL_NAMES.FLASH,
            contents: `Consolidate the following two notes into a single, coherent note. Create a new title that synthesizes the topics, and merge the content, removing redundancy and improving flow.

Note 1 Title: "${note1.title}"
Note 1 Content:
${note1.content}

Note 2 Title: "${note2.title}"
Note 2 Content:
${note2.content}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.STRING },
                    },
                    required: ["title", "content"]
                },
            },
        }),
        {
            errorMessage: 'Error in suggestNoteConsolidation:',
            processResponse: (res) => JSON.parse(res.text.trim()),
            onError: () => { throw new Error("Failed to generate consolidation. Please try again."); }
        }
    );
};


// --- Chat ---
export const generateChatStream = async (
    query: string,
    systemInstruction: string,
    image?: string
) => {
    const userParts: Part[] = [{ text: query }];
    if (image) {
        userParts.push({
            inlineData: {
                mimeType: 'image/jpeg',
                data: image,
            },
        });
    }

    return _callGemini(
        (ai) => ai.models.generateContentStream({
            model: MODEL_NAMES.FLASH,
            contents: { role: 'user', parts: userParts },
            config: { systemInstruction, safetySettings },
        }),
        {
            errorMessage: 'Error getting streaming chat response:',
            processResponse: (stream) => stream, // Pass the stream through directly
            onError: () => { throw new Error("Failed to get streaming response. Please check your API key."); }
        }
    );
};

// --- General Chat with Tools ---
export const createGeneralChatSession = (): Chat => {
    const ai = getGenAI();

    const functionDeclarations: FunctionDeclaration[] = [
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

    return ai.chats.create({
        model: MODEL_NAMES.PRO,
        config: {
            systemInstruction: "You are a helpful assistant with access to a user's notes. You can create, find, read, update, and delete notes and folders. You can also manage templates by creating them from existing notes, finding templates, or applying them to notes. Additionally, you can perform bulk operations like finding and replacing text across multiple notes. You MUST use the provided tools to interact with the user's workspace.",
            tools: [{ functionDeclarations }],
            safetySettings,
        },
    });
};


// --- Editor AI Actions ---
export const suggestTags = async (title: string, content: string): Promise<string[]> => {
    return _callGemini(
        (ai) => ai.models.generateContent({
            model: MODEL_NAMES.FLASH,
            contents: `Suggest up to 5 relevant, single-word or two-word tags for the following note.
Title: ${title}
Content: ${content.substring(0, 500)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            },
        }),
        {
            errorMessage: 'Error suggesting tags:',
            processResponse: (res) => JSON.parse(res.text.trim()),
            onError: () => { throw new Error("Failed to suggest tags."); }
        }
    );
};

export const suggestTitle = async (content: string): Promise<string> => {
    return _callGemini(
        (ai) => ai.models.generateContent({
            model: MODEL_NAMES.FLASH,
            contents: `Suggest a concise, descriptive title for the following note content. The title should be no more than 10 words.
Content: ${content.substring(0, 1000)}`,
        }),
        {
            errorMessage: 'Error suggesting title:',
            processResponse: (res) => res.text.trim().replace(/["\.]/g, ''),
            onError: () => { throw new Error("Failed to suggest a title."); }
        }
    );
};

export const performInlineEdit = async (text: string, action: InlineAction): Promise<string> => {
    let instruction = '';
    switch(action) {
        case 'fix': instruction = 'Fix spelling and grammar mistakes in the following text:'; break;
        case 'shorten': instruction = 'Make the following text more concise:'; break;
        case 'expand': instruction = 'Expand on the following text, making it more detailed:'; break;
        case 'simplify': instruction = 'Simplify the language of the following text:'; break;
        case 'makeProfessional': instruction = 'Rewrite the following text in a professional tone:'; break;
        case 'makeCasual': instruction = 'Rewrite the following text in a casual tone:'; break;
    }

    return _callGemini(
        (ai) => ai.models.generateContent({
            model: MODEL_NAMES.FLASH,
            contents: `${instruction}\n\n"${text}"`,
            config: {
                safetySettings,
            },
        }),
        {
            errorMessage: `Error performing inline edit action "${action}":`,
            processResponse: (res) => res.text.trim(),
            onError: () => { throw new Error(`AI action "${action}" failed.`); }
        }
    );
};

export const summarizeAndExtractActions = async (content: string): Promise<{ summary: string; actionItems: string[] }> => {
    return _callGemini(
        (ai) => ai.models.generateContent({
            model: MODEL_NAMES.FLASH,
            contents: `Summarize the following note and extract a list of action items.
Note:
${content}`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ["summary", "actionItems"]
                },
            },
        }),
        {
            errorMessage: 'Error in summarizeAndExtractActions:',
            processResponse: (res) => JSON.parse(res.text.trim()),
            onError: () => { throw new Error("Failed to summarize and find actions."); }
        }
    );
};


export const enhanceText = async (text: string, tone: string): Promise<string> => {
    return _callGemini(
        (ai) => ai.models.generateContent({
            model: MODEL_NAMES.FLASH,
            contents: `Rewrite the following text to have a ${tone} tone:\n\n"${text}"`,
            config: {
                safetySettings,
            },
        }),
        {
            errorMessage: 'Error enhancing text:',
            processResponse: (res) => res.text.trim(),
            onError: () => { throw new Error(`Failed to enhance text with ${tone} tone.`); }
        }
    );
};
