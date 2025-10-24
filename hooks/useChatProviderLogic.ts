import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChatMessage, Note, ChatMode } from '../types';
import { getStreamingChatResponse, semanticSearchNotes, generateCustomerResponse, getGeneralChatSession, resetGeneralChat } from '../services/geminiService';
import { useStoreContext } from '../context/AppContext';

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
            const initial = { ASSISTANT: [], RESPONDER: [], GENERAL: [] };
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    ASSISTANT: Array.isArray(parsed.ASSISTANT) ? parsed.ASSISTANT : [],
                    RESPONDER: Array.isArray(parsed.RESPONDER) ? parsed.RESPONDER : [],
                    GENERAL: Array.isArray(parsed.GENERAL) ? parsed.GENERAL : [],
                };
            }
            return initial;
        } catch {
            return { ASSISTANT: [], RESPONDER: [], GENERAL: [] };
        }
    });

    const [chatError, setChatError] = useState<string | null>(null);
    const [chatStatus, setChatStatus] = useState<'idle' | 'searching' | 'replying' | 'using_tool'>('idle');

    useEffect(() => {
        try {
            localStorage.setItem(CHAT_HISTORIES_STORAGE_KEY, JSON.stringify(chatHistories));
        } catch (error) {
            console.error("Failed to save chat history to localStorage", error);
        }
    }, [chatHistories]);
    
    const onSendMessage = useCallback(async (query: string, image?: string) => {
        setChatError(null);
        const newUserMessage: ChatMessage = { role: 'user', content: query, image };
        setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], newUserMessage] }));
        setChatStatus('searching');
        try {
            const sourceNoteIds = await semanticSearchNotes(query, notes);
            const sourceNotes = sourceNoteIds.map(id => getNoteById(id)).filter((n): n is Note => !!n);
            setChatStatus('replying');
            const stream = await getStreamingChatResponse(query, sourceNotes, image);
            const newAiMessage: ChatMessage = { role: 'ai', content: '', sources: sourceNotes };
            setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], newAiMessage] }));

            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk.text;
                setChatHistories(prev => {
                    const currentModeHistory = [...prev[chatMode]];
                    if (currentModeHistory.length > 0) {
                        const lastMessage = currentModeHistory[currentModeHistory.length - 1];
                        if(lastMessage.role === 'ai') {
                             currentModeHistory[currentModeHistory.length - 1] = { ...lastMessage, content: fullResponse };
                        }
                    }
                    return { ...prev, [chatMode]: currentModeHistory };
                });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setChatError(errorMessage);
            const errorAiMessage: ChatMessage = { role: 'ai', content: `Sorry, I ran into an error: ${errorMessage}` };
            setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], errorAiMessage] }));
        } finally {
            setChatStatus('idle');
        }
    }, [chatMode, getNoteById, notes]);

    const onGenerateServiceResponse = useCallback(async (customerQuery: string, image?: string) => {
        setChatError(null);
        const newUserMessage: ChatMessage = { role: 'user', content: customerQuery, image };
        setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], newUserMessage] }));
        setChatStatus('searching');
        try {
            const sourceNoteIds = await semanticSearchNotes(customerQuery, notes);
            const sourceNotes = sourceNoteIds.map(id => getNoteById(id)).filter((n): n is Note => !!n);
            setChatStatus('replying');
            const responseText = await generateCustomerResponse(customerQuery, sourceNotes, image);
            setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], { role: 'ai', content: responseText, sources: sourceNotes }] }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setChatError(errorMessage);
            setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], { role: 'ai', content: `Sorry, I ran into an error: ${errorMessage}` }] }));
        } finally {
            setChatStatus('idle');
        }
    }, [chatMode, getNoteById, notes]);

    const onSendGeneralMessage = useCallback(async (query: string, image?: string) => {
        setChatError(null);
        const userMessage: ChatMessage = { role: 'user', content: query, image, status: 'processing' };
        setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], userMessage] }));
        let lastTouchedNoteId: string | null = null;

        try {
            const chat = getGeneralChatSession();
            let response = await chat.sendMessage({ message: query });
            
            while (response.functionCalls && response.functionCalls.length > 0) {
                setChatStatus('using_tool');
                const functionResponses = [];
                const pendingToolMessages: ChatMessage[] = response.functionCalls.map(fc => ({
                    role: 'tool',
                    content: { name: fc.name, args: fc.args, status: 'pending' }
                }));
                setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], ...pendingToolMessages] }));

                for (const fc of response.functionCalls) {
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
                    }

                    setChatHistories(prev => {
                        const newHistory = [...prev[chatMode]];
                        let lastPendingIndex = -1;
                        for (let i = newHistory.length - 1; i >= 0; i--) {
                            const msg = newHistory[i];
                            const content = msg.content;
                            if (
                                msg.role === 'tool' &&
                                typeof content === 'object' &&
                                content !== null &&
                                'name' in content && content.name === fc.name &&
                                'status' in content && content.status === 'pending'
                            ) {
                                lastPendingIndex = i;
                                break;
                            }
                        }
                        
                        if (lastPendingIndex !== -1) {
                            const msgToUpdate = newHistory[lastPendingIndex];
                            const currentContent = msgToUpdate.content;
                            if (typeof currentContent === 'object' && currentContent !== null) {
                                newHistory[lastPendingIndex] = {
                                    ...msgToUpdate,
                                    content: {
                                        ...currentContent,
                                        status,
                                        result,
                                    }
                                };
                            }
                        }
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
                setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], { role: 'ai', content: response.text, noteId: lastTouchedNoteId }] }));
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setChatError(errorMessage);
            setChatHistories(prev => ({ ...prev, [chatMode]: [...prev[chatMode], { role: 'ai', content: `Sorry, I ran into an error: ${errorMessage}` }] }));
        } finally {
            setChatStatus('idle');
            setChatHistories(prev => {
                const newHistory = prev[chatMode].map(msg => msg === userMessage ? { ...msg, status: 'complete' } : msg);
                return { ...prev, [chatMode]: newHistory };
            });
        }
    }, [chatMode, onAddNote, notes, getNoteById, updateNoteInStore, deleteNote, activeNoteId, store, collections, setActiveNoteId]);

    const clearChat = useCallback(() => {
        setChatHistories(prev => ({ ...prev, [chatMode]: [] }));
        setChatError(null);
        setChatStatus('idle');
        if (chatMode === 'GENERAL') {
            resetGeneralChat();
        }
    }, [chatMode]);
    
    const chatValue = useMemo(() => ({
        chatMessages: chatHistories[chatMode] || [], 
        chatStatus, chatMode, setChatMode, 
        onSendMessage, onGenerateServiceResponse, onSendGeneralMessage, clearChat
    }), [
        chatHistories, chatMode, chatStatus, setChatMode,
        onSendMessage, onGenerateServiceResponse, onSendGeneralMessage, clearChat
    ]);

    return chatValue;
}
