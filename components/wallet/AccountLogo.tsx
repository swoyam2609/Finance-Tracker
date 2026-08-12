/**
 * The brand-style mark for one account.
 *
 * Accounts come from a user-editable sheet, so an id we have never seen is a
 * normal state, not an error. The component therefore treats the logo file as
 * optional: it points an `<img>` at `/logos/<slug>.svg` and, the moment that
 * request fails, swaps in an inline monogram tile built from the account's own
 * bloom colour. There is no path through this component that renders a broken
 * image, an empty box, or throws.
 *
 * Plain `<img>` on purpose — these are tiny static SVGs already served from
 * `public/`, so `next/image` would add a loader round-trip and buy nothing.
 */

import { useEffect, useState } from 'react';

import type { Account } from '@/lib/accounts';
import { resolveArt } from '@/lib/accounts';

export interface AccountLogoProps {
    account: Account;
    className?: string;
}

/** `AXIS Bank` -> `axis-bank`. Returns '' when nothing usable survives. */
export function logoSlug(id: string): string {
    return String(id ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Where this account's mark should come from.
 *
 * An `Art` value that is already a `/logos/...` path is an explicit override
 * from the sheet and wins; otherwise the id is slugged into a file name.
 * Returns null when neither yields anything, so the caller goes straight to the
 * monogram without firing a doomed request.
 */
export function logoSrc(account: Pick<Account, 'Id' | 'Art'>): string | null {
    const art = (account.Art || '').trim();
    if (art.startsWith('/logos/')) return art;

    const slug = logoSlug(account.Id);
    return slug ? `/logos/${slug}.svg` : null;
}

/** First character of the label, uppercased. Falls back to the id, then to a dot. */
function monogramLetter(account: Pick<Account, 'Id' | 'Label'>): string {
    const source = (account.Label || account.Id || '').trim();
    return source ? Array.from(source)[0].toUpperCase() : '·';
}

/**
 * The always-available mark: a rounded square in the account's bloom colour
 * with its initial in white. Drawn as SVG rather than a div so the letter
 * scales with the tile instead of needing a font size per call site.
 */
function Monogram({ account, className = '' }: AccountLogoProps) {
    return (
        <svg
            viewBox="0 0 40 40"
            className={`block h-full w-full ${className}`}
            aria-hidden="true"
            focusable="false"
        >
            <rect width="40" height="40" rx="11" fill={resolveArt(account)} />
            <text
                x="20"
                y="20"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="21"
                fontWeight="700"
                fill="#FFFFFF"
            >
                {monogramLetter(account)}
            </text>
        </svg>
    );
}

export default function AccountLogo({ account, className = '' }: AccountLogoProps) {
    const src = logoSrc(account);
    const [failed, setFailed] = useState(false);

    // A different account (or a corrected Art override) deserves a fresh attempt.
    useEffect(() => {
        setFailed(false);
    }, [src]);

    if (!src || failed) return <Monogram account={account} className={className} />;

    return (
        <img
            src={src}
            alt=""
            aria-hidden="true"
            draggable={false}
            decoding="async"
            className={`block h-full w-full object-contain ${className}`}
            onError={() => setFailed(true)}
        />
    );
}
