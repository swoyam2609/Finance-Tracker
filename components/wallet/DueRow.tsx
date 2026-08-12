/**
 * Credit due-date row from the account-detail mockup: a days-left countdown,
 * the due date, an optional minimum due, and a "Log payment" action.
 *
 * Pure presentation — `DueInfo` is computed by `nextDue()` in `@/lib/finance`
 * and passed in, so this component never touches the clock.
 */

import { AlertCircle } from 'lucide-react';

import type { DueInfo } from '@/lib/finance';
import { formatIndianCurrency, formatShortDate } from '@/lib/format';

export interface DueRowProps {
    due: DueInfo;
    /** Minimum amount due this cycle, when the caller knows it. */
    minimumDue?: number;
    onLogPayment?: () => void;
}

const LABEL_CLASS = 'text-[9px] uppercase tracking-[0.1em] text-white/50';

export default function DueRow({ due, minimumDue, onLogPayment }: DueRowProps) {
    const isToday = due.daysLeft === 0;
    // Amber is a reinforcement, never the message: the countdown text says it too.
    const urgent = due.isDueSoon;
    const accent = urgent ? 'text-[#FF9F0A]' : 'text-white';

    return (
        <div className="glass flex w-full items-center gap-[11px] px-[13px] py-[11px] text-white">
            <div className="min-w-0">
                {isToday ? (
                    <>
                        <div className={`text-[15px] font-semibold leading-none ${accent}`}>
                            Due today
                        </div>
                        <div className={`${LABEL_CLASS} mt-[3px]`}>Payment window</div>
                    </>
                ) : (
                    <>
                        <div className={`money text-[20px] font-semibold leading-none ${accent}`}>
                            {due.daysLeft}
                        </div>
                        <div className={`${LABEL_CLASS} mt-[3px]`}>
                            {due.daysLeft === 1 ? 'day to due' : 'days to due'}
                        </div>
                    </>
                )}
            </div>

            <div className="min-w-0">
                <div className="flex items-center gap-1 text-[11px] font-semibold">
                    {urgent && <AlertCircle size={12} className="text-[#FF9F0A]" aria-hidden="true" />}
                    <span className="truncate">Due {formatShortDate(due.date)}</span>
                </div>
                {typeof minimumDue === 'number' && (
                    <div className={`money ${LABEL_CLASS} mt-[2px]`}>
                        min {formatIndianCurrency(minimumDue, { decimals: false })}
                    </div>
                )}
            </div>

            {onLogPayment && (
                <button
                    type="button"
                    onClick={onLogPayment}
                    className="ml-auto shrink-0 rounded-[9px] bg-sys-blue px-[11px] py-[7px] text-[10.5px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-75"
                >
                    Log payment
                </button>
            )}
        </div>
    );
}
