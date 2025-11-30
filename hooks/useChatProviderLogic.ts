import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChatMessage, ChatMode, ChatStatus } from '../types';
import { createGeneralChatSession } from '../services/geminiService';
import { useStoreContext } from '../context/AppContext';
import { Chat } from '@google/genai';
import { useDebounce } from './useDebounce';
import { executeTool, ToolExecutionContext } from '../services/toolExecutionService';

const CHAT_HISTORIES_STORAGE_KEY = 'wesai-chat-histories';

export const useChatProviderLogic = () => {
    const { 
        notes, getNoteById, onAddNote, deleteNote, activeNoteId, setActiveNoteId, 
        updateNote: updateNoteInStore, collections, ...store 
    } = useStoreContext();
    
    // We default to WESCORE_COPILOT as the single unified mode.
    const chatMode: ChatMode = 'WESCORE_COPILOT';

    const [chatHistories, setChatHistories] = useState<Record<ChatMode, ChatMessage[]>>(() => {
        try {
            const saved = localStorage.getItem(CHAT_HISTORIES_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Ensure WESCORE_COPILOT exists
                return {
                    WESCORE_COPILOT: Array.isArray(parsed.WESCORE_COPILOT) ? parsed.WESCORE_COPILOT : [],
                };
            }
            return { WESCORE_COPILOT: [] };
        } catch {
            return { WESCORE_COPILOT: [] };
        }
    });

    const debouncedChatHistories = useDebounce(chatHistories, 1000);
    const [contextNoteIds, setContextNoteIds] = useState<string[]>([]);
    const [chatError, setChatError] = useState<string | null>(null);
    const [chatStatus, setChatStatus] = useState<ChatStatus>('idle');
    const [activeToolName, setActiveToolName] = useState<string | null>(null);
    const chatHistoriesRef = useRef(chatHistories);
    const generalChatRef = useRef<Chat | null>(null);

    useEffect(() => {
        chatHistoriesRef.current = chatHistories;
    }, [chatHistories]);

    // Proactive debounced save to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(CHAT_HISTORIES_STORAGE_KEY, JSON.stringify(debouncedChatHistories));
        } catch (error) {
            console.error("Failed to save chat history to localStorage", error);
        }
    }, [debouncedChatHistories]);

    const sendMessage = useCallback(async (query: string, image?: string) => {
        const getChat = () => {
            if (!generalChatRef.current) {
                generalChatRef.current = createGeneralChatSession();
            }
            return generalChatRef.current;
        };

        setChatError(null);
        
        // Prepare the user message object
        const userMessage: ChatMessage = { 
            id: crypto.randomUUID(), 
            role: 'user', 
            content: query, 
            image, 
            status: 'processing',
            contextNoteIds: [...contextNoteIds] // Snapshot current context
        };

        setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], userMessage] }));
        
        const touchedNoteIds = new Set<string>();

        // Construct the full prompt including context notes if any
        let fullPrompt = query;
        if (contextNoteIds.length > 0) {
            const contextContent = contextNoteIds.map(id => {
                const n = getNoteById(id);
                return n ? `Title: ${n.title}\nID: ${n.id}\nContent:\n${n.content}\n---` : '';
            }).join('\n');
            fullPrompt = `[CONTEXT NOTES PROVIDED BY USER]\n${contextContent}\n\n[USER QUERY]\n${query}`;
        }

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
            
            // If image is present, we need to send it as a part
            let messageParts: any[] = [{ text: fullPrompt }];
            if (image) {
                messageParts.push({
                    inlineData: {
                        mimeType: 'image/jpeg', // Assumption based on ChatInput handling
                        data: image
                    }
                });
            }

            // We use `contents` structure for complex multi-part messages if needed, 
            // but the SDK `sendMessage` takes `string | Part[]`.
            // Let's pass the parts array directly if image exists, otherwise string.
            let response = await chat.sendMessage({ 
                message: image ? messageParts : fullPrompt 
            });
            
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
                const newHistory = prev[chatMode].map(msg => msg.id === userMessage.id ? { ...msg, status: 'complete' as const } : msg);
                return { ...prev, [chatMode]: newHistory };
            });
        }
    }, [onAddNote, notes, getNoteById, updateNoteInStore, deleteNote, activeNoteId, store, collections, setActiveNoteId, contextNoteIds]);
    
    const recallLastMessage = useCallback(() => {
        const currentHistory = chatHistoriesRef.current[chatMode];
        for (let i = currentHistory.length - 1; i >= 0; i--) {
            const msg = currentHistory[i];
            if (msg.role === 'user' && typeof msg.content === 'string') {
                return msg;
            }
        }
        return null;
    }, []);
    
    const deleteMessage = useCallback((messageId: string) => {
        setChatHistories(prev => ({
            ...prev,
            [chatMode]: prev[chatMode].filter(msg => msg.id !== messageId)
        }));
    }, []);

    const clearChat = useCallback(() => {
        setChatHistories(prev => ({ ...prev, [chatMode]: [] }));
        setChatError(null);
        setChatStatus('idle');
        setActiveToolName(null);
        setContextNoteIds([]);
        generalChatRef.current = null;
    }, []);
    
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
    }, []);

    const chatValue = useMemo(() => ({
        chatMessages: chatHistories[chatMode] || [], 
        chatStatus,
        sendMessage, // The single unified handler
        clearChat,
        activeToolName, 
        deleteMessage, 
        handleFeedback, 
        recallLastMessage,
        contextNoteIds, 
        setContextNoteIds,
        // Legacy props compatibility (can be removed later if not used in View)
        chatMode,
    }), [
        chatHistories, chatStatus, sendMessage, clearChat,
        activeToolName, deleteMessage, handleFeedback, recallLastMessage,
        contextNoteIds, setContextNoteIds
    ]);

    return chatValue;
};