/**
 * Tweens a number towards `target` using a spring animation.
 *
 * Design goals:
 *  - The number should visibly rush toward the target (fast initial velocity).
 *  - A small, satisfying overshoot (~5-6%) so the change feels physical.
 *  - Smooth settle — no abrupt stop, no visible oscillation kinks.
 *  - Total duration ~800ms so it feels snappy, not sluggish.
 *
 * Implementation: numerical integration of a damped spring (mass-spring-damper)
 * using semi-implicit Euler. This is simpler than the closed-form solution and
 * handles mid-flight target changes naturally — the spring just retargets
 * from wherever the value currently is, with its current velocity preserved.
 *
 *   F = -k·x - c·v     (Hooke + damping)
 *   a = F / m          (m = 1)
 *   v += a·dt
 *   x += v·dt
 *
 * where x is the displacement from target, k is stiffness, c is damping.
 *
 * `prefers-reduced-motion` short-circuits and reports `target` immediately.
 */

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

// Spring parameters tuned for a money counter:
//   stiffness (k) = 170  — high enough to feel snappy
//   damping (c)   = 16   — underdamped, gives ~5% overshoot
//   mass (m)       = 1
const STIFFNESS = 170;
const DAMPING = 16;

export function useAnimatedCounter(target: number, duration: number = 800): number {
    const shouldReduceMotion = useReducedMotion();
    const [value, setValue] = useState(0);
    // Current position and velocity — preserved across target changes so
    // mid-flight retargeting carries momentum instead of jumping.
    const positionRef = useRef(0);
    const velocityRef = useRef(0);

    useEffect(() => {
        if (shouldReduceMotion) {
            positionRef.current = target;
            velocityRef.current = 0;
            setValue(target);
            return;
        }

        // If already at target with no velocity, skip.
        if (positionRef.current === target && Math.abs(velocityRef.current) < 0.1) return;

        let frame = requestAnimationFrame(function tick() {
            // Fixed timestep for stable integration. 120Hz displays get
            // smaller real dt but we still step in fixed increments —
            // substepping twice per frame keeps the spring stable.
            const dt = 1 / 120;

            for (let i = 0; i < 2; i++) {
                const displacement = positionRef.current - target;
                const force = -STIFFNESS * displacement - DAMPING * velocityRef.current;
                const acceleration = force; // mass = 1
                velocityRef.current += acceleration * dt;
                positionRef.current += velocityRef.current * dt;
            }

            const current = positionRef.current;
            setValue(current);

            // Stop when both position and velocity have settled.
            const settled =
                Math.abs(current - target) < 0.3 &&
                Math.abs(velocityRef.current) < 0.5;

            if (settled) {
                positionRef.current = target;
                velocityRef.current = 0;
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
