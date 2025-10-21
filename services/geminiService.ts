import { GoogleGenAI, Type } from "@google/genai";
import { Note, SpellingError } from "../types";

export type InlineAction = 'fix' | 'shorten' | 'expand' | 'simplify' | 'makeProfessional' | 'makeCasual';

const API_KEY_STORAGE_KEY = 'wesai-api-key';

// Helper to safely parse JSON responses, even when wrapped in markdown code blocks
function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
    if (!jsonString) {
        return defaultValue;
    }
    try {
        // Gemini sometimes returns JSON wrapped in markdown ```json ... ```
        const cleanedString = jsonString.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        return JSON.parse(cleanedString) as T;
    } catch (error) {
        console.warn("Failed to parse JSON string after cleaning:", { original: jsonString }, error);
        return defaultValue;
    }
}

const getApiKey = (): string | undefined => {
    try {
        const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
        // Use storedKey if it exists, otherwise fallback to environment variable
        return storedKey || process.env.API_KEY;
    } catch {
        // If localStorage fails for any reason, fallback to env var
        return process.env.API_KEY;
    }
}

const getAi = () => {
    const key = getApiKey();
    if (!key) {
        throw new Error("API key is not configured. Please add it in the settings.");
    }
    return new GoogleGenAI({ apiKey: key });
};


const handleGeminiError = (error: unknown, context: string): Error => {
    console.error(`Error in ${context}:`, error);
    if (error instanceof Error) {
        if (error.message.includes("API key is not configured")) {
            return new Error("Your API key is missing. Please add it in the settings to use AI features.");
        }
        if (error.message.includes('429') || error.message.toLowerCase().includes('quota')) {
            window.dispatchEvent(new CustomEvent('ai-rate-limit'));
            return new Error("You've exceeded your API quota. Please check your plan and billing details at ai.google.dev. Features will resume shortly.");
        }
        if (error.message.includes('fetch failed')) {
            return new Error("Network error. Please check your connection and try again.");
        }
        return new Error(`An AI error occurred. Please try again later.`);
    }
    return new Error(`An unknown error occurred during ${context}.`);
};


export const performInlineEdit = async (text: string, action: InlineAction): Promise<string> => {
    if (!text) return "";

    let instruction = '';
    switch (action) {
        case 'fix':
            instruction = 'Fix all spelling and grammar errors in the following text.';
            break;
        case 'shorten':
            instruction = 'Make the following text more concise and to the point.';
            break;
        case 'expand':
            instruction = 'Expand on the following text, adding more detail and explanation.';
            break;
        case 'simplify':
            instruction = 'Rewrite the following text using simpler language that a 5th grader could understand.';
            break;
        case 'makeProfessional':
            instruction = 'Rewrite the following text with a formal, professional tone.';
            break;
        case 'makeCasual':
            instruction = 'Rewrite the following text with a more casual, conversational tone.';
            break;
        default:
            throw new Error('Unknown inline edit action.');
    }

    const prompt = `${instruction} Only return the modified text, without any additional commentary, introductory phrases, or markdown formatting.\n\nTEXT: """${text}"""`;

    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        throw handleGeminiError(error, `inline edit (${action})`);
    }
};

export const enhanceText = async (text: string, tone: string): Promise<string> => {
    if (!text) {
        return "";
    }

    try {
        const ai = getAi();

        const prompt = tone === 'Custom' 
            ? `Rewrite the following text. Do not add any extra commentary, just provide the rewritten text:\n\n${text}`
            : `Rewrite the following text with a ${tone} tone. Do not add any extra commentary, just provide the rewritten text:\n\n${text}`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        throw handleGeminiError(error, "text enhancement");
    }
};


export const summarizeAndExtractActions = async (text: string): Promise<{ summary: string; actionItems: string[] }> => {
    if (!text) {
        return { summary: '', actionItems: [] };
    }

    try {
        const ai = getAi();

        const schema = {
            type: Type.OBJECT,
            properties: {
                summary: {
                    type: Type.STRING,
                    description: 'A concise summary of the text, capturing the main points.',
                },
                actionItems: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING,
                    },
                    description: 'A list of clear, actionable tasks or to-do items found in the text. If none are found, this should be an empty array.',
                },
            },
            required: ['summary', 'actionItems'],
        };

        const prompt = `Summarize the following text and extract any potential action items or tasks. If no action items are found, return an empty array for actionItems. Here is the text:\n\n${text}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });

        const responseText = response.text.trim();
        const result = safeJsonParse(responseText, { summary: '', actionItems: [] });
        
        // If parsing was successful but yielded an empty object, and the original response was not empty, it's likely a content filter issue.
        if (!result.summary && (!result.actionItems || result.actionItems.length === 0) && responseText) {
             throw new Error("The AI returned an empty or invalid response. This might be due to content filtering.");
        }

        return result;

    } catch (error) {
        throw handleGeminiError(error, "summarization");
    }
};

export const semanticSearchNotes = async (query: string, notes: Note[]): Promise<string[]> => {
    if (!query) {
        return notes.map(n => n.id);
    }
    if (notes.length === 0) {
        return [];
    }

    try {
        const ai = getAi();

        const simplifiedNotes = notes.map(({ id, title, content, tags }) => ({
            id,
            title,
            content: content.substring(0, 4000), // Truncate content to manage context size
            tags,
        }));

        const schema = {
            type: Type.OBJECT,
            properties: {
                relevantNoteIds: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING,
                    },
                    description: 'An array of note IDs that are semantically relevant to the user\'s query, ordered from most to least relevant.',
                }
            },
            required: ['relevantNoteIds']
        };

        const prompt = `You are a semantic search engine for a note-taking app. A user is searching for: "${query}".

Analyze the user's query and the following list of notes. Identify the notes that are most semantically relevant, even if they don't contain the exact keywords. Consider the title, content, and tags.

Return a JSON object containing a single key "relevantNoteIds", which is an array of the ID strings of the relevant notes, ordered by relevance. If no notes are relevant, return an empty array.

Here are the notes:
${JSON.stringify(simplifiedNotes)}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });
        
        const responseText = response.text.trim();
        const result = safeJsonParse(responseText, { relevantNoteIds: [] });
        return result.relevantNoteIds || [];

    } catch (error) {
        throw handleGeminiError(error, "semantic search");
    }
};

export const suggestTags = async (title: string, content: string): Promise<string[]> => {
    if (!content) {
        return [];
    }

    try {
        const ai = getAi();

        const schema = {
            type: Type.OBJECT,
            properties: {
                tags: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING,
                    },
                    description: 'An array of 3 to 5 relevant tags for the note. Tags should be concise, lowercase, and either single-word or kebab-case (e.g., "project-planning").',
                },
            },
            required: ['tags'],
        };

        const prompt = `You are an expert at organizing information. Analyze the following note (title and content) and suggest 3 to 5 relevant tags to help categorize it. The tags should be concise, lowercase, and ideally single-word or in kebab-case.

Note Title: "${title}"

Note Content:
"${content.substring(0, 4000)}"

Return a JSON object with a single key "tags" containing an array of your suggested tag strings.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });

        const responseText = response.text.trim();
        const result = safeJsonParse(responseText, { tags: [] });
        return result.tags || [];

    } catch (error) {
        throw handleGeminiError(error, "tag suggestion");
    }
};

export const suggestTitle = async (content: string): Promise<string> => {
    if (!content) {
        return "";
    }

    try {
        const ai = getAi();

        const prompt = `You are an expert at writing concise and descriptive titles. Analyze the following note content and suggest a single, short title for it (under 10 words). Do not add any extra commentary, quotation marks, or prefixes like "Title:". Just provide the title text.

Note Content:
"${content.substring(0, 4000)}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        // Trim whitespace and remove any surrounding quotes that the model might add
        return response.text.trim().replace(/^"|"$/g, '');

    } catch (error) {
        throw handleGeminiError(error, "title suggestion");
    }
};


export const askAboutNotes = async (query: string, notes: Note[]): Promise<{ answer: string; sourceNoteIds: string[] }> => {
    if (!query) {
        return { answer: "Please ask a question.", sourceNoteIds: [] };
    }
    if (notes.length === 0) {
        return { answer: "You don't have any notes for me to search through yet.", sourceNoteIds: [] };
    }

    try {
        const ai = getAi();

        const simplifiedNotes = notes.map(({ id, title, content, tags }) => ({
            id,
            title,
            content: content.substring(0, 2000), // Truncate content
            tags,
        }));

        const schema = {
            type: Type.OBJECT,
            properties: {
                answer: {
                    type: Type.STRING,
                    description: 'A comprehensive, synthesized answer to the user\'s query based *only* on the provided notes. The answer should be in well-formatted Markdown.',
                },
                sourceNoteIds: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING,
                    },
                    description: 'An array of note IDs that were used as sources to construct the answer. Only include notes that were directly referenced.',
                }
            },
            required: ['answer', 'sourceNoteIds']
        };

        const prompt = `You are an AI assistant for a note-taking app. Your task is to answer the user's question based *exclusively* on the content of the notes provided below.

User's Question: "${query}"

Instructions:
1.  Read all the provided notes carefully.
2.  Synthesize a single, coherent answer to the user's question.
3.  If the notes don't contain relevant information, say so. Do not invent information.
4.  Identify the specific notes you used to formulate your answer.
5.  Return a JSON object containing your markdown-formatted answer and an array of the source note IDs.

Here are the notes:
${JSON.stringify(simplifiedNotes)}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });
        
        const responseText = response.text.trim();
        const result = safeJsonParse<{ answer: string; sourceNoteIds: string[] } | null>(responseText, null);
        
        if (!result) {
            return { answer: "Sorry, I received an invalid response from the AI. This can happen due to content safety filters. Please try rephrasing your question.", sourceNoteIds: [] };
        }
        return result;

    } catch (error) {
        throw handleGeminiError(error, "AI chat");
    }
};

export const findMisspelledWords = async (text: string): Promise<SpellingError[]> => {
    if (!text || text.trim().length < 2) {
        return [];
    }

    try {
        const ai = getAi();
        const schema = {
            type: Type.OBJECT,
            properties: {
                errors: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            word: { type: Type.STRING, description: 'The misspelled word.' },
                            index: { type: Type.INTEGER, description: 'The starting index of the word in the text.' },
                            length: { type: Type.INTEGER, description: 'The length of the misspelled word.' },
                        },
                        required: ['word', 'index', 'length']
                    },
                    description: 'An array of identified spelling errors.'
                }
            },
            required: ['errors']
        };

        const prompt = `Analyze the following text and identify any misspelled English words. For each misspelled word, provide the word itself, its starting index in the original text, and its length. Do not flag proper nouns or technical terms that are correctly spelled.

TEXT: """${text}"""`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });

        const responseText = response.text.trim();
        const result = safeJsonParse(responseText, { errors: [] });
        return result.errors || [];
    } catch (error) {
        if (error instanceof Error && (error.message.includes('429') || error.message.toLowerCase().includes('quota'))) {
            console.warn("Spell check skipped due to rate limiting.");
        } else {
            console.error("Error finding misspelled words:", error);
        }
        // Don't throw an error to the user for a background task, just return empty
        return [];
    }
};

export const getSpellingSuggestions = async (word: string): Promise<string[]> => {
    if (!word) return [];

    try {
        const ai = getAi();
        const schema = {
            type: Type.OBJECT,
            properties: {
                suggestions: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'An array of up to 5 correct spelling suggestions for the word.'
                }
            },
            required: ['suggestions']
        };

        const prompt = `Provide up to 5 correct spelling suggestions for the misspelled word: "${word}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });

        const responseText = response.text.trim();
        const result = safeJsonParse(responseText, { suggestions: [] });
        return result.suggestions || [];
    } catch (error) {
        throw handleGeminiError(error, "spelling suggestions");
    }
};