import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ReactNode, useRef, useEffect } from 'react';

// ── Spring presets ──
const springs = {
    snappy: { type: 'spring' as const, stiffness: 400, damping: 30 },
    bouncy: { type: 'spring' as const, stiffness: 400, damping: 17 },
    gentle: { type: 'spring' as const, stiffness: 300, damping: 25 },
    quick: { type: 'spring' as const, stiffness: 500, damping: 30 },
    reduced: { type: 'tween' as const, duration: 0.15 },
};

// ── PressableCard ──
// Wraps any card/button with spring-based tap and hover feedback
export function PressableCard({
    children,
    onClick,
    className = '',
    scaleAmount = 0.97,
}: {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
    scaleAmount?: number;
}) {
    const shouldReduceMotion = useReducedMotion();
    return (
        <motion.div
            className={className}
            onClick={onClick}
            whileTap={shouldReduceMotion ? {} : { scale: scaleAmount }}
            whileHover={shouldReduceMotion ? {} : { scale: 1 + (1 - scaleAmount) * 0.5 }}
            transition={shouldReduceMotion ? springs.reduced : springs.bouncy}
            style={{ cursor: onClick ? 'pointer' : undefined }}
        >
            {children}
        </motion.div>
    );
}

// ── SlideIndicator ──
// Animated background that slides between segments/pills via layoutId
export function SlideIndicator({
    layoutId,
    className = '',
}: {
    layoutId: string;
    className?: string;
}) {
    return (
        <motion.div
            layoutId={layoutId}
            className={`absolute inset-0 ${className}`}
            transition={springs.quick}
        />
    );
}

// ── AnimatedTabContent ──
// Wraps tab content with directional slide + fade transitions
export function AnimatedTabContent({
    activeKey,
    children,
}: {
    activeKey: string;
    children: ReactNode;
}) {
    const shouldReduceMotion = useReducedMotion();
    const prevKeyRef = useRef(activeKey);
    const directionRef = useRef(1);

    // Track tab keys order to compute direction
    const tabOrder = ['transactions', 'transfers', 'analytics', 'loans'];

    useEffect(() => {
        const prevIdx = tabOrder.indexOf(prevKeyRef.current);
        const nextIdx = tabOrder.indexOf(activeKey);
        if (prevIdx !== -1 && nextIdx !== -1) {
            directionRef.current = nextIdx > prevIdx ? 1 : -1;
        }
        prevKeyRef.current = activeKey;
    }, [activeKey]);

    const dir = directionRef.current;

    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={activeKey}
                initial={shouldReduceMotion ? { opacity: 0 } : { x: dir * 40, opacity: 0 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { x: 0, opacity: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { x: dir * -40, opacity: 0 }}
                transition={shouldReduceMotion ? springs.reduced : springs.snappy}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}

// ── BottomSheet ──
// Animated sheet with drag-to-dismiss on mobile
export function BottomSheet({
    isOpen,
    onClose,
    children,
    side = false,
}: {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    side?: boolean;
}) {
    const shouldReduceMotion = useReducedMotion();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                    />
                    {/* Sheet */}
                    <motion.div
                        className={`fixed z-50 bg-sys-bg shadow-2xl overflow-y-auto
                            ${side
                                ? 'top-0 right-0 bottom-0 border-l border-sys-separator w-full max-w-md'
                                : 'inset-x-0 bottom-0 rounded-t-3xl border-t border-sys-separator max-h-[92vh]'
                            }`}
                        style={{ paddingBottom: side ? undefined : 'var(--safe-area-bottom, 0px)' }}
                        initial={side ? { x: '100%' } : { y: '100%' }}
                        animate={side ? { x: 0 } : { y: 0 }}
                        exit={side ? { x: '100%' } : { y: '100%' }}
                        transition={shouldReduceMotion ? springs.reduced : springs.snappy}
                        drag={side || shouldReduceMotion ? false : 'y'}
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_e, info) => {
                            if (info.velocity.y > 500 || info.offset.y > 100) {
                                onClose();
                            }
                        }}
                    >
                        {/* Drag handle — mobile only */}
                        {!side && (
                            <div className="flex justify-center py-3 sm:hidden">
                                <div className="w-10 h-1 rounded-full bg-sys-fill" />
                            </div>
                        )}
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ── ModalSheet ──
// Centered modal on desktop, bottom sheet on mobile, with drag-to-dismiss
export function ModalSheet({
    isOpen,
    onClose,
    children,
}: {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
}) {
    const shouldReduceMotion = useReducedMotion();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                    />
                    {/* Mobile: bottom sheet */}
                    <motion.div
                        className="fixed inset-x-0 bottom-0 z-50 sm:hidden"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={shouldReduceMotion ? springs.reduced : springs.snappy}
                        drag={shouldReduceMotion ? false : 'y'}
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_e, info) => {
                            if (info.velocity.y > 500 || info.offset.y > 100) {
                                onClose();
                            }
                        }}
                    >
                        <div
                            className="bg-sys-card rounded-t-3xl shadow-2xl p-6"
                            style={{ paddingBottom: 'max(1.5rem, var(--safe-area-bottom, 0px))' }}
                        >
                            <div className="flex justify-center pb-2">
                                <div className="w-10 h-1 rounded-full bg-sys-fill" />
                            </div>
                            {children}
                        </div>
                    </motion.div>
                    {/* Desktop: centered modal */}
                    <motion.div
                        className="fixed inset-0 z-50 hidden sm:flex items-center justify-center pointer-events-none"
                    >
                        <motion.div
                            className="bg-sys-card rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 pointer-events-auto"
                            initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
                            animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                            exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
                            transition={shouldReduceMotion ? springs.reduced : springs.snappy}
                        >
                            {children}
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ── Stagger Container / Item ──
// Parent-child pair for staggered entrance animations
const staggerContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.06 },
    },
};

const staggerItemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: springs.gentle,
    },
};

export function StaggerContainer({
    children,
    className = '',
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.div
            className={className}
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
        >
            {children}
        </motion.div>
    );
}

export function StaggerItem({
    children,
    className = '',
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.div className={className} variants={staggerItemVariants}>
            {children}
        </motion.div>
    );
}
