

import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Type, FunctionDeclaration, Content, GenerateContentResponse, Chat, Part, GenerationConfig } from "@google/genai";
import { Note, ChatMessage, InlineAction, SpellingError } from '../types';
import { MODEL_NAMES } from '../lib/config';
import { sha256, getLocalCache, setLocalCache } from '../lib/cache';
import { supabase } from '../lib/supabaseClient';

const API_KEY_STORAGE_KEY = 'wesai-api-key';

// Cache for the GenAI instance to avoid re-creating it on every call.
let genAI: GoogleGenAI | null = null;
let cachedApiKey: string | null = null;

/**
 * Normalizes the 'contents' part of a Gemini request by trimming whitespace 
 * from any text parts. This increases cache hits for semantically identical prompts.
 */
function normalizeContents(contents: string | Part | (string | Part)[]): string | Part | (string | Part)[] {
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
function sortObjectKeys(obj: any): any {
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
 * A centralized wrapper for making Gemini API calls, now with a two-tiered caching system.
 * It handles caching, getting the genAI instance, try/catch, error logging, and rate limit events.
 * Crucially, it now separates API call errors from response processing errors to prevent cache poisoning.
 */
async function _callGemini<T>(
    payload: {
        model: string;
        contents: string | Part | (string | Part)[];
        config?: GenerationConfig;
    },
    processingOptions: {
        errorMessage: string;
        processResponse: (response: GenerateContentResponse) => T;
        onError: () => T | never;
        bypassCache?: boolean;
    }
): Promise<T> {
    const { model, contents, config } = payload;
    const { bypassCache = false } = processingOptions;

    const normalizedContents = normalizeContents(contents);

    // 1. Create a stable hash for the request by sorting keys before stringifying.
    const requestPayload = { model, contents: normalizedContents, config };
    const sortedPayload = sortObjectKeys(requestPayload);
    const promptString = JSON.stringify(sortedPayload);
    const hash = await sha256(promptString);

    // 2. Check Level 1: Local Cache (fastest)
    if (!bypassCache) {
        const localData = getLocalCache(hash);
        if (localData !== null) {
            return localData as T;
        }
    }

    // 3. Check Level 2: Supabase Persistent Cache
    if (!bypassCache) {
        const { data: dbCache, error: dbError } = await supabase
            .from('ai_cache')
            .select('response')
            .eq('prompt_hash', hash)
            .single();
        
        if (dbCache && !dbError) {
            const dbData = dbCache.response as T;
            setLocalCache(hash, dbData); // Populate L1 cache
            return dbData;
        }
    }

    // 4. Cache Miss: Call the Gemini API
    let response: GenerateContentResponse;
    try {
        const ai = getGenAI();
        response = await ai.models.generateContent({ model, contents: normalizedContents, config });
    } catch (e) {
        console.error(`API call error: ${processingOptions.errorMessage}`, e);
        fireRateLimitEvent(e);
        return processingOptions.onError();
    }

    // 5. Process the response. If this fails, we DO NOT cache the result.
    try {
        const processedData = processingOptions.processResponse(response);

        // 6. Save to both caches for future requests
        setLocalCache(hash, processedData);
        // Fire-and-forget insertion to Supabase. Don't block the UI.
        supabase.from('ai_cache').insert({
            prompt_hash: hash,
            prompt: promptString, // Store full context for analytics/debugging
            response: processedData as any, // Cast to any for JSONB compatibility
            model,
        }).then(({ error }) => {
            if (error && error.code !== '23505') { // Ignore unique constraint violations
                console.warn("Supabase cache insertion failed:", error);
            }
        });

        return processedData;
    } catch (e) {
        console.error(`Processing error: ${processingOptions.errorMessage}`, e);
        // Do not fire rate limit event; API call was successful.
        return processingOptions.onError();
    }
}


// --- Spellcheck ---
export const findMisspelledWords = async (text: string): Promise<SpellingError[]> => {
    if (!text.trim()) return [];
    
    const payload = {
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
    };
    
    return _callGemini(
        payload,
        {
            errorMessage: 'Error in findMisspelledWords:',
            processResponse: (res) => {
                try {
                    return JSON.parse(res.text.trim());
                } catch (e) {
                    console.error('Failed to parse JSON for misspelled words:', e, res.text);
                    throw e; // Re-throw to prevent caching a bad result
                }
            },
            onError: () => [] // Fail gracefully in the UI
        }
    );
};

export const getSpellingSuggestions = async (word: string): Promise<string[]> => {
    const payload = {
        model: MODEL_NAMES.FLASH,
        contents: `Provide up to 5 spelling suggestions for the word "${word}".`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
            },
        },
    };
    
    return _callGemini(
        payload,
        {
            errorMessage: 'Error in getSpellingSuggestions:',
            processResponse: (res) => {
                try {
                    return JSON.parse(res.text.trim());
                } catch (e) {
                    console.error('Failed to parse JSON for spelling suggestions:', e, res.text);
                    throw e; // Re-throw to prevent caching a bad result
                }
            },
            onError: () => []
        }
    );
};


// --- Semantic Search ---
// Semantic search should not be cached as it depends on the entire (and changing) notes corpus.
export const semanticSearchNotes = async (query: string, notes: Note[], limit: number = 5): Promise<string[]> => {
    if (notes.length === 0) return [];

    const notesContext = notes
        .filter(n => n.id)
        .map(note => `ID: ${note.id}\nTITLE: ${note.title}\nCONTENT: ${note.content.substring(0, 200)}...`)
        .join('\n---\n');

    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
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
        });
        try {
            return JSON.parse(response.text.trim());
        } catch (parseError) {
             console.error('Failed to parse JSON in semanticSearchNotes:', parseError, response.text);
             throw new Error("AI search returned invalid data format.");
        }
    } catch (e) {
        console.error('Error in semanticSearchNotes:', e);
        fireRateLimitEvent(e);
        throw new Error("AI search failed. Please check your API key and try again.");
    }
};

// --- Note Actions ---
export const suggestNoteConsolidation = async (note1: Note, note2: Note): Promise<{ title: string, content: string }> => {
    const payload = {
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
    };

    return _callGemini(
        payload,
        {
            errorMessage: 'Error in suggestNoteConsolidation:',
            processResponse: (res) => {
                try {
                    return JSON.parse(res.text.trim());
                } catch(e) {
                    console.error('Failed to parse JSON for note consolidation:', e, res.text);
                    throw new Error("AI returned invalid data format.");
                }
            },
            onError: () => { throw new Error("Failed to generate consolidation. Please try again."); }
        }
    );
};

export const suggestTitleAndTags = async (content: string): Promise<{ title: string, tags: string[] }> => {
    const payload = {
        model: MODEL_NAMES.FLASH,
        contents: `Analyze the following note content. Suggest a concise, descriptive title (no more than 10 words) and up to 5 relevant, single-word or two-word tags.
Content: ${content.substring(0, 1000)}`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { 
                        type: Type.STRING,
                        description: "A concise, descriptive title, no more than 10 words."
                    },
                    tags: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Up to 5 relevant, single-word or two-word tags."
                    }
                },
                required: ["title", "tags"]
            }
        },
    };
    
    return _callGemini(
        payload,
        {
            errorMessage: 'Error suggesting title and tags:',
            processResponse: (res) => {
                try {
                    const result = JSON.parse(res.text.trim());
                    if (result.title) {
                        result.title = result.title.replace(/["\.]/g, '');
                    }
                    return result;
                } catch(e) {
                    console.error('Failed to parse JSON for title/tags:', e, res.text);
                    throw new Error("AI returned invalid data format.");
                }
            },
            onError: () => { throw new Error("Failed to suggest title and tags."); }
        }
    );
};


// --- Chat (Streaming - Bypasses Caching) ---
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

    try {
        const ai = getGenAI();
        return await ai.models.generateContentStream({
            model: MODEL_NAMES.FLASH,
            contents: { role: 'user', parts: userParts },
            config: { systemInstruction, safetySettings },
        });
    } catch (e) {
        console.error('Error getting streaming chat response:', e);
        fireRateLimitEvent(e);
        throw new Error("Failed to get streaming response. Please check your API key.");
    }
};

// --- General Chat with Tools (Bypasses Caching) ---
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
            systemInstruction: "You are a helpful assistant with access to a user's notes. You can create, find, read, update, and delete notes and folders. You can also manage templates by creating them from existing notes, finding templates, or applying them to notes. Additionally, you can perform bulk operations like finding and replacing text across multiple notes. You MUST use the provided tools to interact with the user's workspace. If you receive a tool response with `{ success: false, error: '...' }`, you MUST NOT retry the same command. Instead, you MUST inform the user of the specific error message and ask them for clarification or a different command.",
            tools: [{ functionDeclarations }],
            safetySettings,
        },
    });
};


// --- Editor AI Actions ---
export const suggestTags = async (title: string, content: string): Promise<string[]> => {
    const payload = {
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
    };
    
    return _callGemini(
        payload,
        {
            errorMessage: 'Error suggesting tags:',
            processResponse: (res) => {
                try {
                    return JSON.parse(res.text.trim());
                } catch(e) {
                    console.error('Failed to parse JSON for tags:', e, res.text);
                    throw new Error("AI returned invalid data format.");
                }
            },
            onError: () => { throw new Error("Failed to suggest tags."); }
        }
    );
};

export const suggestTitle = async (content: string): Promise<string> => {
    const payload = {
        model: MODEL_NAMES.FLASH,
        contents: `Suggest a concise, descriptive title for the following note content. The title should be no more than 10 words.
Content: ${content.substring(0, 1000)}`,
    };

    return _callGemini(
        payload,
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
    
    const payload = {
        model: MODEL_NAMES.FLASH,
        contents: `${instruction}\n\n"${text}"`,
        config: {
            safetySettings,
        },
    };

    return _callGemini(
        payload,
        {
            errorMessage: `Error performing inline edit action "${action}":`,
            processResponse: (res) => res.text.trim(),
            onError: () => { throw new Error(`AI action "${action}" failed.`); }
        }
    );
};

export const summarizeAndExtractActions = async (content: string): Promise<{ summary: string; actionItems: string[] }> => {
    const payload = {
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
    };
    
    return _callGemini(
        payload,
        {
            errorMessage: 'Error in summarizeAndExtractActions:',
            processResponse: (res) => {
                try {
                    return JSON.parse(res.text.trim());
                } catch(e) {
                    console.error('Failed to parse JSON for summary:', e, res.text);
                    throw new Error("AI returned invalid data format.");
                }
            },
            onError: () => { throw new Error("Failed to summarize and find actions."); }
        }
    );
};


export const enhanceText = async (text: string, tone: string): Promise<string> => {
    const payload = {
        model: MODEL_NAMES.FLASH,
        contents: `Rewrite the following text to have a ${tone} tone:\n\n"${text}"`,
        config: {
            safetySettings,
        },
    };
    
    return _callGemini(
        payload,
        {
            errorMessage: 'Error enhancing text:',
            processResponse: (res) => res.text.trim(),
            onError: () => { throw new Error(`Failed to enhance text with ${tone} tone.`); }
        }
    );
};