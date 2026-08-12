/**
 * Category vocabulary, shared by the add/edit forms, the filter chips and the
 * analytics charts. Previously duplicated inside pages/index.tsx.
 */

/** Selectable expense categories. Excludes Income and both Transfer pseudo-categories. */
export const CATEGORIES = [
    'Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities',
    'Healthcare', 'Education', 'Groceries', 'Rent', 'Insurance', 'Personal Care',
    'Travel', 'Subscriptions', 'Gifts', 'Family Transfer', 'Other',
] as const;

export const ALL_CATEGORIES = 'All Categories';
export const ALL_ACCOUNTS = 'All Accounts';

/** Cycled by index for the category distribution bars. */
export const CATEGORY_PALETTE = [
    '#0A84FF', '#BF5AF2', '#FF375F', '#FF9F0A', '#30D158',
    '#5E5CE6', '#FF453A', '#64D2FF', '#FFD60A', '#00C7BE',
];

export function categoryColor(index: number): string {
    return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
}
