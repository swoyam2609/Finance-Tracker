import { motion, useReducedMotion } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.3 },
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.4, ease: 'easeOut' as const },
    },
};

const childVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring' as const, stiffness: 400, damping: 30 },
    },
};

const statCards = [
    { label: 'Balance', color: 'text-sys-green', delay: 0 },
    { label: 'Spent', color: 'text-sys-red', delay: 0.5 },
    { label: 'Saved', color: 'text-sys-blue', delay: 1 },
];

const chartPath = 'M10 80 Q50 68 75 48 T130 28 T185 15 L210 10';
const areaPath = 'M10 80 Q50 68 75 48 T130 28 T185 15 L210 10 L210 95 L10 95 Z';

const dataPoints = [
    { cx: 75, cy: 48, delay: 0.4 },
    { cx: 130, cy: 28, delay: 0.6 },
    { cx: 210, cy: 10, delay: 0.8 },
];

export default function LoadingScreen() {
    const shouldReduceMotion = useReducedMotion();

    return (
        <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-sys-bg"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="status"
            aria-label="Loading your financial data"
        >
            {/* Radial glow */}
            <div
                className="absolute pointer-events-none"
                style={{
                    top: '50%',
                    left: '50%',
                    width: 400,
                    height: 400,
                    transform: 'translate(-50%, -50%)',
                    background: 'radial-gradient(circle, rgba(48,209,88,0.06) 0%, transparent 70%)',
                }}
            />

            {/* Title */}
            <motion.h1
                className="text-[28px] font-bold text-sys-label tracking-tight"
                variants={childVariants}
            >
                Finance Tracker
            </motion.h1>

            {/* Chart */}
            <motion.div className="my-8" variants={childVariants}>
                <motion.svg
                    width={220}
                    height={100}
                    viewBox="0 0 220 100"
                    className="overflow-visible"
                >
                    {/* Subtle grid lines */}
                    <line x1="10" y1="25" x2="210" y2="25" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="10" y1="50" x2="210" y2="50" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="10" y1="75" x2="210" y2="75" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

                    {/* Gradient fill */}
                    <defs>
                        <linearGradient id="loadingFillGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#30D158" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="#30D158" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <motion.path
                        d={areaPath}
                        fill="url(#loadingFillGrad)"
                        initial={{ opacity: 0 }}
                        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: [0, 1, 1, 0] }}
                        transition={shouldReduceMotion ? { duration: 0.5 } : { duration: 2.5, ease: 'easeOut' as const, repeat: Infinity }}
                    />

                    {/* Main chart line */}
                    <motion.path
                        d={chartPath}
                        fill="none"
                        stroke="#30D158"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0.3 }}
                        animate={shouldReduceMotion ? { pathLength: 1, opacity: 1 } : { pathLength: [0, 1, 1, 0], opacity: [0.3, 1, 1, 0.3] }}
                        transition={shouldReduceMotion ? { duration: 0.5 } : { duration: 2.5, ease: 'easeOut' as const, repeat: Infinity }}
                    />

                    {/* Glow line */}
                    <motion.path
                        d={chartPath}
                        fill="none"
                        stroke="#30D158"
                        strokeWidth={8}
                        strokeLinecap="round"
                        style={{ filter: 'blur(10px)' }}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={shouldReduceMotion ? { pathLength: 1, opacity: 0.3 } : { pathLength: [0, 1, 1, 0], opacity: [0, 0.3, 0.3, 0] }}
                        transition={shouldReduceMotion ? { duration: 0.5 } : { duration: 2.5, ease: 'easeOut' as const, repeat: Infinity }}
                    />

                    {/* Data points with glow rings */}
                    {dataPoints.map((point) => (
                        <g key={`${point.cx}-${point.cy}`}>
                            <motion.circle
                                cx={point.cx}
                                cy={point.cy}
                                r={4}
                                fill="#30D158"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={shouldReduceMotion ? { scale: 1, opacity: 1, r: 4 } : {
                                    scale: [0, 1, 1, 0],
                                    opacity: [0, 1, 1, 0],
                                    r: [4, 6, 4, 4],
                                }}
                                transition={shouldReduceMotion ? { duration: 0.5, delay: point.delay } : {
                                    duration: 2.5,
                                    ease: 'easeOut' as const,
                                    repeat: Infinity,
                                    delay: point.delay,
                                }}
                            />
                            <motion.circle
                                cx={point.cx}
                                cy={point.cy}
                                r={8}
                                fill="none"
                                stroke="#30D158"
                                strokeWidth={1}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={shouldReduceMotion ? { scale: 1, opacity: 0.3 } : {
                                    scale: [0, 1, 1, 0],
                                    opacity: [0, 0.3, 0.3, 0],
                                }}
                                transition={shouldReduceMotion ? { duration: 0.5, delay: point.delay } : {
                                    duration: 2.5,
                                    ease: 'easeOut' as const,
                                    repeat: Infinity,
                                    delay: point.delay,
                                }}
                            />
                        </g>
                    ))}
                </motion.svg>
            </motion.div>

            {/* Stat Cards */}
            <motion.div className="flex gap-3" variants={childVariants}>
                {statCards.map((card) => (
                    <motion.div
                        key={card.label}
                        className="bg-sys-card rounded-2xl px-[18px] py-3 min-w-[90px] text-center"
                        animate={shouldReduceMotion ? {} : { y: [0, -4, 0] }}
                        transition={shouldReduceMotion ? {} : {
                            duration: 3,
                            ease: 'easeInOut' as const,
                            repeat: Infinity,
                            delay: card.delay,
                        }}
                    >
                        <p className="text-[10px] uppercase tracking-wider text-sys-label-secondary">
                            {card.label}
                        </p>
                        <p className={`text-lg font-bold mt-1 ${card.color}`}>
                            &#8377;--,---
                        </p>
                    </motion.div>
                ))}
            </motion.div>

            {/* Status text */}
            <motion.p
                className="mt-7 text-[13px] text-white/30"
                variants={childVariants}
            >
                Preparing your dashboard...
            </motion.p>
        </motion.div>
    );
}
