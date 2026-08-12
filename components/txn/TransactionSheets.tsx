/**
 * Add and edit transaction surfaces, lifted out of pages/index.tsx.
 *
 * Behaviour is preserved exactly: income forces the Category to 'Income' and
 * a positive amount, expenses require a category and store a negative amount,
 * and both flows refetch after a write rather than updating optimistically.
 * The keypad-driven redesign of these forms is milestone M2.
 */

import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { BottomSheet, ModalSheet, SlideIndicator, PressableCard } from '@/components/MotionPrimitives';
import { useToast } from '@/components/layout/ToastHost';
import { useFinance, type Transaction } from '@/components/data/FinanceProvider';
import { CATEGORIES } from '@/lib/categories';
import { amountOf } from '@/lib/finance';
import { ART_PRESETS, type Account } from '@/lib/accounts';
import { categoryGlyph } from '@/components/txn/CategoryIcon';
import AccountLogo from '@/components/wallet/AccountLogo';

function Spinner() {
    return (
        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

const today = () => new Date().toISOString().split('T')[0];

interface FormState {
    Date: string;
    Account: string;
    Category: string;
    Description: string;
    Amount: string;
}

function emptyForm(defaultAccount: string): FormState {
    return { Date: today(), Account: defaultAccount, Category: '', Description: '', Amount: '' };
}

/** Segmented Expense / Income switch. `layoutId` must differ per instance on screen. */
function TypeToggle({ isIncome, onChange, layoutId }: {
    isIncome: boolean;
    onChange: (isIncome: boolean) => void;
    layoutId: string;
}) {
    return (
        <div className="bg-sys-elevated rounded-xl p-1 flex">
            <button type="button" onClick={() => onChange(false)}
                className="relative flex-1 py-2.5 rounded-lg text-sm font-semibold">
                {!isIncome && <SlideIndicator layoutId={layoutId} className="bg-sys-red rounded-lg shadow-sm" />}
                <span className={`relative z-10 ${!isIncome ? 'text-white' : 'text-sys-label-secondary'}`}>Expense</span>
            </button>
            <button type="button" onClick={() => onChange(true)}
                className="relative flex-1 py-2.5 rounded-lg text-sm font-semibold">
                {isIncome && <SlideIndicator layoutId={layoutId} className="bg-sys-green rounded-lg shadow-sm" />}
                <span className={`relative z-10 ${isIncome ? 'text-white' : 'text-sys-label-secondary'}`}>Income</span>
            </button>
        </div>
    );
}

function FieldRow({ label, children, first = false }: { label: string; children: React.ReactNode; first?: boolean }) {
    return (
        <>
            {!first && <div className="border-t border-sys-glass-stroke ml-4" />}
            <div>
                <label className="text-xs font-medium text-sys-label-secondary px-4 pt-3 block">{label}</label>
                {children}
            </div>
        </>
    );
}

const FIELD_CLASS = 'w-full px-4 py-2.5 bg-transparent text-sys-label focus:outline-none';

// ─────────────────────────────────────────────────────────────── add

export function AddTransactionSheet({ isOpen, onClose, accounts }: {
    isOpen: boolean;
    onClose: () => void;
    accounts: Account[];
}) {
    const { refresh } = useFinance();
    const { addToast } = useToast();
    const defaultAccount = accounts[0]?.Id ?? '';

    const [form, setForm] = useState<FormState>(() => emptyForm(defaultAccount));
    const [isIncome, setIsIncome] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Adopt a real account id once the sheet has loaded them.
    useEffect(() => {
        if (!form.Account && defaultAccount) setForm(current => ({ ...current, Account: defaultAccount }));
    }, [defaultAccount, form.Account]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setSubmitting(true);
        const wasIncome = isIncome;
        try {
            const amount = parseFloat(form.Amount);
            const response = await fetch('/api/expenses/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    Amount: (wasIncome ? Math.abs(amount) : -Math.abs(amount)).toString(),
                    Category: wasIncome ? 'Income' : form.Category,
                }),
            });
            if (!response.ok) {
                const body = await response.json();
                throw new Error(body.error || 'Failed to add transaction');
            }
            setForm(emptyForm(defaultAccount));
            setIsIncome(false);
            onClose();
            addToast(wasIncome ? 'Income added successfully!' : 'Expense added successfully!', 'success');
            await refresh();
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Failed to add transaction', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const accent = isIncome ? ART_PRESETS.green : ART_PRESETS.pink;

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose}>
            <div className="px-6 pb-[calc(1.5rem+var(--safe-area-bottom,0px))]">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-sys-label">New Transaction</h2>
                    <button onClick={onClose} aria-label="Close"
                        className="rounded-full bg-sys-fill/50 flex items-center justify-center min-w-[44px] min-h-[44px]">
                        <X className="w-4 h-4 text-sys-label-secondary" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <TypeToggle isIncome={isIncome} onChange={setIsIncome} layoutId="addTypeToggle" />

                    {/* Amount — glass card with bloom */}
                    <div className="glass overflow-hidden">
                        <div className="glass-bloom" style={{ background: accent }} aria-hidden="true" />
                        <div className="glass-scrim" aria-hidden="true" />
                        <div className="relative px-5 py-4">
                            <label className="text-[11px] font-medium text-sys-label-secondary uppercase tracking-wider">Amount</label>
                            <div className="relative mt-1">
                                <div className="absolute inset-y-0 left-0 flex items-center">
                                    <span className="text-sys-label-secondary text-2xl font-bold">₹</span>
                                </div>
                                <input
                                    type="number" required step="0.01" min="0" inputMode="decimal"
                                    className="money w-full pl-8 bg-transparent text-sys-label focus:outline-none text-3xl font-bold placeholder-sys-label-tertiary"
                                    value={form.Amount}
                                    onChange={event => setForm({ ...form, Amount: event.target.value })}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Account picker — horizontal scroll of logo chips */}
                    <div>
                        <label className="text-[11px] font-medium text-sys-label-secondary uppercase tracking-wider mb-2 block">Account</label>
                        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
                            {accounts.map(account => {
                                const selected = form.Account === account.Id;
                                return (
                                    <PressableCard
                                        key={account.Id}
                                        onClick={() => setForm({ ...form, Account: account.Id })}
                                        scaleAmount={0.94}
                                        className="shrink-0"
                                    >
                                        <div className={`glass overflow-hidden px-3 py-2.5 min-w-[88px] ${selected ? 'ring-2 ring-sys-blue' : ''}`}>
                                            <div className="glass-bloom" style={{ background: account.Art || ART_PRESETS.slate }} aria-hidden="true" />
                                            <div className="relative flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
                                                    <AccountLogo account={account} />
                                                </div>
                                                <span className="text-xs font-medium text-sys-label truncate">{account.Label}</span>
                                            </div>
                                        </div>
                                    </PressableCard>
                                );
                            })}
                        </div>
                    </div>

                    {/* Category picker — grid of icon chips */}
                    {!isIncome && (
                        <div>
                            <label className="text-[11px] font-medium text-sys-label-secondary uppercase tracking-wider mb-2 block">Category</label>
                            <div className="grid grid-cols-4 gap-2">
                                {CATEGORIES.map(category => {
                                    const glyph = categoryGlyph(category);
                                    const selected = form.Category === category;
                                    return (
                                        <PressableCard
                                            key={category}
                                            onClick={() => setForm({ ...form, Category: category })}
                                            scaleAmount={0.92}
                                        >
                                            <div className={`glass overflow-hidden flex flex-col items-center gap-1.5 py-2.5 px-1 ${selected ? 'ring-2 ring-sys-blue' : ''}`}>
                                                <div className={`w-8 h-8 rounded-lg ${glyph.bgColor} flex items-center justify-center`}>
                                                    {glyph.icon}
                                                </div>
                                                <span className="text-[9px] text-sys-label-secondary text-center leading-tight truncate w-full">{category}</span>
                                            </div>
                                        </PressableCard>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Date + Description — glass fields */}
                    <div className="glass overflow-hidden">
                        <div className="glass-bloom" style={{ background: ART_PRESETS.blue }} aria-hidden="true" />
                        <div className="glass-scrim" aria-hidden="true" />
                        <div className="relative">
                            <div className="px-5 pt-3.5">
                                <label className="text-[11px] font-medium text-sys-label-secondary uppercase tracking-wider block mb-1">Date</label>
                                <input type="date" required className="w-full pb-3 bg-transparent text-sys-label focus:outline-none" style={{ colorScheme: 'dark' }}
                                    value={form.Date} onChange={event => setForm({ ...form, Date: event.target.value })} />
                            </div>
                            <div className="border-t border-sys-glass-stroke mx-5" />
                            <div className="px-5 pt-3.5">
                                <label className="text-[11px] font-medium text-sys-label-secondary uppercase tracking-wider block mb-1">Description</label>
                                <input type="text" className="w-full pb-3.5 bg-transparent text-sys-label placeholder-sys-label-tertiary focus:outline-none" placeholder="Optional"
                                    value={form.Description} onChange={event => setForm({ ...form, Description: event.target.value })} />
                            </div>
                        </div>
                    </div>

                    {/* Submit — gradient matching the type */}
                    <button type="submit" disabled={submitting}
                        className={`w-full text-white font-semibold py-4 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-40 text-[17px] flex items-center justify-center gap-2 ${
                            isIncome
                                ? 'bg-gradient-to-r from-sys-green to-sys-teal'
                                : 'bg-gradient-to-r from-sys-pink to-sys-red'
                        }`}>
                        {submitting
                            ? <><Spinner />Adding...</>
                            : (isIncome ? 'Add Income' : 'Add Expense')}
                    </button>
                </form>
            </div>
        </BottomSheet>
    );
}

// ────────────────────────────────────────────────────────────── edit

export function EditTransactionModal({ isOpen, onClose, txn, accounts }: {
    isOpen: boolean;
    onClose: () => void;
    txn: Transaction | null;
    accounts: Account[];
}) {
    const { refresh } = useFinance();
    const { addToast } = useToast();

    const [form, setForm] = useState<FormState>(() => emptyForm(accounts[0]?.Id ?? ''));
    const [isIncome, setIsIncome] = useState(false);
    const [updating, setUpdating] = useState(false);

    // Refill whenever a different row is opened.
    useEffect(() => {
        if (!txn) return;
        const amount = amountOf(txn);
        setForm({
            Date: txn.Date,
            Account: txn.Account,
            Category: txn.Category,
            Description: txn.Description || '',
            Amount: Math.abs(amount).toString(),
        });
        setIsIncome(amount >= 0);
    }, [txn]);

    const rowIndex = typeof txn?.RowIndex === 'number' ? txn.RowIndex : null;

    const handleUpdate = async (event: FormEvent) => {
        event.preventDefault();
        if (rowIndex === null) {
            addToast('This row cannot be edited — no row reference.', 'error');
            return;
        }
        setUpdating(true);
        try {
            const amount = parseFloat(form.Amount);
            const response = await fetch('/api/expenses/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rowIndex,
                    expenseData: {
                        ...form,
                        Amount: (isIncome ? Math.abs(amount) : -Math.abs(amount)).toString(),
                        Category: isIncome ? 'Income' : form.Category,
                    },
                }),
            });
            if (!response.ok) {
                const body = await response.json();
                throw new Error(body.error || 'Failed to update transaction');
            }
            onClose();
            addToast('Transaction updated!', 'success');
            await refresh();
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Failed to update transaction', 'error');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <ModalSheet isOpen={isOpen} onClose={onClose}>
            <div className="px-6 pb-[calc(1.5rem+var(--safe-area-bottom,0px))]">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-sys-label">Edit Transaction</h2>
                    <button onClick={onClose} aria-label="Close"
                        className="rounded-full bg-sys-fill/50 flex items-center justify-center min-w-[44px] min-h-[44px]">
                        <X className="w-4 h-4 text-sys-label-secondary" />
                    </button>
                </div>

                <form onSubmit={handleUpdate} className="space-y-5">
                    <TypeToggle isIncome={isIncome} onChange={setIsIncome} layoutId="editTypeToggle" />

                    {/* Amount — glass card with bloom */}
                    <div className="glass overflow-hidden">
                        <div className="glass-bloom" style={{ background: isIncome ? ART_PRESETS.green : ART_PRESETS.pink }} aria-hidden="true" />
                        <div className="glass-scrim" aria-hidden="true" />
                        <div className="relative px-5 py-4">
                            <label className="text-[11px] font-medium text-sys-label-secondary uppercase tracking-wider">Amount</label>
                            <div className="relative mt-1">
                                <div className="absolute inset-y-0 left-0 flex items-center">
                                    <span className="text-sys-label-secondary text-2xl font-bold">₹</span>
                                </div>
                                <input
                                    type="number" required step="0.01" min="0" inputMode="decimal"
                                    className="money w-full pl-8 bg-transparent text-sys-label focus:outline-none text-3xl font-bold placeholder-sys-label-tertiary"
                                    value={form.Amount}
                                    onChange={event => setForm({ ...form, Amount: event.target.value })}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Account picker — horizontal scroll of logo chips */}
                    <div>
                        <label className="text-[11px] font-medium text-sys-label-secondary uppercase tracking-wider mb-2 block">Account</label>
                        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
                            {accounts.map(account => {
                                const selected = form.Account === account.Id;
                                return (
                                    <PressableCard
                                        key={account.Id}
                                        onClick={() => setForm({ ...form, Account: account.Id })}
                                        scaleAmount={0.94}
                                        className="shrink-0"
                                    >
                                        <div className={`glass overflow-hidden px-3 py-2.5 min-w-[88px] ${selected ? 'ring-2 ring-sys-blue' : ''}`}>
                                            <div className="glass-bloom" style={{ background: account.Art || ART_PRESETS.slate }} aria-hidden="true" />
                                            <div className="relative flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
                                                    <AccountLogo account={account} />
                                                </div>
                                                <span className="text-xs font-medium text-sys-label truncate">{account.Label}</span>
                                            </div>
                                        </div>
                                    </PressableCard>
                                );
                            })}
                        </div>
                    </div>

                    {/* Category picker — grid of icon chips */}
                    {!isIncome && (
                        <div>
                            <label className="text-[11px] font-medium text-sys-label-secondary uppercase tracking-wider mb-2 block">Category</label>
                            <div className="grid grid-cols-4 gap-2">
                                {CATEGORIES.map(category => {
                                    const glyph = categoryGlyph(category);
                                    const selected = form.Category === category;
                                    return (
                                        <PressableCard
                                            key={category}
                                            onClick={() => setForm({ ...form, Category: category })}
                                            scaleAmount={0.92}
                                        >
                                            <div className={`glass overflow-hidden flex flex-col items-center gap-1.5 py-2.5 px-1 ${selected ? 'ring-2 ring-sys-blue' : ''}`}>
                                                <div className={`w-8 h-8 rounded-lg ${glyph.bgColor} flex items-center justify-center`}>
                                                    {glyph.icon}
                                                </div>
                                                <span className="text-[9px] text-sys-label-secondary text-center leading-tight truncate w-full">{category}</span>
                                            </div>
                                        </PressableCard>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Date + Description — glass fields */}
                    <div className="glass overflow-hidden">
                        <div className="glass-bloom" style={{ background: ART_PRESETS.blue }} aria-hidden="true" />
                        <div className="glass-scrim" aria-hidden="true" />
                        <div className="relative">
                            <div className="px-5 pt-3.5">
                                <label className="text-[11px] font-medium text-sys-label-secondary uppercase tracking-wider block mb-1">Date</label>
                                <input type="date" required className="w-full pb-3 bg-transparent text-sys-label focus:outline-none" style={{ colorScheme: 'dark' }}
                                    value={form.Date} onChange={event => setForm({ ...form, Date: event.target.value })} />
                            </div>
                            <div className="border-t border-sys-glass-stroke mx-5" />
                            <div className="px-5 pt-3.5">
                                <label className="text-[11px] font-medium text-sys-label-secondary uppercase tracking-wider block mb-1">Description</label>
                                <input type="text" className="w-full pb-3.5 bg-transparent text-sys-label placeholder-sys-label-tertiary focus:outline-none" placeholder="Optional"
                                    value={form.Description} onChange={event => setForm({ ...form, Description: event.target.value })} />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button type="button" onClick={onClose}
                            className="flex-1 bg-sys-elevated text-sys-label font-semibold py-3.5 rounded-2xl">
                            Cancel
                        </button>
                        <button type="submit" disabled={updating}
                            className={`flex-1 text-white font-semibold py-3.5 rounded-2xl disabled:opacity-40 transition-all active:scale-[0.98] ${
                                isIncome
                                    ? 'bg-gradient-to-r from-sys-green to-sys-teal'
                                    : 'bg-gradient-to-r from-sys-pink to-sys-red'
                            }`}>
                            {updating
                                ? <span className="flex items-center justify-center gap-2"><Spinner />Saving...</span>
                                : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </ModalSheet>
    );
}
