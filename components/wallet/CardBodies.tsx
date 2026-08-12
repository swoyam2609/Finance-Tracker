/**
 * Per-kind card faces. Each body owns the bottom block of an `AccountCard`:
 * an uppercase label, the money figure, an optional meta line, and an optional
 * right-hand ornament (utilization ring / sparkline).
 *
 * Pure presentation. Every figure comes from `@/lib/finance` and every currency
 * string from `@/lib/format` — nothing is computed or fetched here.
 */

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

import type { Account } from '@/lib/accounts';
import { availableCredit, creditOutstanding, utilization } from '@/lib/finance';
import { formatIndianCurrency } from '@/lib/format';

import UtilizationRing from './UtilizationRing';

export type CardVariant = 'rail' | 'hero' | 'grid' | 'row';

export interface CardBodyProps {
    account: Account;
    balance: number;
    variant: CardVariant;
}

/**
 * Typography and geometry tokens per variant, lifted from Direction A of the
 * approved card mockup and the detail-screen hero face.
 *
 * `showMeta` is false on the short variants: at 96px (grid/row) and 118px
 * (rail) there is no room for a second meta line without clipping, so those
 * faces state the account number in the sublabel instead.
 */
export const CARD_TYPE: Record<CardVariant, {
    /** Account Label */
    name: string;
    /** Kind sublabel */
    sub: string;
    /** "Outstanding" / "Available" */
    label: string;
    /** The money figure */
    value: string;
    /** Availability / min-balance / masked number line */
    meta: string;
    /** Chip block dimensions */
    chip: string;
    /** Account glyph tile dimensions */
    iconTile: string;
    /** Bloom diameter in px — kept well under the card height so it stays a corner glow */
    bloom: number;
    /** Shell width + height */
    shell: string;
    /** Shell padding */
    pad: string;
    /** UtilizationRing px size */
    ring: number;
    /** Sparkline px size */
    spark: { width: number; height: number };
    /** Render the body's own meta line */
    showMeta: boolean;
    /** Render the masked number on its own line under the body */
    showNumberLine: boolean;
    /** Render paise on the money figure */
    decimals: boolean;
}> = {
    rail: {
        name: 'text-[12px]',
        sub: 'text-[8.5px]',
        label: 'text-[8.5px]',
        value: 'text-[20px]',
        meta: 'text-[9.5px]',
        chip: 'w-[22px] h-[16px]',
        iconTile: 'w-[26px] h-[26px]',
        bloom: 104,
        shell: 'w-[190px] h-[118px] shrink-0',
        pad: 'p-[14px]',
        ring: 38,
        spark: { width: 50, height: 18 },
        showMeta: false,
        showNumberLine: true,
        decimals: true,
    },
    hero: {
        name: 'text-[12.5px]',
        sub: 'text-[8.5px]',
        label: 'text-[9px]',
        value: 'text-[25px]',
        meta: 'text-[11px]',
        chip: 'w-[24px] h-[17px]',
        iconTile: 'w-[32px] h-[32px]',
        bloom: 150,
        shell: 'w-full h-[158px]',
        pad: 'px-4 py-[15px]',
        ring: 46,
        spark: { width: 62, height: 22 },
        showMeta: true,
        showNumberLine: true,
        decimals: true,
    },
    grid: {
        name: 'text-[11px]',
        sub: 'text-[8.5px]',
        label: 'text-[8.5px]',
        value: 'text-[13px]',
        meta: 'text-[9px]',
        chip: 'w-[19px] h-[14px]',
        iconTile: 'w-[24px] h-[24px]',
        bloom: 88,
        shell: 'w-full h-[96px]',
        pad: 'px-[13px] py-3',
        ring: 30,
        spark: { width: 38, height: 14 },
        showMeta: false,
        showNumberLine: false,
        decimals: false,
    },
    row: {
        name: 'text-[11.5px]',
        sub: 'text-[8.5px]',
        label: 'text-[8.5px]',
        value: 'text-[15px]',
        meta: 'text-[9.5px]',
        chip: 'w-[19px] h-[14px]',
        iconTile: 'w-[26px] h-[26px]',
        bloom: 92,
        shell: 'w-full h-[96px]',
        pad: 'px-[13px] py-3',
        ring: 32,
        spark: { width: 44, height: 16 },
        showMeta: false,
        showNumberLine: false,
        decimals: false,
    },
};

/** Uppercase micro-label above every money figure. */
export const LABEL_CLASS = 'uppercase tracking-[0.11em] text-white/50';
/** Supporting line under a money figure. */
export const META_CLASS = 'tracking-[0.05em] text-white/60';

function Figure({ amount, variant }: { amount: number; variant: CardVariant }) {
    const type = CARD_TYPE[variant];
    return (
        <div className={`money font-semibold tracking-[-0.025em] truncate ${type.value}`}>
            {formatIndianCurrency(amount, { decimals: type.decimals })}
        </div>
    );
}

function Label({ children, variant }: { children: string; variant: CardVariant }) {
    return (
        <div className={`${LABEL_CLASS} ${CARD_TYPE[variant].label} mb-[2px]`}>{children}</div>
    );
}

function Meta({ children, variant }: { children: ReactNode; variant: CardVariant }) {
    return (
        <div className={`money ${META_CLASS} ${CARD_TYPE[variant].meta} mt-[6px] truncate`}>
            {children}
        </div>
    );
}

/**
 * Outstanding, a utilization ring, and remaining headroom.
 * With no `CreditLimit` configured there is nothing to divide by, so the ring
 * and the availability line are both omitted rather than shown as zeros.
 */
export function CreditBody({ account, balance, variant }: CardBodyProps) {
    const type = CARD_TYPE[variant];
    const outstanding = creditOutstanding(account, balance);
    const available = availableCredit(account, outstanding);
    const ratio = utilization(outstanding, account.CreditLimit);

    return (
        <>
            <div className="min-w-0">
                <Label variant={variant}>Outstanding</Label>
                <Figure amount={outstanding} variant={variant} />
                {type.showMeta && available !== null && (
                    <Meta variant={variant}>
                        {formatIndianCurrency(available, { decimals: false })} available of{' '}
                        {formatIndianCurrency(account.CreditLimit, { decimals: false })}
                    </Meta>
                )}
            </div>
            {ratio !== null && (
                <div className="shrink-0">
                    <UtilizationRing value={ratio} size={type.ring} />
                </div>
            )}
        </>
    );
}

/** Available balance, plus the reserve held back from Spendable when there is one. */
export function BankBody({ account, balance, variant }: CardBodyProps) {
    const type = CARD_TYPE[variant];

    return (
        <div className="min-w-0">
            <Label variant={variant}>Available</Label>
            <Figure amount={balance} variant={variant} />
            {type.showMeta && account.MinBalance > 0 && (
                <Meta variant={variant}>
                    {formatIndianCurrency(account.MinBalance, { decimals: false })} min balance held
                </Meta>
            )}
        </div>
    );
}

/** Cash on hand. No number, no reserve, no ornament. */
export function CashBody({ balance, variant }: CardBodyProps) {
    return (
        <div className="min-w-0">
            <Label variant={variant}>Balance</Label>
            <Figure amount={balance} variant={variant} />
        </div>
    );
}

/**
 * Holding value, with an optional sparkline. `series` is a caller-supplied
 * history; when it is absent nothing is drawn — no placeholder data is invented.
 */
export function InvestmentBody({ balance, variant, series }: CardBodyProps & { series?: number[] }) {
    const type = CARD_TYPE[variant];

    return (
        <>
            <div className="min-w-0">
                <Label variant={variant}>Value</Label>
                <Figure amount={balance} variant={variant} />
            </div>
            {series && series.length > 1 && (
                <div className="shrink-0 text-white/55">
                    <Sparkline series={series} width={type.spark.width} height={type.spark.height} />
                </div>
            )}
        </>
    );
}

function Sparkline({ series, width, height }: { series: number[]; width: number; height: number }) {
    const shouldReduceMotion = useReducedMotion();

    const low = Math.min(...series);
    const high = Math.max(...series);
    const span = high - low || 1;
    const points = series
        .map((point, index) => {
            const x = (index / (series.length - 1)) * 100;
            const y = 24 - ((point - low) / span) * 24;
            return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ');

    return (
        <svg
            viewBox="0 0 100 24"
            width={width}
            height={height}
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
        >
            <motion.polyline
                points={points}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: shouldReduceMotion ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.7, ease: 'easeOut' }}
            />
        </svg>
    );
}
