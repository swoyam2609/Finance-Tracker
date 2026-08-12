import { useCallback, useEffect, useMemo, useState, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { AlertCircle, Plus, Wallet } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { useToast } from '@/components/layout/ToastHost';
import { SkeletonRow } from '@/components/layout/SkeletonCard';
import { PressableCard, StaggerContainer, StaggerItem } from '@/components/MotionPrimitives';
import { formatIndianCurrency, formatShortDate } from '@/lib/format';
import { ART_PRESETS } from '@/lib/accounts';
import type { LoanTransaction } from '@/lib/google-sheet';

// ── Loans ──
// Ported from the Loans tab of pages/index.tsx. Loans deliberately keep their own
// local state and fetch: the shared FinanceProvider does not carry loan rows.

type LoanTx = LoanTransaction & { RowIndex?: number };

type LoanForm = {
    Date: string;
    PersonName: string;
    TransactionType: string;
    Amount: string;
    Description: string;
};

const today = () => new Date().toISOString().split('T')[0];

const emptyForm = (): LoanForm => ({
    Date: today(),
    PersonName: '',
    TransactionType: 'LENT',
    Amount: '',
    Description: '',
});

const Spinner = () => (
    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
);

export default function LoansPage() {
    const { addToast } = useToast();
    const { status } = useSession();

    const [loans, setLoans] = useState<LoanTx[]>([]);
    const [loansLoading, setLoansLoading] = useState(true);
    const [loansError, setLoansError] = useState('');
    const [loanFormData, setLoanFormData] = useState<LoanForm>(emptyForm);
    const [selectedPerson, setSelectedPerson] = useState('');
    const [loanSubmitting, setLoanSubmitting] = useState(false);

    // GET /api/loans/get returns a bare array of loan rows.
    const fetchLoansData = useCallback(async () => {
        try {
            setLoansLoading(true);
            const response = await fetch('/api/loans/get');
            if (!response.ok) {
                // Name the status: a bare "Failed to fetch loans" hid a 401 here.
                const detail = await response.json().catch(() => null);
                throw new Error(detail?.error
                    ? `${detail.error} (${response.status})`
                    : `Couldn't reach the loans sheet (HTTP ${response.status})`);
            }
            const data: LoanTx[] = await response.json();
            setLoans(data);
            setLoansError('');
        } catch (err) {
            // The original swallowed this into console.error; surface it inline instead.
            setLoansError(err instanceof Error ? err.message : 'Failed to fetch loans');
        } finally {
            setLoansLoading(false);
        }
    }, []);

    // Wait for the session before calling a session-guarded route, otherwise the
    // first request races authentication and comes back 401.
    useEffect(() => {
        if (status !== 'authenticated') return;
        fetchLoansData();
    }, [status, fetchLoansData]);

    const handleLoanSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoanSubmitting(true);
        try {
            const response = await fetch('/api/loans/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loanFormData),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add loan transaction');
            }
            setLoanFormData(emptyForm());
            setSelectedPerson('');
            addToast('Loan transaction added!', 'success');
            await fetchLoansData();
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'Failed to add loan transaction', 'error');
        } finally {
            setLoanSubmitting(false);
        }
    };

    // LENT and ADDITIONAL_LOAN add, RECEIVED subtracts, anything else is ignored.
    const loansSummary = useMemo(() => {
        const personBalances: { [key: string]: number } = {};
        loans.forEach(loan => {
            const amount = parseFloat(loan.Amount || '0');
            if (!personBalances[loan.PersonName]) personBalances[loan.PersonName] = 0;
            if (loan.TransactionType === 'LENT' || loan.TransactionType === 'ADDITIONAL_LOAN') personBalances[loan.PersonName] += amount;
            else if (loan.TransactionType === 'RECEIVED') personBalances[loan.PersonName] -= amount;
        });
        return Object.entries(personBalances)
            .map(([person, balance]) => ({ person, balance }))
            .sort((a, b) => b.balance - a.balance);
    }, [loans]);

    const getPersonTransactions = useCallback(
        (personName: string) =>
            loans
                .filter(loan => loan.PersonName === personName)
                .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime()),
        [loans]
    );

    const uniquePersons = useMemo(() => {
        const persons = new Set<string>();
        loans.forEach(loan => { if (loan.PersonName) persons.add(loan.PersonName); });
        return Array.from(persons).sort();
    }, [loans]);

    // An overpaid person must not drag the total down.
    const totalLent = loansSummary.reduce((sum, item) => sum + Math.max(0, item.balance), 0);

    const showSkeleton = loansLoading && loans.length === 0;

    return (
        <AppShell title="Loans">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* ── Summary ── */}
                <section className="glass p-6">
                    <div
                        className="glass-bloom"
                        style={{ background: '#0A84FF' }}
                        aria-hidden="true"
                    />
                    <div className="relative">
                        <p className="text-sys-label-secondary text-sm font-medium mb-1">Total Money Lent</p>
                        <p className="money text-3xl sm:text-4xl font-bold text-sys-label mb-3">
                            {formatIndianCurrency(totalLent)}
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-sys-elevated rounded-lg text-xs font-medium text-sys-label-secondary">
                                {loansSummary.filter(p => p.balance > 0).length} people
                            </span>
                            <span className="px-3 py-1 bg-sys-elevated rounded-lg text-xs font-medium text-sys-label-secondary">
                                {loans.length} transactions
                            </span>
                        </div>
                    </div>
                </section>

                {loansError && (
                    <div
                        role="alert"
                        className="glass px-4 py-3 flex items-start gap-2.5 text-sys-red"
                    >
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold">Couldn&apos;t load loans</p>
                            <p className="text-xs opacity-80 break-words">{loansError}</p>
                        </div>
                        <button
                            type="button"
                            onClick={fetchLoansData}
                            className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg bg-sys-red/15 flex-shrink-0"
                        >
                            Retry
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* ── Add transaction ── */}
                    <div className="lg:col-span-1">
                        <div className="glass overflow-hidden p-5">
                            <div className="glass-bloom" style={{ background: ART_PRESETS.violet }} aria-hidden="true" />
                            <div className="glass-scrim" aria-hidden="true" />
                            <div className="relative">
                            <h2 className="text-base font-bold text-sys-label mb-4">Add Transaction</h2>

                            <form onSubmit={handleLoanSubmit} className="space-y-4">
                                {/* Transaction Type — segmented control */}
                                <div>
                                    <label className="text-[11px] font-medium text-sys-label-secondary uppercase tracking-wider mb-2 block">Type</label>
                                    <div className="bg-sys-elevated rounded-xl p-1 flex gap-1">
                                        {([
                                            { value: 'LENT', label: 'Lent', activeClass: 'bg-sys-blue' },
                                            { value: 'RECEIVED', label: 'Received', activeClass: 'bg-sys-green' },
                                            { value: 'ADDITIONAL_LOAN', label: 'Additional', activeClass: 'bg-sys-purple' },
                                        ] as const).map(opt => {
                                            const active = loanFormData.TransactionType === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setLoanFormData({ ...loanFormData, TransactionType: opt.value })}
                                                    className={`relative flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${active ? `${opt.activeClass} text-white` : 'text-sys-label-secondary'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Amount — glass card with bloom */}
                                <div className="glass overflow-hidden">
                                    <div className="glass-bloom" style={{ background: ART_PRESETS.amber }} aria-hidden="true" />
                                    <div className="glass-scrim" aria-hidden="true" />
                                    <div className="relative px-4 py-3">
                                        <label className="text-[11px] font-medium text-sys-label-secondary uppercase tracking-wider">Amount</label>
                                        <div className="relative mt-1">
                                            <div className="absolute inset-y-0 left-0 flex items-center">
                                                <span className="text-sys-label-secondary text-xl font-bold">₹</span>
                                            </div>
                                            <input
                                                type="number" required step="0.01" min="0" inputMode="decimal"
                                                className="money w-full pl-7 bg-transparent text-sys-label focus:outline-none text-2xl font-bold placeholder-sys-label-tertiary"
                                                placeholder="0.00"
                                                value={loanFormData.Amount}
                                                onChange={(e) => setLoanFormData({ ...loanFormData, Amount: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Person */}
                                <div>
                                    <label htmlFor="loan-person" className="text-[11px] font-medium text-sys-label-secondary uppercase tracking-wider mb-1.5 block">Person</label>
                                    {uniquePersons.length > 0 ? (
                                        <div className="space-y-2">
                                            <select
                                                id="loan-person"
                                                className="apple-select"
                                                value={selectedPerson}
                                                onChange={(e) => {
                                                    setSelectedPerson(e.target.value);
                                                    setLoanFormData({ ...loanFormData, PersonName: e.target.value });
                                                }}
                                            >
                                                <option value="">Select or type new</option>
                                                {uniquePersons.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                            <input
                                                type="text"
                                                placeholder="Or enter new name"
                                                className="apple-input"
                                                value={selectedPerson === '' ? loanFormData.PersonName : ''}
                                                onChange={(e) => {
                                                    setSelectedPerson('');
                                                    setLoanFormData({ ...loanFormData, PersonName: e.target.value });
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <input
                                            id="loan-person"
                                            type="text"
                                            required
                                            placeholder="Enter name"
                                            className="apple-input"
                                            value={loanFormData.PersonName}
                                            onChange={(e) => setLoanFormData({ ...loanFormData, PersonName: e.target.value })}
                                        />
                                    )}
                                </div>

                                {/* Date + Description — glass fields */}
                                <div className="glass overflow-hidden">
                                    <div className="glass-bloom" style={{ background: ART_PRESETS.blue }} aria-hidden="true" />
                                    <div className="glass-scrim" aria-hidden="true" />
                                    <div className="relative">
                                        <div className="px-4 pt-3">
                                            <label className="text-[11px] font-medium text-sys-label-secondary uppercase tracking-wider block mb-1">Date</label>
                                            <input
                                                type="date" required className="w-full pb-3 bg-transparent text-sys-label focus:outline-none"
                                                style={{ colorScheme: 'dark' }}
                                                value={loanFormData.Date}
                                                onChange={(e) => setLoanFormData({ ...loanFormData, Date: e.target.value })}
                                            />
                                        </div>
                                        <div className="border-t border-sys-glass-stroke mx-4" />
                                        <div className="px-4 pt-3">
                                            <label className="text-[11px] font-medium text-sys-label-secondary uppercase tracking-wider block mb-1">Description</label>
                                            <input
                                                type="text" className="w-full pb-3.5 bg-transparent text-sys-label placeholder-sys-label-tertiary focus:outline-none" placeholder="Optional"
                                                value={loanFormData.Description}
                                                onChange={(e) => setLoanFormData({ ...loanFormData, Description: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loanSubmitting}
                                    className="w-full bg-gradient-to-r from-sys-blue to-sys-purple text-white font-semibold py-3.5 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-[17px]"
                                >
                                    {loanSubmitting ? (
                                        <><Spinner /> Adding...</>
                                    ) : (
                                        <><Plus className="w-5 h-5" /> Add Transaction</>
                                    )}
                                </button>
                            </form>
                            </div>
                        </div>
                    </div>

                    {/* ── People ── */}
                    <div className="lg:col-span-2 space-y-4">
                        {showSkeleton ? (
                            <div className="glass p-5 space-y-1">
                                {[0, 1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}
                            </div>
                        ) : loansSummary.length === 0 ? (
                            <div className="glass p-12 text-center">
                                <div className="w-14 h-14 bg-sys-elevated rounded-2xl flex items-center justify-center mx-auto mb-3">
                                    <Wallet className="w-7 h-7 text-sys-label-tertiary" />
                                </div>
                                <p className="text-sys-label-secondary text-sm">No loan records yet</p>
                            </div>
                        ) : (
                            <StaggerContainer className="space-y-4">
                                {loansSummary.map(({ person, balance }) => {
                                    const personTxns = getPersonTransactions(person);
                                    const totalLentToPerson = personTxns
                                        .filter(t => t.TransactionType === 'LENT' || t.TransactionType === 'ADDITIONAL_LOAN')
                                        .reduce((s, t) => s + parseFloat(t.Amount || '0'), 0);
                                    const totalReceived = personTxns
                                        .filter(t => t.TransactionType === 'RECEIVED')
                                        .reduce((s, t) => s + parseFloat(t.Amount || '0'), 0);
                                    const repaymentPercent = totalLentToPerson > 0
                                        ? Math.min((totalReceived / totalLentToPerson) * 100, 100)
                                        : 0;

                                    return (
                                        <StaggerItem key={person}>
                                            <div className="glass overflow-hidden">
                                                <div className="glass-bloom" style={{ background: ART_PRESETS.blue }} aria-hidden="true" />
                                                <div className="glass-scrim" aria-hidden="true" />
                                                <div className="relative">
                                                <div className="px-5 py-4 border-b border-sys-separator">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-10 h-10 rounded-full bg-sys-blue/15 flex items-center justify-center text-sys-blue font-bold text-sm flex-shrink-0">
                                                                {person.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h3 className="font-semibold text-sys-label truncate">{person}</h3>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <div className="w-20 h-1.5 bg-sys-fill rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-sys-blue rounded-full transition-all duration-500"
                                                                            style={{ width: `${repaymentPercent}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-[10px] text-sys-label-tertiary">{repaymentPercent.toFixed(0)}% repaid</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className={`money px-3 py-1.5 rounded-lg font-bold text-sm flex-shrink-0 ${
                                                            balance > 0 ? 'bg-sys-green/15 text-sys-green'
                                                                : balance < 0 ? 'bg-sys-red/15 text-sys-red'
                                                                    : 'bg-sys-fill text-sys-label-secondary'
                                                        }`}>
                                                            {formatIndianCurrency(Math.abs(balance))}
                                                            <span className="text-[10px] ml-1 opacity-70">
                                                                {balance > 0 ? 'owed' : balance < 0 ? 'overpaid' : 'settled'}
                                                            </span>
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="p-2">
                                                    {personTxns.map((tx, idx) => {
                                                        const isLent = tx.TransactionType === 'LENT' || tx.TransactionType === 'ADDITIONAL_LOAN';
                                                        return (
                                                            <div key={idx} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
                                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isLent ? 'bg-sys-blue' : 'bg-sys-green'}`} />
                                                                <span className="text-xs text-sys-label-tertiary w-16 flex-shrink-0">{formatShortDate(tx.Date)}</span>
                                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ${
                                                                    tx.TransactionType === 'LENT' ? 'bg-sys-blue/15 text-sys-blue'
                                                                        : tx.TransactionType === 'ADDITIONAL_LOAN' ? 'bg-sys-purple/15 text-sys-purple'
                                                                            : 'bg-sys-green/15 text-sys-green'
                                                                }`}>
                                                                    {tx.TransactionType === 'LENT' ? 'Lent' : tx.TransactionType === 'ADDITIONAL_LOAN' ? 'Additional' : 'Received'}
                                                                </span>
                                                                <span className="text-xs text-sys-label-secondary flex-1 truncate">{tx.Description || '-'}</span>
                                                                <span className={`money text-sm font-bold flex-shrink-0 ${isLent ? 'text-sys-blue' : 'text-sys-green'}`}>
                                                                    {isLent ? '+' : '-'}{formatIndianCurrency(parseFloat(tx.Amount || '0'))}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                </div>
                                            </div>
                                        </StaggerItem>
                                    );
                                })}
                            </StaggerContainer>
                        )}
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
