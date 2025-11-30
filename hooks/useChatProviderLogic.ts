import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChatMessage, Note, ChatMode, ChatStatus } from '../types';
import { generateChatStream, semanticSearchNotes, createGeneralChatSession } from '../services/geminiService';
import { useStoreContext } from '../context/AppContext';
import { Chat } from '@google/genai';
import { useDebounce } from './useDebounce';
import { executeTool, ToolExecutionContext } from '../services/toolExecutionService';

const CHAT_HISTORIES_STORAGE_KEY = 'wesai-chat-histories';
const RESPONDERS_STORAGE_KEY = 'wesai-chat-responders';


export const useChatProviderLogic = () => {
    const { 
        notes, getNoteById, onAddNote, deleteNote, activeNoteId, setActiveNoteId, 
        updateNote: updateNoteInStore, collections, ...store 
    } = useStoreContext();
    
    const [chatMode, setInternalChatMode] = useState<ChatMode>('ASSISTANT');
    const [chatHistories, setChatHistories] = useState<Record<ChatMode, ChatMessage[]>>(() => {
        try {
            const saved = localStorage.getItem(CHAT_HISTORIES_STORAGE_KEY);
            const initial = { ASSISTANT: [], RESPONDER: [], WESCORE_COPILOT: [], AMAZON: [] };
            if (saved) {
                const parsed = JSON.parse(saved);
                // Simple migration for existing users
                if (parsed.GENERAL && !parsed.WESCORE_COPILOT) {
                    parsed.WESCORE_COPILOT = parsed.GENERAL;
                    delete parsed.GENERAL;
                }
                return {
                    ASSISTANT: Array.isArray(parsed.ASSISTANT) ? parsed.ASSISTANT : [],
                    RESPONDER: Array.isArray(parsed.RESPONDER) ? parsed.RESPONDER : [],
                    WESCORE_COPILOT: Array.isArray(parsed.WESCORE_COPILOT) ? parsed.WESCORE_COPILOT : [],
                    AMAZON: Array.isArray(parsed.AMAZON) ? parsed.AMAZON : [],
                };
            }
            return initial;
        } catch {
            return { ASSISTANT: [], RESPONDER: [], WESCORE_COPILOT: [], AMAZON: [] };
        }
    });
    const debouncedChatHistories = useDebounce(chatHistories, 1000);
    const [responders, setResponders] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(RESPONDERS_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [contextNoteIds, setContextNoteIds] = useState<string[]>([]);
    const [chatError, setChatError] = useState<string | null>(null);
    const [chatStatus, setChatStatus] = useState<ChatStatus>('idle');
    const [activeToolName, setActiveToolName] = useState<string | null>(null);
    const streamSessionIdRef = useRef(0);
    const chatHistoriesRef = useRef(chatHistories);
    const generalChatRef = useRef<Chat | null>(null);

    useEffect(() => {
        chatHistoriesRef.current = chatHistories;
    }, [chatHistories]);

    const setChatMode = useCallback((mode: ChatMode) => {
        if (chatMode === 'WESCORE_COPILOT' && mode !== 'WESCORE_COPILOT') {
            generalChatRef.current = null;
        }
        setInternalChatMode(mode);
    }, [chatMode]);


    useEffect(() => {
        try {
            localStorage.setItem(RESPONDERS_STORAGE_KEY, JSON.stringify(responders));
        } catch (error) {
            console.error("Failed to save responders to localStorage", error);
        }
    }, [responders]);

    // Proactive debounced save to localStorage during the session.
    useEffect(() => {
        try {
            const historiesToSave = (Object.keys(debouncedChatHistories) as ChatMode[]).reduce((acc, mode) => {
                const history = debouncedChatHistories[mode];
                if (Array.isArray(history)) {
                    // Truncate to the last 100 messages to prevent localStorage from blowing up.
                    acc[mode] = history.slice(-100); 
                } else {
                    acc[mode] = [];
                }
                return acc;
            }, {} as Record<ChatMode, ChatMessage[]>);
            localStorage.setItem(CHAT_HISTORIES_STORAGE_KEY, JSON.stringify(historiesToSave));
        } catch (error) {
            console.error("Failed to save chat history to localStorage", error);
        }
    }, [debouncedChatHistories]);

    // Final save attempt on page unload as a safety net.
    useEffect(() => {
        const handleBeforeUnload = () => {
            try {
                // Use synchronous save on unload to prevent data loss, with truncation
                const historiesToSave = (Object.keys(chatHistoriesRef.current) as ChatMode[]).reduce((acc, mode) => {
                    const history = chatHistoriesRef.current[mode];
                    if (Array.isArray(history)) {
                        acc[mode] = history.slice(-100);
                    } else {
                        acc[mode] = [];
                    }
                    return acc;
                }, {} as Record<ChatMode, ChatMessage[]>);
                localStorage.setItem(CHAT_HISTORIES_STORAGE_KEY, JSON.stringify(historiesToSave));
            } catch (error) {
                console.error("Failed to save chat history on unload", error);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    const _handleStreamedChat = useCallback(async (query: string, image: string | undefined, getSystemInstruction: (sourceNotes: Note[]) => string) => {
        const currentSessionId = ++streamSessionIdRef.current;
        setChatError(null);
        const newUserMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: query, image, contextNoteIds };
        setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], newUserMessage] }));
        
        let sourceNotes: Note[];
        if (contextNoteIds.length > 0) {
            setChatStatus('replying');
            sourceNotes = contextNoteIds.map(id => getNoteById(id)).filter((n): n is Note => !!n);
        } else {
            setChatStatus('searching');
            const sourceNoteIds = await semanticSearchNotes(query, notes);
            sourceNotes = sourceNoteIds.map(id => getNoteById(id)).filter((n): n is Note => !!n);
        }

        let newAiMessage: ChatMessage | null = null;

        try {
            if (currentSessionId !== streamSessionIdRef.current) return;
            
            if (chatStatus !== 'replying') setChatStatus('replying');
            
            const systemInstruction = getSystemInstruction(sourceNotes);
            const stream = await generateChatStream(query, systemInstruction, image);

            newAiMessage = { id: crypto.randomUUID(), role: 'ai', content: '', sources: sourceNotes, status: 'processing' };
            
            if (currentSessionId !== streamSessionIdRef.current) return;
            setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], newAiMessage!] }));

            let fullResponse = '';
            for await (const chunk of stream) {
                if (currentSessionId !== streamSessionIdRef.current) break; // Invalidate stream if chat is cleared
                fullResponse += chunk.text;
                setChatHistories(prev => {
                    const currentModeHistory = [...prev[chatMode]];
                    const messageIndex = currentModeHistory.findIndex(m => m.id === newAiMessage!.id);
                    if (messageIndex > -1) {
                         currentModeHistory[messageIndex] = { ...currentModeHistory[messageIndex], content: fullResponse };
                    }
                    return { ...prev, [chatMode]: currentModeHistory };
                });
            }
        } catch (error) {
            if (currentSessionId !== streamSessionIdRef.current) return;
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setChatError(errorMessage);
            const errorAiMessage: ChatMessage = { id: crypto.randomUUID(), role: 'ai', content: `Sorry, I ran into an error: ${errorMessage}` };
            setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], errorAiMessage] }));
        } finally {
            if (currentSessionId === streamSessionIdRef.current) {
                setChatStatus('idle');
                if (newAiMessage) {
                    setChatHistories(prev => {
                        const currentModeHistory = [...prev[chatMode]];
                        const messageIndex = currentModeHistory.findIndex(m => m.id === newAiMessage!.id);
                        if (messageIndex > -1) {
                            currentModeHistory[messageIndex] = { ...currentModeHistory[messageIndex], status: 'complete' };
                        }
                        return { ...prev, [chatMode]: currentModeHistory };
                    });
                }
            }
        }
    }, [chatMode, getNoteById, notes, contextNoteIds, chatStatus]);
    
    const onSendMessage = useCallback((q, i) => _handleStreamedChat(q, i, (s) => `You are a helpful AI assistant integrated into a note-taking app. Use the provided "Source Notes" to answer the user's query.\n- When you use information from a source, you MUST cite it by number, like this: [1].\n- Place citations at the end of the sentence or clause they support.\n- If the sources are not relevant, ignore them and answer from your general knowledge without citing any sources.\n- Be concise and helpful.\n\nSource Notes:\n${s.length > 0 ? s.map((n, i) => `--- SOURCE [${i + 1}]: ${n.title} ---\n${n.content}\n`).join('') : 'No source notes provided.'}`), [_handleStreamedChat]);
    const onGenerateServiceResponse = useCallback((q, i) => _handleStreamedChat(q, i, (s) => `You are a professional and empathetic customer service agent. Your goal is to resolve the customer's issue using the provided knowledge base.\n- When you use information from the knowledge base, you MUST cite it by number, like this: [1].\n- Place citations at the end of the sentence or clause they support.\n- If the knowledge base doesn't have the answer, apologize and explain that you will escalate the issue, without citing any sources.\nKnowledge Base:\n${s.length > 0 ? s.map((n, i) => `--- DOC [${i + 1}]: ${n.title} ---\n${n.content}\n`).join('') : 'No knowledge provided.'}`), [_handleStreamedChat]);
    const onGenerateAmazonCopy = useCallback((q, i) => _handleStreamedChat(q, i, (s) => `You are an expert Amazon E-commerce Strategist and Copywriter, now operating under **Brand Story Intelligence v2.0**. Your mission is to generate a complete, SEO-optimized, and brand-aligned product listing from the provided research notes. This output must be **layout-aware** and ready for handoff to a design team.

**OVERALL DIRECTIVE:**
You MUST generate the entire Amazon product listing, structured into the following sections using Markdown headings.

**TONE & VOICE DIRECTIVE (Voice-of-the-Customer Layer):**
- Translate technical jargon into simple, benefit-driven language. Think like a customer, not an engineer.
- **Good Example:** "Press one button for help — no phone needed."
- **Bad Example:** "Features instant SOS calling."
- **Good Example:** "Works anywhere your phone does."
- **Bad Example:** "Nationwide 4G LTE coverage."

**DESIGN ALIGNMENT DIRECTIVE (Visual Cues):**
- Within the A+ Content section, you MUST embed **visual layout cues** using bracket syntax. These cues guide the design team.
- Use \`[IMG: Description of a lifestyle or product shot]\` for images.
- Use \`[GRAPHIC: Description of an infographic or map]\` for graphics.
- Use \`[ICON SET: Feature 1 / Feature 2 / Feature 3]\` to suggest a set of icons.

**OUTPUT STRUCTURE:**

## 1. Product Title
A concise, keyword-rich title (max 200 characters).

## 2. Bullet Points (5 Key Features)
- Five distinct bullet points.
- Each starts with a capitalized, benefit-oriented phrase.
- Each explains a key feature and its direct benefit to the customer.

## 3. Product Description
A detailed, paragraph-based description of the product that expands on the bullet points and tells a cohesive story.

## 4. Backend Keywords (Search Terms)
A comma-separated list of 15-20 relevant, long-tail keywords. Do not repeat words from the title.

## 5. Premium A+ Content
This section MUST be a sequence of distinct A+ modules, following this exact order:
1.  **Hero:** A powerful, emotionally resonant headline and opening.
2.  **Compatibility:** Clear, direct information about device/service compatibility.
3.  **Features:** Detail 3-4 key product features, translating specs into benefits.
4.  **Coverage:** Explain network coverage or service availability with confidence.
5.  **Brand Story:** A brief narrative about the brand's mission or origin.
6.  **Brand Differentiation:** A short, 2-3 sentence micro-block explaining why our product is superior. Start it with a bolded header, e.g., **Why Choose Us?**. This is the competitive positioning node.
7.  **CTA (Call to Action):** A final, compelling reason to choose this product.

**NARRATIVE RHYTHM DIRECTIVE (For A+ Content):**
For each A+ module (except Compatibility and Brand Differentiation), you MUST follow this internal structure:
1.  **Emotional Hook:** Start with a sentence that connects to the customer's feelings or needs.
2.  **Rational Clarity:** Follow with clear, factual information.
3.  **Trust/Reassurance Cue:** End with a statement that builds confidence.

**EXECUTION:**
- Base ALL content on the provided "Research Notes".
- When using information from notes, cite the source by number, like this: [1].
- Adhere strictly to Amazon's Terms of Service.

Research Notes:
${s.length > 0 ? s.map((n, i) => `--- NOTE [${i + 1}]: ${n.title} ---\n${n.content}\n`).join('') : 'No research notes provided.'}`), [_handleStreamedChat]);

    const onSendGeneralMessage = useCallback(async (query: string, image?: string) => {
        const getChat = () => {
            if (!generalChatRef.current) {
                generalChatRef.current = createGeneralChatSession();
            }
            return generalChatRef.current;
        };

        setChatError(null);
        const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: query, image, status: 'processing' };
        setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], userMessage] }));
        const touchedNoteIds = new Set<string>();

        // Create the context object for the execution service
        const toolContext: ToolExecutionContext = {
            notes,
            collections,
            templates: store.templates,
            activeNoteId,
            getNoteById,
            getCollectionById: store.getCollectionById,
            onAddNote,
            updateNoteInStore,
            deleteNote,
            setActiveNoteId,
            addCollection: store.addCollection,
            moveItem: store.moveItem,
            addTemplate: store.addTemplate,
        };

        try {
            const chat = getChat();
            let response = await chat.sendMessage({ message: query });
            
            while (response.functionCalls && response.functionCalls.length > 0) {
                setChatStatus('using_tool');
                const functionResponses = [];
                const pendingToolMessages: ChatMessage[] = response.functionCalls.map(fc => ({
                    id: crypto.randomUUID(),
                    role: 'tool',
                    content: { name: fc.name, args: fc.args, status: 'pending' }
                }));
                setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], ...pendingToolMessages] }));

                for (const [index, fc] of response.functionCalls.entries()) {
                    const toolMessageId = pendingToolMessages[index].id;
                    setActiveToolName(fc.name);
                    
                    const { result, status, touchedNoteIds: newTouchedIds } = await executeTool(fc.name, fc.args, toolContext);
                    
                    newTouchedIds.forEach(id => touchedNoteIds.add(id));
                    
                    setActiveToolName(null);

                    setChatHistories(prev => {
                        const newHistory = prev[chatMode].map(msg => {
                            if (msg.id === toolMessageId) {
                                const currentContent = msg.content;
                                if (typeof currentContent === 'object' && currentContent !== null) {
                                    return {
                                        ...msg,
                                        content: {
                                            ...currentContent,
                                            status,
                                            result,
                                        }
                                    };
                                }
                            }
                            return msg;
                        });
                        return { ...prev, [chatMode]: newHistory };
                    });
                    functionResponses.push({ id: fc.id, name: fc.name, response: { result }});
                }
                
                const functionResponseParts = functionResponses.map(({ name, response }) => ({
                    functionResponse: { name, response },
                }));
                response = await chat.sendMessage({ message: functionResponseParts });
            }

            if (response.text) {
                setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], { id: crypto.randomUUID(), role: 'ai', content: response.text, noteIds: Array.from(touchedNoteIds) }] }));
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setChatError(errorMessage);
            setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], { id: crypto.randomUUID(), role: 'ai', content: `Sorry, I ran into an error: ${errorMessage}` }] }));
        } finally {
            setChatStatus('idle');
            setChatHistories(prev => {
                const newHistory = prev[chatMode].map(msg => msg.id === userMessage.id ? { ...msg, status: 'complete' } : msg);
                return { ...prev, [chatMode]: newHistory };
            });
        }
    }, [chatMode, onAddNote, notes, getNoteById, updateNoteInStore, deleteNote, activeNoteId, store, collections, setActiveNoteId]);
    
    const recallLastMessage = useCallback(() => {
        const currentHistory = chatHistoriesRef.current[chatMode];
        // Use a reverse for-loop for broad compatibility instead of findLastIndex.
        for (let i = currentHistory.length - 1; i >= 0; i--) {
            const msg = currentHistory[i];
            if (msg.role === 'user' && typeof msg.content === 'string') {
                return msg;
            }
        }
        return null;
    }, [chatMode]);
    
    const deleteMessage = useCallback((messageId: string) => {
        setChatHistories(prev => ({
            ...prev,
            [chatMode]: prev[chatMode].filter(msg => msg.id !== messageId)
        }));
    }, [chatMode]);

    const clearChat = useCallback(() => {
        streamSessionIdRef.current++; // Invalidate any in-flight streaming sessions
        setChatHistories(prev => ({ ...prev, [chatMode]: [] }));
        setChatError(null);
        setChatStatus('idle');
        setActiveToolName(null);
        setContextNoteIds([]);
        if (chatMode === 'WESCORE_COPILOT') {
            generalChatRef.current = null;
        }
    }, [chatMode]);
    
    const handleFeedback = useCallback((messageId: string, feedbackData: { rating: 'up' | 'down'; tags?: string[] }) => {
        setChatHistories(prev => {
            const currentHistory = prev[chatMode];
            const updatedHistory = currentHistory.map(msg => {
                if (msg.id === messageId) {
                    return { ...msg, feedback: feedbackData };
                }
                return msg;
            });
            return { ...prev, [chatMode]: updatedHistory };
        });
    }, [chatMode]);
    
    const addResponder = useCallback((prompt: string) => {
        setResponders(prev => [prompt, ...prev.filter(p => p !== prompt)]);
    }, []);

    const deleteResponder = useCallback((index: number) => {
        setResponders(prev => prev.filter((_, i) => i !== index));
    }, []);


    const chatValue = useMemo(() => ({
        chatMessages: chatHistories[chatMode] || [], 
        chatStatus, chatMode, setChatMode, 
        onSendMessage, onGenerateServiceResponse, onSendGeneralMessage, onGenerateAmazonCopy, clearChat,
        activeToolName, deleteMessage, handleFeedback, recallLastMessage,
        responders, addResponder, deleteResponder,
        contextNoteIds, setContextNoteIds,
    }), [
        chatHistories, chatMode, chatStatus, setChatMode,
        onSendMessage, onGenerateServiceResponse, onSendGeneralMessage, onGenerateAmazonCopy, clearChat,
        activeToolName, deleteMessage, handleFeedback, recallLastMessage,
        responders, addResponder, deleteResponder,
        contextNoteIds, setContextNoteIds,
    ]);

    return chatValue;
};