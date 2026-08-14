/**
 * Transfers route — moves money between two accounts.
 *
 * Ported from the old Transfers tab in pages/index.tsx. The submit flow is
 * unchanged: POST the raw form to /api/transfers/add, reset + toast + refresh on
 * success, keep the form filled on failure.
 *
 * Two things the cramped tab could not do:
 *  - Query-string prefill (`?from=&to=&amount=`), so the credit card's
 *    "Log payment" action can deep-link into a half-filled form.
 *  - A "Recent transfers" list under the form.
 */

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { ArrowRightLeft, History } from 'lucide-react';

import AppShell from '@/components/layout/AppShell';
import { useFinance } from '@/components/data/FinanceProvider';
import { useToast } from '@/components/layout/ToastHost';
import { PressableCard } from '@/components/MotionPrimitives';
import AccountLogo from '@/components/wallet/AccountLogo';
import { formatIndianCurrency, formatShortDate } from '@/lib/format';
import { amountOf } from '@/lib/finance';
import { ART_PRESETS, type Account } from '@/lib/accounts';

interface TransferForm {
    Date: string;
    FromAccount: string;
    ToAccount: string;
    Amount: string;
    Description: string;
}

/** Prefillable fields, so an untouched one can be overwritten and a touched one cannot. */
type PrefillField = 'FromAccount' | 'ToAccount' | 'Amount';

const DEFAULT_FROM = 'AXIS Bank';
const DEFAULT_TO = 'SBI Bank';
const RECENT_LIMIT = 10;

function today(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * The documented defaults, degraded safely: if `AXIS Bank` / `SBI Bank` are not
 * in the visible set, fall back to the first and second visible account so the
 * select never renders a value that has no matching <option>.
 */
function resolveDefaults(visibleAccounts: Account[]): { FromAccount: string; ToAccount: string } {
    const has = (id: string) => visibleAccounts.some(account => account.Id === id);
    const first = visibleAccounts[0]?.Id ?? DEFAULT_FROM;
    const second = visibleAccounts[1]?.Id ?? first;

    return {
        FromAccount: has(DEFAULT_FROM) ? DEFAULT_FROM : first,
        ToAccount: has(DEFAULT_TO) ? DEFAULT_TO : second,
    };
}

/** `router.query` values may be repeated; take the first occurrence. */
function firstValue(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return value[0] ?? '';
    return value ?? '';
}

/** An account id from the query string, but only if it actually exists. */
function readAccountParam(
    value: string | string[] | undefined,
    visibleAccounts: Account[],
): string | null {
    const id = firstValue(value).trim();
    if (!id) return null;
    return visibleAccounts.some(account => account.Id === id) ? id : null;
}

/** A positive finite amount from the query string. Anything else is ignored. */
function readAmountParam(value: string | string[] | undefined): string | null {
    const raw = firstValue(value).trim();
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return String(parsed);
}

function Spinner() {
    return (
        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
    );
}

export default function TransfersPage() {
    const router = useRouter();
    const { transactions, visibleAccounts, refresh } = useFinance();
    const { addToast } = useToast();

    const [formData, setFormData] = useState<TransferForm>({
        Date: today(),
        FromAccount: DEFAULT_FROM,
        ToAccount: DEFAULT_TO,
        Amount: '',
        Description: '',
    });
    const [submitting, setSubmitting] = useState(false);

    /** Fields the user has already changed. Prefill must never overwrite these. */
    const touched = useRef<Set<PrefillField>>(new Set());
    /** Prefill is a one-shot: it runs on the first render where accounts exist. */
    const seeded = useRef(false);

    const update = (patch: Partial<TransferForm>, field?: PrefillField) => {
        if (field) touched.current.add(field);
        setFormData(previous => ({ ...previous, ...patch }));
    };

    // ── Seed defaults + query prefill, once the accounts have loaded ──
    // Runs a single time. Per field: a user edit wins over the query string,
    // and the query string wins over the resolved default.
    useEffect(() => {
        if (seeded.current) return;
        if (!router.isReady) return;
        if (visibleAccounts.length === 0) return;

        seeded.current = true;

        const defaults = resolveDefaults(visibleAccounts);
        const fromParam = readAccountParam(router.query.from, visibleAccounts);
        const toParam = readAccountParam(router.query.to, visibleAccounts);
        const amountParam = readAmountParam(router.query.amount);

        setFormData(previous => ({
            ...previous,
            FromAccount: touched.current.has('FromAccount')
                ? previous.FromAccount
                : (fromParam ?? defaults.FromAccount),
            ToAccount: touched.current.has('ToAccount')
                ? previous.ToAccount
                : (toParam ?? defaults.ToAccount),
            // No valid `amount` param leaves whatever is there rather than blanking it.
            Amount: touched.current.has('Amount') || amountParam === null
                ? previous.Amount
                : amountParam,
        }));
    }, [router.isReady, router.query, visibleAccounts]);

    const sameAccount = formData.FromAccount === formData.ToAccount;

    // ── Recent transfers: the debit leg only, newest first, capped ──
    const recentTransfers = useMemo(
        () => transactions
            .filter(txn => txn.Category === 'Transfer Out')
            .slice()
            .sort((a, b) => (b.Date || '').localeCompare(a.Date || ''))
            .slice(0, RECENT_LIMIT),
        [transactions],
    );

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const response = await fetch('/api/transfers/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to record transfer');
            }
            // Success only: a failure deliberately keeps the form filled.
            touched.current.clear();
            setFormData({
                Date: today(),
                ...resolveDefaults(visibleAccounts),
                Amount: '',
                Description: '',
            });
            addToast('Transfer recorded successfully!', 'success');
            await refresh();
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'Failed to record transfer', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AppShell title="Transfers">
            <div className="mx-auto w-full max-w-2xl px-4 pt-6 md:px-8 md:pt-10 space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <h1 className="text-[28px] font-bold text-sys-label tracking-tight">Transfers</h1>
                    <p className="text-[15px] text-sys-label-secondary mt-0.5">
                        Move money between your accounts.
                    </p>
                </motion.div>

                <motion.div
                    className="glass overflow-hidden p-5 sm:p-6"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                >
                    <div className="glass-bloom" style={{ background: ART_PRESETS.blue }} aria-hidden="true" />
                    <div className="glass-scrim" aria-hidden="true" />
                    <div className="relative">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-sys-blue/15 rounded-xl flex items-center justify-center shrink-0">
                            <ArrowRightLeft className="w-5 h-5 text-sys-blue" />
                        </div>
                        <h2 className="text-lg font-bold text-sys-label">Transfer Between Accounts</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Transfer flow — visual account pickers */}
                        <div className="bg-sys-elevated/60 rounded-2xl p-4 sm:p-5">
                            {/* From */}
                            <div>
                                <label className="text-[11px] font-medium text-sys-label-secondary uppercase tracking-wider mb-2 block">From</label>
                                <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
                                    {visibleAccounts.map(account => {
                                        const selected = formData.FromAccount === account.Id;
                                        return (
                                            <PressableCard
                                                key={account.Id}
                                                onClick={() => update({ FromAccount: account.Id }, 'FromAccount')}
                                                scaleAmount={0.94}
                                                className="shrink-0"
                                            >
                                                <div className={`glass overflow-hidden px-3 py-2.5 min-w-[88px] ${selected ? 'border-2 border-sys-blue' : 'border-2 border-transparent'}`}>
                                                    <div className="glass-bloom" style={{ background: selected ? ART_PRESETS.blue : (account.Art || ART_PRESETS.slate) }} aria-hidden="true" />
                                                    <div className="relative flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
                                                            <AccountLogo account={account} />
                                                        </div>
                                                        <span className={`text-xs font-medium truncate ${selected ? 'text-sys-blue' : 'text-sys-label'}`}>{account.Label}</span>
                                                    </div>
                                                </div>
                                            </PressableCard>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Arrow */}
                            <div className="flex justify-center py-3" aria-hidden="true">
                                <div className="w-10 h-10 rounded-full bg-sys-blue/15 flex items-center justify-center">
                                    <ArrowRightLeft className="w-4 h-4 text-sys-blue rotate-90 sm:rotate-0" />
                                </div>
                            </div>

                            {/* To */}
                            <div>
                                <label className="text-[11px] font-medium text-sys-label-secondary uppercase tracking-wider mb-2 block">To</label>
                                <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
                                    {visibleAccounts.map(account => {
                                        const selected = formData.ToAccount === account.Id;
                                        return (
                                            <PressableCard
                                                key={account.Id}
                                                onClick={() => update({ ToAccount: account.Id }, 'ToAccount')}
                                                scaleAmount={0.94}
                                                className="shrink-0"
                                            >
                                                <div className={`glass overflow-hidden px-3 py-2.5 min-w-[88px] ${selected ? 'border-2 border-sys-blue' : 'border-2 border-transparent'}`}>
                                                    <div className="glass-bloom" style={{ background: selected ? ART_PRESETS.blue : (account.Art || ART_PRESETS.slate) }} aria-hidden="true" />
                                                    <div className="relative flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
                                                            <AccountLogo account={account} />
                                                        </div>
                                                        <span className={`text-xs font-medium truncate ${selected ? 'text-sys-blue' : 'text-sys-label'}`}>{account.Label}</span>
                                                    </div>
                                                </div>
                                            </PressableCard>
                                        );
                                    })}
                                </div>
                            </div>

                            {sameAccount && (
                                <p className="text-xs text-sys-orange mt-3 text-center animate-scale-in">
                                    Please select different accounts
                                </p>
                            )}
                        </div>

                        {/* Amount / Date / Description */}
                        <div className="glass overflow-hidden">
                            <div className="glass-bloom" style={{ background: ART_PRESETS.violet }} aria-hidden="true" />
                            <div className="glass-scrim" aria-hidden="true" />
                            <div className="relative">
                            <div>
                                <label
                                    htmlFor="transfer-amount"
                                    className="text-[11px] font-medium text-sys-label-secondary uppercase tracking-wider px-4 pt-3 block"
                                >
                                    Amount
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                                        <span className="text-sys-label-secondary font-bold">₹</span>
                                    </div>
                                    <input
                                        id="transfer-amount"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={formData.Amount}
                                        onChange={e => update({ Amount: e.target.value }, 'Amount')}
                                        className="money w-full pl-8 pr-4 py-2.5 bg-transparent text-sys-label placeholder-sys-label-tertiary focus:outline-none"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="border-t border-sys-glass-stroke mx-4" />

                            <div>
                                <label
                                    htmlFor="transfer-date"
                                    className="text-[11px] font-medium text-sys-label-secondary uppercase tracking-wider px-4 pt-3 block"
                                >
                                    Date
                                </label>
                                <input
                                    id="transfer-date"
                                    type="date"
                                    value={formData.Date}
                                    onChange={e => update({ Date: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-transparent text-sys-label focus:outline-none"
                                    required
                                    style={{ colorScheme: 'dark' }}
                                />
                            </div>

                            <div className="border-t border-sys-glass-stroke mx-4" />

                            <div>
                                <label
                                    htmlFor="transfer-description"
                                    className="text-[11px] font-medium text-sys-label-secondary uppercase tracking-wider px-4 pt-3 block"
                                >
                                    Description
                                </label>
                                <input
                                    id="transfer-description"
                                    type="text"
                                    value={formData.Description}
                                    onChange={e => update({ Description: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-transparent text-sys-label placeholder-sys-label-tertiary focus:outline-none"
                                    placeholder="Optional"
                                />
                            </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || sameAccount}
                            className="w-full bg-gradient-to-r from-sys-blue to-sys-purple text-white font-semibold py-3.5 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-[17px] flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <><Spinner /> Processing...</>
                            ) : (
                                <><ArrowRightLeft className="w-5 h-5" /> Record Transfer</>
                            )}
                        </button>
                    </form>
                    </div>
                </motion.div>

                {/* Recent transfers — nothing at all when there are none */}
                {recentTransfers.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                    >
                        <div className="flex items-center gap-2 px-1 pb-2">
                            <History className="w-4 h-4 text-sys-label-tertiary" />
                            <h2 className="text-[11px] uppercase tracking-[0.09em] text-sys-label-tertiary">
                                Recent transfers
                            </h2>
                        </div>

                        <div className="glass overflow-hidden divide-y divide-sys-glass-stroke/60">
                            <div className="glass-bloom" style={{ background: ART_PRESETS.teal }} aria-hidden="true" />
                            <div className="glass-scrim" aria-hidden="true" />
                            <div className="relative">
                            {recentTransfers.map((txn, index) => (
                                <div
                                    key={txn.RowIndex ?? `${txn.Date}-${txn.Description}-${index}`}
                                    className="flex items-center gap-3 px-4 py-3"
                                >
                                    <div className="w-9 h-9 rounded-[11px] bg-sys-blue/15 flex items-center justify-center shrink-0">
                                        <ArrowRightLeft className="w-4 h-4 text-sys-blue" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[15px] text-sys-label truncate">
                                            {txn.Description || 'Transfer'}
                                        </p>
                                        <p className="text-[13px] text-sys-label-secondary">
                                            {formatShortDate(txn.Date)}
                                        </p>
                                    </div>
                                    <p className="money text-[15px] font-semibold text-sys-label shrink-0">
                                        {formatIndianCurrency(Math.abs(amountOf(txn)))}
                                    </p>
                                </div>
                            ))}
                            </div>
                        </div>
                    </motion.section>
                )}
            </div>
        </AppShell>
    );
}
