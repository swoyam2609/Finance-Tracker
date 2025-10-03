import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
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
        })
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

