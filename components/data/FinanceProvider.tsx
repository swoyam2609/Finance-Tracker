/**
 * Single source of truth for sheet-backed finance data.
 *
 * Fetches the Expenses and Accounts tabs once the NextAuth session is
 * authenticated, derives the account list and per-account balances, and hands
 * every screen the same immutable snapshot.
 *
 * Resilience rules, all deliberate:
 *  - An accounts fetch failure falls back to `DEFAULT_ACCOUNTS` instead of
 *    blanking the app.
 *  - A failed `refresh()` keeps the previously loaded data on screen and only
 *    sets `error`. Transactions are never cleared on failure.
 *  - Any account id seen in transactions but missing from the sheet is
 *    synthesized, so history is never hidden by a metadata gap.
 *
 * `loading` vs `refreshing`:
 *  - `loading` is true only while the first successful load is still pending
 *    (i.e. there is no data yet). Gate skeletons on this.
 *  - `refreshing` is true whenever any fetch is in flight, including the
 *    initial one. Gate spinners/opacity on this. A post-mutation `refresh()`
 *    therefore never blanks the UI, because `loading` stays false.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';

import {
    DEFAULT_ACCOUNTS,
    sortAccounts,
    synthesizeAccount,
    type Account,
} from '@/lib/accounts';
import { allBalances, type Balances } from '@/lib/finance';
// Type-only: keeps the server-only Google API client out of the client bundle.
import type { ExpenseData } from '@/lib/google-sheet';

/** A sheet row as the UI sees it. `RowIndex` is absent on optimistic rows. */
export type Transaction = ExpenseData & { RowIndex?: number };

export interface FinanceContextValue {
    /** Every expense row, newest-first exactly as the API returned them. */
    transactions: Transaction[];
    /** Every account, archived ones included. Sorted by `Order`, then `Id`. */
    accounts: Account[];
    /** `accounts` minus archived rows — what carousels and pickers should show. */
    visibleAccounts: Account[];
    /** Signed balance per account id, transfers included. */
    balances: Balances;
    /** True only until the first load resolves. Never true for a refresh. */
    loading: boolean;
    /** True whenever a fetch is in flight, initial load included. */
    refreshing: boolean;
    /** Empty string when healthy. Previous data survives a non-empty error. */
    error: string;
    /** Re-fetches both tabs. Awaitable, for refetch-after-write callers. */
    refresh: () => Promise<void>;
    /** Epoch ms of the last successful load, or null before the first one. */
    lastUpdated: number | null;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

const EXPENSES_URL = '/api/expenses/get';
const ACCOUNTS_URL = '/api/accounts/get';

function toError(value: unknown): Error {
    return value instanceof Error ? value : new Error(String(value));
}

/** Both API routes return bare arrays; anything else is a contract break. */
async function fetchArray(url: string): Promise<unknown[]> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Request to ${url} failed (${response.status})`);
    const payload = await response.json();
    if (!Array.isArray(payload)) throw new Error(`Expected an array from ${url}`);
    return payload;
}

type Settled<T> = { ok: true; value: T } | { ok: false; error: Error };

/** Lets one leg of a `Promise.all` fail without rejecting the other. */
function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
    return promise.then(
        value => ({ ok: true as const, value }),
        error => ({ ok: false as const, error: toError(error) }),
    );
}

/**
 * Appends a synthesized account for every id that appears in `transactions`
 * without a matching sheet row, then re-sorts the whole list.
 */
function withSynthesizedAccounts(sheetAccounts: Account[], transactions: Transaction[]): Account[] {
    const known = new Set(sheetAccounts.map(account => account.Id));
    const maxOrder = sheetAccounts.reduce((max, account) => Math.max(max, account.Order), 0);
    const synthesized: Account[] = [];

    transactions.forEach(txn => {
        const id = String(txn.Account ?? '').trim();
        if (!id || known.has(id)) return;
        known.add(id);
        synthesized.push(synthesizeAccount(id, maxOrder + synthesized.length + 1));
    });

    return sortAccounts(sheetAccounts.concat(synthesized));
}

export default function FinanceProvider({ children }: { children: ReactNode }) {
    const { status } = useSession();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [sheetAccounts, setSheetAccounts] = useState<Account[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);

    const mountedRef = useRef(true);
    /** Monotonic request id, so a slow earlier load cannot clobber a newer one. */
    const requestRef = useRef(0);

    // Re-arming on mount matters: StrictMode mounts, unmounts, then remounts.
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const load = useCallback(async () => {
        const requestId = ++requestRef.current;
        setRefreshing(true);

        const [txnResult, accountResult] = await Promise.all([
            settle(fetchArray(EXPENSES_URL) as Promise<Transaction[]>),
            settle(fetchArray(ACCOUNTS_URL) as Promise<Account[]>),
        ]);

        // A newer load started while this one was in flight, or we unmounted.
        if (!mountedRef.current || requestId !== requestRef.current) return;

        const problems: string[] = [];

        if (txnResult.ok) {
            setTransactions(txnResult.value);
        } else {
            // Keep whatever is already on screen; only report the failure.
            problems.push(txnResult.error.message || 'Failed to load transactions');
        }

        if (accountResult.ok && accountResult.value.length > 0) {
            setSheetAccounts(accountResult.value);
        } else if (accountResult.ok) {
            // Accounts tab missing or empty — the documented default set.
            setSheetAccounts(DEFAULT_ACCOUNTS);
        } else {
            setSheetAccounts(current => (current.length > 0 ? current : DEFAULT_ACCOUNTS));
            problems.push(accountResult.error.message || 'Failed to load accounts');
        }

        setError(problems.join(' · '));
        if (txnResult.ok) setLastUpdated(Date.now());
        setLoaded(true);
        setRefreshing(false);
    }, []);

    const refresh = useCallback(() => load(), [load]);

    useEffect(() => {
        if (status !== 'authenticated') return;
        void load();
    }, [status, load]);

    const accounts = useMemo(
        () => withSynthesizedAccounts(sheetAccounts, transactions),
        [sheetAccounts, transactions],
    );

    const visibleAccounts = useMemo(
        () => accounts.filter(account => !account.Archived),
        [accounts],
    );

    const balances = useMemo(
        () => allBalances(transactions, accounts),
        [transactions, accounts],
    );

    const value = useMemo<FinanceContextValue>(() => ({
        transactions,
        accounts,
        visibleAccounts,
        balances,
        loading: !loaded,
        refreshing,
        error,
        refresh,
        lastUpdated,
    }), [transactions, accounts, visibleAccounts, balances, loaded, refreshing, error, refresh, lastUpdated]);

    return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
    const context = useContext(FinanceContext);
    if (!context) {
        throw new Error('useFinance must be used inside a <FinanceProvider>. Wrap the app in pages/_app.tsx.');
    }
    return context;
}
