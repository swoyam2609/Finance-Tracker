/**
 * Full-screen loading state — the wallet assembling itself.
 *
 * Built from the same frosted-glass geometry as a real rail card (190x118,
 * `.glass` + `.glass-bloom` + `.glass-scrim`, one colour bloom per face), so the
 * wait reads as the deck being laid out rather than as a generic spinner.
 *
 * Nothing here shows a figure: the balance is a `.skeleton` placeholder and the
 * card faces are hairline bars, so no part of this screen can be mistaken for
 * real data.
 *
 * Every loop branches on `useReducedMotion()`. With reduced motion the screen
 * renders its settled final state — fanned cards, no drift, no sheen, no pulse.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { CreditCard, Landmark, TrendingUp, type LucideIcon } from 'lucide-react';

/** Rail-card geometry, mirrored from `CARD_TYPE.rail` in `wallet/CardBodies`. */
const CARD_W = 190;
const CARD_H = 118;
const BLOOM = 104;

/** Ambient radial size, in px. Kept off-transform so `scale` stays animatable. */
const GLOW = 620;

interface GhostCard {
    /** One of the `ART_PRESETS` hues. */
    hue: string;
    icon: LucideIcon;
    /** Settled fan offset + tilt. */
    x: number;
    y: number;
    rotate: number;
    z: number;
    /** Entrance delay — the back faces land first, the front face last. */
    delay: number;
    /** Period of the idle drift loop, in seconds. Deliberately coprime-ish. */
    drift: number;
    /** Echo the utilization ring on the credit face only. */
    ring?: boolean;
}

const CARDS: GhostCard[] = [
    { hue: '#00B8A9', icon: TrendingUp, x: -52, y: 15, rotate: -9, z: 1, delay: 0, drift: 4.6 },
    { hue: '#7A5CFF', icon: CreditCard, x: 52, y: 15, rotate: 9, z: 2, delay: 0.09, drift: 5.3, ring: true },
    { hue: '#C2415A', icon: Landmark, x: 0, y: -9, rotate: 0, z: 3, delay: 0.18, drift: 4.1 },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.12, delayChildren: 0.05 },
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.4, ease: 'easeOut' as const },
    },
};

const reducedContainerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: {
        opacity: 0,
        transition: { duration: 0.4, ease: 'easeOut' as const },
    },
};

const riseVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring' as const, stiffness: 340, damping: 32 },
    },
};

const fadeVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
};

/** A hairline placeholder where a line of card text would sit. */
function Bar({
    w,
    h,
    opacity = 0.18,
    radius = 999,
}: {
    w: number;
    h: number;
    opacity?: number;
    radius?: number;
}) {
    return (
        <div
            style={{
                width: w,
                height: h,
                borderRadius: radius,
                backgroundColor: `rgba(255,255,255,${opacity})`,
            }}
        />
    );
}

/** One glass face in the fan: real card chrome, placeholder content. */
function GhostFace({
    card,
    index,
    reduced,
}: {
    card: GhostCard;
    index: number;
    reduced: boolean;
}) {
    const Icon = card.icon;

    return (
        <motion.div
            className="absolute left-1/2 top-1/2"
            style={{ zIndex: card.z, marginLeft: -CARD_W / 2, marginTop: -CARD_H / 2 }}
            initial={
                reduced
                    ? { opacity: 0, x: card.x, y: card.y, rotate: card.rotate }
                    : { opacity: 0, x: card.x * 0.3, y: card.y + 34, rotate: card.rotate * 0.25, scale: 0.9 }
            }
            animate={
                reduced
                    ? { opacity: 1, x: card.x, y: card.y, rotate: card.rotate }
                    : { opacity: 1, x: card.x, y: card.y, rotate: card.rotate, scale: 1 }
            }
            transition={
                reduced
                    ? { duration: 0.25 }
                    : {
                        type: 'spring' as const,
                        stiffness: 240,
                        damping: 20,
                        mass: 0.9,
                        delay: 0.3 + card.delay,
                    }
            }
        >
            {/* Idle drift, kept on its own layer so it composes with the settle transform. */}
            <motion.div
                className="glass flex flex-col justify-between p-[14px] text-white"
                style={{ width: CARD_W, height: CARD_H }}
                animate={reduced ? undefined : { y: [0, -5, 0] }}
                transition={
                    reduced
                        ? undefined
                        : {
                            duration: card.drift,
                            ease: 'easeInOut' as const,
                            repeat: Infinity,
                            delay: index * 0.35,
                        }
                }
            >
                <motion.div
                    className="glass-bloom"
                    style={{ background: card.hue, width: BLOOM, height: BLOOM }}
                    animate={reduced ? undefined : { opacity: [0.34, 0.52, 0.34] }}
                    transition={
                        reduced
                            ? undefined
                            : {
                                duration: 5.5,
                                ease: 'easeInOut' as const,
                                repeat: Infinity,
                                delay: index * 0.6,
                            }
                    }
                    aria-hidden="true"
                />
                <div className="glass-scrim" aria-hidden="true" />

                {/* Light pass — reads as the face being rendered in. */}
                {!reduced && (
                    <motion.div
                        className="pointer-events-none absolute inset-y-0 left-0 w-[76px]"
                        style={{
                            background:
                                'linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.14) 50%, transparent 100%)',
                            filter: 'blur(6px)',
                        }}
                        initial={{ x: -100 }}
                        animate={{ x: CARD_W + 50 }}
                        transition={{
                            duration: 1.5,
                            ease: 'easeInOut' as const,
                            repeat: Infinity,
                            repeatDelay: 2,
                            delay: 0.9 + index * 0.24,
                        }}
                        aria-hidden="true"
                    />
                )}

                {/* Identity row */}
                <div className="relative flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                        <div
                            className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[8px]"
                            style={{ backgroundColor: `${card.hue}33` }}
                        >
                            <Icon className="h-[55%] w-[55%] text-white/70" strokeWidth={2} />
                        </div>
                        <div className="flex flex-col gap-[5px]">
                            <Bar w={54} h={7} opacity={0.2} />
                            <Bar w={32} h={5} opacity={0.11} />
                        </div>
                    </div>
                    <div className="h-[16px] w-[22px] shrink-0 rounded-[4px] bg-gradient-to-br from-white/40 to-white/[0.12]" />
                </div>

                {/* Money row — bars, never numerals */}
                <div className="relative flex items-end justify-between gap-3">
                    <div className="flex flex-col gap-[7px]">
                        <Bar w={34} h={5} opacity={0.13} />
                        <Bar w={88} h={13} opacity={0.19} radius={4} />
                    </div>
                    {card.ring && (
                        <div className="h-[30px] w-[30px] shrink-0 rounded-full border-[2.5px] border-white/[0.13]" />
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function LoadingScreen() {
    const shouldReduceMotion = useReducedMotion();
    const reduced = Boolean(shouldReduceMotion);

    return (
        <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-sys-bg"
            variants={reduced ? reducedContainerVariants : containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="status"
            aria-label="Loading your financial data"
        >
            {/* Ambient bloom so the black never reads flat */}
            <motion.div
                className="pointer-events-none absolute left-1/2 top-1/2"
                style={{
                    width: GLOW,
                    height: GLOW,
                    marginLeft: -GLOW / 2,
                    marginTop: -GLOW / 2 - 20,
                    background:
                        'radial-gradient(circle, rgba(122,92,255,0.16) 0%, rgba(122,92,255,0.055) 45%, transparent 72%)',
                }}
                animate={reduced ? undefined : { scale: [1, 1.09, 1], opacity: [0.65, 1, 0.65] }}
                transition={
                    reduced
                        ? undefined
                        : { duration: 9, ease: 'easeInOut' as const, repeat: Infinity }
                }
                aria-hidden="true"
            />

            <div className="relative z-10 flex flex-col items-center px-6">
                {/* Wordmark, restrained */}
                <motion.p
                    className="text-[10px] uppercase tracking-[0.34em] text-white/30"
                    variants={reduced ? fadeVariants : riseVariants}
                >
                    Finance Tracker
                </motion.p>

                {/* Where the balance will land. `.skeleton`'s shimmer is already
                    neutralised by the prefers-reduced-motion rule in globals.css. */}
                <motion.div
                    className="mt-7 flex flex-col items-center gap-[10px]"
                    variants={reduced ? fadeVariants : riseVariants}
                    aria-hidden="true"
                >
                    <div className="skeleton h-[9px] w-[64px]" style={{ borderRadius: 999 }} />
                    <div className="skeleton h-[30px] w-[188px]" style={{ borderRadius: 10 }} />
                </motion.div>

                {/* The deck, fanning into place */}
                <motion.div
                    className="relative mt-10 h-[176px] w-[300px]"
                    variants={reduced ? fadeVariants : riseVariants}
                    aria-hidden="true"
                >
                    {CARDS.map((card, index) => (
                        <GhostFace key={card.hue} card={card} index={index} reduced={reduced} />
                    ))}
                </motion.div>

                <motion.p
                    className="mt-10 text-[12.5px] tracking-[0.01em] text-white/35"
                    variants={reduced ? fadeVariants : riseVariants}
                >
                    <motion.span
                        className="inline-block"
                        animate={reduced ? undefined : { opacity: [0.55, 1, 0.55] }}
                        transition={
                            reduced
                                ? undefined
                                : { duration: 3.4, ease: 'easeInOut' as const, repeat: Infinity }
                        }
                    >
                        Laying out your cards
                    </motion.span>
                </motion.p>
            </div>
        </motion.div>
    );
}
