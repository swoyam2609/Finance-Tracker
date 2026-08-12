/**
 * Account metadata: types, card art presets, sheet-row coercion, and the
 * built-in defaults used when the spreadsheet has no `Accounts` tab yet.
 *
 * This module is client-safe — it must never import from `lib/google-sheet`,
 * which pulls in the Google API client.
 */

export type AccountKind = 'bank' | 'credit' | 'cash' | 'investment';

export interface Account {
    /** Join key. Must equal the `Account` value written in Expenses rows. */
    Id: string;
    /** Display name. Safe to change without orphaning history. */
    Label: string;
    Kind: AccountKind;
    /** Masked number suffix, e.g. "9034". Empty when unknown. */
    Last4: string;
    /** visa | mastercard | rupay | amex | '' */
    Network: string;
    /** Art preset name, or a raw `#rrggbb`. Empty falls back to the kind default. */
    Art: string;
    /** Credit accounts only. 0 when unset. */
    CreditLimit: number;
    /** Reserve held back from Spendable. 0 when unset. */
    MinBalance: number;
    /** Credit accounts only. Day of month the statement is generated. */
    StatementDay: number | null;
    /** Credit accounts only. Day of month payment is due. */
    DueDay: number | null;
    /** Carousel order, ascending. */
    Order: number;
    /** Hidden from the UI but still counted in history. */
    Archived: boolean;
}

/** Bloom colour presets, referenced by name from the sheet's `Art` column. */
export const ART_PRESETS: Record<string, string> = {
    maroon: '#C2415A',
    blue: '#3D7DFF',
    violet: '#7A5CFF',
    green: '#26A862',
    teal: '#00B8A9',
    amber: '#FF9F0A',
    pink: '#FF375F',
    slate: '#6E6E78',
};

const KIND_ART: Record<AccountKind, string> = {
    bank: 'blue',
    credit: 'violet',
    cash: 'green',
    investment: 'teal',
};

const KINDS: AccountKind[] = ['bank', 'credit', 'cash', 'investment'];
const HEX = /^#[0-9a-fA-F]{6}$/;

/** Resolves an account's bloom colour to a concrete hex value. */
export function resolveArt(account: Pick<Account, 'Art' | 'Kind'>): string {
    const art = (account.Art || '').trim();
    if (HEX.test(art)) return art;
    if (ART_PRESETS[art.toLowerCase()]) return ART_PRESETS[art.toLowerCase()];
    return ART_PRESETS[KIND_ART[account.Kind]] ?? ART_PRESETS.slate;
}

function toNumber(value: unknown): number {
    const parsed = parseFloat(String(value ?? '').replace(/[,₹\s]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
}

function toDayOfMonth(value: unknown): number | null {
    const parsed = Math.trunc(toNumber(value));
    return parsed >= 1 && parsed <= 31 ? parsed : null;
}

function toKind(value: unknown): AccountKind {
    const kind = String(value ?? '').trim().toLowerCase();
    return (KINDS as string[]).includes(kind) ? (kind as AccountKind) : 'bank';
}

function toBoolean(value: unknown): boolean {
    const flag = String(value ?? '').trim().toLowerCase();
    return flag === 'true' || flag === 'yes' || flag === '1' || flag === 'y';
}

/**
 * Coerces one raw `Accounts` sheet row into an `Account`.
 * Returns null when the row has no usable `Id`, so callers can skip it.
 */
export function coerceAccount(row: Record<string, unknown>, index: number): Account | null {
    const id = String(row.Id ?? '').trim();
    if (!id) return null;

    const kind = toKind(row.Kind);
    const order = toNumber(row.Order);

    return {
        Id: id,
        Label: String(row.Label ?? '').trim() || id,
        Kind: kind,
        Last4: String(row.Last4 ?? '').trim(),
        Network: String(row.Network ?? '').trim().toLowerCase(),
        Art: String(row.Art ?? '').trim(),
        CreditLimit: toNumber(row.CreditLimit),
        MinBalance: toNumber(row.MinBalance),
        StatementDay: kind === 'credit' ? toDayOfMonth(row.StatementDay) : null,
        DueDay: kind === 'credit' ? toDayOfMonth(row.DueDay) : null,
        Order: order > 0 ? order : index + 1,
        Archived: toBoolean(row.Archived),
    };
}

/**
 * Fallback used when the `Accounts` tab is missing or empty. Reproduces the
 * behaviour the app had before the tab existed, including the 15,000 total
 * minimum-balance reserve that used to be a hardcoded subtraction.
 */
export const DEFAULT_ACCOUNTS: Account[] = [
    {
        Id: 'AXIS Bank', Label: 'AXIS Bank', Kind: 'bank', Last4: '', Network: '', Art: 'maroon',
        CreditLimit: 0, MinBalance: 12000, StatementDay: null, DueDay: null, Order: 1, Archived: false,
    },
    {
        Id: 'SBI Bank', Label: 'SBI Bank', Kind: 'bank', Last4: '', Network: '', Art: 'blue',
        CreditLimit: 0, MinBalance: 3000, StatementDay: null, DueDay: null, Order: 2, Archived: false,
    },
    {
        Id: 'Credit Card', Label: 'Credit Card', Kind: 'credit', Last4: '', Network: '', Art: 'violet',
        CreditLimit: 0, MinBalance: 0, StatementDay: null, DueDay: null, Order: 3, Archived: false,
    },
    {
        Id: 'Cash', Label: 'Cash', Kind: 'cash', Last4: '', Network: '', Art: 'green',
        CreditLimit: 0, MinBalance: 0, StatementDay: null, DueDay: null, Order: 4, Archived: false,
    },
    {
        Id: 'Mutual Fund', Label: 'Mutual Fund', Kind: 'investment', Last4: '', Network: '', Art: 'teal',
        CreditLimit: 0, MinBalance: 0, StatementDay: null, DueDay: null, Order: 5, Archived: false,
    },
];

/**
 * Builds a stand-in account for a transaction whose `Account` value has no row
 * in the sheet, so history is never hidden by a metadata gap.
 */
export function synthesizeAccount(id: string, order: number): Account {
    return {
        Id: id, Label: id, Kind: 'bank', Last4: '', Network: '', Art: '',
        CreditLimit: 0, MinBalance: 0, StatementDay: null, DueDay: null, Order: order, Archived: false,
    };
}

export function sortAccounts(accounts: Account[]): Account[] {
    return accounts.slice().sort((a, b) => a.Order - b.Order || a.Id.localeCompare(b.Id));
}
