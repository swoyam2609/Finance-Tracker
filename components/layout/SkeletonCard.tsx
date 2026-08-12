// ── Skeletons ──
// Shimmer placeholders sized to the real geometry so nothing reflows when data
// lands. Shimmer comes from the existing `.skeleton` class in globals.css;
// `motion-reduce:animate-none` honours prefers-reduced-motion without JS.

const shimmer = 'skeleton motion-reduce:animate-none';

export type SkeletonCardVariant = 'rail' | 'grid' | 'hero';

// Mirrors AccountCard's three card sizes.
const variantShell: Record<SkeletonCardVariant, string> = {
    rail: 'w-[190px] h-[118px] shrink-0 px-3.5 py-[13px]',
    grid: 'w-full h-24 p-3',
    hero: 'w-full h-[158px] p-4',
};

export function SkeletonCard({
    variant = 'rail',
    className = '',
}: {
    variant?: SkeletonCardVariant;
    className?: string;
}) {
    const isHero = variant === 'hero';

    return (
        <div
            aria-hidden="true"
            className={`glass flex flex-col justify-between ${variantShell[variant]} ${className}`}
        >
            {/* Card name + network chip */}
            <div className="flex items-start justify-between gap-3">
                <div className={`${shimmer} h-3 ${isHero ? 'w-32' : 'w-20'}`} />
                <div className={`${shimmer} h-[14px] w-[19px] rounded`} />
            </div>

            {/* Label + figure */}
            <div className="flex flex-col gap-1.5">
                <div className={`${shimmer} h-2 w-14`} />
                <div className={`${shimmer} ${isHero ? 'h-7 w-44' : 'h-4 w-24'}`} />
                {isHero && <div className={`${shimmer} h-2 w-36 mt-1`} />}
            </div>
        </div>
    );
}

export function SkeletonRow({ className = '' }: { className?: string }) {
    return (
        <div aria-hidden="true" className={`flex items-center gap-3 py-2.5 ${className}`}>
            {/* Category icon tile */}
            <div className={`${shimmer} w-7 h-7 rounded-lg shrink-0`} />

            {/* Name + subtitle */}
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className={`${shimmer} h-3 w-1/2 max-w-[140px]`} />
                <div className={`${shimmer} h-2 w-1/3 max-w-[100px]`} />
            </div>

            {/* Amount */}
            <div className={`${shimmer} h-3 w-16 shrink-0`} />
        </div>
    );
}
