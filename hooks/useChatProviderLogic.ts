import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChatMessage, Note, ChatMode, ChatStatus } from '../types';
import { generateChatStream, semanticSearchNotes, getGeneralChatSession, resetGeneralChat } from '../services/geminiService';
import { useStoreContext } from '../context/AppContext';
import { useDebounce } from './useDebounce';

const CHAT_HISTORIES_STORAGE_KEY = 'wesai-chat-histories';

export const useChatProviderLogic = () => {
    const { 
        notes, getNoteById, onAddNote, deleteNote, activeNoteId, setActiveNoteId, 
        updateNote: updateNoteInStore, collections, ...store 
    } = useStoreContext();
    
    const [chatMode, setChatMode] = useState<ChatMode>('ASSISTANT');
    const [chatHistories, setChatHistories] = useState<Record<ChatMode, ChatMessage[]>>(() => {
        try {
            const saved = localStorage.getItem(CHAT_HISTORIES_STORAGE_KEY);
            const initial = { ASSISTANT: [], RESPONDER: [], GENERAL: [], AMAZON: [] };
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    ASSISTANT: Array.isArray(parsed.ASSISTANT) ? parsed.ASSISTANT : [],
                    RESPONDER: Array.isArray(parsed.RESPONDER) ? parsed.RESPONDER : [],
                    GENERAL: Array.isArray(parsed.GENERAL) ? parsed.GENERAL : [],
                    AMAZON: Array.isArray(parsed.AMAZON) ? parsed.AMAZON : [],
                };
            }
            return initial;
        } catch {
            return { ASSISTANT: [], RESPONDER: [], GENERAL: [], AMAZON: [] };
        }
    });

    const debouncedChatHistories = useDebounce(chatHistories, 1000);
    const [chatError, setChatError] = useState<string | null>(null);
    const [chatStatus, setChatStatus] = useState<ChatStatus>('idle');
    const [activeToolName, setActiveToolName] = useState<string | null>(null);
    const streamSessionIdRef = useRef(0);
    const chatHistoriesRef = useRef(chatHistories);

    useEffect(() => {
        chatHistoriesRef.current = chatHistories;
    }, [chatHistories]);

    useEffect(() => {
        try {
            localStorage.setItem(CHAT_HISTORIES_STORAGE_KEY, JSON.stringify(debouncedChatHistories));
        } catch (error) {
            console.error("Failed to save chat history to localStorage", error);
        }
    }, [debouncedChatHistories]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            try {
                // Use synchronous save on unload to prevent data loss
                localStorage.setItem(CHAT_HISTORIES_STORAGE_KEY, JSON.stringify(chatHistoriesRef.current));
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
        const newUserMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: query, image };
        setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], newUserMessage] }));
        setChatStatus('searching');

        try {
            const sourceNoteIds = await semanticSearchNotes(query, notes);
            const sourceNotes = sourceNoteIds.map(id => getNoteById(id)).filter((n): n is Note => !!n);

            if (currentSessionId !== streamSessionIdRef.current) return;
            
            setChatStatus('replying');
            
            const systemInstruction = getSystemInstruction(sourceNotes);
            const stream = await generateChatStream(query, systemInstruction, image);

            const newAiMessage: ChatMessage = { id: crypto.randomUUID(), role: 'ai', content: '', sources: sourceNotes };
            
            if (currentSessionId !== streamSessionIdRef.current) return;
            setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], newAiMessage] }));

            let fullResponse = '';
            for await (const chunk of stream) {
                if (currentSessionId !== streamSessionIdRef.current) break; // Invalidate stream if chat is cleared
                fullResponse += chunk.text;
                setChatHistories(prev => {
                    const currentModeHistory = [...prev[chatMode]];
                    const messageIndex = currentModeHistory.findIndex(m => m.id === newAiMessage.id);
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
            }
        }
    }, [chatMode, getNoteById, notes]);
    
    const onSendMessage = useCallback(async (query: string, image?: string) => {
        const getSystemInstruction = (sourceNotes: Note[]) => `You are a helpful AI assistant integrated into a note-taking app. Use the provided "Source Notes" to answer the user's query. If the sources are relevant, synthesize them in your answer. If they are not relevant, ignore them. Be concise and helpful.

Source Notes:
${sourceNotes.length > 0 ? sourceNotes.map(n => `--- NOTE: ${n.title} ---\n${n.content}\n`).join('') : 'No source notes provided.'}`;
        
        await _handleStreamedChat(query, image, getSystemInstruction);
    }, [_handleStreamedChat]);

    const onGenerateServiceResponse = useCallback(async (customerQuery: string, image?: string) => {
        const getSystemInstruction = (sourceNotes: Note[]) => `You are a professional and empathetic customer service agent. Your goal is to resolve the customer's issue using the provided knowledge base. If the knowledge base doesn't have the answer, apologize and explain that you will escalate the issue.
Knowledge Base:
${sourceNotes.length > 0 ? sourceNotes.map(n => `--- DOC: ${n.title} ---\n${n.content}\n`).join('') : 'No knowledge provided.'}`;

        await _handleStreamedChat(customerQuery, image, getSystemInstruction);
    }, [_handleStreamedChat]);
    
    const onGenerateAmazonCopy = useCallback(async (productInfo: string, image?: string) => {
        const getSystemInstruction = (sourceNotes: Note[]) => `You are an expert Amazon copywriter. Create a compelling, SEO-optimized product listing based on the provided information. Follow Amazon's style guidelines. The output should be well-structured Markdown, including a title, bullet points, and a product description. Use information from the provided research notes if available.
Research Notes:
${sourceNotes.length > 0 ? sourceNotes.map(n => `--- NOTE: ${n.title} ---\n${n.content}\n`).join('') : 'No research notes provided.'}`;
        
        await _handleStreamedChat(productInfo, image, getSystemInstruction);
    }, [_handleStreamedChat]);

    const onSendGeneralMessage = useCallback(async (query: string, image?: string) => {
        setChatError(null);
        const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: query, image, status: 'processing' };
        setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], userMessage] }));
        let lastTouchedNoteId: string | null = null;

        try {
            const chat = getGeneralChatSession();
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
                    let result: any;
                    let status: 'complete' | 'error' = 'complete';
                    try {
                        switch (fc.name) {
                            case 'createNote':
                                const title = String(fc.args.title || 'Untitled Note');
                                const content = String(fc.args.content || '');
                                const newNoteId = await onAddNote(null, title, content);
                                result = { success: true, noteId: newNoteId };
                                lastTouchedNoteId = newNoteId;
                                break;
                            case 'findNotes':
                                const queryToSearch = String(fc.args.query || '');
                                const foundNotes = notes
                                    .filter(n => n.title.toLowerCase().includes(queryToSearch.toLowerCase()))
                                    .map(n => ({ id: n.id, title: n.title }));
                                result = { notes: foundNotes };
                                break;
                             case 'getNoteContent':
                                const noteIdToRead = String(fc.args.noteId || '');
                                const noteToRead = getNoteById(noteIdToRead);
                                if (noteToRead) {
                                    result = { title: noteToRead.title, content: noteToRead.content };
                                } else {
                                    throw new Error("Note not found.");
                                }
                                break;
                            case 'updateNote':
                                const noteIdToUpdate = String(fc.args.noteId || '');
                                const noteToUpdate = getNoteById(noteIdToUpdate);
                                if (noteToUpdate) {
                                    const updatedFields: { title?: string, content?: string } = {};
                                    if (fc.args.title) updatedFields.title = String(fc.args.title);
                                    if (fc.args.content) updatedFields.content = String(fc.args.content);
                                    
                                    if (Object.keys(updatedFields).length > 0) {
                                        await updateNoteInStore(noteIdToUpdate, updatedFields);
                                        result = { success: true, noteId: noteIdToUpdate };
                                        lastTouchedNoteId = noteIdToUpdate;
                                    } else {
                                        throw new Error("No fields to update were provided.");
                                    }
                                } else {
                                    throw new Error("Note not found.");
                                }
                                break;
                            case 'deleteNote':
                                const noteIdToDelete = String(fc.args.noteId || '');
                                const noteToDeleteInstance = getNoteById(noteIdToDelete);
                                if (noteToDeleteInstance) {
                                    await deleteNote(noteIdToDelete);
                                    if (activeNoteId === noteIdToDelete) setActiveNoteId(null);
                                    result = { success: true, noteId: noteIdToDelete };
                                } else {
                                    throw new Error("Note not found.");
                                }
                                break;
                             case 'createCollection':
                                const name = String(fc.args.name || 'New Folder');
                                const parentId = fc.args.parentId ? String(fc.args.parentId) : null;
                                const newCollectionId = await store.addCollection(name, parentId);
                                result = { success: true, collectionId: newCollectionId };
                                break;
                            case 'findCollections':
                                const collectionQuery = String(fc.args.query || '').toLowerCase();
                                const foundCollections = collections
                                    .filter(c => c.name.toLowerCase().includes(collectionQuery))
                                    .map(c => ({ id: c.id, name: c.name }));
                                result = { collections: foundCollections };
                                break;
                            case 'moveNoteToCollection':
                                const noteIdToMove = String(fc.args.noteId || '');
                                const collectionId = fc.args.collectionId === null || fc.args.collectionId === 'null' ? null : String(fc.args.collectionId);
                                const noteToMove = getNoteById(noteIdToMove);
                                const collection = collectionId ? store.getCollectionById(collectionId) : { name: 'root' };
                                
                                if (noteToMove && (collection || collectionId === null)) {
                                    await store.moveItem(noteIdToMove, collectionId, 'inside');
                                    result = { success: true };
                                } else {
                                    throw new Error("Note or destination folder not found.");
                                }
                                break;
                            default:
                                throw new Error(`Unknown function: ${fc.name}`);
                        }
                    } catch (toolError) {
                        result = { success: false, error: (toolError as Error).message };
                        status = 'error';
                    } finally {
                        setActiveToolName(null);
                    }

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
                setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], { id: crypto.randomUUID(), role: 'ai', content: response.text, noteId: lastTouchedNoteId }] }));
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
        if (chatMode === 'GENERAL') {
            resetGeneralChat();
        }
    }, [chatMode]);
    
    const chatValue = useMemo(() => ({
        chatMessages: chatHistories[chatMode] || [], 
        chatStatus, chatMode, setChatMode, 
        onSendMessage, onGenerateServiceResponse, onSendGeneralMessage, onGenerateAmazonCopy, clearChat,
        activeToolName, deleteMessage,
    }), [
        chatHistories, chatMode, chatStatus, setChatMode,
        onSendMessage, onGenerateServiceResponse, onSendGeneralMessage, onGenerateAmazonCopy, clearChat,
        activeToolName, deleteMessage,
    ]);

    return chatValue;
}