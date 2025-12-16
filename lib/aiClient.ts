
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, GenerateContentResponse, GenerationConfig, Part } from "@google/genai";
import { API_KEY_STORAGE_KEY } from './config';
import { normalizeContents } from './dataUtils';

// Cache for the GenAI instance to avoid re-creating it on every call.
let genAI: GoogleGenAI | null = null;
let cachedApiKey: string | null = null;

export const getGenAI = (): GoogleGenAI => {
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

export const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export const fireRateLimitEvent = (error: any) => {
    if (error instanceof Error && (error.message.includes('429') || error.message.includes('API key not valid'))) {
        window.dispatchEvent(new CustomEvent('ai-rate-limit'));
    }
};

/**
 * A centralized wrapper for making Gemini API calls.
 * Caching has been disabled to prevent database usage.
 */
export async function callGemini<T>(
    payload: {
        model: string;
        contents: string | Part | (string | Part)[];
        config?: GenerationConfig;
    },
    processingOptions: {
        errorMessage: string;
        processResponse: (response: GenerateContentResponse) => T;
        onError: () => T | never;
        bypassCache?: boolean; // Deprecated, kept for interface compatibility
    }
): Promise<T> {
    const { model, contents, config } = payload;

    const normalizedContents = normalizeContents(contents);

    // Call the Gemini API
    let response: GenerateContentResponse;
    try {
        const ai = getGenAI();
        response = await ai.models.generateContent({ model, contents: normalizedContents, config: {...config, safetySettings } });
    } catch (e) {
        console.error(`API call error: ${processingOptions.errorMessage}`, e);
        fireRateLimitEvent(e);
        return processingOptions.onError();
    }

    // Process the response
    try {
        return processingOptions.processResponse(response);
    } catch (e) {
        console.error(`Processing error: ${processingOptions.errorMessage}`, e);
        return processingOptions.onError();
    }
}
