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
            className="hidden md:flex fixed left-0 top-0 bottom-0 z-50 w-[62px] lg:w-[200px] flex-col items-center lg:items-stretch gap-4 py-4 lg:px-3 bg-sys-card/60 backdrop-blur-xl border-r-[0.5px] border-sys-glass-stroke"
        >
            <Link
                href="/"
                aria-label="Finance — home"
                className="mb-1.5 flex items-center justify-center lg:justify-start gap-2.5 lg:px-2 min-w-[44px] min-h-[44px]"
            >
                <span
                    aria-hidden="true"
                    className="w-[26px] h-[26px] shrink-0 rounded-lg bg-gradient-to-br from-sys-blue to-sys-purple"
                />
                <span className="hidden lg:block text-[15px] font-semibold text-sys-label">Finance</span>
                <span className="sr-only">Finance</span>
            </Link>

            <ul className="flex flex-col items-center lg:items-stretch gap-1 w-full">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const active = isNavItemActive(router.pathname, href);
                    return (
                        <li key={href} className="w-full">
                            <Link
                                href={href}
                                aria-label={label}
                                aria-current={active ? 'page' : undefined}
                                className={`relative flex items-center justify-center lg:justify-start gap-3 lg:px-3 min-w-[44px] min-h-[44px] rounded-xl transition-colors ${
                                    active ? 'lg:bg-sys-glass' : 'lg:hover:bg-white/[0.04]'
                                }`}
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
                                    className={`w-5 h-5 shrink-0 transition-colors ${
                                        active ? 'text-sys-blue' : 'text-sys-label opacity-[0.32]'
                                    }`}
                                    strokeWidth={active ? 2.2 : 1.9}
                                    aria-hidden="true"
                                />
                                <span
                                    className={`hidden lg:block text-[14px] ${
                                        active ? 'text-sys-label font-medium' : 'text-sys-label-secondary'
                                    }`}
                                >
                                    {label}
                                </span>
                                <span className="sr-only lg:hidden">{label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
