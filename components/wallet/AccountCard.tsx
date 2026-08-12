/**
 * One account rendered as a frosted-glass card face — Direction A of the
 * approved card mockup: translucent fill, hairline stroke, a single blurred
 * colour bloom off the top-right corner, and a kind-specific body.
 *
 * Pure presentation: every figure arrives as a prop or comes from the pure
 * helpers in `@/lib/finance`. Nothing here fetches or subscribes to data.
 */

import { motion } from 'framer-motion';
import type { KeyboardEvent } from 'react';

import type { Account, AccountKind } from '@/lib/accounts';
import { resolveArt } from '@/lib/accounts';
import { maskLast4 } from '@/lib/format';

import {
    BankBody,
    CARD_TYPE,
    CashBody,
    CreditBody,
    InvestmentBody,
    META_CLASS,
    type CardBodyProps,
    type CardVariant,
} from './CardBodies';
import { PressableCard } from '../MotionPrimitives';

export interface AccountCardProps {
    account: Account;
    /** Signed balance for this account, from `accountBalance` / `allBalances`. */
    balance: number;
    variant?: CardVariant;
    onClick?: () => void;
    /** Set to morph this face into the detail screen's hero card. */
    layoutId?: string;
    className?: string;
}

/** The kind is always stated as text, so the bloom colour is never the only signal. */
const KIND_LABEL: Record<AccountKind, string> = {
    bank: 'Bank',
    credit: 'Credit',
    cash: 'Cash',
    investment: 'Investment',
};

const NETWORK_LABEL: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    rupay: 'RuPay',
    amex: 'Amex',
};

const BODIES: Record<AccountKind, (props: CardBodyProps) => JSX.Element> = {
    bank: BankBody,
    credit: CreditBody,
    cash: CashBody,
    investment: InvestmentBody,
};

export default function AccountCard({
    account,
    balance,
    variant = 'rail',
    onClick,
    layoutId,
    className = '',
}: AccountCardProps) {
    const type = CARD_TYPE[variant];
    const Body = BODIES[account.Kind];
    const masked = maskLast4(account.Last4, 2);

    const sublabel = [
        KIND_LABEL[account.Kind],
        NETWORK_LABEL[account.Network] ?? (account.Network ? account.Network.toUpperCase() : ''),
        type.showNumberLine ? '' : masked,
    ]
        .filter(Boolean)
        .join(' · ');

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!onClick) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onClick();
    };

    return (
        <motion.div
            layoutId={layoutId}
            className={`${type.shell} ${className}`}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? handleKeyDown : undefined}
            aria-label={onClick ? `${account.Label}, ${KIND_LABEL[account.Kind]}` : undefined}
        >
            <PressableCard onClick={onClick} className="h-full w-full">
                <div
                    className={`glass flex h-full w-full flex-col justify-between text-white ${type.pad}`}
                >
                    <div
                        className="glass-bloom"
                        style={{ background: resolveArt(account) }}
                        aria-hidden="true"
                    />

                    {/* Identity */}
                    <div className="relative flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <div className={`${type.name} font-semibold tracking-[0.01em] truncate`}>
                                {account.Label}
                            </div>
                            <div
                                className={`${type.sub} mt-[2px] uppercase tracking-[0.1em] text-white/50 truncate`}
                            >
                                {sublabel}
                            </div>
                        </div>
                        <div
                            className={`${type.chip} shrink-0 rounded-[4px] bg-gradient-to-br from-white/50 to-white/[0.14]`}
                            aria-hidden="true"
                        />
                    </div>

                    {/* Money */}
                    <div className="relative">
                        <div className="flex items-end justify-between gap-3">
                            <Body account={account} balance={balance} variant={variant} />
                        </div>
                        {type.showNumberLine && masked && (
                            <div
                                className={`money ${META_CLASS} ${type.meta} mt-[6px] opacity-80`}
                            >
                                {masked}
                            </div>
                        )}
                    </div>
                </div>
            </PressableCard>
        </motion.div>
    );
}
