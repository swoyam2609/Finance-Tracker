import { FormEvent, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Login() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Redirect if already authenticated
    if (status === 'authenticated') {
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

    return (
        <>
            <Head>
                <title>Sign In - Finance Tracker</title>
            </Head>
            <div className="min-h-screen flex flex-col items-center justify-center bg-sys-bg px-4">
                {/* App Icon */}
                <div className="mb-8 animate-fade-in">
                    <div className="w-20 h-20 rounded-[22px] bg-sys-blue flex items-center justify-center shadow-lg shadow-sys-blue/20">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <div className="text-center mb-10 animate-fade-in" style={{ animationDelay: '100ms' }}>
                    <h1 className="text-3xl font-bold text-sys-label tracking-tight">
                        Finance Tracker
                    </h1>
                    <p className="mt-2 text-sys-label-secondary text-base">
                        Sign in to continue
                    </p>
                </div>

                {/* Form Card */}
                <div className="w-full max-w-sm animate-slide-up" style={{ animationDelay: '150ms' }}>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Grouped inputs - iOS style */}
                        <div className="apple-card overflow-hidden">
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
                            className="w-full bg-sys-blue text-white font-semibold py-3.5 rounded-xl text-[17px] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
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
                </div>
            </div>
        </>
    );
}
