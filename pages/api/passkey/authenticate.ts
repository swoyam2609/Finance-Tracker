import type { NextApiRequest, NextApiResponse } from 'next';
import {
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { getStoredCredential } from '@/lib/passkey';

/**
 * Passkey authentication.
 *
 * GET  — returns authentication options for `navigator.credentials.get()`.
 * POST — verifies the browser's authentication response.
 *
 * On successful verification, returns a flag the client uses to complete
 * sign-in via NextAuth's credentials provider.
 */

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
    if (req.method === 'GET') {
        try {
            const credential = getStoredCredential();
            if (!credential) {
                return res.status(404).json({ error: 'No passkey registered' });
            }

            const allowCredentials = [{
                id: credential.id,
                type: 'public-key' as const,
                transports: credential.transports as AuthenticatorTransport[],
            }];

            const options = await generateAuthenticationOptions({
                rpID: getRpId(req),
                allowCredentials,
                userVerification: 'preferred',
            });

            // Store the challenge for verification (in-memory).
            (req as any).pendingAuthChallenge = options.challenge;

            return res.status(200).json(options);
        } catch (error) {
            console.error('Passkey auth options error:', error);
            return res.status(500).json({ error: 'Failed to generate authentication options' });
        }
    }

    if (req.method === 'POST') {
        try {
            const credential = getStoredCredential();
            if (!credential) {
                return res.status(404).json({ error: 'No passkey registered' });
            }

            const body = req.body;
            const expectedChallenge = (req as any).pendingAuthChallenge;

            const verification = await verifyAuthenticationResponse({
                response: body,
                expectedChallenge: `${expectedChallenge}`,
                expectedOrigin: getOrigin(req),
                expectedRPID: getRpId(req),
                credential: {
                    id: credential.id,
                    publicKey: Buffer.from(credential.publicKey, 'base64'),
                    counter: credential.counter,
                    transports: credential.transports as AuthenticatorTransport[],
                },
            });

            if (!verification.verified) {
                return res.status(401).json({ error: 'Authentication failed' });
            }

            // Update the counter to prevent replay attacks.
            credential.counter = verification.authenticationInfo.newCounter;
            const { saveCredential } = await import('@/lib/passkey');
            saveCredential(credential);

            return res.status(200).json({ verified: true });
        } catch (error) {
            console.error('Passkey auth verification error:', error);
            return res.status(500).json({ error: 'Failed to verify authentication' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
