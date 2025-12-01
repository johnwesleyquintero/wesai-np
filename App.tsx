
import React, { useEffect, useState, Suspense } from 'react';
import { AppProvider, useUIContext, useAuthContext } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import SuspenseLoader from './components/SuspenseLoader';
import { setupStorageBucket } from './lib/supabaseClient';

// Lazy load main views to split the bundle
const Auth = React.lazy(() => import('./components/Auth'));
const LandingPage = React.lazy(() => import('./components/LandingPage'));
const WorkspaceLayout = React.lazy(() => import('./components/WorkspaceLayout'));

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
            return (
                <Suspense fallback={<SuspenseLoader />}>
                    <Auth onBack={() => setShowAuth(false)} onEnterDemo={() => setIsDemoMode(true)} />
                </Suspense>
            );
        }
        return (
            <Suspense fallback={<SuspenseLoader />}>
                <LandingPage onGetStarted={() => setShowAuth(true)} onEnterDemo={() => setIsDemoMode(true)} />
            </Suspense>
        );
    }

    return (
        <Suspense fallback={<SuspenseLoader />}>
            <WorkspaceLayout />
        </Suspense>
    );
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
