import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, ReactNode } from 'react';
import { AuthSession, EditorActions, ContextMenuItem, SmartCollection, ViewState, ConfirmationState, ConfirmationOptions, Note, ChatMessage, ChatMode, ChatStatus, SearchMode, TreeNode, NoteVersion } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useUIProviderLogic } from '../hooks/useUIProviderLogic';
import { useStoreProviderLogic } from '../hooks/useStoreProviderLogic';
import { useChatProviderLogic } from '../hooks/useChatProviderLogic';
import { useEditorProviderLogic } from '../hooks/useEditorProviderLogic';

// --- CONTEXT DEFINITIONS ---
interface AuthContextType {
    session: AuthSession | null;
    isSessionLoading: boolean;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

type StoreContextType = ReturnType<typeof useStoreProviderLogic>;
const StoreContext = createContext<StoreContextType | undefined>(undefined);

type ChatContextType = ReturnType<typeof useChatProviderLogic>;
const ChatContext = createContext<ChatContextType | undefined>(undefined);

type UIContextType = ReturnType<typeof useUIProviderLogic>;
const UIContext = createContext<UIContextType | undefined>(undefined);

type EditorContextType = ReturnType<typeof useEditorProviderLogic>;
const EditorContext = createContext<EditorContextType | undefined>(undefined);

// --- HOOKS (for consuming contexts) ---
export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuthContext must be used within an AppProvider');
    return context;
};
export const useStoreContext = () => {
    const context = useContext(StoreContext);
    if (!context) throw new Error('useStoreContext must be used within an AppProvider');
    return context;
};
export const useChatContext = () => {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChatContext must be used within an AppProvider');
    return context;
};
export const useUIContext = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error('useUIContext must be used within an AppProvider');
    return context;
};
export const useEditorContext = () => {
    const context = useContext(EditorContext);
    if (!context) throw new Error('useEditorContext must be used within an AppProvider');
    return context;
};


// --- PROVIDER COMPONENTS ---
const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [isSessionLoading, setIsSessionLoading] = useState(true);
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setIsSessionLoading(false); });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
        return () => subscription.unsubscribe();
    }, []);
    const authValue = useMemo(() => ({ session, isSessionLoading }), [session, isSessionLoading]);
    return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
}

const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const uiValue = useUIProviderLogic();
    return <UIContext.Provider value={uiValue}>{children}</UIContext.Provider>;
}

const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const storeValue = useStoreProviderLogic();
    return <StoreContext.Provider value={storeValue}>{children}</StoreContext.Provider>;
};

const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const chatValue = useChatProviderLogic();
    return <ChatContext.Provider value={chatValue}>{children}</ChatContext.Provider>;
}

const EditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const editorValue = useEditorProviderLogic();
    return <EditorContext.Provider value={editorValue}>{children}</EditorContext.Provider>;
}

// --- MASTER PROVIDER ---
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <AuthProvider>
            <UIProvider>
                <StoreProvider>
                    <ChatProvider>
                        <EditorProvider>
                            {children}
                        </EditorProvider>
                    </ChatProvider>
                </StoreProvider>
            </UIProvider>
        </AuthProvider>
    );
};