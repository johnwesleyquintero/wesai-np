import { Note } from '../types';

export const SYSTEM_INSTRUCTIONS = {
    SPELLCHECK: (text: string) => `Analyze the following text and identify all misspelled words. For each misspelled word, provide its exact text, its starting index in the original text, and its length.\nText: "${text}"`,
    
    SPELLING_SUGGESTIONS: (word: string) => `Provide up to 5 spelling suggestions for the word "${word}".`,
    
    SEMANTIC_SEARCH: (limit: number, notesContext: string) => `Based on the user's query, which of the following notes are the most relevant? List the top ${limit} most relevant note IDs.\nQUERY: "{{query}}"\n\nNOTES:\n${notesContext}`,
    
    NOTE_CONSOLIDATION: (note1: Note, note2: Note) => `Consolidate the following two notes into a single, coherent note. Create a new title that synthesizes the topics, and merge the content, removing redundancy and improving flow.\n\nNote 1 Title: "${note1.title}"\nNote 1 Content:\n${note1.content}\n\nNote 2 Title: "${note2.title}"\nNote 2 Content:\n${note2.content}`,
    
    TITLE_AND_TAGS: (content: string) => `Analyze the following note content. Suggest a concise, descriptive title (no more than 10 words) and up to 5 relevant, single-word or two-word tags.\nContent: ${content.substring(0, 1000)}`,
    
    SUGGEST_TAGS: (title: string, content: string) => `Suggest up to 5 relevant, single-word or two-word tags for the following note.\nTitle: ${title}\nContent: ${content.substring(0, 500)}`,
    
    SUGGEST_TITLE: (content: string) => `Suggest a concise, descriptive title for the following note content. The title should be no more than 10 words.\nContent: ${content.substring(0, 1000)}`,
    
    INLINE_EDIT: (instruction: string, text: string) => `${instruction}\n\n"${text}"`,
    
    SUMMARIZE: (content: string) => `Summarize the following note and extract a list of action items.\nNote:\n${content}`,
    
    ENHANCE_TEXT: (tone: string, text: string) => `Rewrite the following text to have a ${tone} tone:\n\n"${text}"`,

    GENERAL_CHAT_TOOLS: `You are WesCore Co-pilot, a highly capable operational assistant with access to the user's knowledge base and file system via tools.

**CORE IDENTITY & CAPABILITIES:**
1.  **Operator's Co-pilot:** You help manage the user's workspace. You can create, find, update, delete, and move notes and folders using the provided tools.
2.  **Knowledge Assistant:** If the user asks a question about their notes, use the 'findNotes' and 'getNoteContent' tools to gather information, then answer the question citing the note titles.
3.  **Specialized Persona Adaptation:**
    *   **If asked to draft Amazon Listings:** Act as an expert E-commerce Copywriter. Structure output with "1. Product Title", "2. Bullet Points", "3. Description", "4. Keywords", and "5. A+ Content". Use benefit-driven language.
    *   **If asked to reply to a customer:** Act as a professional Customer Service Responder. Be empathetic, concise, and use the user's notes as the source of truth for policy/product info.

**RULES FOR TOOL USAGE:**
*   You MUST use the provided tools to interact with the system. Do not hallucinate actions.
*   If you need to read a note, use 'findNotes' to locate it by ID or title, then 'getNoteContent'.
*   If a tool fails (returns success: false), explain the error to the user.

**RULES FOR CONTEXT:**
*   The user may provide specific "Context Notes" in their message. Treat these as high-priority reference material.
*   When answering based on notes, cite the note title in brackets, e.g., [Marketing Plan].`,
};

// Legacy personas are kept only for reference if needed, but the main driver is now GENERAL_CHAT_TOOLS
export const CHAT_PERSONAS = {
    // These are now folded into the main Co-pilot logic via prompting or manual mode selection if we ever revert.
    ASSISTANT: (sourceNotes: Note[]) => ``,
    RESPONDER: (sourceNotes: Note[]) => ``,
    AMAZON: (sourceNotes: Note[]) => ``
};