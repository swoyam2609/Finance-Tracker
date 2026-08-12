/**
 * Home — the wallet view.
 *
 * Replaces the four-tab single page. Transfers, Analytics and Loans now live at
 * their own routes; what remains here is the hero figure, the account carousel,
 * the daily pulse tiles and the recent transaction list.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import { AlertCircle, Plus, Wallet } from 'lucide-react';

import AppShell from '@/components/layout/AppShell';
import { SkeletonCard, SkeletonRow } from '@/components/layout/SkeletonCard';
import { useFinance, type Transaction } from '@/components/data/FinanceProvider';
import AccountCarousel from '@/components/wallet/AccountCarousel';
import HeroBalance, { type HeroMode } from '@/components/hero/HeroBalance';
import BreakdownSheet from '@/components/hero/BreakdownSheet';
import PulseTile from '@/components/hero/PulseTile';
import FilterChips from '@/components/txn/FilterChips';
import { TransactionGroup, TransactionRow } from '@/components/txn/TransactionRow';
import { AddTransactionSheet, EditTransactionModal } from '@/components/txn/TransactionSheets';

import { ALL_ACCOUNTS, ALL_CATEGORIES } from '@/lib/categories';
import { activeCategories, filterTransactions, groupTransactionsByDate } from '@/lib/transactions';
import {
    creditOutstanding, investments, monthDelta, netWorth, reserves, spendable, spentToday,
} from '@/lib/finance';
const RECENT_LIMIT = 10;

export default function Home() {
    const router = useRouter();
    const { data: session } = useSession();
    const { transactions, accounts, visibleAccounts, balances, loading, error, refresh } = useFinance();

    const [heroMode, setHeroMode] = useState<HeroMode>('spendable');
    const [breakdownOpen, setBreakdownOpen] = useState(false);
    const [accountFilter, setAccountFilter] = useState(ALL_ACCOUNTS);
    const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
    const [showAll, setShowAll] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [editing, setEditing] = useState<Transaction | null>(null);

    // Captured once per mount so the counters and date labels do not drift mid-session.
    const today = useMemo(() => new Date(), []);

    const money = useMemo(() => {
        const liquid = accounts
            .filter(account => account.Kind === 'bank' || account.Kind === 'cash')
            .reduce((sum, account) => sum + (balances[account.Id] ?? 0), 0);
        const outstanding = accounts
            .reduce((sum, account) => sum + creditOutstanding(account, balances[account.Id] ?? 0), 0);

        return {
            liquid,
            outstanding,
            spendable: spendable(accounts, balances),
            netWorth: netWorth(accounts, balances),
            investments: investments(accounts, balances),
            reserves: reserves(accounts),
            monthDelta: monthDelta(transactions, today),
            spentToday: spentToday(transactions, today),
        };
    }, [accounts, balances, transactions, today]);

    const investmentIds = useMemo(
        () => new Set(accounts.filter(account => account.Kind === 'investment').map(account => account.Id)),
        [accounts],
    );

    const accountLabels = useMemo(() => {
        const labels: Record<string, string> = { [ALL_ACCOUNTS]: 'All' };
        visibleAccounts.forEach(account => { labels[account.Id] = account.Label; });
        return labels;
    }, [visibleAccounts]);

    const groups = useMemo(() => {
        const filtered = filterTransactions(transactions, { account: accountFilter, category: categoryFilter });
        return {
            total: filtered.length,
            groups: groupTransactionsByDate(showAll ? filtered : filtered.slice(0, RECENT_LIMIT), today),
        };
    }, [transactions, accountFilter, categoryFilter, showAll, today]);

    const heroTotal = heroMode === 'spendable' ? money.spendable
        : heroMode === 'networth' ? money.netWorth
            : money.investments;

    const listTitle = categoryFilter !== ALL_CATEGORIES
        ? categoryFilter
        : accountFilter === ALL_ACCOUNTS
            ? 'Recent transactions'
            : accountLabels[accountFilter] ?? accountFilter;

    const openAccount = (id: string) => router.push(`/accounts/${encodeURIComponent(id)}`);

    return (
        <AppShell title="Home">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
                {/* Greeting */}
                <div className="flex items-start justify-between pt-4 pb-6">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.1em] text-sys-label-tertiary">
                            {today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </p>
                        <h1 className="text-[17px] font-semibold text-sys-label mt-0.5">Finance Tracker</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="hidden sm:block text-[13px] text-sys-label-secondary">
                            {session?.user?.email}
                        </span>
                        <button onClick={() => signOut()}
                            className="text-[13px] text-sys-red font-medium min-h-[44px] px-1">
                            Sign Out
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="glass flex items-center gap-3 px-4 py-3 mb-5">
                        <AlertCircle className="w-4 h-4 text-sys-red shrink-0" />
                        <p className="text-[13px] text-sys-label-secondary flex-1">{error}</p>
                        <button onClick={() => refresh()} className="text-[13px] text-sys-blue font-medium">
                            Retry
                        </button>
                    </div>
                )}

                <HeroBalance
                    mode={heroMode}
                    onModeChange={setHeroMode}
                    spendable={money.spendable}
                    netWorth={money.netWorth}
                    investments={money.investments}
                    monthDelta={money.monthDelta}
                    onBreakdown={() => setBreakdownOpen(true)}
                />

                {/* Accounts */}
                <section className="mt-7">
                    <div className="flex items-baseline justify-between mb-3">
                        <h2 className="text-[11px] uppercase tracking-[0.12em] text-sys-label-tertiary">Accounts</h2>
                        <span className="text-[11px] text-sys-label-tertiary">{visibleAccounts.length}</span>
                    </div>
                    {loading ? (
                        <div className="flex gap-3 overflow-hidden">
                            <SkeletonCard variant="rail" />
                            <SkeletonCard variant="rail" />
                        </div>
                    ) : (
                        <AccountCarousel
                            accounts={visibleAccounts}
                            balances={balances}
                            onSelect={openAccount}
                        />
                    )}
                </section>

                {/* Pulse */}
                <div className="flex gap-3 mt-5">
                    <PulseTile label="Spent today" value={money.spentToday} tone="red" art="pink" />
                    <PulseTile label="Invested" value={money.investments} tone="teal" art="teal" />
                </div>

                {/* Transactions */}
                <section className="mt-8">
                    <div className="flex items-baseline justify-between mb-3">
                        <h2 className="text-[11px] uppercase tracking-[0.12em] text-sys-label-tertiary">
                            {listTitle}
                        </h2>
                        {groups.total > RECENT_LIMIT && (
                            <button onClick={() => setShowAll(current => !current)}
                                className="text-[13px] text-sys-blue font-medium">
                                {showAll ? 'Show less' : 'See all'}
                            </button>
                        )}
                    </div>

                    <FilterChips
                        options={[ALL_ACCOUNTS, ...visibleAccounts.map(account => account.Id)]}
                        value={accountFilter}
                        onChange={value => { setAccountFilter(value); setShowAll(false); }}
                        label={option => accountLabels[option] ?? option}
                        layoutId="homeAccountFilter"
                        className="mb-2"
                    />
                    <FilterChips
                        options={activeCategories(transactions)}
                        value={categoryFilter}
                        onChange={value => { setCategoryFilter(value); setShowAll(false); }}
                        label={option => (option === ALL_CATEGORIES ? 'All' : option)}
                        layoutId="homeCategoryFilter"
                        tone="elevated"
                        className="mb-4"
                    />

                    {loading ? (
                        <div className="glass divide-y divide-sys-glass-stroke/60">
                            {[1, 2, 3, 4, 5].map(row => <SkeletonRow key={row} />)}
                        </div>
                    ) : groups.groups.length === 0 ? (
                        <div className="glass flex flex-col items-center text-center py-12 px-6">
                            <div className="w-12 h-12 rounded-2xl bg-sys-fill/50 flex items-center justify-center mb-3">
                                <Wallet className="w-5 h-5 text-sys-label-secondary" />
                            </div>
                            <p className="text-[15px] text-sys-label">No transactions yet</p>
                            <p className="text-[13px] text-sys-label-secondary mt-1">Tap + to add your first one</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {groups.groups.map((group, index) => (
                                <TransactionGroup key={group.dateKey} label={group.label} index={index}>
                                    {group.transactions.map((txn, rowIndex) => (
                                        <TransactionRow
                                            key={`${group.dateKey}-${rowIndex}`}
                                            txn={txn}
                                            isInvestment={investmentIds.has(txn.Account)}
                                            onClick={setEditing}
                                        />
                                    ))}
                                </TransactionGroup>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* FAB */}
            <motion.button
                onClick={() => setAddOpen(true)}
                aria-label="Add transaction"
                className="fixed bottom-20 md:bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-sys-blue text-white shadow-float flex items-center justify-center"
                style={{ marginBottom: 'var(--safe-area-bottom, 0px)' }}
                animate={{ scale: addOpen || editing ? 0 : 1, opacity: addOpen || editing ? 0 : 1 }}
                whileTap={{ scale: 0.85 }}
                whileHover={{ scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
                <Plus className="w-6 h-6" />
            </motion.button>

            <BreakdownSheet
                isOpen={breakdownOpen}
                onClose={() => setBreakdownOpen(false)}
                mode={heroMode}
                liquid={money.liquid}
                reserves={money.reserves}
                outstanding={money.outstanding}
                investments={money.investments}
                total={heroTotal}
            />

            <AddTransactionSheet
                isOpen={addOpen}
                onClose={() => setAddOpen(false)}
                accounts={visibleAccounts}
            />

            <EditTransactionModal
                isOpen={editing !== null}
                onClose={() => setEditing(null)}
                txn={editing}
                accounts={visibleAccounts}
            />
        </AppShell>
    );
}
