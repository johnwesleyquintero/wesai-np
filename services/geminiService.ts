import { GoogleGenAI, Type, GenerateContentResponse, Content, Chat, FunctionDeclaration } from "@google/genai";
import { Note, SpellingError, ChatMessage } from "../types";

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

const parseDataUrl = (dataUrl: string): { mimeType: string; data: string } => {
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
        throw new Error("Invalid data URL format");
    }
    return { mimeType: match[1], data: match[2] };
};

const handleGeminiError = (error: unknown, context: string): Error => {
    console.error(`Error in ${context}:`, error);

    // Convert the error to a string to reliably check for keywords.
    const errorString = (error instanceof Error) ? error.message : JSON.stringify(error);

    if (errorString.includes("API key is not configured")) {
        return new Error("Your API key is missing. Please add it in the settings to use AI features.");
    }
    if (errorString.includes('429') || errorString.toLowerCase().includes('quota')) {
        window.dispatchEvent(new CustomEvent('ai-rate-limit'));
        return new Error("You've exceeded your API quota. Please check your plan and billing details at ai.google.dev. Features will resume shortly.");
    }
    if (errorString.includes('fetch failed')) {
        return new Error("Network error. Please check your connection and try again.");
    }

    // Fallback for other errors from the Error object, if available.
    if (error instanceof Error) {
        return new Error(`An AI error occurred in ${context}: ${error.message}. Please try again later.`);
    }

    return new Error(`An unknown error occurred during ${context}.`);
};

// --- Function Calling Tool Definitions ---

const createNoteTool: FunctionDeclaration = {
  name: 'createNote',
  parameters: {
    type: Type.OBJECT,
    description: 'Creates a new note with a title and content.',
    properties: {
      title: {
        type: Type.STRING,
        description: 'The title of the new note.',
      },
      content: {
        type: Type.STRING,
        description: 'The markdown content of the new note.',
      },
    },
    required: ['title', 'content'],
  },
};

const findNotesTool: FunctionDeclaration = {
  name: 'findNotes',
  parameters: {
    type: Type.OBJECT,
    description: 'Finds notes based on a search query.',
    properties: {
      query: {
        type: Type.STRING,
        description: 'The search query to find relevant notes.',
      },
    },
    required: ['query'],
  },
};

const getNoteContentTool: FunctionDeclaration = {
  name: 'getNoteContent',
  parameters: {
    type: Type.OBJECT,
    description: 'Retrieves the full title and markdown content of a specific note.',
    properties: {
      noteId: {
        type: Type.STRING,
        description: 'The ID of the note to read.',
      },
    },
    required: ['noteId'],
  },
};

const updateNoteTool: FunctionDeclaration = {
  name: 'updateNote',
  parameters: {
    type: Type.OBJECT,
    description: 'Updates an existing note by replacing its title and/or content. Provide only the fields that need to be changed.',
    properties: {
      noteId: {
        type: Type.STRING,
        description: 'The ID of the note to update.',
      },
      title: {
        type: Type.STRING,
        description: 'The new title for the note.',
      },
      content: {
        type: Type.STRING,
        description: 'The new, full markdown content that will replace the entire existing content of the note.',
      },
    },
    required: ['noteId'],
  },
};

const deleteNoteTool: FunctionDeclaration = {
  name: 'deleteNote',
  parameters: {
    type: Type.OBJECT,
    description: 'Permanently deletes a note.',
    properties: {
      noteId: {
        type: Type.STRING,
        description: 'The ID of the note to delete.',
      },
    },
    required: ['noteId'],
  },
};

const createCollectionTool: FunctionDeclaration = {
  name: 'createCollection',
  parameters: {
    type: Type.OBJECT,
    description: 'Creates a new folder (collection) to organize notes.',
    properties: {
      name: {
        type: Type.STRING,
        description: 'The name of the new folder.',
      },
      parentId: {
        type: Type.STRING,
        description: 'Optional. The ID of the parent folder to create this folder inside.',
      },
    },
    required: ['name'],
  },
};

const findCollectionsTool: FunctionDeclaration = {
  name: 'findCollections',
  parameters: {
    type: Type.OBJECT,
    description: 'Finds folders (collections) based on a search query.',
    properties: {
      query: {
        type: Type.STRING,
        description: 'The search query to find relevant folders.',
      },
    },
    required: ['query'],
  },
};

const moveNoteToCollectionTool: FunctionDeclaration = {
  name: 'moveNoteToCollection',
  parameters: {
    type: Type.OBJECT,
    description: 'Moves a note into a specific folder (collection).',
    properties: {
      noteId: {
        type: Type.STRING,
        description: 'The ID of the note to move.',
      },
      collectionId: {
        type: Type.STRING,
        description: 'The ID of the destination folder. Use null to move the note to the root level.',
      },
    },
    required: ['noteId', 'collectionId'],
  },
};


const aiTools: FunctionDeclaration[] = [
    createNoteTool,
    findNotesTool,
    getNoteContentTool,
    updateNoteTool,
    deleteNoteTool,
    createCollectionTool,
    findCollectionsTool,
    moveNoteToCollectionTool,
];

class GeminiAPIService {
    private ai: GoogleGenAI | null = null;
    private lastUsedApiKey: string | undefined | null = null;
    private generalChatSession: Chat | null = null;

    private getApiKey(): string | undefined {
        try {
            const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
            return storedKey || process.env.API_KEY;
        } catch {
            return process.env.API_KEY;
        }
    }

    private getAi(): GoogleGenAI {
        const key = this.getApiKey();

        if (this.lastUsedApiKey !== key) {
            this.ai = null;
            this.lastUsedApiKey = key;
            this.generalChatSession = null;
        }

        if (!this.ai) {
            if (!key) {
                throw new Error("API key is not configured. Please add it in the settings.");
            }
            this.ai = new GoogleGenAI({ apiKey: key });
        }
        return this.ai;
    }

    public performInlineEdit = async (text: string, action: InlineAction): Promise<string> => {
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
            const ai = this.getAi();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ parts: [{ text: prompt }] }],
            });
            return response.text.trim();
        } catch (error) {
            throw handleGeminiError(error, `inline edit (${action})`);
        }
    };
    
    public enhanceText = async (text: string, tone: string): Promise<string> => {
        if (!text) {
            return "";
        }

        try {
            const ai = this.getAi();

            const prompt = tone === 'Custom' 
                ? `Rewrite the following text. Do not add any extra commentary, just provide the rewritten text:\n\n${text}`
                : `Rewrite the following text with a ${tone} tone. Do not add any extra commentary, just provide the rewritten text:\n\n${text}`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ parts: [{ text: prompt }] }],
            });

            return response.text;
        } catch (error) {
            throw handleGeminiError(error, "text enhancement");
        }
    };
    
    public summarizeAndExtractActions = async (text: string): Promise<{ summary: string; actionItems: string[] }> => {
        if (!text) {
            return { summary: '', actionItems: [] };
        }

        try {
            const ai = this.getAi();

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
                contents: [{ parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                }
            });

            const responseText = response.text.trim();
            const result = safeJsonParse(responseText, { summary: '', actionItems: [] });
            
            if (!result.summary && (!result.actionItems || result.actionItems.length === 0) && responseText) {
                 throw new Error("The AI returned an empty or invalid response. This might be due to content filtering.");
            }

            return result;

        } catch (error) {
            throw handleGeminiError(error, "summarization");
        }
    };
    
    public semanticSearchNotes = async (query: string, notes: Note[]): Promise<string[]> => {
        if (!query) {
            return notes.map(n => n.id);
        }
        if (notes.length === 0) {
            return [];
        }

        try {
            const ai = this.getAi();

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
                contents: [{ parts: [{ text: prompt }] }],
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
    
    public suggestTags = async (title: string, content: string): Promise<string[]> => {
        if (!content) {
            return [];
        }

        try {
            const ai = this.getAi();

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
                contents: [{ parts: [{ text: prompt }] }],
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

    public suggestTitle = async (content: string): Promise<string> => {
        if (!content) {
            return "";
        }

        try {
            const ai = this.getAi();

            const prompt = `You are an expert at writing concise and descriptive titles. Analyze the following note content and suggest a single, short title for it (under 10 words). Do not add any extra commentary, quotation marks, or prefixes like "Title:". Just provide the title text.

Note Content:
"${content.substring(0, 4000)}"`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ parts: [{ text: prompt }] }],
            });

            return response.text.trim().replace(/^"|"$/g, '');

        } catch (error) {
            throw handleGeminiError(error, "title suggestion");
        }
    };

    public getStreamingChatResponse = async (
        query: string,
        contextNotes: Note[],
        image?: string | null
    ): Promise<AsyncGenerator<GenerateContentResponse>> => {
        try {
            const ai = this.getAi();

            const simplifiedNotes = contextNotes.map(({ title, content, tags }) => ({
                title,
                content: content.substring(0, 2000), // Truncate content
                tags,
            }));
            
            const history: Content[] = [{
                role: 'user',
                parts: [{
                    text: `You are an AI assistant for a note-taking app. Your task is to answer the user's question based *exclusively* on the content of the notes provided in this context. If the notes don't contain relevant information, say so. Do not invent information. Format your answer in clear Markdown.

Here are the notes to use as context:
${JSON.stringify(simplifiedNotes)}`
                }]
            }, {
                role: 'model',
                parts: [{ text: "Understood. I will answer the user's next question based only on the provided notes." }]
            }];
            
            const chat = ai.chats.create({ model: 'gemini-2.5-flash', history });

            const userParts: (string | { inlineData: { mimeType: string; data: string } })[] = [query];
            if (image) {
                const { mimeType, data } = parseDataUrl(image);
                userParts.push({ inlineData: { mimeType, data } });
            }

            const result = await chat.sendMessageStream({ message: userParts });
            return result;
        } catch (error) {
            throw handleGeminiError(error, "AI chat");
        }
    };

    public generateCustomerResponse = async (
        customerQuery: string,
        contextNotes: Note[],
        image?: string | null
    ): Promise<string> => {
        try {
            const ai = this.getAi();
            const simplifiedNotes = contextNotes.map(({ title, content, tags }) => ({
                title,
                content: content.substring(0, 2000),
                tags
            }));

            const systemInstruction = `You are an expert customer service professional. Your goal is to provide helpful, empathetic, and professional responses to customer inquiries. Your response MUST be based *exclusively* on the information provided in the knowledge base notes. If the notes do not contain the answer, politely state that you cannot provide the information and will escalate the issue.

**Platform Compliance Rule:** If you infer the context is a third-party marketplace (like Amazon, eBay), DO NOT include any direct website links, URLs, or off-platform contact information. Instead, guide the user by name (e.g., 'Please visit our official website for more information'). Adhering to this is critical to protect account health.

Format your response in clear, professional Markdown.`;
            
            const prompt = `Here is the relevant knowledge base information:
${JSON.stringify(simplifiedNotes)}

Here is the customer's message (and an attached image, if provided). Please draft a response.
Customer message: "${customerQuery}"`;

            const userParts: any[] = [{ text: prompt }];
            if (image) {
                const { mimeType, data } = parseDataUrl(image);
                userParts.push({ inlineData: { mimeType, data } });
            }
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: userParts }],
                config: {
                    systemInstruction,
                },
            });

            return response.text.trim();

        } catch (error) {
            throw handleGeminiError(error, "customer response generation");
        }
    };
    
    public findMisspelledWords = async (text: string): Promise<SpellingError[]> => {
        if (!text || text.trim().length < 2) {
            return [];
        }

        try {
            const ai = this.getAi();
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
                contents: [{ parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                }
            });

            const responseText = response.text.trim();
            const result = safeJsonParse(responseText, { errors: [] });
            return result.errors || [];
        } catch (error) {
            // Let the centralized handler manage the error message and side effects.
            // We can still log a warning here for debugging purposes if needed.
            console.warn("Spell check failed:", error);
            return [];
        }
    };

    public getSpellingSuggestions = async (word: string): Promise<string[]> => {
        if (!word) return [];

        try {
            const ai = this.getAi();
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
                contents: [{ parts: [{ text: prompt }] }],
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

    public suggestNoteConsolidation = async (note1: Note, note2: Note): Promise<{ title: string; content: string }> => {
        try {
            const ai = this.getAi();
            const schema = {
                type: Type.OBJECT,
                properties: {
                    title: {
                        type: Type.STRING,
                        description: 'A new, concise title for the consolidated note.',
                    },
                    content: {
                        type: Type.STRING,
                        description: 'A comprehensive, well-structured body for the new note in Markdown format that merges the key ideas from both source notes.',
                    },
                },
                required: ['title', 'content'],
            };
            
            const prompt = `You are an expert at knowledge synthesis. Analyze the following two notes and create a single, consolidated note that merges their key ideas. Provide a new, concise title and a comprehensive body in Markdown format. The goal is to create a unified, well-structured note that preserves important information from both.

**Note 1 Title:** "${note1.title}"
**Note 1 Content:**
"""
${note1.content}
"""

**Note 2 Title:** "${note2.title}"
**Note 2 Content:**
"""
${note2.content}
"""`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                }
            });

            const responseText = response.text.trim();
            return safeJsonParse(responseText, { title: '', content: '' });
        } catch (error) {
            throw handleGeminiError(error, "note consolidation");
        }
    };
    
    public resetGeneralChat = () => {
        this.generalChatSession = null;
    };
    
    public getGeneralChatSession = (): Chat => {
        try {
            const ai = this.getAi();
            if (!this.generalChatSession) {
                 this.generalChatSession = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction: `You are WesAI, a helpful and general-purpose AI assistant. Your primary role is to help the user manage their notes. You can create, find, read, update, delete, and organize notes and folders using the provided tools.

**Your workflow for editing or refining a note should be:**
1. Use \`findNotes\` to locate the relevant note(s).
2. Use \`getNoteContent\` to retrieve its current content.
3. Perform the requested refinement (e.g., proofreading, summarizing).
4. Use \`updateNote\` with the \`noteId\` and the new, complete \`content\` to save the changes.

**Your workflow for organizing notes should be:**
1. Understand the user's categorization goal (e.g., "group all project notes").
2. Use \`findNotes\` to identify the notes that need to be organized.
3. Use \`findCollections\` to see if a suitable folder already exists.
4. If a folder doesn't exist, use \`createCollection\` to make a new one.
5. For each note, use \`moveNoteToCollection\` to place it in the correct folder. You can use a \`collectionId\` of \`null\` to move a note to the root.

Always inform the user of the actions you have taken, such as which note you have updated or which notes you have moved.`,
                        tools: [{ functionDeclarations: aiTools }],
                    }
                });
            }
            return this.generalChatSession;
        } catch (error) {
            if (error instanceof Error && error.message.includes("API key")) {
                this.resetGeneralChat();
            }
            throw handleGeminiError(error, "general AI chat session");
        }
    };
}

const geminiService = new GeminiAPIService();

export const {
    performInlineEdit,
    enhanceText,
    summarizeAndExtractActions,
    semanticSearchNotes,
    suggestTags,
    suggestTitle,
    getStreamingChatResponse,
    generateCustomerResponse,
    findMisspelledWords,
    getSpellingSuggestions,
    suggestNoteConsolidation,
    resetGeneralChat,
    getGeneralChatSession
} = geminiService;