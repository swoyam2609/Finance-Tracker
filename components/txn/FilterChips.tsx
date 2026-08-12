/**
 * Horizontal scrolling filter pills with a shared sliding indicator.
 * Replaces the four near-identical chip rows in the original pages/index.tsx.
 */

import { SlideIndicator } from '@/components/MotionPrimitives';

export interface FilterChipsProps {
    options: string[];
    value: string;
    onChange: (option: string) => void;
    /** Must be unique per chip row on screen, or the indicator will fly between rows. */
    layoutId: string;
    /** Shortens long option names for display, e.g. 'All Accounts' -> 'All'. */
    label?: (option: string) => string;
    tone?: 'blue' | 'elevated';
    className?: string;
}

export default function FilterChips({
    options,
    value,
    onChange,
    layoutId,
    label = option => option,
    tone = 'blue',
    className = '',
}: FilterChipsProps) {
    return (
        <div className={`flex gap-2 overflow-x-auto scrollbar-hide ${className}`}>
            {options.map(option => {
                const isActive = option === value;
                return (
                    <button
                        key={option}
                        type="button"
                        onClick={() => onChange(option)}
                        aria-pressed={isActive}
                        className="relative shrink-0 px-3.5 py-1.5 rounded-full text-[13px] whitespace-nowrap min-h-[32px]"
                    >
                        {isActive && (
                            <SlideIndicator
                                layoutId={layoutId}
                                className={`rounded-full ${tone === 'blue' ? 'bg-sys-blue' : 'bg-sys-elevated'}`}
                            />
                        )}
                        <span className={`relative z-10 ${isActive ? 'text-white font-medium' : 'text-sys-label-secondary'}`}>
                            {label(option)}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
