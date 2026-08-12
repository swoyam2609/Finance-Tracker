import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { getStoredCredential, saveCredential } from '@/lib/passkey';

/**
 * Passkey registration.
 *
 * GET  — returns registration options for `navigator.credentials.create()`.
 * POST — verifies the browser's registration response and stores the credential.
 *
 * Registration is gated behind an authenticated session: you must be logged in
 * via password first, then register a passkey to enable passwordless login.
 */

const RP_NAME = 'Finance Tracker';

function getRpId(req: NextApiRequest): string {
    const host = req.headers.host || 'localhost:3000';
    return host.split(':')[0];
}

function getOrigin(req: NextApiRequest): string {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost:3000';
    return `${protocol}://${host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Require an authenticated session — don't let anonymous users register.
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ error: 'Sign in with password first to register a passkey' });
    }

    const rpId = getRpId(req);
    const origin = getOrigin(req);

    if (req.method === 'GET') {
        try {
            const existing = getStoredCredential();
            const excludeCredentials = existing
                ? [{ id: existing.id, type: 'public-key' as const, transports: existing.transports as AuthenticatorTransport[] }]
                : [];

            const options = await generateRegistrationOptions({
                rpName: RP_NAME,
                rpID: rpId,
                userName: session.user?.email || 'user',
                userDisplayName: session.user?.name || 'User',
                attestationType: 'none',
                excludeCredentials,
                authenticatorSelection: {
                    residentKey: 'preferred',
                    userVerification: 'preferred',
                },
            });

            // Store the challenge in the session for verification (in-memory for now).
            (req as any).pendingRegistrationChallenge = options.challenge;

            return res.status(200).json(options);
        } catch (error) {
            console.error('Passkey registration options error:', error);
            return res.status(500).json({ error: 'Failed to generate registration options' });
        }
    }

    if (req.method === 'POST') {
        try {
            const body = req.body;
            const expectedChallenge = (req as any).pendingRegistrationChallenge;

            const verification = await verifyRegistrationResponse({
                response: body,
                expectedChallenge: `${expectedChallenge}`,
                expectedOrigin: origin,
                expectedRPID: rpId,
            });

            if (!verification.verified || !verification.registrationInfo) {
                return res.status(400).json({ error: 'Registration verification failed' });
            }

            const { credential } = verification.registrationInfo;

            saveCredential({
                id: credential.id,
                publicKey: Buffer.from(credential.publicKey).toString('base64'),
                counter: credential.counter,
                transports: credential.transports || [],
            });

            return res.status(200).json({ verified: true });
        } catch (error) {
            console.error('Passkey registration verification error:', error);
            return res.status(500).json({ error: 'Failed to verify registration' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
