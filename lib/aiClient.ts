import { GoogleGenAI, HarmCategory, HarmBlockThreshold, GenerateContentResponse, GenerationConfig, Part } from "@google/genai";
import { API_KEY_STORAGE_KEY, MODEL_NAMES } from './config';
import { sha256, getLocalCache, setLocalCache } from './cache';
import { supabase } from './supabaseClient';
import { normalizeContents, sortObjectKeys } from './dataUtils';

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
 * A centralized wrapper for making Gemini API calls with a two-tiered caching system.
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
        bypassCache?: boolean;
    }
): Promise<T> {
    const { model, contents, config } = payload;
    const { bypassCache = false } = processingOptions;

    const normalizedContents = normalizeContents(contents);

    // 1. Create a stable hash for the request
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

        // 6. Save to both caches
        setLocalCache(hash, processedData);
        // Fire-and-forget insertion to Supabase.
        supabase.from('ai_cache').insert({
            prompt_hash: hash,
            prompt: promptString,
            response: processedData as any,
            model,
        }).then(({ error }) => {
            if (error && error.code !== '23505') { 
                console.warn("Supabase cache insertion failed:", error);
            }
        });

        return processedData;
    } catch (e) {
        console.error(`Processing error: ${processingOptions.errorMessage}`, e);
        return processingOptions.onError();
    }
}
