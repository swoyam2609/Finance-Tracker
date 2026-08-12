/**
 * Currency and date formatting. Shared by every component so the app never
 * renders two different money styles.
 */

/**
 * Indian digit grouping: last three digits, then two-digit groups.
 * 187816.32 -> "₹1,87,816.32". Negatives put the minus outside the symbol,
 * matching the original implementation.
 */
export function formatIndianCurrency(amount: number, options: { decimals?: boolean } = {}): string {
    const showDecimals = options.decimals !== false;
    const safe = Number.isFinite(amount) ? amount : 0;
    const isNegative = safe < 0;
    const absolute = Math.abs(safe);

    const [integerPart, decimalPart] = absolute.toFixed(2).split('.');
    let grouped = integerPart;
    if (integerPart.length > 3) {
        const lastThree = integerPart.slice(-3);
        const remaining = integerPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
        grouped = `${remaining},${lastThree}`;
    }

    const formatted = showDecimals ? `₹${grouped}.${decimalPart}` : `₹${grouped}`;
    return isNegative ? `-${formatted}` : formatted;
}

/** Signed variant for transaction rows: "+₹420.00" / "−₹420.00". */
export function formatSigned(amount: number): string {
    const sign = amount >= 0 ? '+' : '−';
    return `${sign}${formatIndianCurrency(Math.abs(amount))}`;
}

/** "₹1.88L" / "₹6.99L" / "₹1.2Cr" — for tight card faces only, never for totals. */
export function formatCompact(amount: number): string {
    const absolute = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    if (absolute >= 10000000) return `${sign}₹${(absolute / 10000000).toFixed(2)}Cr`;
    if (absolute >= 100000) return `${sign}₹${(absolute / 100000).toFixed(2)}L`;
    return formatIndianCurrency(amount, { decimals: false });
}

/** Masks a card number down to its last four digits. */
export function maskLast4(last4: string, groups = 4): string {
    if (!last4) return '';
    const dots = Array.from({ length: Math.max(0, groups - 1) }, () => '••••').join(' ');
    return dots ? `${dots} ${last4}` : last4;
}

const DAY_MS = 86400000;

/** "Today" / "Yesterday" / "Thu, 2 Jul" for a `YYYY-MM-DD` key. */
export function formatDateLabel(isoDate: string, today: Date): string {
    if (!isoDate || isoDate === 'unknown') return 'Unknown date';

    const todayKey = toKey(today);
    if (isoDate === todayKey) return 'Today';
    if (isoDate === toKey(new Date(today.getTime() - DAY_MS))) return 'Yesterday';

    try {
        return new Date(isoDate).toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        });
    } catch {
        return isoDate;
    }
}

/** "5 Sep" for a `YYYY-MM-DD` key. */
export function formatShortDate(isoDate: string): string {
    if (!isoDate) return '';
    try {
        return new Date(isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
        return isoDate;
    }
}

function toKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
