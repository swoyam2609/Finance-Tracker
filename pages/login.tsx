import { FormEvent, useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Fingerprint, KeyRound, Plus } from 'lucide-react';
import {
    startAuthentication,
    startRegistration,
} from '@simplewebauthn/browser';
import { ART_PRESETS } from '@/lib/accounts';

export default function Login() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [passkeyLoading, setPasskeyLoading] = useState(false);
    const [passkeyRegistered, setPasskeyRegistered] = useState(false);
    const [registeringPasskey, setRegisteringPasskey] = useState(false);

    // Check if a passkey is already registered on mount.
    useEffect(() => {
        fetch('/api/passkey/authenticate', { method: 'GET' })
            .then(res => { if (res.ok) setPasskeyRegistered(true); })
            .catch(() => {});
    }, []);

    // Redirect if already authenticated
    if (status === 'authenticated' && !registeringPasskey) {
        router.push('/');
        return null;
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                redirect: false,
                email,
                password,
            });

            if (result?.error) {
                setError('Invalid email or password');
            } else if (result?.ok) {
                router.push('/');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasskeyLogin = async () => {
        setError('');
        setPasskeyLoading(true);
        try {
            // 1. Get auth options from the server.
            const optsRes = await fetch('/api/passkey/authenticate');
            if (!optsRes.ok) {
                setError('No passkey registered. Sign in with password first to set one up.');
                return;
            }
            const opts = await optsRes.json();

            // 2. Prompt the browser for the passkey (Face ID / Touch ID / security key).
            const asseResp = await startAuthentication({ optionsJSON: opts });

            // 3. Verify the assertion server-side.
            const verifyRes = await fetch('/api/passkey/authenticate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(asseResp),
            });

            if (!verifyRes.ok) {
                setError('Passkey verification failed');
                return;
            }

            // 4. Complete sign-in via NextAuth.
            const result = await signIn('passkey', {
                redirect: false,
                verified: 'true',
            });

            if (result?.ok) {
                router.push('/');
            } else {
                setError('Passkey sign-in failed');
            }
        } catch (err: any) {
            if (err?.name === 'NotAllowedError') return; // user cancelled
            setError(err instanceof Error ? err.message : 'Passkey authentication failed');
        } finally {
            setPasskeyLoading(false);
        }
    };

    const handleRegisterPasskey = async () => {
        setError('');
        setRegisteringPasskey(true);
        setPasskeyLoading(true);
        try {
            // 1. Get registration options (requires an active session).
            const optsRes = await fetch('/api/passkey/register');
            if (!optsRes.ok) {
                setError('Sign in with password first to register a passkey');
                return;
            }
            const opts = await optsRes.json();

            // 2. Prompt the browser to create a passkey.
            const attResp = await startRegistration({ optionsJSON: opts });

            // 3. Verify and store the credential server-side.
            const verifyRes = await fetch('/api/passkey/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(attResp),
            });

            if (!verifyRes.ok) {
                setError('Passkey registration failed');
                return;
            }

            setPasskeyRegistered(true);
            // Redirect to home after successful registration.
            router.push('/');
        } catch (err: any) {
            if (err?.name === 'NotAllowedError') return;
            setError(err instanceof Error ? err.message : 'Passkey registration failed');
        } finally {
            setPasskeyLoading(false);
            setRegisteringPasskey(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-sys-bg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-sys-fill border-t-sys-blue mx-auto" />
                    <p className="mt-4 text-sys-label-secondary text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    const showPasskeyRegister = status === 'authenticated' && !passkeyRegistered;

    return (
        <>
            <Head>
                <title>Sign In - Finance Tracker</title>
                <link rel="icon" type="image/png" href="/favicon.png?v=2" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="Finance" />
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <meta name="theme-color" content="#000000" />
            </Head>
            <div className="min-h-screen flex flex-col items-center justify-center bg-sys-bg px-4 relative overflow-hidden">
                {/* Ambient bloom so the background never reads flat */}
                <div
                    className="pointer-events-none absolute left-1/2 top-1/2"
                    style={{
                        width: 600,
                        height: 600,
                        marginLeft: -300,
                        marginTop: -300,
                        background:
                            'radial-gradient(circle, rgba(122,92,255,0.12) 0%, transparent 70%)',
                    }}
                />

                {/* App Icon */}
                <div className="mb-8 animate-fade-in relative z-10">
                    <div className="glass overflow-hidden w-20 h-20 rounded-[22px] flex items-center justify-center shadow-lg shadow-sys-blue/20 relative">
                        <div className="glass-bloom" style={{ background: ART_PRESETS.blue }} />
                        <div className="glass-scrim" />
                        <div className="relative">
                            <img src="/logos/app-logo.svg" alt="" className="w-14 h-14" draggable={false} decoding="async" />
                        </div>
                    </div>
                </div>

                {/* Title */}
                <div className="text-center mb-10 animate-fade-in" style={{ animationDelay: '100ms' }}>
                    <h1 className="text-3xl font-bold text-sys-label tracking-tight">
                        Finance Tracker
                    </h1>
                    <p className="mt-2 text-sys-label-secondary text-base">
                        {showPasskeyRegister ? 'Register a passkey for faster sign-in' : 'Sign in to continue'}
                    </p>
                </div>

                {/* Form Card */}
                <div className="w-full max-w-sm animate-slide-up relative z-10" style={{ animationDelay: '150ms' }}>
                    {showPasskeyRegister ? (
                        /* After password login, prompt to register a passkey */
                        <div className="space-y-4">
                            <button
                                onClick={handleRegisterPasskey}
                                disabled={passkeyLoading}
                                className="w-full bg-gradient-to-r from-sys-blue to-sys-purple text-white font-semibold py-3.5 rounded-xl text-[17px] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {passkeyLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Setting up...
                                    </span>
                                ) : (
                                    <><Fingerprint className="w-5 h-5" /> Set up passkey</>
                                )}
                            </button>
                            <button
                                onClick={() => router.push('/')}
                                className="w-full text-sys-label-secondary font-medium py-2 text-sm"
                            >
                                Skip for now
                            </button>
                        </div>
                    ) : (
                        <>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Grouped inputs - iOS style */}
                                <div className="glass overflow-hidden relative">
                                    <div className="glass-bloom" style={{ background: ART_PRESETS.blue }} />
                                    <div className="glass-scrim" />
                                    <div className="relative">
                                        <input
                                            id="email-address"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            className="w-full px-4 py-3.5 bg-transparent text-sys-label placeholder-sys-label-tertiary focus:outline-none text-[17px]"
                                            placeholder="Email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="border-t border-sys-separator ml-4" />
                                    <div className="relative">
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete="current-password"
                                            required
                                            className="w-full px-4 py-3.5 bg-transparent text-sys-label placeholder-sys-label-tertiary focus:outline-none text-[17px]"
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 px-1 animate-scale-in">
                                        <svg className="w-4 h-4 text-sys-red flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                        <p className="text-sm text-sys-red">{error}</p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-sys-blue to-sys-purple text-white font-semibold py-3.5 rounded-xl text-[17px] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Signing In...
                                        </span>
                                    ) : (
                                        'Sign In'
                                    )}
                                </button>
                            </form>

                            {/* Passkey sign-in divider + button */}
                            {passkeyRegistered && (
                                <>
                                    <div className="flex items-center gap-3 py-2">
                                        <div className="flex-1 h-px bg-sys-separator" />
                                        <span className="text-xs text-sys-label-tertiary uppercase tracking-wider">or</span>
                                        <div className="flex-1 h-px bg-sys-separator" />
                                    </div>
                                    <button
                                        onClick={handlePasskeyLogin}
                                        disabled={passkeyLoading}
                                        className="w-full glass overflow-hidden text-sys-label font-semibold py-3.5 rounded-xl text-[17px] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative"
                                    >
                                        <div className="glass-bloom" style={{ background: ART_PRESETS.green }} aria-hidden="true" />
                                        <div className="glass-scrim" aria-hidden="true" />
                                        <span className="relative flex items-center gap-2">
                                            {passkeyLoading ? (
                                                <>
                                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    Verifying...
                                                </>
                                            ) : (
                                                <><Fingerprint className="w-5 h-5" /> Sign in with passkey</>
                                            )}
                                        </span>
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
