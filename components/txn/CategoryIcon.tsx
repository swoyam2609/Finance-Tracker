/**
 * Category and account glyphs, lifted verbatim from the original
 * pages/index.tsx so icon and colour choices stay identical after the split.
 */

import {
    UtensilsCrossed, Car, ShoppingBag, Film, Zap, Heart, GraduationCap, ShoppingCart,
    Home as HomeIcon, Shield, Sparkles, Plane, RefreshCw, Gift, Users, Wallet,
    Building2, Landmark, CreditCard, Banknote, TrendingUp, ArrowUp, ArrowDown, ArrowRight,
} from 'lucide-react';
import type { ReactNode } from 'react';

export interface Glyph {
    icon: ReactNode;
    bgColor: string;
}

const ICON = 'w-5 h-5';

const CATEGORY_GLYPHS: Record<string, Glyph> = {
    'Food & Dining': { icon: <UtensilsCrossed className={`${ICON} text-sys-orange`} />, bgColor: 'bg-sys-orange/15' },
    'Transportation': { icon: <Car className={`${ICON} text-sys-blue`} />, bgColor: 'bg-sys-blue/15' },
    'Shopping': { icon: <ShoppingBag className={`${ICON} text-sys-pink`} />, bgColor: 'bg-sys-pink/15' },
    'Entertainment': { icon: <Film className={`${ICON} text-sys-purple`} />, bgColor: 'bg-sys-purple/15' },
    'Bills & Utilities': { icon: <Zap className={`${ICON} text-sys-yellow`} />, bgColor: 'bg-sys-yellow/15' },
    'Healthcare': { icon: <Heart className={`${ICON} text-sys-red`} />, bgColor: 'bg-sys-red/15' },
    'Education': { icon: <GraduationCap className={`${ICON} text-sys-indigo`} />, bgColor: 'bg-sys-indigo/15' },
    'Groceries': { icon: <ShoppingCart className={`${ICON} text-sys-green`} />, bgColor: 'bg-sys-green/15' },
    'Rent': { icon: <HomeIcon className={`${ICON} text-sys-orange`} />, bgColor: 'bg-sys-orange/15' },
    'Insurance': { icon: <Shield className={`${ICON} text-sys-teal`} />, bgColor: 'bg-sys-teal/15' },
    'Personal Care': { icon: <Sparkles className={`${ICON} text-sys-pink`} />, bgColor: 'bg-sys-pink/15' },
    'Travel': { icon: <Plane className={`${ICON} text-sys-cyan`} />, bgColor: 'bg-sys-cyan/15' },
    'Subscriptions': { icon: <RefreshCw className={`${ICON} text-sys-purple`} />, bgColor: 'bg-sys-purple/15' },
    'Gifts': { icon: <Gift className={`${ICON} text-sys-pink`} />, bgColor: 'bg-sys-pink/15' },
    'Family Transfer': { icon: <Users className={`${ICON} text-sys-teal`} />, bgColor: 'bg-sys-teal/15' },
    'Other': { icon: <Wallet className={`${ICON} text-sys-label-secondary`} />, bgColor: 'bg-sys-fill/50' },
};

/**
 * Positive rows always show a green up-arrow regardless of category, matching
 * the original behaviour.
 */
export function categoryGlyph(category: string, isPositive = false): Glyph {
    if (isPositive) {
        return { icon: <ArrowUp className={`${ICON} text-sys-green`} />, bgColor: 'bg-sys-green/15' };
    }
    if (category === 'Transfer Out') {
        return { icon: <ArrowRight className={`${ICON} text-sys-red`} />, bgColor: 'bg-sys-red/15' };
    }
    if (category === 'Transfer In') {
        return { icon: <ArrowDown className={`${ICON} text-sys-green`} />, bgColor: 'bg-sys-green/15' };
    }
    return CATEGORY_GLYPHS[category] || CATEGORY_GLYPHS['Other'];
}

export interface AccountGlyph {
    icon: ReactNode;
    color: string;
    bg: string;
}

export function accountGlyph(account: string): AccountGlyph {
    switch (account) {
        case 'AXIS Bank': return { icon: <Building2 className={ICON} />, color: 'text-sys-pink', bg: 'bg-sys-pink/15' };
        case 'SBI Bank': return { icon: <Landmark className={ICON} />, color: 'text-sys-blue', bg: 'bg-sys-blue/15' };
        case 'Credit Card': return { icon: <CreditCard className={ICON} />, color: 'text-sys-orange', bg: 'bg-sys-orange/15' };
        case 'Cash': return { icon: <Banknote className={ICON} />, color: 'text-sys-green', bg: 'bg-sys-green/15' };
        case 'Mutual Fund': return { icon: <TrendingUp className={ICON} />, color: 'text-sys-purple', bg: 'bg-sys-purple/15' };
        default: return { icon: <Wallet className={ICON} />, color: 'text-sys-label-secondary', bg: 'bg-sys-fill/50' };
    }
}

/** Falls back by account kind when the account name is not one of the known five. */
export function accountKindGlyph(kind: string): AccountGlyph {
    switch (kind) {
        case 'credit': return { icon: <CreditCard className={ICON} />, color: 'text-sys-purple', bg: 'bg-sys-purple/15' };
        case 'cash': return { icon: <Banknote className={ICON} />, color: 'text-sys-green', bg: 'bg-sys-green/15' };
        case 'investment': return { icon: <TrendingUp className={ICON} />, color: 'text-sys-teal', bg: 'bg-sys-teal/15' };
        default: return { icon: <Landmark className={ICON} />, color: 'text-sys-blue', bg: 'bg-sys-blue/15' };
    }
}
