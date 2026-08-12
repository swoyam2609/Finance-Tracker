/**
 * A single transaction row and its date-group wrapper. Title, subtitle and
 * amount rules are preserved from the original pages/index.tsx list.
 */

import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { PressableCard } from '@/components/MotionPrimitives';
import { categoryGlyph } from './CategoryIcon';
import { formatIndianCurrency } from '@/lib/format';
import { amountOf, type MoneyTxn } from '@/lib/finance';

export interface TransactionRowProps<T extends MoneyTxn> {
    txn: T & { Description?: string };
    /** True when the row's account is an investment account, which retitles income as "Investment". */
    isInvestment?: boolean;
    onClick?: (txn: T & { Description?: string }) => void;
}

export function TransactionRow<T extends MoneyTxn>({ txn, isInvestment = false, onClick }: TransactionRowProps<T>) {
    const amount = amountOf(txn);
    const isPositive = amount >= 0;
    const glyph = categoryGlyph(txn.Category, isPositive);

    const title = isPositive
        ? (isInvestment ? 'Investment' : 'Income')
        : (txn.Description || txn.Category);

    return (
        <PressableCard
            onClick={onClick ? () => onClick(txn) : undefined}
            scaleAmount={0.98}
            className="flex items-center gap-3 px-4 py-3"
        >
            <div className={`w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 ${glyph.bgColor}`}>
                {glyph.icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[15px] text-sys-label truncate">{title}</p>
                <p className="text-[13px] text-sys-label-secondary truncate">{txn.Account}</p>
            </div>
            <p className={`money text-[15px] font-semibold shrink-0 ${isPositive ? 'text-sys-green' : 'text-sys-label'}`}>
                {isPositive ? '+' : '-'}{formatIndianCurrency(Math.abs(amount))}
            </p>
            {onClick && <ChevronRight className="w-4 h-4 text-sys-label-tertiary shrink-0" />}
        </PressableCard>
    );
}

export interface TransactionGroupProps {
    label: string;
    children: ReactNode;
    /** Stagger index, used for the original 80ms-per-group fade cascade. */
    index?: number;
}

export function TransactionGroup({ label, children, index = 0 }: TransactionGroupProps) {
    return (
        <div className="animate-fade-in" style={{ animationDelay: `${index * 80}ms` }}>
            <p className="px-4 py-2 text-[11px] uppercase tracking-[0.09em] text-sys-label-tertiary">
                {label}
            </p>
            <div className="glass divide-y divide-sys-glass-stroke/60">{children}</div>
        </div>
    );
}
