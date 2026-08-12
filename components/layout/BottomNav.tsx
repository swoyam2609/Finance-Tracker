import Link from 'next/link';
import { useRouter } from 'next/router';
import { useReducedMotion } from 'framer-motion';
import { ArrowRightLeft, Banknote, Home, PieChart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SlideIndicator } from '@/components/MotionPrimitives';

export type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
};

// Single source of truth for the four destinations — SideRail imports this too.
export const navItems: NavItem[] = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/transfers', label: 'Transfers', icon: ArrowRightLeft },
    { href: '/analytics', label: 'Analytics', icon: PieChart },
    { href: '/loans', label: 'Loans', icon: Banknote },
];

/**
 * Active-route test shared by BottomNav and SideRail.
 * `/accounts/[id]` is a drilldown from Home, so Home stays lit there.
 * `router.pathname` is the route pattern, so the dynamic segment arrives
 * literally as `/accounts/[id]` — a prefix test covers every account id.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
    if (href === '/') {
        return pathname === '/' || pathname === '/accounts' || pathname.startsWith('/accounts/');
    }
    return pathname === href;
}

export default function BottomNav() {
    const router = useRouter();
    const shouldReduceMotion = useReducedMotion();

    return (
        <nav
            aria-label="Primary"
            className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sys-card/80 backdrop-blur-xl hairline-t"
            style={{ paddingBottom: 'var(--safe-area-bottom, 0px)' }}
        >
            <ul className="flex items-stretch justify-around h-14">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const active = isNavItemActive(router.pathname, href);
                    return (
                        <li key={href} className="flex-1 flex">
                            <Link
                                href={href}
                                aria-label={label}
                                aria-current={active ? 'page' : undefined}
                                className="relative flex-1 flex items-center justify-center min-w-[44px] min-h-[44px] transition-opacity active:opacity-60"
                            >
                                {active && (
                                    <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-7 rounded-full overflow-hidden">
                                        {shouldReduceMotion ? (
                                            <span className="absolute inset-0 bg-sys-blue rounded-full" />
                                        ) : (
                                            <SlideIndicator
                                                layoutId="bottom-nav-indicator"
                                                className="bg-sys-blue rounded-full"
                                            />
                                        )}
                                    </span>
                                )}
                                <Icon
                                    className={`w-[19px] h-[19px] transition-colors ${
                                        active ? 'text-sys-blue' : 'text-sys-label opacity-[0.35]'
                                    }`}
                                    strokeWidth={active ? 2.2 : 1.9}
                                    aria-hidden="true"
                                />
                                <span className="sr-only">{label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
