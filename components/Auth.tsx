import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { GoogleIcon } from './Icons';

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
    
    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
        });
        if (error) {
            setError(error.message);
            setLoading(false);
        }
    };

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

    return (
        <div className="flex items-center justify-center h-screen w-screen bg-light-background dark:bg-dark-background">
            <div className="w-full max-w-sm p-8 space-y-6 bg-light-ui dark:bg-dark-ui rounded-xl shadow-lg">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">WesAI Notepad</h1>
                    <p className="mt-2 text-sm text-light-text/60 dark:text-dark-text/60">
                        {view === 'login' && 'Sign in to your account'}
                        {view === 'signup' && 'Create a new account'}
                        {view === 'resend_confirmation' && 'Resend Confirmation'}
                    </p>
                </div>

                {error && <div className="p-3 text-center text-sm text-red-700 bg-red-100 rounded-md dark:bg-red-900/30 dark:text-red-200">{error}</div>}
                {notification && <div className="p-3 text-center text-sm text-green-700 bg-green-100 rounded-md dark:bg-green-900/30 dark:text-green-200">{notification}</div>}

                <form className="space-y-4" onSubmit={view === 'resend_confirmation' ? handleResendConfirmation : handleAuth}>
                    <div>
                        <label htmlFor="email" className="sr-only">Email address</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="w-full px-4 py-2 text-sm bg-light-background dark:bg-dark-background rounded-md border border-light-border dark:border-dark-border focus:ring-1 focus:ring-light-primary focus:outline-none"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    {view !== 'resend_confirmation' && (
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="w-full px-4 py-2 text-sm bg-light-background dark:bg-dark-background rounded-md border border-light-border dark:border-dark-border focus:ring-1 focus:ring-light-primary focus:outline-none"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    )}
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900 rounded-md py-2 text-sm font-semibold hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : (
                            view === 'login' ? 'Sign In' :
                            view === 'signup' ? 'Sign Up' :
                            'Resend Confirmation Link'
                        )}
                    </button>
                </form>

                {view !== 'resend_confirmation' && (
                    <>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-light-border dark:border-dark-border"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-light-ui dark:bg-dark-ui text-light-text/60 dark:text-dark-text/60">Or continue with</span>
                            </div>
                        </div>
                        
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="w-full flex items-center justify-center bg-white dark:bg-dark-background rounded-md py-2 text-sm font-semibold border border-light-border dark:border-dark-border hover:bg-light-background dark:hover:bg-dark-ui-hover disabled:opacity-50"
                        >
                            <GoogleIcon className="w-5 h-5 mr-3" />
                            Sign in with Google
                        </button>
                    </>
                )}

                <div className="text-sm text-center">
                    {view === 'login' && (
                        <p className="text-light-text/60 dark:text-dark-text/60">
                            No account?{' '}
                            <button onClick={() => { setView('signup'); setError(null); }} className="font-medium text-light-primary dark:text-dark-primary hover:underline">
                                Sign up
                            </button>
                        </p>
                    )}
                    {view === 'signup' && (
                        <p className="text-light-text/60 dark:text-dark-text/60">
                            Already have an account?{' '}
                            <button onClick={() => { setView('login'); setError(null); }} className="font-medium text-light-primary dark:text-dark-primary hover:underline">
                                Sign in
                            </button>
                        </p>
                    )}
                     {view === 'resend_confirmation' && (
                        <p className="text-light-text/60 dark:text-dark-text/60">
                            Remembered your password?{' '}
                            <button onClick={() => { setView('login'); setError(null); }} className="font-medium text-light-primary dark:text-dark-primary hover:underline">
                                Sign in
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Auth;
