
import React, { useEffect, useState } from 'react';
import { AppProvider, useUIContext, useAuthContext } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import SuspenseLoader from './components/SuspenseLoader';
import Auth from './components/Auth';
import { setupStorageBucket } from './lib/supabaseClient';
import LandingPage from './components/LandingPage';
import WorkspaceLayout from './components/WorkspaceLayout';

function AppContainer() {
    const { session, isSessionLoading } = useAuthContext();
    const { isDemoMode, setIsDemoMode } = useUIContext();
    const [showAuth, setShowAuth] = useState(false);

    useEffect(() => {
        if (session) {
            setupStorageBucket();
        }
    }, [session]);

    if (isSessionLoading) {
        return <SuspenseLoader />;
    }

    if (!session && !isDemoMode) {
        if (showAuth) {
            return <Auth onBack={() => setShowAuth(false)} onEnterDemo={() => setIsDemoMode(true)} />;
        }
        return <LandingPage onGetStarted={() => setShowAuth(true)} onEnterDemo={() => setIsDemoMode(true)} />;
    }

    return <WorkspaceLayout />;
}

export default function App() {
    return (
        <ToastProvider>
            <AppProvider>
                <AppContainer />
            </AppProvider>
        </ToastProvider>
    );
}
