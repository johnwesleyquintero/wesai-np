
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Type, FunctionDeclaration, Content, GenerateContentResponse, Chat, Part } from "@google/genai";
import { Note, ChatMessage, InlineAction, SpellingError } from '../types';

const API_KEY_STORAGE_KEY = 'wesai-api-key';

const getGenAI = (): GoogleGenAI => {
    let apiKey: string | null = null;
    try {
        apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    } catch (e) {
        console.error("Could not access localStorage for API key.", e);
    }
    
    if (!apiKey) {
        window.dispatchEvent(new CustomEvent('ai-rate-limit'));
        throw new Error("Gemini API key not found. Please set it in the settings.");
    }
    return new GoogleGenAI({ apiKey });
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

// --- Spellcheck ---
export const findMisspelledWords = async (text: string): Promise<SpellingError[]> => {
    if (!text.trim()) return [];
    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as SpellingError[];
    } catch (e) {
        console.error("Error in findMisspelledWords:", e);
        fireRateLimitEvent(e);
        return []; // Fail gracefully
    }
};

export const getSpellingSuggestions = async (word: string): Promise<string[]> => {
    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Provide up to 5 spelling suggestions for the word "${word}".`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                },
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as string[];
    } catch (e) {
        console.error("Error in getSpellingSuggestions:", e);
        fireRateLimitEvent(e);
        return [];
    }
};


// --- Semantic Search ---
export const semanticSearchNotes = async (query: string, notes: Note[], limit: number = 5): Promise<string[]> => {
    if (notes.length === 0) return [];
    try {
        const ai = getGenAI();
        const notesContext = notes
            .filter(n => n.id)
            .map(note => `ID: ${note.id}\nTITLE: ${note.title}\nCONTENT: ${note.content.substring(0, 200)}...`)
            .join('\n---\n');

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Error in semanticSearchNotes:", e);
        fireRateLimitEvent(e);
        throw new Error("AI search failed. Please check your API key and try again.");
    }
};

// --- Note Actions ---
export const suggestNoteConsolidation = async (note1: Note, note2: Note): Promise<{ title: string, content: string }> => {
    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Error in suggestNoteConsolidation:", e);
        fireRateLimitEvent(e);
        throw new Error("Failed to generate consolidation. Please try again.");
    }
};


// --- Chat ---
const buildChatContext = (sourceNotes: Note[]): Content => {
    return {
        role: 'system',
        parts: [{
            text: `You are a helpful AI assistant integrated into a note-taking app. Use the provided "Source Notes" to answer the user's query. If the sources are relevant, synthesize them in your answer. If they are not relevant, ignore them. Be concise and helpful.

Source Notes:
${sourceNotes.length > 0 ? sourceNotes.map(n => `--- NOTE: ${n.title} ---\n${n.content}\n`).join('') : 'No source notes provided.'}`
        }]
    };
};

export const getStreamingChatResponse = async (query: string, sourceNotes: Note[], image?: string) => {
    try {
        const ai = getGenAI();

        const contents: Content[] = [buildChatContext(sourceNotes)];
        const userParts: Part[] = [{ text: query }];
        if (image) {
            userParts.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: image,
                },
            });
        }
        contents.push({ role: 'user', parts: userParts });

        return ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents,
            safetySettings,
        });

    } catch (e) {
        console.error("Error getting streaming chat response:", e);
        fireRateLimitEvent(e);
        throw new Error("Failed to get streaming response. Please check your API key.");
    }
};

export const generateCustomerResponse = async (customerQuery: string, sourceNotes: Note[], image?: string): Promise<string> => {
     try {
        const ai = getGenAI();
        const systemInstruction = `You are a professional and empathetic customer service agent. Your goal is to resolve the customer's issue using the provided knowledge base. If the knowledge base doesn't have the answer, apologize and explain that you will escalate the issue.
Knowledge Base:
${sourceNotes.length > 0 ? sourceNotes.map(n => `--- DOC: ${n.title} ---\n${n.content}\n`).join('') : 'No knowledge provided.'}`;

        const userParts: Part[] = [{ text: `Customer Query: ${customerQuery}` }];
         if (image) {
             userParts.push({ inlineData: { mimeType: 'image/jpeg', data: image } });
         }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { role: 'user', parts: userParts },
            config: { systemInstruction },
            safetySettings
        });
        return response.text;
    } catch (e) {
        console.error("Error in generateCustomerResponse:", e);
        fireRateLimitEvent(e);
        throw new Error("Failed to generate customer response.");
    }
};

export const generateAmazonListingCopy = async (productInfo: string, sourceNotes: Note[], image?: string): Promise<string> => {
    try {
        const ai = getGenAI();
        const systemInstruction = `You are an expert Amazon copywriter. Create a compelling, SEO-optimized product listing based on the provided information. Follow Amazon's style guidelines. The output should be well-structured Markdown, including a title, bullet points, and a product description. Use information from the provided research notes if available.
Research Notes:
${sourceNotes.length > 0 ? sourceNotes.map(n => `--- NOTE: ${n.title} ---\n${n.content}\n`).join('') : 'No research notes provided.'}`;
        
        const userParts: Part[] = [{ text: `Product Info: ${productInfo}` }];
        if (image) {
            userParts.push({ inlineData: { mimeType: 'image/jpeg', data: image } });
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { role: 'user', parts: userParts },
            config: { systemInstruction },
            safetySettings
        });
        return response.text;
    } catch (e) {
        console.error("Error in generateAmazonListingCopy:", e);
        fireRateLimitEvent(e);
        throw new Error("Failed to generate Amazon copy.");
    }
};


// --- General Chat with Tools ---
let generalChat: Chat | null = null;
export const getGeneralChatSession = (): Chat => {
    if (generalChat) {
        return generalChat;
    }
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
    ];

    generalChat = ai.chats.create({
        model: 'gemini-2.5-pro',
        config: {
            systemInstruction: "You are a helpful assistant with access to a user's notes. You can create, find, read, update, and delete notes and folders. You MUST use the provided tools to interact with the notes.",
            tools: [{ functionDeclarations }],
        },
        safetySettings
    });
    return generalChat;
};

export const resetGeneralChat = () => {
    generalChat = null;
};


// --- Editor AI Actions ---
export const suggestTags = async (title: string, content: string): Promise<string[]> => {
    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Error suggesting tags:", e);
        fireRateLimitEvent(e);
        throw new Error("Failed to suggest tags.");
    }
};

export const suggestTitle = async (content: string): Promise<string> => {
     try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Suggest a concise, descriptive title for the following note content. The title should be no more than 10 words.
Content: ${content.substring(0, 1000)}`,
        });
        // Remove quotes and periods from the response
        return response.text.trim().replace(/["\.]/g, '');
    } catch (e) {
        console.error("Error suggesting title:", e);
        fireRateLimitEvent(e);
        throw new Error("Failed to suggest a title.");
    }
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

    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `${instruction}\n\n"${text}"`,
            safetySettings,
        });
        return response.text.trim();
    } catch (e) {
        console.error("Error performing inline edit:", e);
        fireRateLimitEvent(e);
        throw new Error(`AI action "${action}" failed.`);
    }
};

export const summarizeAndExtractActions = async (content: string): Promise<{ summary: string; actionItems: string[] }> => {
    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Error in summarizeAndExtractActions:", e);
        fireRateLimitEvent(e);
        throw new Error("Failed to summarize and find actions.");
    }
};


export const enhanceText = async (text: string, tone: string): Promise<string> => {
    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Rewrite the following text to have a ${tone} tone:\n\n"${text}"`,
            safetySettings
        });
        return response.text.trim();
    } catch (e) {
        console.error("Error enhancing text:", e);
        fireRateLimitEvent(e);
        throw new Error(`Failed to enhance text with ${tone} tone.`);
    }
};
