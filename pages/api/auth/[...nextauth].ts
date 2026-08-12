import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { hasPasskey } from '@/lib/passkey';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            id: 'credentials',
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                // Validate against environment variables
                const validEmail = process.env.USER_EMAIL;
                const validPassword = process.env.USER_PASSWORD;

                if (!validEmail || !validPassword) {
                    throw new Error('Authentication configuration is missing');
                }

                // Simple comparison (in production, use bcrypt.compare for hashed passwords)
                if (credentials.email === validEmail && credentials.password === validPassword) {
                    return {
                        id: '1',
                        email: validEmail,
                        name: 'User',
                    };
                }

                return null;
            }
        }),
        CredentialsProvider({
            id: 'passkey',
            name: 'Passkey',
            credentials: {
                verified: { label: 'Verified', type: 'text' },
            },
            async authorize(credentials) {
                // The client calls /api/passkey/authenticate directly to verify
                // the WebAuthn assertion, then calls signIn('passkey') with
                // { verified: 'true' }. We trust the flag only if a passkey
                // is actually registered.
                if (credentials?.verified !== 'true') return null;
                if (!hasPasskey()) return null;

                const validEmail = process.env.USER_EMAIL;
                return {
                    id: '1',
                    email: validEmail || 'user@finance.local',
                    name: 'User',
                };
            },
        }),
    ],
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.email = token.email as string;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
