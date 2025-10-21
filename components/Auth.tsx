import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

type AuthView = 'login' | 'signup' | 'resend_confirmation';

const Auth: React.FC = () => {
    const [view, setView] = useState<AuthView>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    useEffect(() => {
        const hash = window.location.hash;
        if (hash.includes('error_code=otp_expired')) {
            setView('resend_confirmation');
            setError('Your confirmation link has expired. Please enter your email to resend it.');
            // Clean up the URL hash
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setNotification(null);

        try {
            if (view === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else { // 'signup'
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: 'https://wesai-np.vercel.app/',
                    },
                });
                if (error) throw error;
                setNotification('Check your email for the confirmation link!');
            }
        } catch (error: any) {
             if (error.message && error.message.includes('already been registered')) {
                setError('This email is already registered but not confirmed.');
                setNotification('Please check your inbox for the confirmation link, or request a new one.');
                setView('resend_confirmation');
            } else {
                setError(error.error_description || error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendConfirmation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError('Please enter your email address.');
            return;
        }
        setLoading(true);
        setError(null);
        setNotification(null);

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
            });
            if (error) throw error;
            setNotification('A new confirmation link has been sent. Please check your inbox.');
            setView('login');
        } catch (error: any) {
            setError(error.error_description || error.message);
        } finally {
            setLoading(false);
        }
    };
    
    if (view === 'resend_confirmation') {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-light-background dark:bg-dark-background">
                <div className="w-full max-w-md p-8 space-y-8 bg-light-ui dark:bg-dark-ui rounded-xl shadow-lg">
                    <div>
                        <h2 className="text-3xl font-bold text-center text-light-text dark:text-dark-text">
                           Resend Confirmation
                        </h2>
                        <p className="mt-2 text-center text-sm text-light-text/70 dark:text-dark-text/70">
                            Enter your email to receive a new confirmation link.
                        </p>
                    </div>
                    <form className="mt-8 space-y-6" onSubmit={handleResendConfirmation}>
                        <div>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-light-border dark:border-dark-border placeholder-light-text/50 dark:placeholder-dark-text/50 text-light-text dark:text-dark-text focus:outline-none focus:ring-light-primary dark:focus:ring-dark-primary focus:border-light-primary dark:focus:border-dark-primary focus:z-10 sm:text-sm bg-light-background dark:bg-dark-background"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        {error && <p className="text-sm text-red-500 text-center pt-4">{error}</p>}
                        {notification && <p className="text-sm text-green-600 dark:text-green-400 text-center pt-4">{notification}</p>}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-light-primary hover:bg-light-primary-hover dark:bg-dark-primary dark:hover:bg-dark-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-primary-hover dark:focus:ring-dark-primary-hover disabled:opacity-50"
                            >
                                {loading ? 'Sending...' : 'Resend Confirmation Email'}
                            </button>
                        </div>
                    </form>
                    <div className="text-sm text-center">
                        <button
                            onClick={() => {
                                setView('login');
                                setError(null);
                                setNotification(null);
                            }}
                            className="font-medium text-light-primary hover:text-light-primary-hover dark:text-dark-primary dark:hover:text-dark-primary-hover"
                        >
                            Back to Sign In
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center h-screen w-screen bg-light-background dark:bg-dark-background">
            <div className="w-full max-w-md p-8 space-y-8 bg-light-ui dark:bg-dark-ui rounded-xl shadow-lg">
                <div>
                    <h2 className="text-3xl font-bold text-center text-light-text dark:text-dark-text">
                        WesAI Notepad
                    </h2>
                    <p className="mt-2 text-center text-sm text-light-text/70 dark:text-dark-text/70">
                        {view === 'login' ? 'Sign in to your account' : 'Create a new account'}
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleAuth}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-light-border dark:border-dark-border placeholder-light-text/50 dark:placeholder-dark-text/50 text-light-text dark:text-dark-text rounded-t-md focus:outline-none focus:ring-light-primary dark:focus:ring-dark-primary focus:border-light-primary dark:focus:border-dark-primary focus:z-10 sm:text-sm bg-light-background dark:bg-dark-background"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-light-border dark:border-dark-border placeholder-light-text/50 dark:placeholder-dark-text/50 text-light-text dark:text-dark-text rounded-b-md focus:outline-none focus:ring-light-primary dark:focus:ring-dark-primary focus:border-light-primary dark:focus:border-dark-primary focus:z-10 sm:text-sm bg-light-background dark:bg-dark-background"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {error && <p className="text-sm text-red-500 text-center pt-4">{error}</p>}
                    {notification && <p className="text-sm text-green-600 dark:text-green-400 text-center pt-4">{notification}</p>}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-light-primary hover:bg-light-primary-hover dark:bg-dark-primary dark:hover:bg-dark-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-primary-hover dark:focus:ring-dark-primary-hover disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : (view === 'login' ? 'Sign In' : 'Sign Up')}
                        </button>
                    </div>
                </form>
                <div className="text-sm text-center">
                    <button
                        onClick={() => {
                          setView(view === 'login' ? 'signup' : 'login');
                          setError(null);
                          setNotification(null);
                        }}
                        className="font-medium text-light-primary hover:text-light-primary-hover dark:text-dark-primary dark:hover:text-dark-primary-hover"
                    >
                        {view === 'login' ? 'Don\'t have an account? Sign Up' : 'Already have an account? Sign In'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;