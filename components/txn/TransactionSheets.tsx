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
import { BottomSheet, ModalSheet, SlideIndicator } from '@/components/MotionPrimitives';
import { useToast } from '@/components/layout/ToastHost';
import { useFinance, type Transaction } from '@/components/data/FinanceProvider';
import { CATEGORIES } from '@/lib/categories';
import { amountOf } from '@/lib/finance';
import type { Account } from '@/lib/accounts';

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

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose}>
            <div className="px-6 pb-6 sm:p-6">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-sys-label">New Transaction</h2>
                    <button onClick={onClose} aria-label="Close"
                        className="rounded-full bg-sys-fill/50 flex items-center justify-center min-w-[44px] min-h-[44px]">
                        <X className="w-4 h-4 text-sys-label-secondary" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <TypeToggle isIncome={isIncome} onChange={setIsIncome} layoutId="addTypeToggle" />

                    <div>
                        <label className="text-sm font-medium text-sys-label-secondary mb-2 block">Amount</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-5">
                                <span className="text-sys-label-secondary text-2xl font-bold">₹</span>
                            </div>
                            <input
                                type="number" required step="0.01" min="0" inputMode="decimal"
                                className="money w-full pl-14 pr-4 py-5 bg-sys-card text-sys-label rounded-2xl focus:outline-none focus:ring-2 focus:ring-sys-blue/50 transition-all text-3xl font-bold placeholder-sys-label-tertiary"
                                value={form.Amount}
                                onChange={event => setForm({ ...form, Amount: event.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="glass overflow-hidden">
                        <FieldRow label="Date" first>
                            <input type="date" required className={FIELD_CLASS} style={{ colorScheme: 'dark' }}
                                value={form.Date} onChange={event => setForm({ ...form, Date: event.target.value })} />
                        </FieldRow>
                        <FieldRow label="Account">
                            <select required className={`${FIELD_CLASS} appearance-none cursor-pointer`}
                                value={form.Account} onChange={event => setForm({ ...form, Account: event.target.value })}>
                                {accounts.map(account => (
                                    <option key={account.Id} value={account.Id}>{account.Label}</option>
                                ))}
                            </select>
                        </FieldRow>
                        {!isIncome && (
                            <FieldRow label="Category">
                                <select required className={`${FIELD_CLASS} appearance-none cursor-pointer`}
                                    value={form.Category} onChange={event => setForm({ ...form, Category: event.target.value })}>
                                    <option value="">Select category</option>
                                    {CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                                </select>
                            </FieldRow>
                        )}
                        <FieldRow label="Description">
                            <input type="text" className={`${FIELD_CLASS} placeholder-sys-label-tertiary`} placeholder="Optional"
                                value={form.Description} onChange={event => setForm({ ...form, Description: event.target.value })} />
                        </FieldRow>
                    </div>

                    <button type="submit" disabled={submitting}
                        className="w-full bg-sys-blue text-white font-semibold py-4 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-40 text-[17px]">
                        {submitting
                            ? <span className="flex items-center justify-center gap-2"><Spinner />Adding...</span>
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
            <div className="px-6 pb-6 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-sys-label">Edit Transaction</h2>
                    <button onClick={onClose} aria-label="Close"
                        className="rounded-full bg-sys-fill/50 flex items-center justify-center min-w-[44px] min-h-[44px]">
                        <X className="w-4 h-4 text-sys-label-secondary" />
                    </button>
                </div>

                <form onSubmit={handleUpdate} className="space-y-5">
                    <TypeToggle isIncome={isIncome} onChange={setIsIncome} layoutId="editTypeToggle" />

                    <div className="glass overflow-hidden">
                        <FieldRow label="Date" first>
                            <input type="date" required className={FIELD_CLASS} style={{ colorScheme: 'dark' }}
                                value={form.Date} onChange={event => setForm({ ...form, Date: event.target.value })} />
                        </FieldRow>
                        <FieldRow label="Account">
                            <select required className={`${FIELD_CLASS} appearance-none cursor-pointer`}
                                value={form.Account} onChange={event => setForm({ ...form, Account: event.target.value })}>
                                {accounts.map(account => (
                                    <option key={account.Id} value={account.Id}>{account.Label}</option>
                                ))}
                            </select>
                        </FieldRow>
                        {!isIncome && (
                            <FieldRow label="Category">
                                <select required className={`${FIELD_CLASS} appearance-none cursor-pointer`}
                                    value={form.Category} onChange={event => setForm({ ...form, Category: event.target.value })}>
                                    <option value="">Select category</option>
                                    {CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                                </select>
                            </FieldRow>
                        )}
                        <FieldRow label="Description">
                            <input type="text" className={`${FIELD_CLASS} placeholder-sys-label-tertiary`} placeholder="Details"
                                value={form.Description} onChange={event => setForm({ ...form, Description: event.target.value })} />
                        </FieldRow>
                        <FieldRow label="Amount">
                            <input type="number" required step="0.01" min="0" inputMode="decimal"
                                className={`money ${FIELD_CLASS}`}
                                value={form.Amount} onChange={event => setForm({ ...form, Amount: event.target.value })} />
                        </FieldRow>
                    </div>

                    <div className="flex gap-3">
                        <button type="button" onClick={onClose}
                            className="flex-1 bg-sys-elevated text-sys-label font-semibold py-3.5 rounded-2xl">
                            Cancel
                        </button>
                        <button type="submit" disabled={updating}
                            className="flex-1 bg-sys-blue text-white font-semibold py-3.5 rounded-2xl disabled:opacity-40">
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
