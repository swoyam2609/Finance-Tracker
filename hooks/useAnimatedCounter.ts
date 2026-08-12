/**
 * Tweens a number towards `target` using an underdamped spring.
 *
 * The spring overshoots the target by ~3% and settles back — the physical
 * "iOS spring" feel. This replaces the previous two-phase ease, which was
 * mathematically broken: both phases were ease-out curves, so the number
 * just decelerated with a velocity kink at 55% rather than truly rushing
 * and settling.
 *
 * Uses the closed-form underdamped spring solution rather than numerical
 * integration, so there is no accumulated error and the value at any time t
 * is exact:
 *
 *   x(t) = target − A · e^(−ζω₀t) · [cos(ω_d·t) + (ζω₀/ω_d)·sin(ω_d·t)]
 *
 * where A = target − start, ω_d = ω₀√(1−ζ²).
 *
 * The `duration` parameter (ms) controls the settling time: ω₀ is derived so
 * that the spring settles within 2% of the target at roughly `duration`.
 * The overshoot percentage is fixed by ζ and stays constant regardless of
 * duration.
 *
 * `prefers-reduced-motion` short-circuits and reports `target` immediately.
 *
 * Starts from 0 on mount, then springs from the current displayed value to
 * the new target on each change — so mid-flight target changes don't jump.
 */

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/** Damping ratio. 0.75 → ~2.8% overshoot. */
const ZETA = 0.75;

export function useAnimatedCounter(target: number, duration: number = 900): number {
    const shouldReduceMotion = useReducedMotion();
    const [value, setValue] = useState(0);
    // Tracks the actual displayed value, not the target — so a mid-flight
    // target change springs from where the number currently is, not from the
    // previous target (which would cause a visible jump).
    const currentRef = useRef(0);

    useEffect(() => {
        if (shouldReduceMotion) {
            currentRef.current = target;
            setValue(target);
            return;
        }

        const start = currentRef.current;
        if (start === target) return;

        // Derive ω₀ from the requested duration so the 2% settling time
        // roughly matches: t_s ≈ 4 / (ζ·ω₀)  →  ω₀ = 4 / (ζ · duration_s)
        const omega0 = 4 / (ZETA * (duration / 1000));
        const omegaD = omega0 * Math.sqrt(1 - ZETA * ZETA);
        const amplitude = target - start;

        const startTime = performance.now();

        let frame = requestAnimationFrame(function tick(now: number) {
            const t = (now - startTime) / 1000; // seconds

            // Closed-form underdamped spring position at time t.
            const decay = Math.exp(-ZETA * omega0 * t);
            const oscillation =
                Math.cos(omegaD * t) + (ZETA * omega0 / omegaD) * Math.sin(omegaD * t);
            const next = target - amplitude * decay * oscillation;

            currentRef.current = next;
            setValue(next);

            // Stop when the spring has settled within 0.5 of the target
            // (half a rupee is invisible in the formatted output).
            if (Math.abs(next - target) < 0.5) {
                currentRef.current = target;
                setValue(target);
                return;
            }

            frame = requestAnimationFrame(tick);
        });

        return () => cancelAnimationFrame(frame);
    }, [target, duration, shouldReduceMotion]);

    return shouldReduceMotion ? target : value;
}

export default useAnimatedCounter;
