import { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ExpenseData, LoanTransaction, TransferData } from '@/lib/google-sheet';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts';
import {
    UtensilsCrossed,
    Car,
    ShoppingBag,
    Film,
    Zap,
    Heart,
    GraduationCap,
    ShoppingCart,
    Home as HomeIcon,
    Shield,
    Sparkles,
    Plane,
    RefreshCw,
    Gift,
    Wallet,
    X,
    Plus,
    TrendingUp,
    CreditCard,
    Banknote,
    Building2,
    Landmark,
    CheckCircle2,
    AlertCircle,
    ArrowRightLeft,
    ChevronRight,
} from 'lucide-react';

type Transaction = ExpenseData & { RowIndex?: number };
type LoanTx = LoanTransaction & { RowIndex?: number };
type Toast = { id: number; message: string; type: 'success' | 'error'; exiting?: boolean };

// Indian currency formatting utility
const formatIndianCurrency = (amount: number): string => {
    const isNegative = amount < 0;
    const absoluteAmount = Math.abs(amount);
    const [integerPart, decimalPart] = absoluteAmount.toFixed(2).split('.');
    let formattedInteger = integerPart;
    if (integerPart.length > 3) {
        const lastThree = integerPart.slice(-3);
        const remaining = integerPart.slice(0, -3);
        const formattedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
        formattedInteger = formattedRemaining + ',' + lastThree;
    }
    const formattedAmount = `₹${formattedInteger}.${decimalPart}`;
    return isNegative ? `-${formattedAmount}` : formattedAmount;
};

// Category icon mapping
const getCategoryIcon = (category: string, isPositive: boolean = false) => {
    if (isPositive) {
        return {
            icon: (
                <svg className="w-5 h-5 text-sys-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
            ),
            bgColor: 'bg-sys-green/15'
        };
    }
    if (category === 'Transfer Out') {
        return {
            icon: (
                <svg className="w-5 h-5 text-sys-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
            ),
            bgColor: 'bg-sys-red/15'
        };
    }
    if (category === 'Transfer In') {
        return {
            icon: (
                <svg className="w-5 h-5 text-sys-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8l4 4m0 0l4-4m-4 4v12" />
                </svg>
            ),
            bgColor: 'bg-sys-green/15'
        };
    }
    const categoryMap: { [key: string]: { icon: JSX.Element; bgColor: string } } = {
        'Food & Dining': { icon: <UtensilsCrossed className="w-5 h-5 text-sys-orange" />, bgColor: 'bg-sys-orange/15' },
        'Transportation': { icon: <Car className="w-5 h-5 text-sys-blue" />, bgColor: 'bg-sys-blue/15' },
        'Shopping': { icon: <ShoppingBag className="w-5 h-5 text-sys-pink" />, bgColor: 'bg-sys-pink/15' },
        'Entertainment': { icon: <Film className="w-5 h-5 text-sys-purple" />, bgColor: 'bg-sys-purple/15' },
        'Bills & Utilities': { icon: <Zap className="w-5 h-5 text-sys-yellow" />, bgColor: 'bg-sys-yellow/15' },
        'Healthcare': { icon: <Heart className="w-5 h-5 text-sys-red" />, bgColor: 'bg-sys-red/15' },
        'Education': { icon: <GraduationCap className="w-5 h-5 text-sys-indigo" />, bgColor: 'bg-sys-indigo/15' },
        'Groceries': { icon: <ShoppingCart className="w-5 h-5 text-sys-green" />, bgColor: 'bg-sys-green/15' },
        'Rent': { icon: <HomeIcon className="w-5 h-5 text-sys-orange" />, bgColor: 'bg-sys-orange/15' },
        'Insurance': { icon: <Shield className="w-5 h-5 text-sys-teal" />, bgColor: 'bg-sys-teal/15' },
        'Personal Care': { icon: <Sparkles className="w-5 h-5 text-sys-pink" />, bgColor: 'bg-sys-pink/15' },
        'Travel': { icon: <Plane className="w-5 h-5 text-sys-cyan" />, bgColor: 'bg-sys-cyan/15' },
        'Subscriptions': { icon: <RefreshCw className="w-5 h-5 text-sys-purple" />, bgColor: 'bg-sys-purple/15' },
        'Gifts': { icon: <Gift className="w-5 h-5 text-sys-pink" />, bgColor: 'bg-sys-pink/15' },
        'Other': { icon: <Wallet className="w-5 h-5 text-sys-label-secondary" />, bgColor: 'bg-sys-fill/50' }
    };
    return categoryMap[category] || categoryMap['Other'];
};

const getAccountIcon = (account: string) => {
    switch (account) {
        case 'AXIS Bank': return { icon: <Building2 className="w-5 h-5" />, color: 'text-sys-pink', bg: 'bg-sys-pink/15' };
        case 'SBI Bank': return { icon: <Landmark className="w-5 h-5" />, color: 'text-sys-blue', bg: 'bg-sys-blue/15' };
        case 'Credit Card': return { icon: <CreditCard className="w-5 h-5" />, color: 'text-sys-orange', bg: 'bg-sys-orange/15' };
        case 'Cash': return { icon: <Banknote className="w-5 h-5" />, color: 'text-sys-green', bg: 'bg-sys-green/15' };
        case 'Mutual Fund': return { icon: <TrendingUp className="w-5 h-5" />, color: 'text-sys-purple', bg: 'bg-sys-purple/15' };
        default: return { icon: <Wallet className="w-5 h-5" />, color: 'text-sys-label-secondary', bg: 'bg-sys-fill/50' };
    }
};

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 1200) {
    const [value, setValue] = useState(0);
    const prevTarget = useRef(0);
    useEffect(() => {
        const start = prevTarget.current;
        prevTarget.current = target;
        const startTime = performance.now();
        const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(start + (target - start) * eased);
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, [target, duration]);
    return value;
}

export default function Home() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [expenses, setExpenses] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Form state
    const [formData, setFormData] = useState<ExpenseData>({
        Date: new Date().toISOString().split('T')[0],
        Account: 'AXIS Bank',
        Category: '',
        Description: '',
        Amount: '',
    });
    const [isIncome, setIsIncome] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Edit modal state
    const [editOpen, setEditOpen] = useState(false);
    const [editData, setEditData] = useState<ExpenseData>({
        Date: '', Account: '', Category: '', Description: '', Amount: '',
    });
    const [editIsIncome, setEditIsIncome] = useState(false);
    const [editRowIndex, setEditRowIndex] = useState<number | null>(null);
    const [updating, setUpdating] = useState(false);

    // Tab & analytics state
    const [activeTab, setActiveTab] = useState<'transactions' | 'transfers' | 'analytics' | 'loans'>('transactions');
    const [selectedPeriod, setSelectedPeriod] = useState<string>('overall');

    // Loans state
    const [loans, setLoans] = useState<LoanTx[]>([]);
    const [loansLoading, setLoansLoading] = useState(false);
    const [loanFormData, setLoanFormData] = useState<LoanTransaction>({
        Date: new Date().toISOString().split('T')[0],
        PersonName: '', TransactionType: 'LENT', Amount: '', Description: '',
    });
    const [loanSubmitting, setLoanSubmitting] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState<string>('');

    // Transfer state
    const [transferFormData, setTransferFormData] = useState<TransferData>({
        Date: new Date().toISOString().split('T')[0],
        FromAccount: 'AXIS Bank', ToAccount: 'SBI Bank', Amount: '', Description: '',
    });
    const [transferSubmitting, setTransferSubmitting] = useState(false);

    // Transaction display state
    const [showAllTransactions, setShowAllTransactions] = useState(false);
    const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('All Accounts');

    // New UI state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [mounted, setMounted] = useState(false);
    const toastCounter = useRef(0);

    // Toast helper
    const addToast = useCallback((message: string, type: 'success' | 'error') => {
        const id = ++toastCounter.current;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
        }, 3000);
    }, []);

    // Mount animation
    useEffect(() => { setMounted(true); }, []);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    // Fetch data
    useEffect(() => {
        if (status === 'authenticated') { fetchExpenses(); fetchLoansData(); }
    }, [status]);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await fetch('/api/expenses/get');
            if (!response.ok) throw new Error('Failed to fetch expenses');
            const data = await response.json();
            setExpenses(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load expenses');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const amount = parseFloat(formData.Amount);
            const signedAmount = isIncome ? Math.abs(amount) : -Math.abs(amount);
            const dataToSend = {
                ...formData,
                Amount: signedAmount.toString(),
                Category: isIncome ? 'Income' : formData.Category,
            };
            const response = await fetch('/api/expenses/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add transaction');
            }
            setFormData({ Date: new Date().toISOString().split('T')[0], Account: 'AXIS Bank', Category: '', Description: '', Amount: '' });
            setIsIncome(false);
            setDrawerOpen(false);
            addToast(isIncome ? 'Income added successfully!' : 'Expense added successfully!', 'success');
            await fetchExpenses();
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'Failed to add transaction', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const fetchLoansData = async () => {
        try {
            setLoansLoading(true);
            const response = await fetch('/api/loans/get');
            if (!response.ok) throw new Error('Failed to fetch loans');
            const data = await response.json();
            setLoans(data);
        } catch (err) {
            console.error('Error fetching loans:', err);
        } finally {
            setLoansLoading(false);
        }
    };

    const handleLoanSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoanSubmitting(true);
        setError('');
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
            setLoanFormData({ Date: new Date().toISOString().split('T')[0], PersonName: '', TransactionType: 'LENT', Amount: '', Description: '' });
            setSelectedPerson('');
            addToast('Loan transaction added!', 'success');
            await fetchLoansData();
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'Failed to add loan transaction', 'error');
        } finally {
            setLoanSubmitting(false);
        }
    };

    const handleTransferSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setTransferSubmitting(true);
        setError('');
        try {
            const response = await fetch('/api/transfers/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transferFormData),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to record transfer');
            }
            setTransferFormData({ Date: new Date().toISOString().split('T')[0], FromAccount: 'AXIS Bank', ToAccount: 'SBI Bank', Amount: '', Description: '' });
            addToast('Transfer recorded successfully!', 'success');
            await fetchExpenses();
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'Failed to record transfer', 'error');
        } finally {
            setTransferSubmitting(false);
        }
    };

    // ── Computed data ──

    const getFilteredTransactions = () => {
        let filtered = expenses;
        if (selectedAccountFilter !== 'All Accounts') {
            filtered = filtered.filter(expense => expense.Account === selectedAccountFilter);
        }
        const sortedTransactions = filtered.slice().reverse();
        return showAllTransactions ? sortedTransactions : sortedTransactions.slice(0, 10);
    };

    const calculateBalances = () => {
        const accounts = ['AXIS Bank', 'SBI Bank', 'Credit Card', 'Cash', 'Mutual Fund'];
        const balances: { [key: string]: number } = {};
        accounts.forEach(account => {
            balances[account] = expenses
                .filter(exp => exp.Account === account)
                .reduce((sum, exp) => sum + parseFloat(exp.Amount || '0'), 0);
        });
        return balances;
    };

    const balances = calculateBalances();
    const totalBalance = Object.values(balances).reduce((sum, val) => sum + val, 0);
    const animatedBalance = useAnimatedCounter(totalBalance);

    const getAvailableMonths = () => {
        const months = new Set<string>();
        expenses.forEach(exp => {
            if (exp.Date) {
                const date = new Date(exp.Date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                months.add(monthKey);
            }
        });
        return Array.from(months).sort().reverse();
    };

    const getFilteredExpenses = () => {
        if (selectedPeriod === 'overall') return expenses;
        return expenses.filter(exp => {
            if (!exp.Date) return false;
            const date = new Date(exp.Date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            return monthKey === selectedPeriod;
        });
    };

    const getCategoryDistribution = () => {
        const filtered = getFilteredExpenses();
        const categoryTotals: { [key: string]: number } = {};
        let totalExpenses = 0;
        filtered.forEach(exp => {
            const amount = parseFloat(exp.Amount || '0');
            if (amount < 0 && exp.Category && exp.Category !== 'Income' && exp.Category !== 'Transfer Out' && exp.Category !== 'Transfer In') {
                categoryTotals[exp.Category] = (categoryTotals[exp.Category] || 0) + Math.abs(amount);
                totalExpenses += Math.abs(amount);
            }
        });
        return Object.entries(categoryTotals)
            .map(([category, amount]) => ({ category, amount, percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0 }))
            .sort((a, b) => b.amount - a.amount);
    };

    const getAccountDistribution = () => {
        const filtered = getFilteredExpenses();
        const accountTotals: { [key: string]: { income: number; expenses: number } } = {};
        filtered.forEach(exp => {
            const amount = parseFloat(exp.Amount || '0');
            if (exp.Category !== 'Transfer In' && exp.Category !== 'Transfer Out') {
                if (!accountTotals[exp.Account]) accountTotals[exp.Account] = { income: 0, expenses: 0 };
                if (amount >= 0) accountTotals[exp.Account].income += amount;
                else accountTotals[exp.Account].expenses += Math.abs(amount);
            }
        });
        return Object.entries(accountTotals).map(([account, data]) => ({
            account, income: data.income, expenses: data.expenses, net: data.income - data.expenses,
        }));
    };

    const getSummary = () => {
        const filtered = getFilteredExpenses();
        let totalIncome = 0, totalExpenses = 0, totalInvestment = 0;
        filtered.forEach(exp => {
            const amount = parseFloat(exp.Amount || '0');
            // Transfers INTO Mutual Fund count as investment
            if (exp.Category === 'Transfer In' && exp.Account === 'Mutual Fund') {
                totalInvestment += amount;
                return;
            }
            if (exp.Category === 'Transfer In' || exp.Category === 'Transfer Out') return;
            if (amount >= 0) {
                if (exp.Account === 'Mutual Fund') totalInvestment += amount;
                else totalIncome += amount;
            } else totalExpenses += Math.abs(amount);
        });
        return {
            totalIncome, totalExpenses, totalInvestment,
            netSavings: totalIncome - totalExpenses,
            savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
        };
    };

    const getSparklineData = (type: 'income' | 'expense' | 'investment') => {
        const filtered = getFilteredExpenses();
        if (filtered.length === 0) return '';
        const dailyData: { [key: string]: number } = {};
        filtered.forEach(exp => {
            if (!exp.Date) return;
            const amount = parseFloat(exp.Amount || '0');
            // Transfers INTO Mutual Fund count as investment
            if (type === 'investment' && exp.Category === 'Transfer In' && exp.Account === 'Mutual Fund') {
                if (!dailyData[exp.Date]) dailyData[exp.Date] = 0;
                dailyData[exp.Date] += amount;
                return;
            }
            if (exp.Category === 'Transfer In' || exp.Category === 'Transfer Out') return;
            if (!dailyData[exp.Date]) dailyData[exp.Date] = 0;
            if (type === 'income' && amount > 0 && exp.Account !== 'Mutual Fund') dailyData[exp.Date] += amount;
            else if (type === 'expense' && amount < 0) dailyData[exp.Date] += Math.abs(amount);
            else if (type === 'investment' && amount > 0 && exp.Account === 'Mutual Fund') dailyData[exp.Date] += amount;
        });
        const sortedDates = Object.keys(dailyData).sort();
        if (sortedDates.length === 0) return '';
        const values = sortedDates.map(date => dailyData[date]);
        const recentValues = values.slice(-30);
        if (recentValues.length === 0) return '';
        const max = Math.max(...recentValues);
        const min = Math.min(...recentValues);
        const range = max - min || 1;
        const width = 200, height = 50, padding = 5;
        const step = width / (recentValues.length - 1 || 1);
        const points = recentValues.map((value, index) => {
            const x = index * step;
            const y = height - padding - ((value - min) / range) * (height - 2 * padding);
            return `${x},${y}`;
        });
        return `M ${points.join(' L ')}`;
    };

    const availableMonths = getAvailableMonths();
    const categoryDistribution = getCategoryDistribution();
    const accountDistribution = getAccountDistribution();
    const summary = getSummary();
    const incomeSparkline = getSparklineData('income');
    const expenseSparkline = getSparklineData('expense');
    const investmentSparkline = getSparklineData('investment');

    const getDailyExpenses = () => {
        const filtered = getFilteredExpenses();
        if (filtered.length === 0) return [];
        const accounts = ['AXIS Bank', 'SBI Bank', 'Credit Card', 'Cash', 'Mutual Fund'];
        const dailyData: { [key: string]: any } = {};
        filtered.forEach(exp => {
            if (!exp.Date) return;
            const date = exp.Date;
            const amount = parseFloat(exp.Amount || '0');
            const account = exp.Account;
            if (exp.Category !== 'Transfer In' && exp.Category !== 'Transfer Out') {
                if (!dailyData[date]) {
                    dailyData[date] = { date, total: 0 };
                    accounts.forEach(acc => { dailyData[date][acc] = 0; });
                }
                if (amount < 0) {
                    const absAmount = Math.abs(amount);
                    dailyData[date].total += absAmount;
                    if (accounts.includes(account)) dailyData[date][account] += absAmount;
                }
            }
        });
        const dates = Object.keys(dailyData).sort();
        if (dates.length === 0) return [];
        const minDate = new Date(dates[0]);
        const maxDate = new Date(dates[dates.length - 1]);
        const allDates: any[] = [];
        const currentDate = new Date(minDate);
        while (currentDate <= maxDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const data = dailyData[dateStr];
            const dataPoint: any = {
                date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                fullDate: dateStr, total: data ? data.total : 0,
            };
            accounts.forEach(account => { dataPoint[account] = data ? data[account] : 0; });
            allDates.push(dataPoint);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return allDates;
    };

    const dailyExpensesData = getDailyExpenses();

    const getLoansSummary = () => {
        const personBalances: { [key: string]: number } = {};
        loans.forEach(loan => {
            const amount = parseFloat(loan.Amount || '0');
            if (!personBalances[loan.PersonName]) personBalances[loan.PersonName] = 0;
            if (loan.TransactionType === 'LENT' || loan.TransactionType === 'ADDITIONAL_LOAN') personBalances[loan.PersonName] += amount;
            else if (loan.TransactionType === 'RECEIVED') personBalances[loan.PersonName] -= amount;
        });
        return Object.entries(personBalances).map(([person, balance]) => ({ person, balance })).sort((a, b) => b.balance - a.balance);
    };

    const getPersonTransactions = (personName: string) => {
        return loans.filter(loan => loan.PersonName === personName).sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
    };

    const getUniquePersons = () => {
        const persons = new Set<string>();
        loans.forEach(loan => { if (loan.PersonName) persons.add(loan.PersonName); });
        return Array.from(persons).sort();
    };

    const loansSummary = getLoansSummary();
    const totalLent = loansSummary.reduce((sum, item) => sum + Math.max(0, item.balance), 0);
    const uniquePersons = getUniquePersons();

    // Date grouping helper
    const groupTransactionsByDate = (transactions: Transaction[]) => {
        const groups: { label: string; dateKey: string; transactions: Transaction[] }[] = [];
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const groupMap: { [key: string]: Transaction[] } = {};
        transactions.forEach(tx => {
            const key = tx.Date || 'unknown';
            if (!groupMap[key]) groupMap[key] = [];
            groupMap[key].push(tx);
        });
        Object.keys(groupMap).sort().reverse().forEach(dateKey => {
            let label = dateKey;
            if (dateKey === today) label = 'Today';
            else if (dateKey === yesterday) label = 'Yesterday';
            else {
                try {
                    label = new Date(dateKey).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
                } catch { label = dateKey; }
            }
            groups.push({ label, dateKey, transactions: groupMap[dateKey] });
        });
        return groups;
    };

    // Edit modal handlers
    const openEditModal = (tx: Transaction) => {
        const numericAmount = parseFloat(tx.Amount || '0');
        setEditRowIndex(typeof tx.RowIndex === 'number' ? tx.RowIndex : null);
        setEditData({ Date: tx.Date, Account: tx.Account, Category: tx.Category, Description: tx.Description, Amount: Math.abs(numericAmount).toString() });
        setEditIsIncome(numericAmount >= 0);
        setEditOpen(true);
    };

    const closeEditModal = () => { setEditOpen(false); setUpdating(false); };

    const handleUpdate = async (e: FormEvent) => {
        e.preventDefault();
        if (editRowIndex === null) return;
        setUpdating(true);
        setError('');
        try {
            const amount = parseFloat(editData.Amount);
            const signedAmount = editIsIncome ? Math.abs(amount) : -Math.abs(amount);
            const payload = {
                rowIndex: editRowIndex,
                expenseData: { ...editData, Amount: signedAmount.toString(), Category: editIsIncome ? 'Income' : editData.Category },
            };
            const response = await fetch('/api/expenses/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update transaction');
            }
            closeEditModal();
            addToast('Transaction updated!', 'success');
            await fetchExpenses();
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'Failed to update transaction', 'error');
        } finally {
            setUpdating(false);
        }
    };

    // ── Loading / Auth states ──

    if (status === 'loading' || (status === 'authenticated' && loading && expenses.length === 0)) {
        return (
            <div className="min-h-screen bg-sys-bg">
                <div className="bg-sys-bg/80 backdrop-blur-xl border-b border-sys-separator">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
                        <div className="skeleton h-7 w-40 rounded-lg" />
                        <div className="skeleton h-7 w-20 rounded-lg" />
                    </div>
                </div>
                <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
                    <div className="skeleton h-5 w-32 rounded mb-3" />
                    <div className="skeleton h-12 w-64 rounded-lg mb-8" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        {[1, 2, 3].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
                    </div>
                    <div className="skeleton h-80 rounded-2xl" />
                </main>
            </div>
        );
    }

    if (status === 'unauthenticated') return null;

    const filteredTxns = getFilteredTransactions();
    const groupedTxns = groupTransactionsByDate(filteredTxns);

    const tabs = [
        { key: 'transactions' as const, label: 'Transactions' },
        { key: 'transfers' as const, label: 'Transfers' },
        { key: 'analytics' as const, label: 'Analytics' },
        { key: 'loans' as const, label: 'Loans' },
    ];

    const categories = [
        'Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities',
        'Healthcare', 'Education', 'Groceries', 'Rent', 'Insurance', 'Personal Care',
        'Travel', 'Subscriptions', 'Gifts', 'Other',
    ];

    const accountsList = ['AXIS Bank', 'SBI Bank', 'Credit Card', 'Cash', 'Mutual Fund'];

    // Spinner component
    const Spinner = () => (
        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
    );

    return (
        <>
            <Head>
                <title>Finance Tracker</title>
                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
            </Head>

            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl backdrop-blur-xl shadow-lg ${
                            toast.exiting ? 'animate-toast-out' : 'animate-toast-in'
                        } ${
                            toast.type === 'success'
                                ? 'bg-sys-green/15 text-sys-green'
                                : 'bg-sys-red/15 text-sys-red'
                        }`}
                    >
                        {toast.type === 'success'
                            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                            : <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        }
                        <span className="text-sm font-medium">{toast.message}</span>
                    </div>
                ))}
            </div>

            {/* Drawer Backdrop */}
            {drawerOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in-fast"
                    onClick={() => setDrawerOpen(false)}
                />
            )}

            {/* Add Transaction Drawer */}
            <div className={`fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-sys-bg border-l border-sys-separator shadow-2xl overflow-y-auto transition-transform duration-300 ease-out ${
                drawerOpen ? 'translate-x-0' : 'translate-x-full'
            }`}>
                <div className="p-6">
                    {/* Drawer Header */}
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-sys-label">New Transaction</h2>
                        <button
                            onClick={() => setDrawerOpen(false)}
                            className="w-8 h-8 rounded-full bg-sys-fill/50 flex items-center justify-center transition-colors active:bg-sys-fill"
                        >
                            <X className="w-4 h-4 text-sys-label-secondary" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Income/Expense Segmented Control */}
                        <div className="bg-sys-elevated rounded-xl p-1 flex">
                            <button
                                type="button"
                                onClick={() => setIsIncome(false)}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                    !isIncome ? 'bg-sys-red text-white shadow-sm' : 'text-sys-label-secondary'
                                }`}
                            >
                                Expense
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsIncome(true)}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                    isIncome ? 'bg-sys-green text-white shadow-sm' : 'text-sys-label-secondary'
                                }`}
                            >
                                Income
                            </button>
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="text-sm font-medium text-sys-label-secondary mb-2 block">Amount</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-5">
                                    <span className="text-sys-label-secondary text-2xl font-bold">₹</span>
                                </div>
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    min="0"
                                    className="w-full pl-14 pr-4 py-5 bg-sys-card text-sys-label rounded-2xl focus:outline-none focus:ring-2 focus:ring-sys-blue/50 transition-all text-3xl font-bold placeholder-sys-label-tertiary"
                                    value={formData.Amount}
                                    onChange={(e) => setFormData({ ...formData, Amount: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Grouped Inputs */}
                        <div className="apple-card overflow-hidden">
                            <div>
                                <label className="text-xs font-medium text-sys-label-secondary px-4 pt-3 block">Date</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full px-4 py-2.5 bg-transparent text-sys-label focus:outline-none"
                                    value={formData.Date}
                                    onChange={(e) => setFormData({ ...formData, Date: e.target.value })}
                                    style={{ colorScheme: 'dark' }}
                                />
                            </div>
                            <div className="border-t border-sys-separator ml-4" />
                            <div>
                                <label className="text-xs font-medium text-sys-label-secondary px-4 pt-3 block">Account</label>
                                <select
                                    required
                                    className="w-full px-4 py-2.5 bg-transparent text-sys-label focus:outline-none appearance-none cursor-pointer"
                                    value={formData.Account}
                                    onChange={(e) => setFormData({ ...formData, Account: e.target.value })}
                                >
                                    {accountsList.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                                </select>
                            </div>
                            {!isIncome && (
                                <>
                                    <div className="border-t border-sys-separator ml-4" />
                                    <div className="animate-fade-in">
                                        <label className="text-xs font-medium text-sys-label-secondary px-4 pt-3 block">Category</label>
                                        <select
                                            required
                                            className="w-full px-4 py-2.5 bg-transparent text-sys-label focus:outline-none appearance-none cursor-pointer"
                                            value={formData.Category}
                                            onChange={(e) => setFormData({ ...formData, Category: e.target.value })}
                                        >
                                            <option value="">Select category</option>
                                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}
                            <div className="border-t border-sys-separator ml-4" />
                            <div>
                                <label className="text-xs font-medium text-sys-label-secondary px-4 pt-3 block">Description</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 bg-transparent text-sys-label focus:outline-none placeholder-sys-label-tertiary"
                                    value={formData.Description}
                                    onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-sys-blue text-white font-semibold py-4 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-[17px]"
                        >
                            {submitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Spinner />
                                    Adding...
                                </span>
                            ) : (
                                isIncome ? 'Add Income' : 'Add Expense'
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* FAB */}
            <button
                onClick={() => setDrawerOpen(true)}
                className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-sys-blue text-white shadow-lg shadow-sys-blue/30 flex items-center justify-center transition-all active:scale-90 ${
                    mounted ? 'animate-scale-in delay-500' : 'opacity-0'
                } ${drawerOpen || editOpen ? 'opacity-0 pointer-events-none scale-50' : ''}`}
            >
                <Plus className="w-6 h-6" />
            </button>

            <div className="min-h-screen bg-sys-bg">
                {/* Header */}
                <header className="sticky top-0 z-30 bg-sys-bg/80 backdrop-blur-xl border-b border-sys-separator">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
                        <h1 className="text-[17px] font-semibold text-sys-label">Finance Tracker</h1>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-sys-label-tertiary hidden sm:block">{session?.user?.email}</span>
                            <button
                                onClick={() => signOut()}
                                className="text-sys-red text-sm font-medium transition-opacity active:opacity-60"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </header>

                <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
                    {/* Segmented Control */}
                    <div className={`mb-8 ${mounted ? 'animate-fade-in' : 'opacity-0'}`}>
                        <div className="bg-sys-elevated rounded-xl p-1 flex">
                            {tabs.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                                        activeTab === tab.key
                                            ? 'bg-sys-fill text-sys-label shadow-sm'
                                            : 'text-sys-label-secondary'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-6 apple-card p-4 animate-scale-in flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-sys-red flex-shrink-0" />
                            <p className="text-sm text-sys-red flex-1">{error}</p>
                            <button onClick={() => setError('')}>
                                <X className="w-4 h-4 text-sys-label-secondary" />
                            </button>
                        </div>
                    )}

                    {/* ═══ TRANSACTIONS TAB ═══ */}
                    {activeTab === 'transactions' && (
                        <div className={mounted ? 'animate-fade-in' : 'opacity-0'}>
                            {/* Top 3 Stats */}
                            <div className="grid grid-cols-3 gap-3 mb-8 animate-slide-up">
                                {/* Current Balance */}
                                <div className="apple-card p-4">
                                    <p className="text-sys-label-secondary text-[11px] font-semibold uppercase tracking-wider mb-2">Balance</p>
                                    <p className="text-sys-label text-xl sm:text-2xl font-bold tracking-tight">
                                        {formatIndianCurrency((balances['AXIS Bank'] || 0) + (balances['SBI Bank'] || 0) + (balances['Cash'] || 0))}
                                    </p>
                                    <p className="text-sys-label-tertiary text-[10px] mt-1">AXIS + SBI + Cash</p>
                                </div>

                                {/* Investment */}
                                <div className="apple-card p-4">
                                    <p className="text-sys-teal text-[11px] font-semibold uppercase tracking-wider mb-2">Investment</p>
                                    <p className="text-sys-teal text-xl sm:text-2xl font-bold tracking-tight">
                                        {formatIndianCurrency(balances['Mutual Fund'] || 0)}
                                    </p>
                                    <p className="text-sys-label-tertiary text-[10px] mt-1">Mutual Fund</p>
                                </div>

                                {/* Spent Today */}
                                <div className="apple-card p-4">
                                    <p className="text-sys-red text-[11px] font-semibold uppercase tracking-wider mb-2">Spent Today</p>
                                    <p className="text-sys-red text-xl sm:text-2xl font-bold tracking-tight">
                                        {formatIndianCurrency(
                                            Math.abs(expenses
                                                .filter(e => {
                                                    const today = new Date().toISOString().split('T')[0];
                                                    return e.Date === today && parseFloat(e.Amount) < 0 && e.Category !== 'Transfer In' && e.Category !== 'Transfer Out';
                                                })
                                                .reduce((s, e) => s + parseFloat(e.Amount), 0))
                                        )}
                                    </p>
                                    <p className="text-sys-label-tertiary text-[10px] mt-1">
                                        {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </p>
                                </div>
                            </div>

                            {/* Account Cards */}
                            <div className="mb-8 animate-slide-up stagger-4">
                                <h3 className="text-xs font-semibold text-sys-label-secondary uppercase tracking-wider mb-3 px-1">Accounts</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                    {Object.entries(balances).map(([account, balance], idx) => {
                                        const ai = getAccountIcon(account);
                                        return (
                                            <button
                                                key={account}
                                                className={`apple-card p-4 text-left transition-all active:scale-[0.97] ${
                                                    selectedAccountFilter === account ? 'ring-1 ring-sys-blue' : ''
                                                }`}
                                                style={{ animationDelay: `${idx * 60}ms` }}
                                                onClick={() => {
                                                    setSelectedAccountFilter(selectedAccountFilter === account ? 'All Accounts' : account);
                                                    setShowAllTransactions(false);
                                                }}
                                            >
                                                <div className={`w-9 h-9 rounded-xl ${ai.bg} flex items-center justify-center mb-3 ${ai.color}`}>
                                                    {ai.icon}
                                                </div>
                                                <p className="text-[11px] text-sys-label-secondary font-medium mb-0.5 truncate">{account}</p>
                                                <p className={`text-sm font-bold ${balance >= 0 ? 'text-sys-label' : 'text-sys-red'}`}>
                                                    {formatIndianCurrency(balance)}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Transactions List */}
                            <div className="animate-slide-up stagger-5">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <h3 className="text-xs font-semibold text-sys-label-secondary uppercase tracking-wider">
                                        {selectedAccountFilter === 'All Accounts' ? 'Recent Transactions' : selectedAccountFilter}
                                    </h3>
                                    <button
                                        onClick={() => setShowAllTransactions(!showAllTransactions)}
                                        className="text-sys-blue text-xs font-medium transition-opacity active:opacity-60"
                                    >
                                        {showAllTransactions ? 'Show Less' : 'See All'}
                                    </button>
                                </div>

                                {/* Account filter pills */}
                                <div className="flex items-center gap-2 flex-wrap mb-3 px-1">
                                    {['All Accounts', ...accountsList].map(acc => (
                                        <button
                                            key={acc}
                                            onClick={() => { setSelectedAccountFilter(acc); setShowAllTransactions(false); }}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                                selectedAccountFilter === acc
                                                    ? 'bg-sys-blue text-white'
                                                    : 'bg-sys-elevated text-sys-label-secondary'
                                            }`}
                                        >
                                            {acc === 'All Accounts' ? 'All' : acc}
                                        </button>
                                    ))}
                                </div>

                                <div className="apple-card overflow-hidden">
                                    {loading ? (
                                        <div className="p-4 space-y-4">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
                                                    <div className="flex-1">
                                                        <div className="skeleton h-4 w-28 rounded mb-2" />
                                                        <div className="skeleton h-3 w-16 rounded" />
                                                    </div>
                                                    <div className="skeleton h-4 w-20 rounded" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : filteredTxns.length === 0 ? (
                                        <div className="py-16 text-center">
                                            <div className="w-14 h-14 bg-sys-elevated rounded-2xl flex items-center justify-center mx-auto mb-3">
                                                <Wallet className="w-7 h-7 text-sys-label-tertiary" />
                                            </div>
                                            <p className="text-sys-label-secondary font-medium text-sm">No transactions yet</p>
                                            <p className="text-sys-label-tertiary text-xs mt-1">Tap + to add your first one</p>
                                        </div>
                                    ) : (
                                        <div>
                                            {groupedTxns.map((group) => (
                                                <div key={group.dateKey}>
                                                    <div className="px-4 py-2 bg-sys-bg/50">
                                                        <span className="text-xs font-semibold text-sys-label-secondary uppercase tracking-wider">{group.label}</span>
                                                    </div>
                                                    {group.transactions.map((expense, index) => {
                                                        const amount = parseFloat(expense.Amount || '0');
                                                        const isPositive = amount >= 0;
                                                        const catIcon = getCategoryIcon(expense.Category, isPositive);
                                                        return (
                                                            <div
                                                                key={`${group.dateKey}-${index}`}
                                                                className="flex items-center gap-3 px-4 py-3 active:bg-sys-elevated/50 transition-colors cursor-pointer"
                                                                onClick={() => openEditModal(expense)}
                                                            >
                                                                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${catIcon.bgColor}`}>
                                                                    {catIcon.icon}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-sys-label text-sm truncate">
                                                                        {isPositive
                                                                            ? (expense.Account === 'Mutual Fund' ? 'Investment' : 'Income')
                                                                            : expense.Description || expense.Category}
                                                                    </p>
                                                                    <p className="text-xs text-sys-label-tertiary mt-0.5">{expense.Account}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className={`font-semibold text-sm tabular-nums ${isPositive ? 'text-sys-green' : 'text-sys-label'}`}>
                                                                        {isPositive ? '+' : '-'}{formatIndianCurrency(Math.abs(amount))}
                                                                    </p>
                                                                    <ChevronRight className="w-4 h-4 text-sys-label-tertiary" />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ TRANSFERS TAB ═══ */}
                    {activeTab === 'transfers' && (
                        <div className="animate-fade-in">
                            <div className="apple-card p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-sys-blue/15 rounded-xl flex items-center justify-center">
                                        <ArrowRightLeft className="w-5 h-5 text-sys-blue" />
                                    </div>
                                    <h2 className="text-lg font-bold text-sys-label">Transfer Between Accounts</h2>
                                </div>

                                <form onSubmit={handleTransferSubmit} className="space-y-5">
                                    {/* Transfer Flow */}
                                    <div className="bg-sys-elevated rounded-2xl p-5">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <label className="text-xs text-sys-label-secondary font-medium mb-1 block">From</label>
                                                <select
                                                    value={transferFormData.FromAccount}
                                                    onChange={(e) => setTransferFormData({ ...transferFormData, FromAccount: e.target.value })}
                                                    className="apple-select"
                                                    required
                                                >
                                                    {accountsList.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex-shrink-0 mt-5">
                                                <div className="w-10 h-10 rounded-full bg-sys-blue/15 flex items-center justify-center">
                                                    <ArrowRightLeft className="w-4 h-4 text-sys-blue" />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-xs text-sys-label-secondary font-medium mb-1 block">To</label>
                                                <select
                                                    value={transferFormData.ToAccount}
                                                    onChange={(e) => setTransferFormData({ ...transferFormData, ToAccount: e.target.value })}
                                                    className="apple-select"
                                                    required
                                                >
                                                    {accountsList.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        {transferFormData.FromAccount === transferFormData.ToAccount && (
                                            <p className="text-xs text-sys-orange mt-3 text-center animate-scale-in">
                                                Please select different accounts
                                            </p>
                                        )}
                                    </div>

                                    <div className="apple-card overflow-hidden">
                                        <div>
                                            <label className="text-xs font-medium text-sys-label-secondary px-4 pt-3 block">Amount</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                                                    <span className="text-sys-label-secondary font-bold">₹</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    value={transferFormData.Amount}
                                                    onChange={(e) => setTransferFormData({ ...transferFormData, Amount: e.target.value })}
                                                    className="w-full pl-8 pr-4 py-2.5 bg-transparent text-sys-label placeholder-sys-label-tertiary focus:outline-none"
                                                    placeholder="0.00"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="border-t border-sys-separator ml-4" />
                                        <div>
                                            <label className="text-xs font-medium text-sys-label-secondary px-4 pt-3 block">Date</label>
                                            <input
                                                type="date"
                                                value={transferFormData.Date}
                                                onChange={(e) => setTransferFormData({ ...transferFormData, Date: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-transparent text-sys-label focus:outline-none"
                                                required
                                                style={{ colorScheme: 'dark' }}
                                            />
                                        </div>
                                        <div className="border-t border-sys-separator ml-4" />
                                        <div>
                                            <label className="text-xs font-medium text-sys-label-secondary px-4 pt-3 block">Description</label>
                                            <input
                                                type="text"
                                                value={transferFormData.Description}
                                                onChange={(e) => setTransferFormData({ ...transferFormData, Description: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-transparent text-sys-label placeholder-sys-label-tertiary focus:outline-none"
                                                placeholder="Optional"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={transferSubmitting || transferFormData.FromAccount === transferFormData.ToAccount}
                                        className="w-full bg-sys-blue text-white font-semibold py-3.5 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-[17px] flex items-center justify-center gap-2"
                                    >
                                        {transferSubmitting ? (
                                            <><Spinner /> Processing...</>
                                        ) : (
                                            <><ArrowRightLeft className="w-5 h-5" /> Record Transfer</>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ═══ ANALYTICS TAB ═══ */}
                    {activeTab === 'analytics' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Period Selector */}
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-bold text-sys-label">Analysis</h2>
                                <select
                                    value={selectedPeriod}
                                    onChange={(e) => setSelectedPeriod(e.target.value)}
                                    className="px-4 py-2 bg-sys-elevated text-sys-label rounded-xl focus:outline-none text-sm appearance-none cursor-pointer"
                                >
                                    <option value="overall">Overall</option>
                                    {availableMonths.map(month => {
                                        const [year, monthNum] = month.split('-');
                                        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                                        return <option key={month} value={month}>{date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</option>;
                                    })}
                                </select>
                            </div>

                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {[
                                    { label: 'Income', value: summary.totalIncome, color: 'text-sys-green' },
                                    { label: 'Investment', value: summary.totalInvestment, color: 'text-sys-teal' },
                                    { label: 'Expenses', value: summary.totalExpenses, color: 'text-sys-red' },
                                    { label: 'Net Savings', value: summary.netSavings, color: summary.netSavings >= 0 ? 'text-sys-green' : 'text-sys-red' },
                                    { label: 'Savings Rate', value: summary.savingsRate, color: 'text-sys-blue', isPercent: true },
                                ].map((card, i) => (
                                    <div key={card.label} className="apple-card p-4 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                                        <p className="text-[11px] font-medium text-sys-label-secondary mb-1.5 uppercase tracking-wider">{card.label}</p>
                                        <p className={`text-lg font-bold ${card.color}`}>
                                            {(card as any).isPercent ? `${card.value.toFixed(1)}%` : formatIndianCurrency(card.value)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Daily Expenses Chart */}
                            <div className="apple-card p-6 animate-slide-up stagger-3">
                                <h3 className="text-base font-bold text-sys-label mb-1">Daily Expenses</h3>
                                <p className="text-xs text-sys-label-secondary mb-6">Spending across all accounts</p>

                                {dailyExpensesData.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16">
                                        <div className="w-14 h-14 bg-sys-elevated rounded-2xl flex items-center justify-center mb-3">
                                            <TrendingUp className="w-7 h-7 text-sys-label-tertiary" />
                                        </div>
                                        <p className="text-sys-label-secondary text-sm">No data for this period</p>
                                    </div>
                                ) : (
                                    <div className="rounded-xl overflow-hidden">
                                        <ResponsiveContainer width="100%" height={350}>
                                            <AreaChart data={dailyExpensesData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                                                <defs>
                                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#0A84FF" stopOpacity={0.25} />
                                                        <stop offset="100%" stopColor="#0A84FF" stopOpacity={0.02} />
                                                    </linearGradient>
                                                    <linearGradient id="colorAxis" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#30D158" stopOpacity={0.15} />
                                                        <stop offset="100%" stopColor="#30D158" stopOpacity={0.02} />
                                                    </linearGradient>
                                                    <linearGradient id="colorSBI" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#FF9F0A" stopOpacity={0.15} />
                                                        <stop offset="100%" stopColor="#FF9F0A" stopOpacity={0.02} />
                                                    </linearGradient>
                                                    <linearGradient id="colorCredit" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#FF453A" stopOpacity={0.15} />
                                                        <stop offset="100%" stopColor="#FF453A" stopOpacity={0.02} />
                                                    </linearGradient>
                                                    <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#BF5AF2" stopOpacity={0.15} />
                                                        <stop offset="100%" stopColor="#BF5AF2" stopOpacity={0.02} />
                                                    </linearGradient>
                                                    <linearGradient id="colorMutual" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#64D2FF" stopOpacity={0.15} />
                                                        <stop offset="100%" stopColor="#64D2FF" stopOpacity={0.02} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#38383A" opacity={0.3} vertical={false} />
                                                <XAxis dataKey="date" stroke="#48484A" style={{ fontSize: '11px' }} tick={{ fill: '#8E8E93' }} axisLine={false} tickLine={false} />
                                                <YAxis stroke="#48484A" style={{ fontSize: '11px' }} tick={{ fill: '#8E8E93' }} tickFormatter={(v) => `₹${v.toLocaleString()}`} axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    content={(props: any) => {
                                                        if (!props.payload || props.payload.length === 0) return null;
                                                        const data = props.payload[0].payload;
                                                        if (data.total === 0) {
                                                            return (
                                                                <div className="bg-sys-elevated rounded-xl p-3 shadow-xl border border-sys-separator">
                                                                    <p className="text-sys-label-secondary text-xs font-medium mb-1">{props.label}</p>
                                                                    <p className="text-sys-green text-sm">No expenses</p>
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <div className="bg-sys-elevated rounded-xl p-3 shadow-xl border border-sys-separator">
                                                                <p className="text-sys-label-secondary text-xs font-medium mb-2">{props.label}</p>
                                                                {props.payload.map((entry: any, i: number) => {
                                                                    if (entry.value === 0) return null;
                                                                    return <p key={i} style={{ color: entry.color }} className="text-xs font-medium">{entry.name}: {formatIndianCurrency(entry.value)}</p>;
                                                                })}
                                                            </div>
                                                        );
                                                    }}
                                                    cursor={{ stroke: '#0A84FF', strokeWidth: 1, strokeDasharray: '4 4' }}
                                                />
                                                <Legend verticalAlign="top" height={36} iconType="line" wrapperStyle={{ paddingBottom: '16px', fontSize: '11px' }} />
                                                <Area type="monotone" dataKey="total" name="Total" stroke="#0A84FF" strokeWidth={2.5} fill="url(#colorTotal)" strokeLinecap="round" />
                                                <Area type="monotone" dataKey="AXIS Bank" name="AXIS Bank" stroke="#30D158" strokeWidth={1.5} fill="url(#colorAxis)" strokeLinecap="round" />
                                                <Area type="monotone" dataKey="SBI Bank" name="SBI Bank" stroke="#FF9F0A" strokeWidth={1.5} fill="url(#colorSBI)" strokeLinecap="round" />
                                                <Area type="monotone" dataKey="Credit Card" name="Credit Card" stroke="#FF453A" strokeWidth={1.5} fill="url(#colorCredit)" strokeLinecap="round" />
                                                <Area type="monotone" dataKey="Cash" name="Cash" stroke="#BF5AF2" strokeWidth={1.5} fill="url(#colorCash)" strokeLinecap="round" />
                                                <Area type="monotone" dataKey="Mutual Fund" name="Mutual Fund" stroke="#64D2FF" strokeWidth={1.5} fill="url(#colorMutual)" strokeLinecap="round" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>

                            {/* Category Distribution */}
                            <div className="apple-card p-6 animate-slide-up stagger-4">
                                <h3 className="text-base font-bold text-sys-label mb-4">Expenses by Category</h3>
                                {categoryDistribution.length === 0 ? (
                                    <p className="text-sys-label-secondary text-center py-8 text-sm">No expense data for this period</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height={380}>
                                        <BarChart data={categoryDistribution.map(cat => ({ name: cat.category, value: cat.amount, percentage: cat.percentage }))} margin={{ top: 15, right: 20, left: 15, bottom: 60 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#38383A" opacity={0.3} />
                                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fill: '#8E8E93', fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: '#8E8E93', fontSize: 11 }} tickFormatter={(v) => `₹${v}`} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#2C2C2E', border: '1px solid #38383A', borderRadius: '12px', color: '#FFFFFF' }}
                                                formatter={(value: number, _name: string, props: any) => [`${formatIndianCurrency(value)} (${props.payload.percentage.toFixed(1)}%)`, 'Amount']}
                                                labelStyle={{ color: '#8E8E93' }}
                                            />
                                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                                {categoryDistribution.map((_entry, index) => {
                                                    const colors = ['#0A84FF', '#BF5AF2', '#FF375F', '#FF9F0A', '#30D158', '#5E5CE6', '#FF453A', '#64D2FF', '#FFD60A', '#00C7BE', '#0A84FF', '#BF5AF2', '#FF375F', '#FF9F0A', '#30D158'];
                                                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                                })}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            {/* Account Breakdown */}
                            <div className="apple-card overflow-hidden animate-slide-up stagger-5">
                                <div className="px-5 py-4 border-b border-sys-separator">
                                    <h3 className="text-base font-bold text-sys-label">Account Breakdown</h3>
                                    <p className="text-xs text-sys-label-secondary mt-0.5">Income, expenses, and net per account</p>
                                </div>

                                {accountDistribution.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <p className="text-sys-label-secondary text-sm">No data for this period</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Desktop Table */}
                                        <div className="hidden md:block overflow-x-auto">
                                            <table className="min-w-full">
                                                <thead>
                                                    <tr className="border-b border-sys-separator">
                                                        <th className="px-5 py-3 text-left text-[11px] font-semibold text-sys-label-secondary uppercase tracking-wider">Account</th>
                                                        <th className="px-5 py-3 text-right text-[11px] font-semibold text-sys-label-secondary uppercase tracking-wider">Income</th>
                                                        <th className="px-5 py-3 text-right text-[11px] font-semibold text-sys-label-secondary uppercase tracking-wider">Expenses</th>
                                                        <th className="px-5 py-3 text-right text-[11px] font-semibold text-sys-label-secondary uppercase tracking-wider">Net</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {accountDistribution.map(acc => {
                                                        const ai = getAccountIcon(acc.account);
                                                        return (
                                                            <tr key={acc.account} className="border-b border-sys-separator last:border-0">
                                                                <td className="px-5 py-3.5">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-8 h-8 rounded-lg ${ai.bg} flex items-center justify-center ${ai.color}`}>
                                                                            {ai.icon}
                                                                        </div>
                                                                        <span className="font-medium text-sys-label text-sm">{acc.account}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-5 py-3.5 text-right">
                                                                    <span className="text-sys-green font-semibold text-sm">{formatIndianCurrency(acc.income)}</span>
                                                                </td>
                                                                <td className="px-5 py-3.5 text-right">
                                                                    <span className="text-sys-red font-semibold text-sm">{formatIndianCurrency(acc.expenses)}</span>
                                                                </td>
                                                                <td className="px-5 py-3.5 text-right">
                                                                    <span className={`font-semibold text-sm ${acc.net >= 0 ? 'text-sys-green' : 'text-sys-red'}`}>
                                                                        {acc.net >= 0 ? '+' : ''}{formatIndianCurrency(acc.net)}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Cards */}
                                        <div className="md:hidden p-4 space-y-3">
                                            {accountDistribution.map(acc => {
                                                const ai = getAccountIcon(acc.account);
                                                return (
                                                    <div key={acc.account} className="bg-sys-elevated rounded-xl p-4">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className={`w-8 h-8 rounded-lg ${ai.bg} flex items-center justify-center ${ai.color}`}>{ai.icon}</div>
                                                            <span className="font-semibold text-sys-label text-sm">{acc.account}</span>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div className="bg-sys-green/10 rounded-lg p-2">
                                                                <p className="text-[10px] text-sys-green/70 font-medium">Income</p>
                                                                <p className="text-sys-green font-bold text-xs">{formatIndianCurrency(acc.income)}</p>
                                                            </div>
                                                            <div className="bg-sys-red/10 rounded-lg p-2">
                                                                <p className="text-[10px] text-sys-red/70 font-medium">Expenses</p>
                                                                <p className="text-sys-red font-bold text-xs">{formatIndianCurrency(acc.expenses)}</p>
                                                            </div>
                                                            <div className={`rounded-lg p-2 ${acc.net >= 0 ? 'bg-sys-green/10' : 'bg-sys-red/10'}`}>
                                                                <p className={`text-[10px] font-medium ${acc.net >= 0 ? 'text-sys-green/70' : 'text-sys-red/70'}`}>Net</p>
                                                                <p className={`font-bold text-xs ${acc.net >= 0 ? 'text-sys-green' : 'text-sys-red'}`}>{formatIndianCurrency(acc.net)}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══ LOANS TAB ═══ */}
                    {activeTab === 'loans' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Summary */}
                            <div className="apple-card p-6">
                                <p className="text-sys-label-secondary text-sm font-medium mb-1">Total Money Lent</p>
                                <p className="text-3xl sm:text-4xl font-bold text-sys-label mb-3">{formatIndianCurrency(totalLent)}</p>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-sys-elevated rounded-lg text-xs font-medium text-sys-label-secondary">
                                        {loansSummary.filter(p => p.balance > 0).length} people
                                    </span>
                                    <span className="px-3 py-1 bg-sys-elevated rounded-lg text-xs font-medium text-sys-label-secondary">
                                        {loans.length} transactions
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Add Loan Form */}
                                <div className="lg:col-span-1">
                                    <div className="apple-card p-6">
                                        <h3 className="text-base font-bold text-sys-label mb-5">Add Transaction</h3>
                                        <form onSubmit={handleLoanSubmit} className="space-y-4">
                                            <div className="apple-card overflow-hidden">
                                                <div>
                                                    <label className="text-xs font-medium text-sys-label-secondary px-4 pt-3 block">Date</label>
                                                    <input type="date" required className="w-full px-4 py-2.5 bg-transparent text-sys-label focus:outline-none"
                                                        value={loanFormData.Date} onChange={(e) => setLoanFormData({ ...loanFormData, Date: e.target.value })} style={{ colorScheme: 'dark' }} />
                                                </div>
                                                <div className="border-t border-sys-separator ml-4" />
                                                <div>
                                                    <label className="text-xs font-medium text-sys-label-secondary px-4 pt-3 block">Person</label>
                                                    {uniquePersons.length > 0 ? (
                                                        <div className="px-4 pb-2.5 space-y-2">
                                                            <select className="w-full py-1.5 bg-transparent text-sys-label focus:outline-none appearance-none cursor-pointer"
                                                                value={selectedPerson} onChange={(e) => { setSelectedPerson(e.target.value); setLoanFormData({ ...loanFormData, PersonName: e.target.value }); }}>
                                                                <option value="">Select or type new</option>
                                                                {uniquePersons.map(p => <option key={p} value={p}>{p}</option>)}
                                                            </select>
                                                            <input type="text" placeholder="Or enter new name" className="w-full py-1.5 bg-transparent text-sys-label placeholder-sys-label-tertiary focus:outline-none"
                                                                value={selectedPerson === '' ? loanFormData.PersonName : ''} onChange={(e) => { setSelectedPerson(''); setLoanFormData({ ...loanFormData, PersonName: e.target.value }); }} />
                                                        </div>
                                                    ) : (
                                                        <input type="text" required className="w-full px-4 py-2.5 bg-transparent text-sys-label placeholder-sys-label-tertiary focus:outline-none"
                                                            value={loanFormData.PersonName} onChange={(e) => setLoanFormData({ ...loanFormData, PersonName: e.target.value })} placeholder="Enter name" />
                                                    )}
                                                </div>
                                                <div className="border-t border-sys-separator ml-4" />
                                                <div>
                                                    <label className="text-xs font-medium text-sys-label-secondary px-4 pt-3 block">Type</label>
                                                    <select required className="w-full px-4 py-2.5 bg-transparent text-sys-label focus:outline-none appearance-none cursor-pointer"
                                                        value={loanFormData.TransactionType} onChange={(e) => setLoanFormData({ ...loanFormData, TransactionType: e.target.value })}>
                                                        <option value="LENT">Money Lent</option>
                                                        <option value="ADDITIONAL_LOAN">Additional Loan</option>
                                                        <option value="RECEIVED">Money Received</option>
                                                    </select>
                                                </div>
                                                <div className="border-t border-sys-separator ml-4" />
                                                <div>
                                                    <label className="text-xs font-medium text-sys-label-secondary px-4 pt-3 block">Amount</label>
                                                    <input type="number" required step="0.01" min="0" className="w-full px-4 py-2.5 bg-transparent text-sys-label placeholder-sys-label-tertiary focus:outline-none"
                                                        value={loanFormData.Amount} onChange={(e) => setLoanFormData({ ...loanFormData, Amount: e.target.value })} placeholder="0.00" />
                                                </div>
                                                <div className="border-t border-sys-separator ml-4" />
                                                <div>
                                                    <label className="text-xs font-medium text-sys-label-secondary px-4 pt-3 block">Description</label>
                                                    <input type="text" className="w-full px-4 py-2.5 bg-transparent text-sys-label placeholder-sys-label-tertiary focus:outline-none"
                                                        value={loanFormData.Description} onChange={(e) => setLoanFormData({ ...loanFormData, Description: e.target.value })} placeholder="Optional" />
                                                </div>
                                            </div>

                                            <button type="submit" disabled={loanSubmitting}
                                                className="w-full bg-sys-blue text-white font-semibold py-3 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                                {loanSubmitting ? (
                                                    <><Spinner /> Adding...</>
                                                ) : (
                                                    <><Plus className="w-5 h-5" /> Add Transaction</>
                                                )}
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                {/* People List */}
                                <div className="lg:col-span-2 space-y-4">
                                    {loansSummary.length === 0 ? (
                                        <div className="apple-card p-12 text-center">
                                            <div className="w-14 h-14 bg-sys-elevated rounded-2xl flex items-center justify-center mx-auto mb-3">
                                                <Banknote className="w-7 h-7 text-sys-label-tertiary" />
                                            </div>
                                            <p className="text-sys-label-secondary text-sm">No loan records yet</p>
                                        </div>
                                    ) : (
                                        loansSummary.map(({ person, balance }) => {
                                            const personTxns = getPersonTransactions(person);
                                            const totalLentToPerson = personTxns.filter(t => t.TransactionType === 'LENT' || t.TransactionType === 'ADDITIONAL_LOAN').reduce((s, t) => s + parseFloat(t.Amount || '0'), 0);
                                            const totalReceived = personTxns.filter(t => t.TransactionType === 'RECEIVED').reduce((s, t) => s + parseFloat(t.Amount || '0'), 0);
                                            const repaymentPercent = totalLentToPerson > 0 ? Math.min((totalReceived / totalLentToPerson) * 100, 100) : 0;
                                            return (
                                                <div key={person} className="apple-card overflow-hidden">
                                                    <div className="px-5 py-4 border-b border-sys-separator">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-sys-blue/15 flex items-center justify-center text-sys-blue font-bold text-sm">
                                                                    {person.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-semibold text-sys-label">{person}</h3>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <div className="w-20 h-1.5 bg-sys-fill rounded-full overflow-hidden">
                                                                            <div className="h-full bg-sys-blue rounded-full transition-all duration-500" style={{ width: `${repaymentPercent}%` }} />
                                                                        </div>
                                                                        <span className="text-[10px] text-sys-label-tertiary">{repaymentPercent.toFixed(0)}% repaid</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <span className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
                                                                balance > 0 ? 'bg-sys-green/15 text-sys-green'
                                                                    : balance < 0 ? 'bg-sys-red/15 text-sys-red'
                                                                        : 'bg-sys-fill text-sys-label-secondary'
                                                            }`}>
                                                                {formatIndianCurrency(Math.abs(balance))}
                                                                <span className="text-[10px] ml-1 opacity-70">{balance > 0 ? 'owed' : balance < 0 ? 'overpaid' : 'settled'}</span>
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="p-2">
                                                        {personTxns.map((tx, idx) => {
                                                            const isLent = tx.TransactionType === 'LENT' || tx.TransactionType === 'ADDITIONAL_LOAN';
                                                            return (
                                                                <div key={idx} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
                                                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isLent ? 'bg-sys-blue' : 'bg-sys-green'}`} />
                                                                    <span className="text-xs text-sys-label-tertiary w-20 flex-shrink-0">{tx.Date}</span>
                                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                                                                        tx.TransactionType === 'LENT' ? 'bg-sys-blue/15 text-sys-blue'
                                                                            : tx.TransactionType === 'ADDITIONAL_LOAN' ? 'bg-sys-purple/15 text-sys-purple'
                                                                                : 'bg-sys-green/15 text-sys-green'
                                                                    }`}>
                                                                        {tx.TransactionType === 'LENT' ? 'Lent' : tx.TransactionType === 'ADDITIONAL_LOAN' ? 'Additional' : 'Received'}
                                                                    </span>
                                                                    <span className="text-xs text-sys-label-secondary flex-1 truncate">{tx.Description || '-'}</span>
                                                                    <span className={`text-sm font-bold tabular-nums ${isLent ? 'text-sys-blue' : 'text-sys-green'}`}>
                                                                        {isLent ? '+' : '-'}{formatIndianCurrency(parseFloat(tx.Amount || '0'))}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ EDIT MODAL ═══ */}
                    {editOpen && (
                        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in-fast">
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeEditModal} />
                            <div className="relative bg-sys-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md mx-0 sm:mx-4 p-6 animate-slide-up">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-sys-label">Edit Transaction</h3>
                                    <button onClick={closeEditModal} className="w-8 h-8 rounded-full bg-sys-fill/50 flex items-center justify-center">
                                        <X className="w-4 h-4 text-sys-label-secondary" />
                                    </button>
                                </div>

                                <form onSubmit={handleUpdate} className="space-y-4">
                                    {/* Income/Expense Segmented */}
                                    <div className="bg-sys-elevated rounded-xl p-1 flex">
                                        <button type="button" onClick={() => setEditIsIncome(false)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${!editIsIncome ? 'bg-sys-red text-white shadow-sm' : 'text-sys-label-secondary'}`}>
                                            Expense
                                        </button>
                                        <button type="button" onClick={() => setEditIsIncome(true)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${editIsIncome ? 'bg-sys-green text-white shadow-sm' : 'text-sys-label-secondary'}`}>
                                            Income
                                        </button>
                                    </div>

                                    <div className="apple-card overflow-hidden">
                                        <div>
                                            <label className="text-xs font-medium text-sys-label-secondary px-4 pt-3 block">Date</label>
                                            <input type="date" required className="w-full px-4 py-2.5 bg-transparent text-sys-label focus:outline-none"
                                                value={editData.Date} onChange={(e) => setEditData({ ...editData, Date: e.target.value })} style={{ colorScheme: 'dark' }} />
                                        </div>
                                        <div className="border-t border-sys-separator ml-4" />
                                        <div>
                                            <label className="text-xs font-medium text-sys-label-secondary px-4 pt-3 block">Account</label>
                                            <select required className="w-full px-4 py-2.5 bg-transparent text-sys-label focus:outline-none appearance-none cursor-pointer"
                                                value={editData.Account} onChange={(e) => setEditData({ ...editData, Account: e.target.value })}>
                                                {accountsList.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                                            </select>
                                        </div>
                                        {!editIsIncome && (
                                            <>
                                                <div className="border-t border-sys-separator ml-4" />
                                                <div className="animate-fade-in">
                                                    <label className="text-xs font-medium text-sys-label-secondary px-4 pt-3 block">Category</label>
                                                    <select required className="w-full px-4 py-2.5 bg-transparent text-sys-label focus:outline-none appearance-none cursor-pointer"
                                                        value={editData.Category} onChange={(e) => setEditData({ ...editData, Category: e.target.value })}>
                                                        <option value="">Select category</option>
                                                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                    </select>
                                                </div>
                                            </>
                                        )}
                                        <div className="border-t border-sys-separator ml-4" />
                                        <div>
                                            <label className="text-xs font-medium text-sys-label-secondary px-4 pt-3 block">Description</label>
                                            <input type="text" className="w-full px-4 py-2.5 bg-transparent text-sys-label placeholder-sys-label-tertiary focus:outline-none"
                                                value={editData.Description} onChange={(e) => setEditData({ ...editData, Description: e.target.value })} placeholder="Details" />
                                        </div>
                                        <div className="border-t border-sys-separator ml-4" />
                                        <div>
                                            <label className="text-xs font-medium text-sys-label-secondary px-4 pt-3 block">Amount</label>
                                            <input type="number" required step="0.01" min="0" className="w-full px-4 py-2.5 bg-transparent text-sys-label placeholder-sys-label-tertiary focus:outline-none"
                                                value={editData.Amount} onChange={(e) => setEditData({ ...editData, Amount: e.target.value })} placeholder="0.00" />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button type="button" onClick={closeEditModal}
                                            className="flex-1 py-3 rounded-xl bg-sys-elevated text-sys-label font-medium transition-all active:scale-[0.98]">
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={updating}
                                            className="flex-1 py-3 rounded-xl bg-sys-blue text-white font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
                                            {updating ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}
