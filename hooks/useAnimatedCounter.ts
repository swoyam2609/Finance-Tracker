/**
 * Tweens a number towards `target` with a cubic ease-out, driven by rAF.
 *
 * Extracted from the original single-page implementation, with two fixes:
 *  - the previous animation frame loop is cancelled when `target` changes
 *    mid-flight, so overlapping tweens can no longer fight over the value;
 *  - `prefers-reduced-motion` short-circuits the tween and reports `target`
 *    immediately, so no motion is produced at all.
 *
 * Starts from 0 on mount, then tweens from the previous target to the new one.
 */

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export function useAnimatedCounter(target: number, duration: number = 1200): number {
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

        const startTime = performance.now();
        let frame = requestAnimationFrame(function tick(now: number) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(start + (target - start) * eased);
            if (progress < 1) frame = requestAnimationFrame(tick);
        });

        return () => cancelAnimationFrame(frame);
    }, [target, duration, shouldReduceMotion]);

    return shouldReduceMotion ? target : value;
}

export default useAnimatedCounter;
