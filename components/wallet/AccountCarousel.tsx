/**
 * Horizontal snap carousel of account cards, becoming a two-column grid at
 * `md` and above. One component tree for both: only the card variant and the
 * container classes change — no drag library, no desktop-only branch.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

import type { Account } from '@/lib/accounts';

import AccountCard from './AccountCard';

export interface AccountCarouselProps {
    accounts: Account[];
    /** Signed balance per account Id, from `allBalances`. */
    balances: Record<string, number>;
    onSelect: (id: string) => void;
}

const MD_BREAKPOINT = '(min-width: 768px)';

/** Tracks the `md` breakpoint so the card variant can follow the container. */
function useIsWide(): boolean {
    const [isWide, setIsWide] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const query = window.matchMedia(MD_BREAKPOINT);
        const sync = () => setIsWide(query.matches);
        sync();
        query.addEventListener('change', sync);
        return () => query.removeEventListener('change', sync);
    }, []);

    return isWide;
}

export default function AccountCarousel({ accounts, balances, onSelect }: AccountCarouselProps) {
    const isWide = useIsWide();
    const shouldReduceMotion = useReducedMotion();
    const scrollerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);

    const setCardRef = useCallback((element: HTMLDivElement | null, index: number) => {
        cardRefs.current[index] = element;
    }, []);

    // Dots follow whichever card occupies the viewport centre.
    useEffect(() => {
        const scroller = scrollerRef.current;
        if (isWide || !scroller || accounts.length < 2) return;
        if (typeof IntersectionObserver === 'undefined') return;

        const cards = cardRefs.current.slice(0, accounts.length).filter(Boolean) as HTMLDivElement[];
        if (!cards.length) return;

        const observer = new IntersectionObserver(
            entries => {
                const visible = entries.filter(entry => entry.isIntersecting);
                if (!visible.length) return;
                const best = visible.reduce((leader, entry) =>
                    entry.intersectionRatio > leader.intersectionRatio ? entry : leader,
                );
                const index = cards.indexOf(best.target as HTMLDivElement);
                if (index !== -1) setActiveIndex(index);
            },
            { root: scroller, threshold: [0.25, 0.5, 0.75, 0.95] },
        );

        cards.forEach(card => observer.observe(card));
        return () => observer.disconnect();
    }, [accounts.length, isWide]);

    if (!accounts.length) return null;

    const scrollTo = (index: number) => {
        cardRefs.current[index]?.scrollIntoView({
            behavior: shouldReduceMotion ? 'auto' : 'smooth',
            block: 'nearest',
            inline: 'center',
        });
    };

    return (
        <div>
            <div
                ref={scrollerRef}
                className="flex snap-x snap-mandatory gap-3 overflow-x-auto scrollbar-hide pb-1 md:grid md:grid-cols-2 md:gap-2.5 md:overflow-x-visible md:pb-0"
            >
                {accounts.map((account, index) => (
                    <div
                        key={account.Id}
                        ref={element => setCardRef(element, index)}
                        className="snap-center shrink-0 md:w-full md:shrink"
                    >
                        <AccountCard
                            account={account}
                            balance={balances[account.Id] ?? 0}
                            variant={isWide ? 'grid' : 'rail'}
                            layoutId={`account-card-${account.Id}`}
                            onClick={() => onSelect(account.Id)}
                        />
                    </div>
                ))}
            </div>

            {accounts.length > 1 && (
                <div className="mt-3 flex justify-center gap-1.5 md:hidden">
                    {accounts.map((account, index) => (
                        <button
                            key={account.Id}
                            type="button"
                            onClick={() => scrollTo(index)}
                            aria-label={`Show ${account.Label}`}
                            aria-current={index === activeIndex}
                            className={`h-1.5 rounded-full transition-all ${
                                index === activeIndex ? 'w-4 bg-white/80' : 'w-1.5 bg-white/25'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
