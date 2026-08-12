/**
 * In-memory challenge store for WebAuthn flows.
 *
 * The challenge generated during the GET request (options) must be available
 * during the POST request (verification). The previous implementation stored
 * it on the `req` object, but GET and POST are separate HTTP requests with
 * separate `req` instances — so the challenge was always `undefined` during
 * verification, and every passkey attempt failed.
 *
 * This is a single-user app running in one server process, so a module-level
 * variable is sufficient. For multi-instance deployments this would need to
 * be a database or Redis.
 */

let pendingRegistrationChallenge: string | null = null;
let pendingAuthChallenge: string | null = null;

export function setRegistrationChallenge(challenge: string): void {
    pendingRegistrationChallenge = challenge;
}

export function getRegistrationChallenge(): string | null {
    return pendingRegistrationChallenge;
}

export function clearRegistrationChallenge(): void {
    pendingRegistrationChallenge = null;
}

export function setAuthChallenge(challenge: string): void {
    pendingAuthChallenge = challenge;
}

export function getAuthChallenge(): string | null {
    return pendingAuthChallenge;
}

export function clearAuthChallenge(): void {
    pendingAuthChallenge = null;
}
