/**
 * A small glass tile for a single at-a-glance figure — "Spent today",
 * "Invested". Geometry copied from the `.duo > div` / `.mini-*` rules of the
 * approved "Snap carousel + pulse tiles" mockup, scaled to the 390px viewport.
 *
 * Pure presentation: the value arrives already computed and already signed.
 */

import { ART_PRESETS } from '@/lib/accounts';
import { formatIndianCurrency } from '@/lib/format';

export type PulseTone = 'neutral' | 'green' | 'red' | 'teal';

export interface PulseTileProps {
    label: string;
    value: number;
    tone?: PulseTone;
    sublabel?: string;
    /** Bloom colour: an `ART_PRESETS` name or a raw `#rrggbb`. */
    art?: string;
}

const TONE_TEXT: Record<PulseTone, string> = {
    neutral: 'text-sys-label',
    green: 'text-sys-green',
    red: 'text-sys-red',
    teal: 'text-sys-cyan',
};

/** Bloom colour used when `art` is absent or unrecognised. */
const TONE_ART: Record<PulseTone, string> = {
    neutral: ART_PRESETS.slate,
    green: ART_PRESETS.green,
    red: ART_PRESETS.pink,
    teal: ART_PRESETS.teal,
};

const HEX = /^#[0-9a-fA-F]{6}$/;

function resolveBloom(art: string | undefined, tone: PulseTone): string {
    const value = (art ?? '').trim();
    if (HEX.test(value)) return value;
    return ART_PRESETS[value.toLowerCase()] ?? TONE_ART[tone];
}

export default function PulseTile({ label, value, tone = 'neutral', sublabel, art }: PulseTileProps) {
    const bloom = resolveBloom(art, tone);

    return (
        <div className="glass flex-1 px-4 py-3">
            <div className="glass-bloom" style={{ background: bloom }} />
            <div className="relative">
                <div className="text-[11px] uppercase tracking-[0.1em] text-sys-label-secondary">{label}</div>
                <div className={`money mt-0.5 text-[20px] font-[640] tracking-[-0.01em] ${TONE_TEXT[tone]}`}>
                    {formatIndianCurrency(value, { decimals: false })}
                </div>
                {sublabel && (
                    <div className="mt-0.5 text-[11px] text-sys-label-secondary">{sublabel}</div>
                )}
            </div>
        </div>
    );
}
