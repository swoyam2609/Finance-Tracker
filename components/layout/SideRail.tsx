import Link from 'next/link';
import { useRouter } from 'next/router';
import { useReducedMotion } from 'framer-motion';
import { SlideIndicator } from '@/components/MotionPrimitives';
import { isNavItemActive, navItems } from './BottomNav';

// ── SideRail ──
// Desktop counterpart to BottomNav: 62px icon rail pinned to the left edge,
// same four destinations, plus the logo mark at the top.

export default function SideRail() {
    const router = useRouter();
    const shouldReduceMotion = useReducedMotion();

    return (
        <nav
            aria-label="Primary"
            className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-[62px] flex-col items-center gap-4 py-4 bg-sys-card/60 backdrop-blur-xl border-r-[0.5px] border-sys-glass-stroke"
        >
            <Link href="/" aria-label="Finance — home" className="mb-1.5 flex items-center justify-center min-w-[44px] min-h-[44px]">
                <span
                    aria-hidden="true"
                    className="w-[26px] h-[26px] rounded-lg bg-gradient-to-br from-sys-blue to-sys-purple"
                />
                <span className="sr-only">Finance</span>
            </Link>

            <ul className="flex flex-col items-center gap-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const active = isNavItemActive(router.pathname, href);
                    return (
                        <li key={href}>
                            <Link
                                href={href}
                                aria-label={label}
                                aria-current={active ? 'page' : undefined}
                                className="relative flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl transition-opacity hover:opacity-100 active:opacity-60"
                            >
                                {active && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 rounded-full overflow-hidden">
                                        {shouldReduceMotion ? (
                                            <span className="absolute inset-0 bg-sys-blue rounded-full" />
                                        ) : (
                                            <SlideIndicator
                                                layoutId="side-rail-indicator"
                                                className="bg-sys-blue rounded-full"
                                            />
                                        )}
                                    </span>
                                )}
                                <Icon
                                    className={`w-5 h-5 transition-colors ${
                                        active ? 'text-sys-blue' : 'text-sys-label opacity-[0.32]'
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
