import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Type, FunctionDeclaration, Content, GenerateContentResponse, Chat, Part, GenerationConfig } from "@google/genai";
import { Note, ChatMessage, InlineAction, SpellingError } from '../types';
import { MODEL_NAMES, API_KEY_STORAGE_KEY } from '../lib/config';
import { sha256, getLocalCache, setLocalCache } from '../lib/cache';
import { supabase } from '../lib/supabaseClient';
import { wesCoreToolDefinitions } from '../lib/toolDefinitions';
import { SYSTEM_INSTRUCTIONS } from '../lib/prompts';

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
    if (error instanceof Error && (error.message.includes('429') || error.message.includes('API key not valid'))) {
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
        response = await ai.models.generateContent({ model, contents: normalizedContents, config: {...config, safetySettings } });
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
        contents: SYSTEM_INSTRUCTIONS.SPELLCHECK(text),
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
                    throw new Error("AI returned invalid data format.");
                }
            },
            onError: () => { throw new Error("Failed to find misspelled words."); }
        }
    );
};

export const getSpellingSuggestions = async (word: string): Promise<string[]> => {
    const payload = {
        model: MODEL_NAMES.FLASH,
        contents: SYSTEM_INSTRUCTIONS.SPELLING_SUGGESTIONS(word),
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
                    throw new Error("AI returned invalid data format.");
                }
            },
            onError: () => { throw new Error("Failed to get spelling suggestions."); }
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

    const prompt = SYSTEM_INSTRUCTIONS.SEMANTIC_SEARCH(limit, notesContext).replace('{{query}}', query);

    const payload = {
        model: MODEL_NAMES.FLASH,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                description: `An array of the top ${limit} most relevant note IDs.`,
                items: { type: Type.STRING },
            },
        },
    };

    return _callGemini(
        payload,
        {
            errorMessage: 'Error in semanticSearchNotes:',
            processResponse: (res) => {
                try {
                    return JSON.parse(res.text.trim());
                } catch (e) {
                    console.error('Failed to parse JSON in semanticSearchNotes:', e, res.text);
                    throw new Error("AI search returned invalid data format.");
                }
            },
            onError: () => {
                throw new Error("AI search failed. Please check your API key and try again.");
            },
            bypassCache: true
        }
    );
};

// --- Note Actions ---
export const suggestNoteConsolidation = async (note1: Note, note2: Note): Promise<{ title: string, content: string }> => {
    const payload = {
        model: MODEL_NAMES.FLASH,
        contents: SYSTEM_INSTRUCTIONS.NOTE_CONSOLIDATION(note1, note2),
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
        contents: SYSTEM_INSTRUCTIONS.TITLE_AND_TAGS(content),
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

    return ai.chats.create({
        model: MODEL_NAMES.PRO,
        config: {
            systemInstruction: SYSTEM_INSTRUCTIONS.GENERAL_CHAT_TOOLS,
            tools: [{ functionDeclarations: wesCoreToolDefinitions }],
            safetySettings,
        },
    });
};


// --- Editor AI Actions ---
export const suggestTags = async (title: string, content: string): Promise<string[]> => {
    const payload = {
        model: MODEL_NAMES.FLASH,
        contents: SYSTEM_INSTRUCTIONS.SUGGEST_TAGS(title, content),
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
        contents: SYSTEM_INSTRUCTIONS.SUGGEST_TITLE(content),
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
        contents: SYSTEM_INSTRUCTIONS.INLINE_EDIT(instruction, text),
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
        contents: SYSTEM_INSTRUCTIONS.SUMMARIZE(content),
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
        contents: SYSTEM_INSTRUCTIONS.ENHANCE_TEXT(tone, text),
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