/**
 * Transaction list shaping: filtering, date grouping, and deriving the set of
 * categories actually present in the data.
 *
 * Behaviour is preserved verbatim from the original pages/index.tsx, including
 * two quirks worth naming:
 *  - The list is ordered by reversing sheet order, not by sorting on date.
 *  - Filtering by 'Income' matches on a non-negative amount rather than on the
 *    Category string, so it also catches Transfer In rows and investment credits.
 */

import { amountOf, isTransfer, type MoneyTxn } from './finance';
import { ALL_ACCOUNTS, ALL_CATEGORIES } from './categories';
import { formatDateLabel } from './format';

export interface TxnFilter {
    account?: string;
    category?: string;
}

export interface TxnGroup<T> {
    label: string;
    dateKey: string;
    transactions: T[];
}

/** Applies the account and category filters, then reverses into newest-first order. */
export function filterTransactions<T extends MoneyTxn>(txns: T[], filter: TxnFilter = {}): T[] {
    const account = filter.account ?? ALL_ACCOUNTS;
    const category = filter.category ?? ALL_CATEGORIES;

    let filtered = txns;
    if (account !== ALL_ACCOUNTS) {
        filtered = filtered.filter(txn => txn.Account === account);
    }
    if (category !== ALL_CATEGORIES) {
        filtered = category === 'Income'
            ? filtered.filter(txn => amountOf(txn) >= 0)
            : filtered.filter(txn => txn.Category === category);
    }

    return filtered.slice().reverse();
}

/** Groups by date descending. Rows with no date collect under 'unknown'. */
export function groupTransactionsByDate<T extends MoneyTxn>(txns: T[], today: Date): TxnGroup<T>[] {
    const groupMap: Record<string, T[]> = {};
    txns.forEach(txn => {
        const key = txn.Date || 'unknown';
        if (!groupMap[key]) groupMap[key] = [];
        groupMap[key].push(txn);
    });

    return Object.keys(groupMap)
        .sort()
        .reverse()
        .map(dateKey => ({
            label: formatDateLabel(dateKey, today),
            dateKey,
            transactions: groupMap[dateKey],
        }));
}

/**
 * The categories worth offering as filter chips, derived from the data:
 * any positive row contributes 'Income', negative rows contribute their own
 * category, and transfers never appear.
 */
export function activeCategories(txns: MoneyTxn[]): string[] {
    const found = new Set<string>();
    txns.forEach(txn => {
        const amount = amountOf(txn);
        if (amount >= 0) {
            found.add('Income');
            return;
        }
        if (txn.Category && !isTransfer(txn)) found.add(txn.Category);
    });
    return [ALL_CATEGORIES, ...Array.from(found).sort()];
}

/** Months present in the data as `YYYY-MM`, newest first. */
export function availableMonths(txns: MoneyTxn[]): string[] {
    const months = new Set<string>();
    txns.forEach(txn => {
        if (!txn.Date) return;
        const date = new Date(txn.Date);
        if (Number.isNaN(date.getTime())) return;
        months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(months).sort().reverse();
}

/** Filters to one `YYYY-MM` period, or returns everything for 'overall'. */
export function filterByPeriod<T extends MoneyTxn>(txns: T[], period: string): T[] {
    if (period === 'overall') return txns;
    return txns.filter(txn => {
        if (!txn.Date) return false;
        const date = new Date(txn.Date);
        if (Number.isNaN(date.getTime())) return false;
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === period;
    });
}
