
import { Type, Chat, Part } from "@google/genai";
import { Note, InlineAction, SpellingError } from '../types';
import { MODEL_NAMES } from '../lib/config';
import { wesCoreToolDefinitions } from '../lib/toolDefinitions';
import { SYSTEM_INSTRUCTIONS } from '../lib/prompts';
import { callGemini, getGenAI, fireRateLimitEvent, safetySettings } from '../lib/aiClient';

// --- Internal Helper: Standardized JSON Caller ---
// This acts as a factory for AI JSON requests, enforcing type safety and consistent parsing.
async function callAiForJson<T>(
    prompt: string | Part | (string | Part)[],
    schemaType: any, // GenAI Schema
    contextLabel: string,
    responseSchemaDescription?: string
): Promise<T> {
    const payload = {
        model: MODEL_NAMES.FLASH,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                ...schemaType,
                description: responseSchemaDescription
            },
        },
    };

    return callGemini(
        payload,
        {
            errorMessage: `Error generating ${contextLabel}:`,
            processResponse: (res) => {
                try {
                    return JSON.parse(res.text.trim()) as T;
                } catch (e) {
                    console.error(`Failed to parse JSON for ${contextLabel}:`, e, res.text);
                    throw new Error("AI returned invalid data format.");
                }
            },
            onError: () => { throw new Error(`Failed to generate ${contextLabel}.`); }
        }
    );
}

// --- Spellcheck ---
export const findMisspelledWords = async (text: string): Promise<SpellingError[]> => {
    if (!text.trim()) return [];
    
    return callAiForJson<SpellingError[]>(
        SYSTEM_INSTRUCTIONS.SPELLCHECK(text),
        {
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
        'misspelled words'
    );
};

export const getSpellingSuggestions = async (word: string): Promise<string[]> => {
    return callAiForJson<string[]>(
        SYSTEM_INSTRUCTIONS.SPELLING_SUGGESTIONS(word),
        {
            type: Type.ARRAY,
            items: { type: Type.STRING },
        },
        'spelling suggestions'
    );
};


// --- Semantic Search ---
export const semanticSearchNotes = async (query: string, notes: Note[], limit: number = 5): Promise<string[]> => {
    if (notes.length === 0) return [];

    const notesContext = notes
        .filter(n => n.id)
        .map(note => `ID: ${note.id}\nTITLE: ${note.title}\nCONTENT: ${note.content.substring(0, 200)}...`)
        .join('\n---\n');

    const prompt = SYSTEM_INSTRUCTIONS.SEMANTIC_SEARCH(limit, notesContext).replace('{{query}}', query);

    // Note: We deliberately bypass cache for search to ensure it feels "live" if the user just edited a note.
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

    return callGemini(
        payload,
        {
            errorMessage: 'Error in semanticSearchNotes:',
            processResponse: (res) => JSON.parse(res.text.trim()),
            onError: () => {
                throw new Error("AI search failed. Please check your API key and try again.");
            },
            bypassCache: true
        }
    );
};

// --- Note Actions ---
export const suggestNoteConsolidation = async (note1: Note, note2: Note): Promise<{ title: string, content: string }> => {
    return callAiForJson<{ title: string, content: string }>(
        SYSTEM_INSTRUCTIONS.NOTE_CONSOLIDATION(note1, note2),
        {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
            },
            required: ["title", "content"]
        },
        'note consolidation'
    );
};

export const suggestTitleAndTags = async (content: string): Promise<{ title: string, tags: string[] }> => {
    const result = await callAiForJson<{ title: string, tags: string[] }>(
        SYSTEM_INSTRUCTIONS.TITLE_AND_TAGS(content),
        {
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
        },
        'title and tags'
    );
    
    if (result.title) {
        result.title = result.title.replace(/["\.]/g, '');
    }
    return result;
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
            // Enable function calling (for note ops). 
            // IMPORTANT: googleSearch is deliberately removed here because mixing 
            // functionDeclarations and googleSearch in the same request causes a 400 error.
            tools: [
                { functionDeclarations: wesCoreToolDefinitions },
            ],
            safetySettings,
        },
    });
};


// --- Editor AI Actions ---
export const suggestTags = async (title: string, content: string): Promise<string[]> => {
    return callAiForJson<string[]>(
        SYSTEM_INSTRUCTIONS.SUGGEST_TAGS(title, content),
        {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        },
        'tags'
    );
};

export const suggestTitle = async (content: string): Promise<string> => {
    const payload = {
        model: MODEL_NAMES.FLASH,
        contents: SYSTEM_INSTRUCTIONS.SUGGEST_TITLE(content),
    };

    return callGemini(
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

    return callGemini(
        payload,
        {
            errorMessage: `Error performing inline edit action "${action}":`,
            processResponse: (res) => res.text.trim(),
            onError: () => { throw new Error(`AI action "${action}" failed.`); }
        }
    );
};

export const summarizeAndExtractActions = async (content: string): Promise<{ summary: string; actionItems: string[] }> => {
    return callAiForJson<{ summary: string; actionItems: string[] }>(
        SYSTEM_INSTRUCTIONS.SUMMARIZE(content),
        {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["summary", "actionItems"]
        },
        'summary and actions'
    );
};


export const enhanceText = async (text: string, tone: string): Promise<string> => {
    const payload = {
        model: MODEL_NAMES.FLASH,
        contents: SYSTEM_INSTRUCTIONS.ENHANCE_TEXT(tone, text),
    };
    
    return callGemini(
        payload,
        {
            errorMessage: 'Error enhancing text:',
            processResponse: (res) => res.text.trim(),
            onError: () => { throw new Error(`Failed to enhance text with ${tone} tone.`); }
        }
    );
};
