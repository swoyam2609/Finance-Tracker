/**
 * Explains the hero figure line by line, so a surprising total is never a
 * mystery: contributions as labelled rows, a hairline rule, then the total.
 *
 * Pure presentation — every figure arrives already computed. Negative
 * contributions are passed in signed, so `formatIndianCurrency` renders the
 * leading minus and no currency string is ever assembled by hand.
 */

import { useId } from 'react';
import { BottomSheet, StaggerContainer, StaggerItem } from '@/components/MotionPrimitives';
import { formatIndianCurrency } from '@/lib/format';
import type { HeroMode } from './HeroBalance';

export interface BreakdownReserve {
    id: string;
    label: string;
    amount: number;
}

export interface BreakdownSheetProps {
    isOpen: boolean;
    onClose: () => void;
    mode: HeroMode;
    /** Sum of bank + cash balances. */
    liquid: number;
    /** Per-account reserves held back from spendable. Amounts are positive. */
    reserves: BreakdownReserve[];
    /** Total credit outstanding, as a positive number. */
    outstanding: number;
    investments: number;
    /** The figure shown in the hero for this mode. */
    total: number;
}

const TITLE: Record<HeroMode, string> = {
    spendable: 'How spendable is worked out',
    networth: 'How net worth is worked out',
    investments: 'Your investments',
};

const EXPLANATION: Record<HeroMode, string> = {
    spendable:
        'Cash you can actually spend: liquid balances, less the reserves you keep untouched, less what you owe on credit.',
    networth: 'Everything you own, less everything you owe.',
    investments:
        'The current value of your investment accounts. It is deliberately kept out of spendable — this money is not sitting in your bank.',
};

const TOTAL_LABEL: Record<HeroMode, string> = {
    spendable: 'Spendable',
    networth: 'Net worth',
    investments: 'Total invested',
};

interface Row {
    key: string;
    label: string;
    /** Signed contribution to the total. */
    value: number;
}

function buildRows(props: BreakdownSheetProps): Row[] {
    const { mode, liquid, reserves, outstanding, investments } = props;

    if (mode === 'investments') {
        // A single figure needs no arithmetic — the explanatory line carries it.
        return [];
    }

    const rows: Row[] = [{ key: 'liquid', label: 'Liquid balances', value: liquid }];

    if (mode === 'spendable') {
        reserves.forEach(reserve => {
            if (reserve.amount === 0) return;
            rows.push({
                key: `reserve-${reserve.id}`,
                label: `${reserve.label} min balance`,
                value: -reserve.amount,
            });
        });
    } else {
        if (investments !== 0) {
            rows.push({ key: 'investments', label: 'Investments', value: investments });
        }
    }

    if (outstanding !== 0) {
        rows.push({ key: 'outstanding', label: 'Credit outstanding', value: -outstanding });
    }

    return rows;
}

export default function BreakdownSheet(props: BreakdownSheetProps) {
    const { isOpen, onClose, mode, total } = props;
    const titleId = useId();
    const rows = buildRows(props);

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="px-5 pb-6 pt-1 sm:pt-5"
            >
                <h2 id={titleId} className="text-[17px] font-semibold tracking-[-0.01em]">
                    {TITLE[mode]}
                </h2>
                <p className="mt-1.5 text-[13px] leading-[1.5] text-sys-label-secondary">
                    {EXPLANATION[mode]}
                </p>

                {rows.length > 0 && (
                    <StaggerContainer className="mt-5">
                        {rows.map(row => (
                            <StaggerItem key={row.key}>
                                <div className="flex items-baseline justify-between gap-4 py-2.5">
                                    <span className="text-[14px] text-sys-label-secondary">{row.label}</span>
                                    <span className="money shrink-0 text-[15px] font-medium">
                                        {formatIndianCurrency(row.value)}
                                    </span>
                                </div>
                            </StaggerItem>
                        ))}
                    </StaggerContainer>
                )}

                <div
                    className={`hairline-t flex items-baseline justify-between gap-4 pt-3.5 ${
                        rows.length > 0 ? 'mt-1.5' : 'mt-5'
                    }`}
                >
                    <span className="text-[11px] uppercase tracking-[0.12em] text-sys-label-secondary">
                        {TOTAL_LABEL[mode]}
                    </span>
                    <span className="money shrink-0 text-[22px] font-[640] tracking-[-0.02em]">
                        {formatIndianCurrency(total)}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="mt-6 w-full rounded-xl bg-sys-elevated py-3 text-[15px] font-medium text-sys-label transition-opacity active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sys-blue/60"
                >
                    Done
                </button>
            </div>
        </BottomSheet>
    );
}
