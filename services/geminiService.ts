import { Type, Chat, Part } from "@google/genai";
import { Note, InlineAction, SpellingError } from '../types';
import { MODEL_NAMES } from '../lib/config';
import { wesCoreToolDefinitions } from '../lib/toolDefinitions';
import { SYSTEM_INSTRUCTIONS } from '../lib/prompts';
import { callGemini, getGenAI, fireRateLimitEvent, safetySettings } from '../lib/aiClient';

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
    
    return callGemini(
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
    
    return callGemini(
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

    return callGemini(
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

    return callGemini(
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
    
    return callGemini(
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
            // Enable both function calling (for note ops) and Google Search (for web grounding)
            tools: [
                { functionDeclarations: wesCoreToolDefinitions },
                { googleSearch: {} }
            ],
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
    
    return callGemini(
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
    
    return callGemini(
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
    
    return callGemini(
        payload,
        {
            errorMessage: 'Error enhancing text:',
            processResponse: (res) => res.text.trim(),
            onError: () => { throw new Error(`Failed to enhance text with ${tone} tone.`); }
        }
    );
};