import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback, ReactNode } from 'react';
import { AuthSession, EditorActions, ContextMenuItem } from '../types';
import { useStoreProviderLogic } from '../hooks/useStoreProviderLogic';
import { useUIProviderLogic } from '../hooks/useUIProviderLogic';
import { useChatProviderLogic } from '../hooks/useChatProviderLogic';
import { useEditorProviderLogic } from '../hooks/useEditorProviderLogic';
import { SupabaseClient } from '@supabase/supabase-js';

// --- Context Definitions ---

// Supabase Context
interface SupabaseContextType {
    supabase: SupabaseClient;
    onReset: () => void;
}
const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);
export const useSupabase = () => {
    const context = useContext(SupabaseContext);
    if (!context) throw new Error('useSupabase must be used within a SupabaseProvider');
    return context;
};

// Auth Context
interface AuthContextType {
    session: AuthSession | null;
    isSessionLoading: boolean;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuthContext must be used within an AppProvider');
    return context;
};

// Store Context
// FIX: Add triggerNoteImport to the context type.
type StoreContextType = ReturnType<typeof useStoreProviderLogic> & { triggerNoteImport: () => void; };
const StoreContext = createContext<StoreContextType | undefined>(undefined);
export const useStoreContext = () => {
    const context = useContext(StoreContext);
    if (!context) throw new Error('useStoreContext must be used within an AppProvider');
    return context;
};

// Chat Context
type ChatContextType = ReturnType<typeof useChatProviderLogic>;
const ChatContext = createContext<ChatContextType | undefined>(undefined);
export const useChatContext = () => {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChatContext must be used within an AppProvider');
    return context;
};

// UI Context
type UIContextType = ReturnType<typeof useUIProviderLogic>;
const UIContext = createContext<UIContextType | undefined>(undefined);
export const useUIContext = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error('useUIContext must be used within an AppProvider');
    return context;
};

// Editor Context
type EditorContextType = ReturnType<typeof useEditorProviderLogic>;
const EditorContext = createContext<EditorContextType | undefined>(undefined);
export const useEditorContext = () => {
    const context = useContext(EditorContext);
    if (!context) throw new Error('useEditorContext must be used within an AppProvider');
    return context;
};

export const SupabaseProvider: React.FC<{ children: ReactNode, supabase: SupabaseClient, onReset: () => void }> = ({ children, supabase, onReset }) => {
    const value = useMemo(() => ({ supabase, onReset }), [supabase, onReset]);
    return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>
}

const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [isSessionLoading, setIsSessionLoading] = useState(true);
    const { supabase } = useSupabase();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setIsSessionLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    const authValue = useMemo(() => ({ session, isSessionLoading }), [session, isSessionLoading]);
    return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
}

const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { supabase } = useSupabase();
    const uiValue = useUIProviderLogic(supabase);
    return <UIContext.Provider value={uiValue}>{children}</UIContext.Provider>;
}

const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const storeLogic = useStoreProviderLogic();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const content = loadEvent.target?.result as string;
                if (content !== null) {
                    storeLogic.onAddNoteFromFile(file.name, content, null);
                }
            };
            reader.readAsText(file);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [storeLogic]);

    const triggerNoteImport = useCallback(() => fileInputRef.current?.click(), []);

    const storeValue = useMemo(() => ({
        ...storeLogic,
        triggerNoteImport,
    }), [storeLogic, triggerNoteImport]);
    
    return (
        <StoreContext.Provider value={storeValue}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileImport}
                accept=".md,.txt,text/plain,text/markdown"
                className="hidden"
            />
            {children}
        </StoreContext.Provider>
    );
};

const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const chatValue = useChatProviderLogic();
    return <ChatContext.Provider value={chatValue}>{children}</ChatContext.Provider>;
}

const EditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const editorValue = useEditorProviderLogic();
    return <EditorContext.Provider value={editorValue}>{children}</EditorContext.Provider>;
}

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
