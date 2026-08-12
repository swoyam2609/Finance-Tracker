/**
 * Credit utilization ring. `value` is the 0–1 fraction returned by
 * `utilization()` — null when the account has no configured limit, in which
 * case nothing renders at all rather than an empty or zeroed ring.
 *
 * Geometry copied from the approved frosted-glass mockup: a 36-unit viewBox
 * with r=15.5 and a 3-unit stroke, so the ring scales with `size` without any
 * per-size maths.
 */

import { motion, useReducedMotion } from 'framer-motion';

const RADIUS = 15.5;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Amber from 70%, red above 90%. The percentage text carries the same meaning. */
function strokeFor(fraction: number): string {
    if (fraction > 0.9) return '#FF453A';
    if (fraction >= 0.7) return '#FF9F0A';
    return 'rgba(255,255,255,0.92)';
}

export default function UtilizationRing({
    value,
    size = 44,
}: {
    value: number | null;
    size?: number;
}) {
    const shouldReduceMotion = useReducedMotion();

    if (value === null) return null;

    const fraction = Math.min(Math.max(value, 0), 1);
    const percent = Math.round(value * 100);
    const offset = CIRCUMFERENCE * (1 - fraction);

    return (
        <svg
            viewBox="0 0 36 36"
            width={size}
            height={size}
            role="img"
            aria-label={`${percent}% of credit limit used`}
        >
            <circle
                cx="18"
                cy="18"
                r={RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="3"
            />
            <motion.circle
                cx="18"
                cy="18"
                r={RADIUS}
                fill="none"
                stroke={strokeFor(fraction)}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                transform="rotate(-90 18 18)"
                initial={{ strokeDashoffset: shouldReduceMotion ? offset : CIRCUMFERENCE }}
                animate={{ strokeDashoffset: offset }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.8, ease: 'easeOut' }}
            />
            <text
                x="18"
                y="20.5"
                textAnchor="middle"
                fontSize="8"
                fill="#fff"
                fillOpacity="0.85"
                className="money"
            >
                {percent}%
            </text>
        </svg>
    );
}
