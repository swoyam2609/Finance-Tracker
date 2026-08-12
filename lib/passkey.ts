/**
 * Passkey credential storage.
 *
 * This is a single-user app (one email/password in env vars), so the passkey
 * is stored in a JSON file on disk rather than a database. The file holds the
 * WebAuthn credential record needed to verify future authentication assertions.
 *
 * If the file does not exist or is empty, no passkey is registered yet.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CREDENTIAL_PATH = join(process.cwd(), '.passkey-credential.json');

export interface StoredCredential {
    id: string;
    publicKey: string;
    counter: number;
    transports: string[];
}

/** Returns the stored credential, or null if no passkey is registered. */
export function getStoredCredential(): StoredCredential | null {
    if (!existsSync(CREDENTIAL_PATH)) return null;
    try {
        const raw = readFileSync(CREDENTIAL_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed?.id || !parsed?.publicKey) return null;
        return parsed as StoredCredential;
    } catch {
        return null;
    }
}

/** Saves or replaces the stored credential. */
export function saveCredential(credential: StoredCredential): void {
    writeFileSync(CREDENTIAL_PATH, JSON.stringify(credential, null, 2), 'utf-8');
}

/** Removes the stored credential, effectively unregistering the passkey. */
export function clearCredential(): void {
    if (existsSync(CREDENTIAL_PATH)) {
        writeFileSync(CREDENTIAL_PATH, '{}', 'utf-8');
    }
}

/** True when a passkey has been registered. */
export function hasPasskey(): boolean {
    return getStoredCredential() !== null;
}
