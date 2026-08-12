/**
 * Pure money model. Every currency figure the UI renders comes from here.
 *
 * No React, no network, no `new Date()` without an argument — callers pass
 * `today` so results are deterministic and testable.
 *
 * Aggregate rules preserved from the original single-page implementation:
 *  - `Transfer In` / `Transfer Out` rows never count as income or expense.
 *  - A `Transfer In` landing on an investment account counts as investment.
 *  - Per-account balances include transfer rows, since a transfer really does
 *    move money between accounts.
 */

import type { Account, AccountKind } from './accounts';

/** Minimal shape needed to compute money — a subset of ExpenseData. */
export interface MoneyTxn {
    Date: string;
    Account: string;
    Category: string;
    Amount: string | number;
}

export const TRANSFER_CATEGORIES = ['Transfer In', 'Transfer Out'] as const;

export type Balances = Record<string, number>;

export interface DueInfo {
    /** ISO `YYYY-MM-DD` of the next due date. */
    date: string;
    /** Whole days from `today` to `date`. 0 means due today. */
    daysLeft: number;
    /** True within five days of the due date. */
    isDueSoon: boolean;
    /** True when today falls between the statement day and the due day. */
    inPaymentWindow: boolean;
}

export function amountOf(txn: MoneyTxn): number {
    const parsed = typeof txn.Amount === 'number' ? txn.Amount : parseFloat(txn.Amount || '0');
    return Number.isFinite(parsed) ? parsed : 0;
}

export function isTransfer(txn: MoneyTxn): boolean {
    return txn.Category === 'Transfer In' || txn.Category === 'Transfer Out';
}

/** ISO `YYYY-MM-DD` for a date, in local terms rather than UTC. */
export function isoDay(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ---------------------------------------------------------------- balances

/** Signed sum of every row belonging to one account, transfers included. */
export function accountBalance(txns: MoneyTxn[], id: string): number {
    return txns.reduce((sum, txn) => (txn.Account === id ? sum + amountOf(txn) : sum), 0);
}

/** Balance for every account in `accounts`, plus any account seen only in `txns`. */
export function allBalances(txns: MoneyTxn[], accounts: Account[]): Balances {
    const balances: Balances = {};
    accounts.forEach(account => { balances[account.Id] = 0; });
    txns.forEach(txn => {
        if (!txn.Account) return;
        balances[txn.Account] = (balances[txn.Account] ?? 0) + amountOf(txn);
    });
    return balances;
}

// ------------------------------------------------------------------ credit

/**
 * What is owed on a credit account. A positive stored balance means the card
 * is overpaid, which is credit headroom rather than spendable cash, so it
 * yields zero outstanding.
 */
export function creditOutstanding(account: Account, balance: number): number {
    if (account.Kind !== 'credit') return 0;
    return balance < 0 ? -balance : 0;
}

export function availableCredit(account: Account, outstanding: number): number | null {
    if (account.Kind !== 'credit' || account.CreditLimit <= 0) return null;
    return account.CreditLimit - outstanding;
}

/** Fraction of the limit in use, 0–1. Null when no limit is configured. */
export function utilization(outstanding: number, limit: number): number | null {
    if (!limit || limit <= 0) return null;
    return outstanding / limit;
}

function daysInMonth(year: number, monthIndex: number): number {
    return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Next payment due date for a credit account.
 *
 * `dueDay` is clamped to the length of its month, so a due day of 31 lands on
 * the 28th in February. When this month's due day has already passed, the next
 * month's is returned.
 */
export function nextDue(statementDay: number | null, dueDay: number | null, today: Date): DueInfo | null {
    if (!dueDay || dueDay < 1 || dueDay > 31) return null;

    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const candidate = (monthOffset: number) => {
        const year = startOfToday.getFullYear();
        const monthIndex = startOfToday.getMonth() + monthOffset;
        const shifted = new Date(year, monthIndex, 1);
        const day = Math.min(dueDay, daysInMonth(shifted.getFullYear(), shifted.getMonth()));
        return new Date(shifted.getFullYear(), shifted.getMonth(), day);
    };

    let due = candidate(0);
    if (due.getTime() < startOfToday.getTime()) due = candidate(1);

    const daysLeft = Math.round((due.getTime() - startOfToday.getTime()) / 86400000);
    const dayOfMonth = startOfToday.getDate();
    const inPaymentWindow = statementDay
        ? statementDay <= dueDay
            ? dayOfMonth >= statementDay && dayOfMonth <= dueDay
            : dayOfMonth >= statementDay || dayOfMonth <= dueDay
        : false;

    return { date: isoDay(due), daysLeft, isDueSoon: daysLeft <= 5, inPaymentWindow };
}

// -------------------------------------------------------------- aggregates

function sumBalancesOfKinds(accounts: Account[], balances: Balances, kinds: AccountKind[]): number {
    return accounts.reduce(
        (sum, account) => (kinds.includes(account.Kind) ? sum + (balances[account.Id] ?? 0) : sum),
        0,
    );
}

function sumOutstanding(accounts: Account[], balances: Balances): number {
    return accounts.reduce(
        (sum, account) => sum + creditOutstanding(account, balances[account.Id] ?? 0),
        0,
    );
}

/** Reserves held back from Spendable, keyed by account, for the breakdown sheet. */
export function reserves(accounts: Account[]): { id: string; label: string; amount: number }[] {
    return accounts
        .filter(account => account.MinBalance > 0)
        .map(account => ({ id: account.Id, label: account.Label, amount: account.MinBalance }));
}

/** Cash you can actually spend: liquid balances, less reserves, less what is owed. */
export function spendable(accounts: Account[], balances: Balances): number {
    const liquid = sumBalancesOfKinds(accounts, balances, ['bank', 'cash']);
    const reserved = accounts.reduce((sum, account) => sum + account.MinBalance, 0);
    return liquid - reserved - sumOutstanding(accounts, balances);
}

/** Everything owned, less everything owed. */
export function netWorth(accounts: Account[], balances: Balances): number {
    const owned = sumBalancesOfKinds(accounts, balances, ['bank', 'cash', 'investment']);
    return owned - sumOutstanding(accounts, balances);
}

export function investments(accounts: Account[], balances: Balances): number {
    return sumBalancesOfKinds(accounts, balances, ['investment']);
}

/** Money spent today: negative non-transfer rows dated today, as a positive number. */
export function spentToday(txns: MoneyTxn[], today: Date): number {
    const key = isoDay(today);
    const total = txns.reduce((sum, txn) => {
        if (txn.Date !== key || isTransfer(txn)) return sum;
        const amount = amountOf(txn);
        return amount < 0 ? sum + amount : sum;
    }, 0);
    return Math.abs(total);
}

/** Net change across the calendar month containing `today`, transfers excluded. */
export function monthDelta(txns: MoneyTxn[], today: Date): number {
    const prefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    return txns.reduce((sum, txn) => {
        if (!txn.Date?.startsWith(prefix) || isTransfer(txn)) return sum;
        return sum + amountOf(txn);
    }, 0);
}

/**
 * Income / expense / investment totals for a set of rows.
 * Mirrors the original `getSummary` rules exactly.
 */
export function summarize(txns: MoneyTxn[], accounts: Account[]) {
    const investmentIds = new Set(
        accounts.filter(account => account.Kind === 'investment').map(account => account.Id),
    );

    let totalIncome = 0;
    let totalExpenses = 0;
    let totalInvestment = 0;

    txns.forEach(txn => {
        const amount = amountOf(txn);
        if (txn.Category === 'Transfer In' && investmentIds.has(txn.Account)) {
            totalInvestment += amount;
            return;
        }
        if (isTransfer(txn)) return;
        if (amount >= 0) {
            if (investmentIds.has(txn.Account)) totalInvestment += amount;
            else totalIncome += amount;
        } else {
            totalExpenses += Math.abs(amount);
        }
    });

    return {
        totalIncome,
        totalExpenses,
        totalInvestment,
        netSavings: totalIncome - totalExpenses,
        savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
    };
}
