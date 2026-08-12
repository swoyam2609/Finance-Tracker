/**
 * The hero balance block: a tappable mode label, one big animated figure and a
 * month-delta line.
 *
 * Pure presentation. Every figure arrives already computed by `lib/finance`;
 * this component never derives money, fetches, or reads a context.
 *
 * Type scale is lifted from the approved "Snap carousel + pulse tiles" mockup
 * (`.hero-lbl` / `.hero-num` / `.hero-delta`), scaled from the 300px mock frame
 * to the real 390px viewport.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { PressableCard } from '@/components/MotionPrimitives';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';
import { formatIndianCurrency } from '@/lib/format';

export type HeroMode = 'spendable' | 'networth' | 'investments';

/** Tap order of the label: spendable → networth → investments → spendable. */
const MODE_ORDER: HeroMode[] = ['spendable', 'networth', 'investments'];

const MODE_LABEL: Record<HeroMode, string> = {
    spendable: 'Spendable',
    networth: 'Net worth',
    investments: 'Investments',
};

function nextMode(mode: HeroMode): HeroMode {
    const index = MODE_ORDER.indexOf(mode);
    return MODE_ORDER[(index + 1) % MODE_ORDER.length];
}

export interface HeroBalanceProps {
    mode: HeroMode;
    onModeChange: (mode: HeroMode) => void;
    spendable: number;
    netWorth: number;
    investments: number;
    /** Net change across the current calendar month. Zero hides the delta line. */
    monthDelta: number;
    /** Called when the figure itself is tapped, to open the breakdown sheet. */
    onBreakdown?: () => void;
}

export default function HeroBalance({
    mode,
    onModeChange,
    spendable,
    netWorth,
    investments,
    monthDelta,
    onBreakdown,
}: HeroBalanceProps) {
    const shouldReduceMotion = useReducedMotion();

    const target = mode === 'spendable' ? spendable : mode === 'networth' ? netWorth : investments;
    const animated = useAnimatedCounter(target);

    // Split the formatted figure so the paise render smaller, as in the mockup.
    // The string still comes from `lib/format` — never hand-rolled here.
    const formatted = formatIndianCurrency(animated);
    const dot = formatted.lastIndexOf('.');
    const whole = dot === -1 ? formatted : formatted.slice(0, dot);
    const fraction = dot === -1 ? '' : formatted.slice(dot);

    const upcoming = nextMode(mode);
    const isUp = monthDelta > 0;

    const figure = (
        <span aria-hidden="true" className="money block text-[42px] font-[680] leading-[1.05] tracking-[-0.03em] md:text-[48px]">
            {whole}
            {fraction && <span className="text-[22px] text-white/45 md:text-[24px]">{fraction}</span>}
        </span>
    );

    return (
        <section className="select-none">
            {/* Mode label — a real button, since it is the only route to net worth. */}
            <button
                type="button"
                onClick={() => onModeChange(upcoming)}
                aria-label={`Showing ${MODE_LABEL[mode].toLowerCase()}. Tap to show ${MODE_LABEL[upcoming].toLowerCase()}.`}
                className="-mx-1 flex items-center gap-1 rounded-md px-1 py-1 text-[12px] uppercase tracking-[0.12em] text-sys-label-secondary transition-opacity active:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sys-blue/60"
            >
                <motion.span
                    key={mode}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: -3 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                >
                    {MODE_LABEL[mode]}
                </motion.span>
                <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 opacity-70" strokeWidth={2.5} />
            </button>

            {/* The figure. Tapping it explains the arithmetic. */}
            {onBreakdown ? (
                <PressableCard className="mt-[3px] inline-block" scaleAmount={0.985}>
                    <button
                        type="button"
                        onClick={onBreakdown}
                        aria-label={`${MODE_LABEL[mode]} ${formatIndianCurrency(target)}. Tap to see how this is calculated.`}
                        className="block cursor-pointer rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sys-blue/60"
                    >
                        {figure}
                    </button>
                </PressableCard>
            ) : (
                <div className="mt-[3px]">
                    {/* Announce the settled value, not every tweened frame. */}
                    <span className="sr-only">{`${MODE_LABEL[mode]} ${formatIndianCurrency(target)}`}</span>
                    {figure}
                </div>
            )}

            {monthDelta !== 0 && (
                <motion.p
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24, delay: 0.05 }}
                    className={`mt-1 text-[13px] ${isUp ? 'text-sys-green' : 'text-sys-red'}`}
                >
                    <span aria-hidden="true">{isUp ? '▲' : '▼'}</span>
                    <span className="sr-only">{isUp ? 'Up' : 'Down'}</span>{' '}
                    <span className="money">{formatIndianCurrency(Math.abs(monthDelta), { decimals: false })}</span> this month
                </motion.p>
            )}
        </section>
    );
}
