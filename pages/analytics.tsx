/**
 * Analytics route — the former "Analytics" tab of pages/index.tsx, now a real page.
 *
 * The four aggregations below are ported verbatim from the original
 * (getCategoryDistribution / getAccountDistribution / getSummary / getDailyExpenses).
 * Their quirks are load-bearing and deliberately preserved:
 *  - Category bars are sized against the LARGEST category, while the printed
 *    percentage is the share of the TOTAL. Two different numbers, both rendered.
 *  - Account rows keep first-occurrence insertion order — no sorting.
 *  - The daily chart gap-fills every calendar day between first and last row.
 *
 * The one intentional change: chart series are derived from `visibleAccounts`
 * rather than the five hardcoded ones, so a new account in the sheet charts itself.
 */

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

import AppShell from '@/components/layout/AppShell';
import { SkeletonCard } from '@/components/layout/SkeletonCard';
import { useFinance, type Transaction } from '@/components/data/FinanceProvider';
import FilterChips from '@/components/txn/FilterChips';
import { StaggerContainer, StaggerItem } from '@/components/MotionPrimitives';
import { accountGlyph } from '@/components/txn/CategoryIcon';
import { availableMonths, filterByPeriod } from '@/lib/transactions';
import { summarize, amountOf, isTransfer } from '@/lib/finance';
import { CATEGORIES, ALL_CATEGORIES, categoryColor } from '@/lib/categories';
import { resolveArt, type Account } from '@/lib/accounts';
import { formatIndianCurrency } from '@/lib/format';

const TOTAL_COLOR = '#0A84FF';

interface CategorySlice {
    category: string;
    amount: number;
    /** Share of the summed expense total, 0–100. */
    percentage: number;
}

interface AccountSlice {
    account: string;
    income: number;
    expenses: number;
    net: number;
}

interface DailyPoint {
    date: string;
    fullDate: string;
    total: number;
    [accountKey: string]: string | number;
}

/**
 * Only negative rows with a real, non-transfer, non-Income category count.
 * Percentages are relative to the summed expense total; sorted by amount desc.
 */
function categoryDistribution(txns: Transaction[]): CategorySlice[] {
    const totals: Record<string, number> = {};
    let totalExpenses = 0;

    txns.forEach(txn => {
        const amount = amountOf(txn);
        if (amount < 0 && txn.Category && txn.Category !== 'Income' && !isTransfer(txn)) {
            totals[txn.Category] = (totals[txn.Category] || 0) + Math.abs(amount);
            totalExpenses += Math.abs(amount);
        }
    });

    return Object.entries(totals)
        .map(([category, amount]) => ({
            category,
            amount,
            percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);
}

/**
 * Buckets by whatever `Account` string the data carries — not a fixed list —
 * excluding both transfer categories. Insertion order is preserved: no sorting.
 */
function accountDistribution(txns: Transaction[]): AccountSlice[] {
    const totals: Record<string, { income: number; expenses: number }> = {};

    txns.forEach(txn => {
        const amount = amountOf(txn);
        if (isTransfer(txn)) return;
        if (!totals[txn.Account]) totals[txn.Account] = { income: 0, expenses: 0 };
        if (amount >= 0) totals[txn.Account].income += amount;
        else totals[txn.Account].expenses += Math.abs(amount);
    });

    return Object.entries(totals).map(([account, data]) => ({
        account,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses,
    }));
}

/**
 * One point per calendar day between the earliest and latest dated row, with
 * missing days zero-filled. Each point carries `total` plus one key per series
 * account. Only negative, non-transfer rows contribute.
 */
function dailyExpenses(txns: Transaction[], seriesAccounts: string[]): DailyPoint[] {
    if (txns.length === 0) return [];

    const dailyData: Record<string, Record<string, number>> = {};

    txns.forEach(txn => {
        if (!txn.Date) return;
        const amount = amountOf(txn);
        if (isTransfer(txn)) return;

        if (!dailyData[txn.Date]) {
            dailyData[txn.Date] = { total: 0 };
            seriesAccounts.forEach(account => { dailyData[txn.Date][account] = 0; });
        }
        if (amount < 0) {
            const absolute = Math.abs(amount);
            dailyData[txn.Date].total += absolute;
            if (seriesAccounts.includes(txn.Account)) dailyData[txn.Date][txn.Account] += absolute;
        }
    });

    const dates = Object.keys(dailyData).sort();
    if (dates.length === 0) return [];

    const maxDate = new Date(dates[dates.length - 1]);
    const cursor = new Date(dates[0]);
    const points: DailyPoint[] = [];

    while (cursor <= maxDate) {
        const dateStr = cursor.toISOString().split('T')[0];
        const bucket = dailyData[dateStr];
        const point: DailyPoint = {
            date: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            fullDate: dateStr,
            total: bucket ? bucket.total : 0,
        };
        seriesAccounts.forEach(account => { point[account] = bucket ? bucket[account] : 0; });
        points.push(point);
        cursor.setDate(cursor.getDate() + 1);
    }

    return points;
}

/** A stable, CSS-safe gradient id per series. */
function gradientId(index: number): string {
    return `analyticsSeries${index}`;
}

export default function AnalyticsPage() {
    const { transactions, accounts, visibleAccounts, loading } = useFinance();

    const [selectedPeriod, setSelectedPeriod] = useState('overall');
    const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);

    const months = useMemo(() => availableMonths(transactions), [transactions]);

    // Period, then exact-string category matching. (The transactions list uses
    // amount-based matching for 'Income'; analytics deliberately does not.)
    const filtered = useMemo(() => {
        const byPeriod = filterByPeriod(transactions, selectedPeriod);
        return selectedCategory === ALL_CATEGORIES
            ? byPeriod
            : byPeriod.filter(txn => txn.Category === selectedCategory);
    }, [transactions, selectedPeriod, selectedCategory]);

    const summary = useMemo(() => summarize(filtered, accounts), [filtered, accounts]);
    const categories = useMemo(() => categoryDistribution(filtered), [filtered]);
    const accountRows = useMemo(() => accountDistribution(filtered), [filtered]);

    // Chart series derived from the sheet instead of the original five hardcoded
    // accounts, so a newly added account appears without a code change.
    const series = useMemo(
        () => visibleAccounts.map((account: Account) => ({
            id: account.Id,
            label: account.Label,
            color: resolveArt(account),
        })),
        [visibleAccounts],
    );

    const dailyData = useMemo(
        () => dailyExpenses(filtered, series.map(item => item.id)),
        [filtered, series],
    );

    const maxCategoryAmount = categories.length > 0
        ? Math.max(...categories.map(item => item.amount))
        : 0;

    const isAllCategories = selectedCategory === ALL_CATEGORIES;

    const summaryCards: { label: string; value: number; color: string; isPercent?: boolean }[] = [
        { label: 'Income', value: summary.totalIncome, color: 'text-sys-green' },
        { label: 'Investment', value: summary.totalInvestment, color: 'text-sys-teal' },
        { label: 'Expenses', value: summary.totalExpenses, color: 'text-sys-red' },
        { label: 'Net Savings', value: summary.netSavings, color: summary.netSavings >= 0 ? 'text-sys-green' : 'text-sys-red' },
        { label: 'Savings Rate', value: summary.savingsRate, color: 'text-sys-blue', isPercent: true },
    ];

    if (loading) {
        return (
            <AppShell title="Analytics">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                    <div className="h-7 w-32 skeleton motion-reduce:animate-none" aria-hidden="true" />
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[0, 1, 2, 3, 4].map(index => (
                            <SkeletonCard key={index} variant="grid" />
                        ))}
                    </div>
                    <SkeletonCard variant="hero" />
                    <SkeletonCard variant="hero" />
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell title="Analytics">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Period Selector */}
                <div className="flex justify-between items-center gap-3">
                    <h2 className="text-lg font-bold text-sys-label">Analysis</h2>
                    <select
                        value={selectedPeriod}
                        onChange={event => setSelectedPeriod(event.target.value)}
                        className="apple-select w-auto py-2 text-sm"
                        aria-label="Period"
                    >
                        <option value="overall">Overall</option>
                        {months.map(month => {
                            const [year, monthNum] = month.split('-');
                            const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                            return (
                                <option key={month} value={month}>
                                    {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </option>
                            );
                        })}
                    </select>
                </div>

                {/* Category Filter Pills */}
                <FilterChips
                    options={[ALL_CATEGORIES, ...CATEGORIES]}
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    layoutId="analyticsCategoryFilter"
                    label={option => (option === ALL_CATEGORIES ? 'All' : option)}
                    className="scroll-fade-right pb-0.5"
                />

                {/* Summary Stats */}
                <StaggerContainer className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible">
                    {summaryCards.map(card => (
                        <StaggerItem key={card.label} className="glass p-4 min-w-[42vw] snap-center sm:min-w-0 flex-shrink-0">
                            <p className="text-[11px] font-medium text-sys-label-secondary mb-1.5 uppercase tracking-wider">{card.label}</p>
                            <p className={`text-lg font-bold money ${card.color}`}>
                                {card.isPercent ? `${card.value.toFixed(1)}%` : formatIndianCurrency(card.value)}
                            </p>
                        </StaggerItem>
                    ))}
                </StaggerContainer>

                {/* Daily Expenses Chart */}
                <motion.div
                    className="glass p-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
                >
                    <h3 className="text-base font-bold text-sys-label mb-1">
                        {isAllCategories ? 'Daily Expenses' : selectedCategory}
                    </h3>
                    <p className="text-xs text-sys-label-secondary mb-6">
                        {isAllCategories ? 'Spending across all accounts' : `${selectedCategory} spending across all accounts`}
                    </p>

                    {dailyData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="w-14 h-14 bg-sys-elevated rounded-2xl flex items-center justify-center mb-3">
                                <TrendingUp className="w-7 h-7 text-sys-label-tertiary" />
                            </div>
                            <p className="text-sys-label-secondary text-sm">No data for this period</p>
                        </div>
                    ) : (
                        <div className="rounded-xl overflow-hidden">
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id={gradientId(0)} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={TOTAL_COLOR} stopOpacity={0.25} />
                                            <stop offset="100%" stopColor={TOTAL_COLOR} stopOpacity={0.02} />
                                        </linearGradient>
                                        {series.map((item, index) => (
                                            <linearGradient key={item.id} id={gradientId(index + 1)} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={item.color} stopOpacity={0.15} />
                                                <stop offset="100%" stopColor={item.color} stopOpacity={0.02} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#38383A" opacity={0.3} vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#48484A"
                                        style={{ fontSize: '10px' }}
                                        tick={{ fill: '#8E8E93' }}
                                        axisLine={false}
                                        tickLine={false}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        stroke="#48484A"
                                        style={{ fontSize: '10px' }}
                                        tick={{ fill: '#8E8E93' }}
                                        tickFormatter={(value: number) => `₹${value.toLocaleString()}`}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        content={(props: any) => {
                                            if (!props.payload || props.payload.length === 0) return null;
                                            const point = props.payload[0].payload;
                                            if (point.total === 0) {
                                                return (
                                                    <div className="bg-sys-elevated rounded-xl p-3 shadow-xl border border-sys-separator">
                                                        <p className="text-sys-label-secondary text-xs font-medium mb-1">{props.label}</p>
                                                        <p className="text-sys-green text-sm">No expenses</p>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div className="bg-sys-elevated rounded-xl p-3 shadow-xl border border-sys-separator">
                                                    <p className="text-sys-label-secondary text-xs font-medium mb-2">{props.label}</p>
                                                    {props.payload.map((entry: any, index: number) => {
                                                        if (entry.value === 0) return null;
                                                        return (
                                                            <p key={index} style={{ color: entry.color }} className="text-xs font-medium money">
                                                                {entry.name}: {formatIndianCurrency(entry.value)}
                                                            </p>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        }}
                                        cursor={{ stroke: TOTAL_COLOR, strokeWidth: 1, strokeDasharray: '4 4' }}
                                    />
                                    <Legend
                                        verticalAlign="top"
                                        height={44}
                                        iconType="line"
                                        wrapperStyle={{ paddingBottom: '12px', fontSize: '10px', lineHeight: '18px' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="total"
                                        name="Total"
                                        stroke={TOTAL_COLOR}
                                        strokeWidth={2.5}
                                        fill={`url(#${gradientId(0)})`}
                                        strokeLinecap="round"
                                    />
                                    {series.map((item, index) => (
                                        <Area
                                            key={item.id}
                                            type="monotone"
                                            dataKey={item.id}
                                            name={item.label}
                                            stroke={item.color}
                                            strokeWidth={1.5}
                                            fill={`url(#${gradientId(index + 1)})`}
                                            strokeLinecap="round"
                                        />
                                    ))}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </motion.div>

                {/* Category Distribution */}
                <motion.div
                    className="glass p-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.2 }}
                >
                    <h3 className="text-base font-bold text-sys-label mb-4">
                        {isAllCategories ? 'Expenses by Category' : `${selectedCategory} Expenses`}
                    </h3>
                    {categories.length === 0 ? (
                        <p className="text-sys-label-secondary text-center py-8 text-sm">No expense data for this period</p>
                    ) : (
                        <div className="space-y-3">
                            {categories.map((slice, index) => (
                                <div key={slice.category}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: categoryColor(index) }}
                                            />
                                            <span className="text-sm text-sys-label truncate">{slice.category}</span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                            <span className="text-sm font-semibold text-sys-label money">{formatIndianCurrency(slice.amount)}</span>
                                            <span className="text-xs text-sys-label-tertiary w-12 text-right money">{slice.percentage.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    {/* Width is share of the LARGEST category; the figure above is share of the total. */}
                                    <div className="h-2 bg-sys-fill rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: categoryColor(index) }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(slice.amount / maxCategoryAmount) * 100}%` }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 25, delay: index * 0.05 }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Account Breakdown */}
                <motion.div
                    className="glass"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.3 }}
                >
                    <div className="px-5 py-4 border-b border-sys-separator">
                        <h3 className="text-base font-bold text-sys-label">Account Breakdown</h3>
                        <p className="text-xs text-sys-label-secondary mt-0.5">
                            {isAllCategories ? 'Income, expenses, and net per account' : `${selectedCategory} per account`}
                        </p>
                    </div>

                    {accountRows.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-sys-label-secondary text-sm">No data for this period</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table — md and up */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b border-sys-separator">
                                            <th className="px-5 py-3 text-left text-[11px] font-semibold text-sys-label-secondary uppercase tracking-wider">Account</th>
                                            <th className="px-5 py-3 text-right text-[11px] font-semibold text-sys-label-secondary uppercase tracking-wider">Income</th>
                                            <th className="px-5 py-3 text-right text-[11px] font-semibold text-sys-label-secondary uppercase tracking-wider">Expenses</th>
                                            <th className="px-5 py-3 text-right text-[11px] font-semibold text-sys-label-secondary uppercase tracking-wider">Net</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {accountRows.map(row => {
                                            const glyph = accountGlyph(row.account);
                                            return (
                                                <tr key={row.account} className="border-b border-sys-separator last:border-0">
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg ${glyph.bg} flex items-center justify-center ${glyph.color}`}>
                                                                {glyph.icon}
                                                            </div>
                                                            <span className="font-medium text-sys-label text-sm">{row.account}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        <span className="text-sys-green font-semibold text-sm money">{formatIndianCurrency(row.income)}</span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        <span className="text-sys-red font-semibold text-sm money">{formatIndianCurrency(row.expenses)}</span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        <span className={`font-semibold text-sm money ${row.net >= 0 ? 'text-sys-green' : 'text-sys-red'}`}>
                                                            {row.net >= 0 ? '+' : ''}{formatIndianCurrency(row.net)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards — below md */}
                            <div className="md:hidden p-4 space-y-3">
                                {accountRows.map(row => {
                                    const glyph = accountGlyph(row.account);
                                    return (
                                        <div key={row.account} className="bg-sys-elevated rounded-xl p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className={`w-8 h-8 rounded-lg ${glyph.bg} flex items-center justify-center ${glyph.color}`}>
                                                    {glyph.icon}
                                                </div>
                                                <span className="font-semibold text-sys-label text-sm">{row.account}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="bg-sys-green/10 rounded-lg p-2">
                                                    <p className="text-[10px] text-sys-green/70 font-medium">Income</p>
                                                    <p className="text-sys-green font-bold text-xs money">{formatIndianCurrency(row.income)}</p>
                                                </div>
                                                <div className="bg-sys-red/10 rounded-lg p-2">
                                                    <p className="text-[10px] text-sys-red/70 font-medium">Expenses</p>
                                                    <p className="text-sys-red font-bold text-xs money">{formatIndianCurrency(row.expenses)}</p>
                                                </div>
                                                <div className={`rounded-lg p-2 ${row.net >= 0 ? 'bg-sys-green/10' : 'bg-sys-red/10'}`}>
                                                    <p className={`text-[10px] font-medium ${row.net >= 0 ? 'text-sys-green/70' : 'text-sys-red/70'}`}>Net</p>
                                                    <p className={`font-bold text-xs money ${row.net >= 0 ? 'text-sys-green' : 'text-sys-red'}`}>
                                                        {formatIndianCurrency(row.net)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
        </AppShell>
    );
}
