/**
 * Tweens a number towards `target`, driven by rAF.
 *
 * Uses a two-phase easing: a fast ease-out for the first 60% of the distance
 * (so the number races towards its new value), then a gentle settle for the
 * remaining 40% (so it decelerates naturally rather than stopping abruptly).
 *
 * Extracted from the original single-page implementation, with fixes:
 *  - the previous animation frame loop is cancelled when `target` changes
 *    mid-flight, so overlapping tweens can no longer fight over the value;
 *  - `prefers-reduced-motion` short-circuits the tween and reports `target`
 *    immediately, so no motion is produced at all.
 *
 * Starts from 0 on mount, then tweens from the previous target to the new one.
 */

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export function useAnimatedCounter(target: number, duration: number = 1100): number {
    const shouldReduceMotion = useReducedMotion();
    const [value, setValue] = useState(0);
    const prevTarget = useRef(0);

    useEffect(() => {
        // No motion requested: jump straight to the target and keep the
        // tween origin in sync so a later re-enable starts from the right place.
        if (shouldReduceMotion) {
            prevTarget.current = target;
            setValue(target);
            return;
        }

        const start = prevTarget.current;
        prevTarget.current = target;

        // If the value hasn't changed, skip the tween.
        if (start === target) return;

        const startTime = performance.now();

        // Two-phase ease: fast ease-out (0→0.6 in 55% of duration) then a
        // gentle decelerate (0.6→1.0 in 45%). This makes the number feel
        // like it's rushing towards the new value and then settling.
        function ease(progress: number): number {
            if (progress < 0.55) {
                // Fast phase: ease-out quad, scaled to 0–0.6
                const p = progress / 0.55;
                return 0.6 * (1 - Math.pow(1 - p, 3));
            } else {
                // Settle phase: ease-in-out, scaled to 0.6–1.0
                const p = (progress - 0.55) / 0.45;
                return 0.6 + 0.4 * (1 - Math.pow(1 - p, 2));
            }
        }

        let frame = requestAnimationFrame(function tick(now: number) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = ease(progress);
            setValue(start + (target - start) * eased);
            if (progress < 1) frame = requestAnimationFrame(tick);
        });

        return () => cancelAnimationFrame(frame);
    }, [target, duration, shouldReduceMotion]);

    return shouldReduceMotion ? target : value;
}

export default useAnimatedCounter;
