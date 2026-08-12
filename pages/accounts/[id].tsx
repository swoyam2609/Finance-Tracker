/**
 * Account detail — drilldown from a card in the Home carousel.
 *
 * The card face uses the same `layoutId` the carousel card carries, so the
 * card morphs into this screen rather than the screen simply appearing.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ChevronLeft, Wallet } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import AppShell from '@/components/layout/AppShell';
import { SkeletonCard, SkeletonRow } from '@/components/layout/SkeletonCard';
import { useFinance, type Transaction } from '@/components/data/FinanceProvider';
import AccountCard from '@/components/wallet/AccountCard';
import DueRow from '@/components/wallet/DueRow';
import { TransactionGroup, TransactionRow } from '@/components/txn/TransactionRow';
import { EditTransactionModal } from '@/components/txn/TransactionSheets';

import { resolveArt, ART_PRESETS } from '@/lib/accounts';
import { amountOf, creditOutstanding, isTransfer, nextDue } from '@/lib/finance';
import { groupTransactionsByDate } from '@/lib/transactions';
import { formatIndianCurrency } from '@/lib/format';

const PERIODS = [
    { key: '1M', months: 1 },
    { key: '3M', months: 3 },
    { key: '1Y', months: 12 },
    { key: 'All', months: 0 },
] as const;

type PeriodKey = typeof PERIODS[number]['key'];

function windowStart(period: PeriodKey, today: Date): Date | null {
    const entry = PERIODS.find(candidate => candidate.key === period);
    if (!entry || entry.months === 0) return null;
    return new Date(today.getFullYear(), today.getMonth() - entry.months, today.getDate());
}

export default function AccountDetail() {
    const router = useRouter();
    const { transactions, accounts, balances, loading } = useFinance();
    const [period, setPeriod] = useState<PeriodKey>('3M');
    const [editing, setEditing] = useState<Transaction | null>(null);

    const today = useMemo(() => new Date(), []);
    const id = typeof router.query.id === 'string' ? router.query.id : '';
    const account = accounts.find(candidate => candidate.Id === id);
    const balance = balances[id] ?? 0;

    const accountTxns = useMemo(
        () => transactions.filter(txn => txn.Account === id),
        [transactions, id],
    );

    /** Running balance per day, and the stats for the selected window. */
    const view = useMemo(() => {
        const start = windowStart(period, today);
        const chronological = accountTxns
            .filter(txn => txn.Date)
            .slice()
            .sort((a, b) => a.Date.localeCompare(b.Date));

        let running = 0;
        const byDay = new Map<string, number>();
        chronological.forEach(txn => {
            running += amountOf(txn);
            byDay.set(txn.Date, running);
        });

        const series = Array.from(byDay.entries())
            .filter(([date]) => !start || new Date(date) >= start)
            .map(([date, value]) => ({
                date,
                label: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                balance: Number(value.toFixed(2)),
            }));

        const inWindow = accountTxns.filter(txn => !start || (txn.Date && new Date(txn.Date) >= start));
        let credited = 0;
        let spent = 0;
        inWindow.forEach(txn => {
            const amount = amountOf(txn);
            if (amount >= 0) {
                // Credit repayments arrive as transfers, so they count toward "paid".
                if (!isTransfer(txn) || account?.Kind === 'credit') credited += amount;
            } else if (!isTransfer(txn)) {
                spent += Math.abs(amount);
            }
        });

        return { series, credited, spent, count: inWindow.length };
    }, [accountTxns, period, today, account?.Kind]);

    const groups = useMemo(
        () => groupTransactionsByDate(accountTxns.slice().reverse(), today),
        [accountTxns, today],
    );

    if (!loading && id && !account) {
        return (
            <AppShell title="Account">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 text-center">
                    <div className="glass overflow-hidden px-6 py-10">
                        <div className="glass-bloom" style={{ background: '#6E6E78' }} aria-hidden="true" />
                        <div className="glass-scrim" aria-hidden="true" />
                        <div className="relative">
                            <p className="text-[17px] text-sys-label">No account called “{id}”.</p>
                            <p className="text-[13px] text-sys-label-secondary mt-2">
                                It may have been renamed in the Accounts tab.
                            </p>
                            <Link href="/" className="inline-block mt-6 text-[15px] text-sys-blue font-medium">
                                Back to home
                            </Link>
                        </div>
                    </div>
                </div>
            </AppShell>
        );
    }

    const outstanding = account ? creditOutstanding(account, balance) : 0;
    const due = account?.Kind === 'credit' ? nextDue(account.StatementDay, account.DueDay, today) : null;
    const art = account ? resolveArt(account) : '#6E6E78';
    const isCredit = account?.Kind === 'credit';

    return (
        <AppShell title={account?.Label ?? 'Account'}>
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
                <div className="flex items-center gap-2 pt-4 pb-5">
                    <button onClick={() => router.back()} aria-label="Back"
                        className="w-9 h-9 -ml-2 flex items-center justify-center">
                        <ChevronLeft className="w-6 h-6 text-sys-label" />
                    </button>
                    <h1 className="text-[15px] font-semibold text-sys-label">{account?.Label ?? '…'}</h1>
                </div>

                {loading || !account ? (
                    <SkeletonCard variant="hero" />
                ) : (
                    <AccountCard
                        account={account}
                        balance={balance}
                        variant="hero"
                        layoutId={`account-card-${account.Id}`}
                    />
                )}

                {account && due && (
                    <div className="mt-3">
                        <DueRow
                            due={due}
                            onLogPayment={() => router.push({
                                pathname: '/transfers',
                                query: { to: account.Id, amount: outstanding > 0 ? outstanding : undefined },
                            })}
                        />
                    </div>
                )}

                {/* Period */}
                <div className="glass flex gap-1 p-1 mt-5">
                    {PERIODS.map(entry => (
                        <button
                            key={entry.key}
                            onClick={() => setPeriod(entry.key)}
                            className={`flex-1 py-1.5 rounded-xl text-[12px] transition-colors ${
                                period === entry.key
                                    ? 'bg-sys-elevated text-sys-label font-semibold'
                                    : 'text-sys-label-secondary'
                            }`}
                        >
                            {entry.key}
                        </button>
                    ))}
                </div>

                {/* Balance over time */}
                <div className="glass overflow-hidden mt-4 p-4">
                    <div className="glass-bloom" style={{ background: art }} aria-hidden="true" />
                    <div className="glass-scrim" aria-hidden="true" />
                    <div className="relative h-[150px]">
                        {view.series.length > 1 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={view.series} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
                                    <defs>
                                        <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={art} stopOpacity={0.35} />
                                            <stop offset="100%" stopColor={art} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="label" hide />
                                    <YAxis hide domain={['dataMin', 'dataMax']} />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'rgba(28, 28, 30, 0.95)', border: 'none', borderRadius: 12, fontSize: 12,
                                        }}
                                        labelStyle={{ color: 'rgba(142, 142, 147, 0.9)' }}
                                        formatter={(value: number) => [formatIndianCurrency(value), 'Balance']}
                                    />
                                    <Area
                                        type="monotone" dataKey="balance" stroke={art} strokeWidth={1.8}
                                        fill="url(#balanceFill)" strokeLinecap="round"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <p className="text-[13px] text-sys-label-secondary">Not enough history to chart</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="flex gap-3 mt-4">
                    <div className="glass overflow-hidden flex-1 px-4 py-3">
                        <div className="glass-bloom" style={{ background: ART_PRESETS.pink }} aria-hidden="true" />
                        <div className="glass-scrim" aria-hidden="true" />
                        <div className="relative">
                            <p className="text-[11px] uppercase tracking-[0.1em] text-sys-label-secondary">
                                {isCredit ? 'Spent' : 'Out'}
                            </p>
                            <p className="money text-[20px] font-[640] tracking-[-0.01em] text-sys-red mt-0.5">
                                {formatIndianCurrency(view.spent, { decimals: false })}
                            </p>
                        </div>
                    </div>
                    <div className="glass overflow-hidden flex-1 px-4 py-3">
                        <div className="glass-bloom" style={{ background: ART_PRESETS.green }} aria-hidden="true" />
                        <div className="glass-scrim" aria-hidden="true" />
                        <div className="relative">
                            <p className="text-[11px] uppercase tracking-[0.1em] text-sys-label-secondary">
                                {isCredit ? 'Paid' : 'In'}
                            </p>
                            <p className="money text-[20px] font-[640] tracking-[-0.01em] text-sys-green mt-0.5">
                                {formatIndianCurrency(view.credited, { decimals: false })}
                            </p>
                        </div>
                    </div>
                    <div className="glass overflow-hidden flex-1 px-4 py-3">
                        <div className="glass-bloom" style={{ background: art }} aria-hidden="true" />
                        <div className="glass-scrim" aria-hidden="true" />
                        <div className="relative">
                            <p className="text-[11px] uppercase tracking-[0.1em] text-sys-label-secondary">Txns</p>
                            <p className="money text-[20px] font-[640] tracking-[-0.01em] text-sys-label mt-0.5">{view.count}</p>
                        </div>
                    </div>
                </div>

                {/* History */}
                <section className="mt-7">
                    <h2 className="text-[11px] uppercase tracking-[0.12em] text-sys-label-tertiary mb-3">History</h2>
                    {loading ? (
                        <div className="glass divide-y divide-sys-glass-stroke/60">
                            {[1, 2, 3, 4].map(row => <SkeletonRow key={row} />)}
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="glass flex flex-col items-center text-center py-12 px-6">
                            <div className="w-12 h-12 rounded-2xl bg-sys-fill/50 flex items-center justify-center mb-3">
                                <Wallet className="w-5 h-5 text-sys-label-secondary" />
                            </div>
                            <p className="text-[15px] text-sys-label">Nothing here yet</p>
                            <p className="text-[13px] text-sys-label-secondary mt-1">
                                Transactions on this account will appear here
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {groups.map((group, index) => (
                                <TransactionGroup key={group.dateKey} label={group.label} index={index}>
                                    {group.transactions.map((txn, rowIndex) => (
                                        <TransactionRow
                                            key={`${group.dateKey}-${rowIndex}`}
                                            txn={txn}
                                            isInvestment={account?.Kind === 'investment'}
                                            onClick={setEditing}
                                        />
                                    ))}
                                </TransactionGroup>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <EditTransactionModal
                isOpen={editing !== null}
                onClose={() => setEditing(null)}
                txn={editing}
                accounts={accounts}
            />
        </AppShell>
    );
}
