import { useState, useEffect, FormEvent } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ExpenseData, LoanTransaction, TransferData } from '@/lib/google-sheet';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
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
    Wallet
} from 'lucide-react';

type Transaction = ExpenseData & { RowIndex?: number };
type LoanTx = LoanTransaction & { RowIndex?: number };

// Indian currency formatting utility
const formatIndianCurrency = (amount: number): string => {
    const isNegative = amount < 0;
    const absoluteAmount = Math.abs(amount);

    // Convert to string and split by decimal
    const [integerPart, decimalPart] = absoluteAmount.toFixed(2).split('.');

    // Add Indian comma formatting (last 3 digits, then every 2 digits)
    let formattedInteger = integerPart;
    if (integerPart.length > 3) {
        const lastThree = integerPart.slice(-3);
        const remaining = integerPart.slice(0, -3);

        // Add commas every 2 digits for the remaining part
        const formattedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
        formattedInteger = formattedRemaining + ',' + lastThree;
    }

    const formattedAmount = `₹${formattedInteger}.${decimalPart}`;
    return isNegative ? `-${formattedAmount}` : formattedAmount;
};

// Category icon mapping function
const getCategoryIcon = (category: string, isPositive: boolean = false) => {
    // Handle income/positive amounts
    if (isPositive) {
        return {
            icon: (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
            ),
            bgColor: 'bg-green-500/20'
        };
    }

    // Handle transfer categories
    if (category === 'Transfer Out') {
        return {
            icon: (
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
            ),
            bgColor: 'bg-red-500/20'
        };
    }

    if (category === 'Transfer In') {
        return {
            icon: (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8l4 4m0 0l4-4m-4 4v12" />
                </svg>
            ),
            bgColor: 'bg-green-500/20'
        };
    }

    // Category-specific icons
    const categoryMap: { [key: string]: { icon: JSX.Element; bgColor: string } } = {
        'Food & Dining': {
            icon: <UtensilsCrossed className="w-5 h-5 text-orange-500" />,
            bgColor: 'bg-orange-500/20'
        },
        'Transportation': {
            icon: <Car className="w-5 h-5 text-blue-500" />,
            bgColor: 'bg-blue-500/20'
        },
        'Shopping': {
            icon: <ShoppingBag className="w-5 h-5 text-pink-500" />,
            bgColor: 'bg-pink-500/20'
        },
        'Entertainment': {
            icon: <Film className="w-5 h-5 text-purple-500" />,
            bgColor: 'bg-purple-500/20'
        },
        'Bills & Utilities': {
            icon: <Zap className="w-5 h-5 text-yellow-500" />,
            bgColor: 'bg-yellow-500/20'
        },
        'Healthcare': {
            icon: <Heart className="w-5 h-5 text-red-500" />,
            bgColor: 'bg-red-500/20'
        },
        'Education': {
            icon: <GraduationCap className="w-5 h-5 text-indigo-500" />,
            bgColor: 'bg-indigo-500/20'
        },
        'Groceries': {
            icon: <ShoppingCart className="w-5 h-5 text-green-500" />,
            bgColor: 'bg-green-600/20'
        },
        'Rent': {
            icon: <HomeIcon className="w-5 h-5 text-amber-600" />,
            bgColor: 'bg-amber-600/20'
        },
        'Insurance': {
            icon: <Shield className="w-5 h-5 text-teal-500" />,
            bgColor: 'bg-teal-500/20'
        },
        'Personal Care': {
            icon: <Sparkles className="w-5 h-5 text-pink-400" />,
            bgColor: 'bg-pink-400/20'
        },
        'Travel': {
            icon: <Plane className="w-5 h-5 text-cyan-500" />,
            bgColor: 'bg-cyan-500/20'
        },
        'Subscriptions': {
            icon: <RefreshCw className="w-5 h-5 text-violet-500" />,
            bgColor: 'bg-violet-500/20'
        },
        'Gifts': {
            icon: <Gift className="w-5 h-5 text-rose-500" />,
            bgColor: 'bg-rose-500/20'
        },
        'Other': {
            icon: <Wallet className="w-5 h-5 text-gray-500" />,
            bgColor: 'bg-gray-500/20'
        }
    };

    return categoryMap[category] || categoryMap['Other'];
};

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
        Date: '',
        Account: '',
        Category: '',
        Description: '',
        Amount: '',
    });
    const [editIsIncome, setEditIsIncome] = useState(false);
    const [editRowIndex, setEditRowIndex] = useState<number | null>(null);
    const [updating, setUpdating] = useState(false);

    // Analytics tab state
    const [activeTab, setActiveTab] = useState<'transactions' | 'transfers' | 'analytics' | 'loans'>('transactions');
    const [selectedPeriod, setSelectedPeriod] = useState<string>('overall');

    // Loans state
    const [loans, setLoans] = useState<LoanTx[]>([]);
    const [loansLoading, setLoansLoading] = useState(false);
    const [loanFormData, setLoanFormData] = useState<LoanTransaction>({
        Date: new Date().toISOString().split('T')[0],
        PersonName: '',
        TransactionType: 'LENT',
        Amount: '',
        Description: '',
    });
    const [loanSubmitting, setLoanSubmitting] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState<string>('');

    // Transfer state
    const [transferFormData, setTransferFormData] = useState<TransferData>({
        Date: new Date().toISOString().split('T')[0],
        FromAccount: 'AXIS Bank',
        ToAccount: 'SBI Bank',
        Amount: '',
        Description: '',
    });
    const [transferSubmitting, setTransferSubmitting] = useState(false);

    // Transaction display state
    const [showAllTransactions, setShowAllTransactions] = useState(false);
    const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('All Accounts');

    // Redirect to login if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    // Fetch expenses
    useEffect(() => {
        if (status === 'authenticated') {
            fetchExpenses();
            fetchLoansData();
        }
    }, [status]);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await fetch('/api/expenses/get');

            if (!response.ok) {
                throw new Error('Failed to fetch expenses');
            }

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
            // Prepare data with correct amount sign
            const amount = parseFloat(formData.Amount);
            const signedAmount = isIncome ? Math.abs(amount) : -Math.abs(amount);

            const dataToSend = {
                ...formData,
                Amount: signedAmount.toString(),
                Category: isIncome ? 'Income' : formData.Category,
            };

            const response = await fetch('/api/expenses/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSend),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add transaction');
            }

            // Reset form
            setFormData({
                Date: new Date().toISOString().split('T')[0],
                Account: 'AXIS Bank',
                Category: '',
                Description: '',
                Amount: '',
            });
            setIsIncome(false);

            // Refresh expenses list
            await fetchExpenses();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add transaction');
        } finally {
            setSubmitting(false);
        }
    };

    // Fetch loans
    const fetchLoansData = async () => {
        try {
            setLoansLoading(true);
            const response = await fetch('/api/loans/get');

            if (!response.ok) {
                throw new Error('Failed to fetch loans');
            }

            const data = await response.json();
            setLoans(data);
        } catch (err) {
            console.error('Error fetching loans:', err);
            // Don't set error for loans, just log it
        } finally {
            setLoansLoading(false);
        }
    };

    // Handle loan transaction submit
    const handleLoanSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoanSubmitting(true);
        setError('');

        try {
            const response = await fetch('/api/loans/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loanFormData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add loan transaction');
            }

            // Reset form
            setLoanFormData({
                Date: new Date().toISOString().split('T')[0],
                PersonName: '',
                TransactionType: 'LENT',
                Amount: '',
                Description: '',
            });
            setSelectedPerson('');

            // Refresh loans list
            await fetchLoansData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add loan transaction');
        } finally {
            setLoanSubmitting(false);
        }
    };

    // Handle transfer form submission
    const handleTransferSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setTransferSubmitting(true);
        setError('');

        try {
            const response = await fetch('/api/transfers/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(transferFormData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to record transfer');
            }

            // Reset form
            setTransferFormData({
                Date: new Date().toISOString().split('T')[0],
                FromAccount: 'AXIS Bank',
                ToAccount: 'SBI Bank',
                Amount: '',
                Description: '',
            });

            // Refresh transactions list
            await fetchExpenses();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to record transfer');
        } finally {
            setTransferSubmitting(false);
        }
    };

    // Filter transactions by account
    const getFilteredTransactions = () => {
        let filtered = expenses;

        // Apply account filter
        if (selectedAccountFilter !== 'All Accounts') {
            filtered = filtered.filter(expense => expense.Account === selectedAccountFilter);
        }

        // Apply view limit
        const sortedTransactions = filtered.slice().reverse();
        return showAllTransactions ? sortedTransactions : sortedTransactions.slice(0, 10);
    };

    // Calculate account balances
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

    // Get available months from expenses
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

    // Filter expenses by selected period
    const getFilteredExpenses = () => {
        if (selectedPeriod === 'overall') {
            return expenses;
        }
        return expenses.filter(exp => {
            if (!exp.Date) return false;
            const date = new Date(exp.Date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            return monthKey === selectedPeriod;
        });
    };

    // Calculate category distribution
    const getCategoryDistribution = () => {
        const filtered = getFilteredExpenses();
        const categoryTotals: { [key: string]: number } = {};
        let totalExpenses = 0;

        filtered.forEach(exp => {
            const amount = parseFloat(exp.Amount || '0');
            // Exclude income, transfers, and only count negative amounts (actual expenses)
            if (amount < 0 && exp.Category &&
                exp.Category !== 'Income' &&
                exp.Category !== 'Transfer Out' &&
                exp.Category !== 'Transfer In') {
                categoryTotals[exp.Category] = (categoryTotals[exp.Category] || 0) + Math.abs(amount);
                totalExpenses += Math.abs(amount);
            }
        });

        return Object.entries(categoryTotals)
            .map(([category, amount]) => ({
                category,
                amount,
                percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
            }))
            .sort((a, b) => b.amount - a.amount);
    };

    // Calculate account distribution
    const getAccountDistribution = () => {
        const filtered = getFilteredExpenses();
        const accountTotals: { [key: string]: { income: number; expenses: number } } = {};

        filtered.forEach(exp => {
            const amount = parseFloat(exp.Amount || '0');
            if (!accountTotals[exp.Account]) {
                accountTotals[exp.Account] = { income: 0, expenses: 0 };
            }
            if (amount >= 0) {
                accountTotals[exp.Account].income += amount;
            } else {
                accountTotals[exp.Account].expenses += Math.abs(amount);
            }
        });

        return Object.entries(accountTotals).map(([account, data]) => ({
            account,
            income: data.income,
            expenses: data.expenses,
            net: data.income - data.expenses,
        }));
    };

    // Calculate income vs expenses summary
    const getSummary = () => {
        const filtered = getFilteredExpenses();
        let totalIncome = 0;
        let totalExpenses = 0;

        filtered.forEach(exp => {
            const amount = parseFloat(exp.Amount || '0');
            // Exclude transfer transactions from income/expense calculations
            if (exp.Category !== 'Transfer In' && exp.Category !== 'Transfer Out') {
                if (amount >= 0) {
                    totalIncome += amount;
                } else {
                    totalExpenses += Math.abs(amount);
                }
            }
        });

        return {
            totalIncome,
            totalExpenses,
            netSavings: totalIncome - totalExpenses,
            savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
        };
    };

    const availableMonths = getAvailableMonths();
    const categoryDistribution = getCategoryDistribution();
    const accountDistribution = getAccountDistribution();
    const summary = getSummary();

    // Calculate daily expenses for chart with per-account breakdown
    const getDailyExpenses = () => {
        const filtered = getFilteredExpenses();
        if (filtered.length === 0) return [];

        const accounts = ['AXIS Bank', 'SBI Bank', 'Credit Card', 'Cash', 'Mutual Fund'];
        const dailyData: { [key: string]: any } = {};

        // Collect all transaction data
        filtered.forEach(exp => {
            if (!exp.Date) return;

            const date = exp.Date;
            const amount = parseFloat(exp.Amount || '0');
            const account = exp.Account;

            // Exclude transfer transactions from daily chart
            if (exp.Category !== 'Transfer In' && exp.Category !== 'Transfer Out') {
                if (!dailyData[date]) {
                    dailyData[date] = { date, total: 0 };
                    accounts.forEach(acc => {
                        dailyData[date][acc] = 0;
                    });
                }

                // Only count expenses (negative amounts)
                if (amount < 0) {
                    const absAmount = Math.abs(amount);
                    dailyData[date].total += absAmount;
                    if (accounts.includes(account)) {
                        dailyData[date][account] += absAmount;
                    }
                }
            }
        });

        // Find min and max dates
        const dates = Object.keys(dailyData).sort();
        if (dates.length === 0) return [];

        const minDate = new Date(dates[0]);
        const maxDate = new Date(dates[dates.length - 1]);

        // Fill in missing dates
        const allDates: any[] = [];
        const currentDate = new Date(minDate);

        while (currentDate <= maxDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const data = dailyData[dateStr];

            const dataPoint: any = {
                date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                fullDate: dateStr,
                total: data ? data.total : 0,
            };

            accounts.forEach(account => {
                dataPoint[account] = data ? data[account] : 0;
            });

            allDates.push(dataPoint);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return allDates;
    };

    const dailyExpensesData = getDailyExpenses();

    // Calculate loans summary per person
    const getLoansSummary = () => {
        const personBalances: { [key: string]: number } = {};

        loans.forEach(loan => {
            const amount = parseFloat(loan.Amount || '0');
            if (!personBalances[loan.PersonName]) {
                personBalances[loan.PersonName] = 0;
            }

            // LENT and ADDITIONAL_LOAN increase the amount owed to you (positive)
            // RECEIVED decreases the amount owed (negative)
            if (loan.TransactionType === 'LENT' || loan.TransactionType === 'ADDITIONAL_LOAN') {
                personBalances[loan.PersonName] += amount;
            } else if (loan.TransactionType === 'RECEIVED') {
                personBalances[loan.PersonName] -= amount;
            }
        });

        return Object.entries(personBalances)
            .map(([person, balance]) => ({ person, balance }))
            .sort((a, b) => b.balance - a.balance);
    };

    // Get transactions for a specific person
    const getPersonTransactions = (personName: string) => {
        return loans
            .filter(loan => loan.PersonName === personName)
            .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
    };

    // Get unique person names
    const getUniquePersons = () => {
        const persons = new Set<string>();
        loans.forEach(loan => {
            if (loan.PersonName) {
                persons.add(loan.PersonName);
            }
        });
        return Array.from(persons).sort();
    };

    const loansSummary = getLoansSummary();
    const totalLent = loansSummary.reduce((sum, item) => sum + Math.max(0, item.balance), 0);
    const uniquePersons = getUniquePersons();

    // Open edit modal with selected transaction
    const openEditModal = (tx: Transaction) => {
        const numericAmount = parseFloat(tx.Amount || '0');
        setEditRowIndex(typeof tx.RowIndex === 'number' ? tx.RowIndex : null);
        setEditData({
            Date: tx.Date,
            Account: tx.Account,
            Category: tx.Category,
            Description: tx.Description,
            Amount: Math.abs(numericAmount).toString(),
        });
        setEditIsIncome(numericAmount >= 0);
        setEditOpen(true);
    };

    const closeEditModal = () => {
        setEditOpen(false);
        setUpdating(false);
    };

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
                expenseData: {
                    ...editData,
                    Amount: signedAmount.toString(),
                    Category: editIsIncome ? 'Income' : editData.Category,
                },
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
            await fetchExpenses();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update transaction');
        } finally {
            setUpdating(false);
        }
    };

    if (status === 'loading' || (status === 'authenticated' && loading && expenses.length === 0)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
                    <p className="mt-4 text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        return null;
    }

    return (
        <>
            <Head>
                <title>Dashboard - Expense Tracker</title>
            </Head>
            <div className="min-h-screen bg-gray-900">
                {/* Header */}
                <header className="bg-gray-800 shadow-lg border-b border-gray-700">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-100">Expense Tracker</h1>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-400">{session?.user?.email}</span>
                            <button
                                onClick={() => signOut()}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Tab Navigation */}
                    <div className="mb-6">
                        <div className="border-b border-gray-700">
                            <nav className="-mb-px flex space-x-4 sm:space-x-8">
                                <button
                                    onClick={() => setActiveTab('transactions')}
                                    className={`${activeTab === 'transactions'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                                >
                                    Transactions
                                </button>
                                <button
                                    onClick={() => setActiveTab('transfers')}
                                    className={`${activeTab === 'transfers'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                                >
                                    Transfers
                                </button>
                                <button
                                    onClick={() => setActiveTab('analytics')}
                                    className={`${activeTab === 'analytics'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                                >
                                    Analytics
                                </button>
                                <button
                                    onClick={() => setActiveTab('loans')}
                                    className={`${activeTab === 'loans'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                                >
                                    Loans
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 rounded-md bg-red-900/50 border border-red-700 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-red-200">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'transactions' && (
                        <>
                            {/* Dashboard Header */}
                            <div className="mb-8">
                                {/* Large Balance Display */}
                                <div className="text-left mb-6">
                                    <h1 className="text-5xl font-bold text-white mb-2">
                                        {formatIndianCurrency(totalBalance)}
                                    </h1>
                                    <p className="text-gray-400 text-lg">Total Balance</p>
                                    <div className="flex items-center mt-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                        <span className="text-sm text-gray-400">Open an account or deposit</span>
                                    </div>
                                </div>

                                {/* Income/Expenses Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    {/* Income Card */}
                                    <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-green-900/40 via-green-800/30 to-green-900/40 border border-green-700/30 backdrop-blur-sm">
                                        <div className="relative z-10">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <p className="text-green-300/70 text-sm mb-2">Income</p>
                                                    <p className="text-green-400 text-3xl font-bold">
                                                        {formatIndianCurrency(
                                                            expenses
                                                                .filter(expense => parseFloat(expense.Amount) > 0)
                                                                .reduce((sum, expense) => sum + parseFloat(expense.Amount), 0)
                                                        )}
                                                    </p>
                                                    <p className="text-green-300/50 text-xs mt-2">
                                                        ₹ {expenses.filter(expense => parseFloat(expense.Amount) > 0).length} transactions
                                                    </p>
                                                </div>
                                                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                                    </svg>
                                                </div>
                                            </div>
                                            {/* Sparkline placeholder */}
                                            <div className="mt-6">
                                                <svg className="w-full h-16" viewBox="0 0 200 50" preserveAspectRatio="none">
                                                    <path
                                                        d="M 0 25 Q 20 20, 40 22 T 80 18 T 120 25 T 160 20 T 200 23"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        className="text-green-500/40"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Spending Card */}
                                    <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-red-900/40 via-red-800/30 to-red-900/40 border border-red-700/30 backdrop-blur-sm">
                                        <div className="relative z-10">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <p className="text-red-300/70 text-sm mb-2">Spending</p>
                                                    <p className="text-red-400 text-3xl font-bold">
                                                        {formatIndianCurrency(
                                                            Math.abs(expenses
                                                                .filter(expense => parseFloat(expense.Amount) < 0)
                                                                .reduce((sum, expense) => sum + parseFloat(expense.Amount), 0))
                                                        )}
                                                    </p>
                                                    <p className="text-red-300/50 text-xs mt-2">
                                                        ₹ {expenses.filter(expense => parseFloat(expense.Amount) < 0).length} transactions
                                                    </p>
                                                </div>
                                                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                                                    </svg>
                                                </div>
                                            </div>
                                            {/* Sparkline placeholder */}
                                            <div className="mt-6">
                                                <svg className="w-full h-16" viewBox="0 0 200 50" preserveAspectRatio="none">
                                                    <path
                                                        d="M 0 30 Q 20 25, 40 28 T 80 23 T 120 30 T 160 25 T 200 27"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        className="text-red-500/40"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Your Assets Section */}
                                <div className="mb-8">
                                    <h2 className="text-xl font-semibold text-white mb-4">Your Assets</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                        {Object.entries(balances).map(([account, balance]) => (
                                            <div key={account} className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                        </svg>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`w-2 h-2 rounded-full ${balance >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                    </div>
                                                </div>
                                                <h3 className="text-gray-300 text-sm font-medium mb-1">{account}</h3>
                                                <p className={`text-lg font-semibold ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>
                                                    {formatIndianCurrency(balance)}
                                                </p>
                                                <p className="text-gray-500 text-xs mt-1">Account Balance</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'transactions' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
                            {/* Add Transaction Form */}
                            <div className="lg:col-span-1">
                                <div className="bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl rounded-2xl p-6 border border-gray-700/50">
                                    <h2 className="text-2xl font-bold text-white mb-6">Add Transaction</h2>
                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        {/* Is it Income Toggle */}
                                        <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl border border-gray-600/50">
                                            <label htmlFor="isIncome" className="text-base font-medium text-gray-200 select-none">
                                                Is it an Income
                                            </label>
                                            <button
                                                type="button"
                                                id="isIncome"
                                                role="switch"
                                                aria-checked={isIncome}
                                                onClick={() => setIsIncome(!isIncome)}
                                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${isIncome ? 'bg-green-500' : 'bg-gray-600'
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${isIncome ? 'translate-x-7' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                        </div>

                                        <div>
                                            <label htmlFor="date" className="block text-sm font-semibold text-gray-300 mb-2">
                                                Date
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    id="date"
                                                    required
                                                    className="w-full px-3 sm:px-4 py-3 bg-gray-700/50 border border-gray-600/50 text-gray-100 text-sm sm:text-base rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder-gray-500 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                                                    value={formData.Date}
                                                    onChange={(e) => setFormData({ ...formData, Date: e.target.value })}
                                                    style={{ colorScheme: 'dark' }}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="account" className="block text-sm font-semibold text-gray-300 mb-2">
                                                    Account
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        id="account"
                                                        required
                                                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                                                        value={formData.Account}
                                                        onChange={(e) => setFormData({ ...formData, Account: e.target.value })}
                                                    >
                                                        <option value="AXIS Bank">AXIS Bank</option>
                                                        <option value="SBI Bank">SBI Bank</option>
                                                        <option value="Credit Card">Credit Card</option>
                                                        <option value="Cash">Cash</option>
                                                        <option value="Mutual Fund">Mutual Fund</option>
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Category - Only show if NOT income */}
                                            {!isIncome && (
                                                <div>
                                                    <label htmlFor="category" className="block text-sm font-semibold text-gray-300 mb-2">
                                                        Category
                                                    </label>
                                                    <div className="relative">
                                                        <select
                                                            id="category"
                                                            required
                                                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                                                            value={formData.Category}
                                                            onChange={(e) => setFormData({ ...formData, Category: e.target.value })}
                                                        >
                                                            <option value="">Select a category</option>
                                                            <option value="Food & Dining">Food & Dining</option>
                                                            <option value="Transportation">Transportation</option>
                                                            <option value="Shopping">Shopping</option>
                                                            <option value="Entertainment">Entertainment</option>
                                                            <option value="Bills & Utilities">Bills & Utilities</option>
                                                            <option value="Healthcare">Healthcare</option>
                                                            <option value="Education">Education</option>
                                                            <option value="Groceries">Groceries</option>
                                                            <option value="Rent">Rent</option>
                                                            <option value="Insurance">Insurance</option>
                                                            <option value="Personal Care">Personal Care</option>
                                                            <option value="Travel">Travel</option>
                                                            <option value="Subscriptions">Subscriptions</option>
                                                            <option value="Gifts">Gifts</option>
                                                            <option value="Other">Other</option>
                                                        </select>
                                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="description" className="block text-sm font-semibold text-gray-300 mb-2">
                                                Description
                                            </label>
                                            <input
                                                type="text"
                                                id="description"
                                                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder-gray-500"
                                                value={formData.Description}
                                                onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                                                placeholder="Optional details"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="amount" className="block text-sm font-semibold text-gray-300 mb-2">
                                                Amount
                                            </label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 text-lg font-semibold">
                                                    ₹
                                                </span>
                                                <input
                                                    type="number"
                                                    id="amount"
                                                    required
                                                    step="0.01"
                                                    min="0"
                                                    className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600/50 text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder-gray-500 text-lg font-medium"
                                                    value={formData.Amount}
                                                    onChange={(e) => setFormData({ ...formData, Amount: e.target.value })}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-indigo-500/50 mt-6"
                                        >
                                            {submitting ? (
                                                <span className="flex items-center justify-center">
                                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Adding...
                                                </span>
                                            ) : (
                                                <span className="flex items-center justify-center">
                                                    {isIncome ? (
                                                        <>
                                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                            </svg>
                                                            Add Income
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                            </svg>
                                                            Add Expense
                                                        </>
                                                    )}
                                                </span>
                                            )}
                                        </button>
                                    </form>
                                </div>
                            </div>

                            {/* Latest Transactions */}
                            <div className="lg:col-span-2">
                                <div className="bg-gray-800 rounded-xl border border-gray-700">
                                    <div className="px-4 sm:px-6 py-4 border-b border-gray-700">
                                        <div className="flex items-center justify-between mb-3">
                                            <h2 className="text-lg sm:text-xl font-semibold text-white">Latest transactions</h2>
                                            <button
                                                onClick={() => setShowAllTransactions(!showAllTransactions)}
                                                className="text-indigo-400 text-xs sm:text-sm hover:text-indigo-300 transition-colors"
                                            >
                                                {showAllTransactions ? 'Show less' : 'View all'}
                                            </button>
                                        </div>

                                        {/* Account Filter */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-400">Filter by account:</span>
                                                <select
                                                    value={selectedAccountFilter}
                                                    onChange={(e) => {
                                                        setSelectedAccountFilter(e.target.value);
                                                        setShowAllTransactions(false); // Reset to limited view when filter changes
                                                    }}
                                                    className="text-xs bg-gray-700 border border-gray-600 text-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    <option value="All Accounts">All Accounts</option>
                                                    <option value="AXIS Bank">AXIS Bank</option>
                                                    <option value="SBI Bank">SBI Bank</option>
                                                    <option value="Credit Card">Credit Card</option>
                                                    <option value="Cash">Cash</option>
                                                    <option value="Mutual Fund">Mutual Fund</option>
                                                </select>
                                            </div>
                                            {!loading && getFilteredTransactions().length > 0 && (
                                                <span className="text-xs text-gray-400">
                                                    Showing {getFilteredTransactions().length}
                                                    {selectedAccountFilter === 'All Accounts'
                                                        ? ` of ${expenses.length} transactions`
                                                        : ` transactions for ${selectedAccountFilter}`
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-4 sm:p-6">
                                        {loading ? (
                                            <div className="flex justify-center py-8">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                            </div>
                                        ) : getFilteredTransactions().length === 0 ? (
                                            <p className="text-gray-400 text-center py-8">
                                                {selectedAccountFilter === 'All Accounts'
                                                    ? 'No transactions yet'
                                                    : `No transactions found for ${selectedAccountFilter}`
                                                }
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                {getFilteredTransactions().map((expense, index) => {
                                                    const amount = parseFloat(expense.Amount || '0');
                                                    const isPositive = amount >= 0;
                                                    return (
                                                        <div key={index} className="flex items-start gap-3 p-3 sm:p-4 hover:bg-gray-700/50 rounded-lg transition-colors group">
                                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                                <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${getCategoryIcon(expense.Category, isPositive).bgColor}`}>
                                                                    {getCategoryIcon(expense.Category, isPositive).icon}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-white text-sm sm:text-base truncate">
                                                                        {isPositive ? 'Income payment' : expense.Description || expense.Category}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                        <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-full whitespace-nowrap">
                                                                            {expense.Account}
                                                                        </span>
                                                                        <span className="text-xs text-gray-400 whitespace-nowrap">
                                                                            {new Date(expense.Date).toLocaleDateString('en-IN', {
                                                                                day: 'numeric',
                                                                                month: 'short'
                                                                            })}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                                <p className={`font-semibold text-sm sm:text-base whitespace-nowrap ${isPositive ? 'text-green-500' : 'text-white'
                                                                    }`}>
                                                                    {isPositive ? '+' : '-'}{formatIndianCurrency(Math.abs(amount))}
                                                                </p>
                                                                <button
                                                                    onClick={() => openEditModal(expense)}
                                                                    className="hidden sm:block opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-400 transition-all p-1"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Transfer Tab */}
                    {activeTab === 'transfers' && (
                        <div className="max-w-2xl mx-auto">
                            <div className="bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl rounded-2xl p-6 border border-gray-700/50">
                                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                                    <svg className="w-6 h-6 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                    Transfer Between Accounts
                                </h2>

                                {error && (
                                    <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 text-red-200 rounded-lg">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleTransferSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Date */}
                                        <div>
                                            <label htmlFor="transferDate" className="block text-sm font-medium text-gray-300 mb-1">
                                                Date
                                            </label>
                                            <input
                                                type="date"
                                                id="transferDate"
                                                value={transferFormData.Date}
                                                onChange={(e) => setTransferFormData({ ...transferFormData, Date: e.target.value })}
                                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                required
                                            />
                                        </div>

                                        {/* Amount */}
                                        <div>
                                            <label htmlFor="transferAmount" className="block text-sm font-medium text-gray-300 mb-1">
                                                Amount (₹)
                                            </label>
                                            <input
                                                type="number"
                                                id="transferAmount"
                                                step="0.01"
                                                min="0.01"
                                                value={transferFormData.Amount}
                                                onChange={(e) => setTransferFormData({ ...transferFormData, Amount: e.target.value })}
                                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* From Account */}
                                        <div>
                                            <label htmlFor="fromAccount" className="block text-sm font-medium text-gray-300 mb-1">
                                                From Account
                                            </label>
                                            <select
                                                id="fromAccount"
                                                value={transferFormData.FromAccount}
                                                onChange={(e) => setTransferFormData({ ...transferFormData, FromAccount: e.target.value })}
                                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                required
                                            >
                                                <option value="AXIS Bank">AXIS Bank</option>
                                                <option value="SBI Bank">SBI Bank</option>
                                                <option value="Credit Card">Credit Card</option>
                                                <option value="Cash">Cash</option>
                                                <option value="Mutual Fund">Mutual Fund</option>
                                            </select>
                                        </div>

                                        {/* To Account */}
                                        <div>
                                            <label htmlFor="toAccount" className="block text-sm font-medium text-gray-300 mb-1">
                                                To Account
                                            </label>
                                            <select
                                                id="toAccount"
                                                value={transferFormData.ToAccount}
                                                onChange={(e) => setTransferFormData({ ...transferFormData, ToAccount: e.target.value })}
                                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                required
                                            >
                                                <option value="AXIS Bank">AXIS Bank</option>
                                                <option value="SBI Bank">SBI Bank</option>
                                                <option value="Credit Card">Credit Card</option>
                                                <option value="Cash">Cash</option>
                                                <option value="Mutual Fund">Mutual Fund</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label htmlFor="transferDescription" className="block text-sm font-medium text-gray-300 mb-1">
                                            Description (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            id="transferDescription"
                                            value={transferFormData.Description}
                                            onChange={(e) => setTransferFormData({ ...transferFormData, Description: e.target.value })}
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            placeholder="Optional description for this transfer"
                                        />
                                    </div>

                                    {/* Transfer Direction Indicator */}
                                    <div className="bg-gray-700/50 rounded-lg p-4">
                                        <div className="flex items-center justify-center space-x-4 text-sm text-gray-300">
                                            <span className="font-medium">{transferFormData.FromAccount}</span>
                                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                            </svg>
                                            <span className="font-medium">{transferFormData.ToAccount}</span>
                                        </div>
                                        {transferFormData.Amount && (
                                            <div className="text-center mt-2">
                                                <span className="text-lg font-bold text-indigo-400">
                                                    {formatIndianCurrency(parseFloat(transferFormData.Amount))}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={transferSubmitting || transferFormData.FromAccount === transferFormData.ToAccount}
                                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center"
                                    >
                                        {transferSubmitting ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Processing Transfer...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                </svg>
                                                Record Transfer
                                            </>
                                        )}
                                    </button>

                                    {transferFormData.FromAccount === transferFormData.ToAccount && (
                                        <p className="text-sm text-yellow-400 text-center">
                                            ⚠️ Please select different accounts for the transfer
                                        </p>
                                    )}
                                </form>

                                <div className="mt-6 p-4 bg-blue-900/30 border border-blue-500/30 rounded-lg">
                                    <h3 className="text-sm font-medium text-blue-300 mb-2">How transfers work:</h3>
                                    <ul className="text-xs text-blue-200 space-y-1">
                                        <li>• Creates two transactions: one debit from source account, one credit to destination account</li>
                                        <li>• Both transactions are categorized as "Transfer Out" and "Transfer In"</li>
                                        <li>• Account balances are automatically updated</li>
                                        <li>• Transfer transactions appear in your transaction history</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Analytics Tab */}
                    {activeTab === 'analytics' && (
                        <div className="space-y-6">
                            {/* Period Selector */}
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-semibold text-gray-100">Expenditure Analysis</h2>
                                <div>
                                    <label htmlFor="period" className="mr-2 text-sm font-medium text-gray-300">
                                        Period:
                                    </label>
                                    <select
                                        id="period"
                                        value={selectedPeriod}
                                        onChange={(e) => setSelectedPeriod(e.target.value)}
                                        className="px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="overall">Overall</option>
                                        {availableMonths.map(month => {
                                            const [year, monthNum] = month.split('-');
                                            const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                                            const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                                            return (
                                                <option key={month} value={month}>
                                                    {monthName}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-gray-800 overflow-hidden shadow rounded-lg">
                                    <div className="px-4 py-5 sm:p-6">
                                        <dt className="text-sm font-medium text-gray-400 truncate">Total Income</dt>
                                        <dd className="mt-1 text-2xl font-semibold text-green-600">
                                            {formatIndianCurrency(summary.totalIncome)}
                                        </dd>
                                    </div>
                                </div>
                                <div className="bg-gray-800 overflow-hidden shadow rounded-lg">
                                    <div className="px-4 py-5 sm:p-6">
                                        <dt className="text-sm font-medium text-gray-400 truncate">Total Expenses</dt>
                                        <dd className="mt-1 text-2xl font-semibold text-red-600">
                                            {formatIndianCurrency(summary.totalExpenses)}
                                        </dd>
                                    </div>
                                </div>
                                <div className="bg-gray-800 overflow-hidden shadow rounded-lg">
                                    <div className="px-4 py-5 sm:p-6">
                                        <dt className="text-sm font-medium text-gray-400 truncate">Net Savings</dt>
                                        <dd className={`mt-1 text-2xl font-semibold ${summary.netSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatIndianCurrency(summary.netSavings)}
                                        </dd>
                                    </div>
                                </div>
                                <div className="bg-indigo-600 overflow-hidden shadow rounded-lg">
                                    <div className="px-4 py-5 sm:p-6">
                                        <dt className="text-sm font-medium text-indigo-100 truncate">Savings Rate</dt>
                                        <dd className="mt-1 text-2xl font-semibold text-white">
                                            {summary.savingsRate.toFixed(1)}%
                                        </dd>
                                    </div>
                                </div>
                            </div>

                            {/* Daily Expenses Chart */}
                            <div className="relative bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 rounded-2xl p-6 border border-gray-700/50 shadow-2xl overflow-hidden">
                                {/* Background decoration */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl"></div>
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl"></div>

                                <div className="relative z-10">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-1">Daily Expenses Trend by Account</h3>
                                            <p className="text-sm text-gray-400">Track your spending patterns across all accounts</p>
                                        </div>
                                    </div>

                                    {dailyExpensesData.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16">
                                            <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
                                                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                            </div>
                                            <p className="text-gray-400 text-center">No transaction data for this period</p>
                                            <p className="text-gray-500 text-sm text-center mt-1">Start adding expenses to see your trend</p>
                                        </div>
                                    ) : (
                                        <div className="bg-gray-900/30 rounded-xl p-4 backdrop-blur-sm border border-gray-700/30">
                                            <ResponsiveContainer width="100%" height={380}>
                                                <AreaChart data={dailyExpensesData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                                                    <defs>
                                                        {/* Gradients for each account */}
                                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                                                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                                                        </linearGradient>
                                                        <linearGradient id="colorAxis" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                                                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                                                        </linearGradient>
                                                        <linearGradient id="colorSBI" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2} />
                                                            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                                                        </linearGradient>
                                                        <linearGradient id="colorCredit" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                                                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                                                        </linearGradient>
                                                        <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                                                        </linearGradient>
                                                        <linearGradient id="colorMutual" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.2} />
                                                            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid
                                                        strokeDasharray="3 3"
                                                        stroke="#374151"
                                                        opacity={0.3}
                                                        vertical={false}
                                                    />
                                                    <XAxis
                                                        dataKey="date"
                                                        stroke="#6b7280"
                                                        style={{ fontSize: '11px', fontWeight: '500' }}
                                                        tick={{ fill: '#9ca3af' }}
                                                        axisLine={{ stroke: '#374151' }}
                                                        tickLine={{ stroke: '#374151' }}
                                                    />
                                                    <YAxis
                                                        stroke="#6b7280"
                                                        style={{ fontSize: '11px', fontWeight: '500' }}
                                                        tick={{ fill: '#9ca3af' }}
                                                        tickFormatter={(value) => `₹${value.toLocaleString()}`}
                                                        axisLine={{ stroke: '#374151' }}
                                                        tickLine={{ stroke: '#374151' }}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                                            border: '1px solid rgba(99, 102, 241, 0.3)',
                                                            borderRadius: '12px',
                                                            padding: '12px',
                                                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                                                            backdropFilter: 'blur(10px)'
                                                        }}
                                                        labelStyle={{
                                                            color: '#d1d5db',
                                                            fontWeight: '600',
                                                            marginBottom: '8px'
                                                        }}
                                                        content={(props: any) => {
                                                            if (!props.payload || props.payload.length === 0) return null;

                                                            const data = props.payload[0].payload;
                                                            const hasExpenses = data.total > 0;

                                                            if (!hasExpenses) {
                                                                return (
                                                                    <div style={{
                                                                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                                                        border: '1px solid rgba(99, 102, 241, 0.3)',
                                                                        borderRadius: '12px',
                                                                        padding: '12px',
                                                                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                                                                        backdropFilter: 'blur(10px)'
                                                                    }}>
                                                                        <p style={{ color: '#d1d5db', fontWeight: '600', marginBottom: '4px' }}>
                                                                            {props.label}
                                                                        </p>
                                                                        <p style={{ color: '#10b981', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                            <span style={{ fontSize: '18px' }}>🎉</span>
                                                                            No expenses today!
                                                                        </p>
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <div style={{
                                                                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                                                    borderRadius: '12px',
                                                                    padding: '12px',
                                                                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                                                                    backdropFilter: 'blur(10px)'
                                                                }}>
                                                                    <p style={{ color: '#d1d5db', fontWeight: '600', marginBottom: '8px' }}>
                                                                        {props.label}
                                                                    </p>
                                                                    {props.payload.map((entry: any, index: number) => {
                                                                        if (entry.value === 0) return null;
                                                                        return (
                                                                            <p key={index} style={{ color: entry.color, fontWeight: '500', marginBottom: '4px' }}>
                                                                                {entry.name}: {formatIndianCurrency(entry.value)}
                                                                            </p>
                                                                        );
                                                                    })}
                                                                </div>
                                                            );
                                                        }}
                                                        cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '5 5' }}
                                                    />
                                                    <Legend
                                                        verticalAlign="top"
                                                        height={36}
                                                        iconType="line"
                                                        wrapperStyle={{
                                                            paddingBottom: '20px',
                                                            fontSize: '12px',
                                                            fontWeight: '500'
                                                        }}
                                                    />

                                                    {/* Total line */}
                                                    <Area
                                                        type="monotone"
                                                        dataKey="total"
                                                        name="Total"
                                                        stroke="#6366f1"
                                                        strokeWidth={3}
                                                        fill="url(#colorTotal)"
                                                        strokeLinecap="round"
                                                    />

                                                    {/* Individual account lines */}
                                                    <Area
                                                        type="monotone"
                                                        dataKey="AXIS Bank"
                                                        name="AXIS Bank"
                                                        stroke="#10b981"
                                                        strokeWidth={2}
                                                        fill="url(#colorAxis)"
                                                        strokeLinecap="round"
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="SBI Bank"
                                                        name="SBI Bank"
                                                        stroke="#f59e0b"
                                                        strokeWidth={2}
                                                        fill="url(#colorSBI)"
                                                        strokeLinecap="round"
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="Credit Card"
                                                        name="Credit Card"
                                                        stroke="#ef4444"
                                                        strokeWidth={2}
                                                        fill="url(#colorCredit)"
                                                        strokeLinecap="round"
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="Cash"
                                                        name="Cash"
                                                        stroke="#8b5cf6"
                                                        strokeWidth={2}
                                                        fill="url(#colorCash)"
                                                        strokeLinecap="round"
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="Mutual Fund"
                                                        name="Mutual Fund"
                                                        stroke="#06b6d4"
                                                        strokeWidth={2}
                                                        fill="url(#colorMutual)"
                                                        strokeLinecap="round"
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Category Distribution */}
                            <div className="bg-gray-800 shadow rounded-lg p-4 sm:p-6">
                                <h3 className="text-lg font-semibold text-gray-100 mb-4">Expenses by Category</h3>
                                {categoryDistribution.length === 0 ? (
                                    <p className="text-gray-400 text-center py-8">No expense data for this period</p>
                                ) : (
                                    <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                                        <ResponsiveContainer width="100%" height={400}>
                                            <BarChart
                                                data={categoryDistribution.map(cat => ({
                                                    name: cat.category,
                                                    value: cat.amount,
                                                    percentage: cat.percentage
                                                }))}
                                                margin={{
                                                    top: 20,
                                                    right: 30,
                                                    left: 20,
                                                    bottom: 60
                                                }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                                <XAxis
                                                    dataKey="name"
                                                    angle={-45}
                                                    textAnchor="end"
                                                    height={100}
                                                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                                                />
                                                <YAxis
                                                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                                                    tickFormatter={(value) => `₹${value}`}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#1f2937',
                                                        border: '1px solid #374151',
                                                        borderRadius: '8px',
                                                        color: '#f3f4f6'
                                                    }}
                                                    formatter={(value: number, name: string, props: any) => [
                                                        `${formatIndianCurrency(value)} (${props.payload.percentage.toFixed(1)}%)`,
                                                        'Amount'
                                                    ]}
                                                    labelStyle={{ color: '#9ca3af' }}
                                                />
                                                <Bar
                                                    dataKey="value"
                                                    radius={[4, 4, 0, 0]}
                                                >
                                                    {categoryDistribution.map((entry, index) => {
                                                        const colors = [
                                                            '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
                                                            '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
                                                            '#f97316', '#84cc16', '#06b6d4', '#a855f7',
                                                            '#6366f1', '#8b5cf6', '#ec4899'
                                                        ];
                                                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                                    })}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>

                            {/* Account Distribution */}
                            <div className="relative bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden">
                                {/* Background decoration */}
                                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl"></div>

                                <div className="relative z-10">
                                    <div className="px-6 py-5 border-b border-gray-700/50">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-xl font-bold text-white mb-1">Account Breakdown</h3>
                                                <p className="text-sm text-gray-400">Income, expenses, and net balance per account</p>
                                            </div>
                                            <div className="hidden sm:flex items-center gap-4 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                                    <span className="text-gray-400">Income</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                    <span className="text-gray-400">Expenses</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Desktop Table View */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="min-w-full">
                                            <thead>
                                                <tr className="border-b border-gray-700/50">
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                        Account
                                                    </th>
                                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <span>Income</span>
                                                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <span>Expenses</span>
                                                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                        Net Balance
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {accountDistribution.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="px-6 py-12 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mb-3">
                                                                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                                    </svg>
                                                                </div>
                                                                <p className="text-gray-400 font-medium">No account data for this period</p>
                                                                <p className="text-gray-500 text-sm mt-1">Add transactions to see your breakdown</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    accountDistribution.map((acc, index) => (
                                                        <tr
                                                            key={acc.account}
                                                            className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors group"
                                                        >
                                                            <td className="px-6 py-5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center group-hover:from-indigo-500/30 group-hover:to-purple-500/30 transition-colors">
                                                                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                                        </svg>
                                                                    </div>
                                                                    <span className="text-base font-semibold text-white">{acc.account}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5 text-right">
                                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                                                                    <span className="text-base font-bold text-green-400">
                                                                        {formatIndianCurrency(acc.income)}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5 text-right">
                                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                                                                    <span className="text-base font-bold text-red-400">
                                                                        {formatIndianCurrency(acc.expenses)}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5 text-right">
                                                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-base ${acc.net >= 0
                                                                    ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-400'
                                                                    : 'bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/30 text-red-400'
                                                                    }`}>
                                                                    {acc.net >= 0 ? '↑' : '↓'}
                                                                    <span>{formatIndianCurrency(Math.abs(acc.net))}</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Card View */}
                                    <div className="md:hidden p-4 space-y-3">
                                        {accountDistribution.length === 0 ? (
                                            <div className="flex flex-col items-center py-8">
                                                <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mb-3">
                                                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                    </svg>
                                                </div>
                                                <p className="text-gray-400 font-medium text-center">No account data for this period</p>
                                                <p className="text-gray-500 text-sm mt-1 text-center">Add transactions to see your breakdown</p>
                                            </div>
                                        ) : (
                                            accountDistribution.map(acc => (
                                                <div key={acc.account} className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                                                            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                            </svg>
                                                        </div>
                                                        <span className="font-bold text-white text-base">{acc.account}</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                                                            <div className="text-green-300/70 text-xs mb-1 font-medium">Income</div>
                                                            <div className="text-green-400 font-bold text-sm">{formatIndianCurrency(acc.income)}</div>
                                                        </div>
                                                        <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                                                            <div className="text-red-300/70 text-xs mb-1 font-medium">Expenses</div>
                                                            <div className="text-red-400 font-bold text-sm">{formatIndianCurrency(acc.expenses)}</div>
                                                        </div>
                                                        <div className={`rounded-lg p-3 border ${acc.net >= 0
                                                            ? 'bg-green-500/10 border-green-500/20'
                                                            : 'bg-red-500/10 border-red-500/20'
                                                            }`}>
                                                            <div className={`text-xs mb-1 font-medium ${acc.net >= 0 ? 'text-green-300/70' : 'text-red-300/70'}`}>Net</div>
                                                            <div className={`font-bold text-sm ${acc.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                {formatIndianCurrency(acc.net)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loans Tab */}
                    {activeTab === 'loans' && (
                        <div className="space-y-6">
                            {/* Summary Card */}
                            <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl p-8 text-white overflow-hidden">
                                {/* Background decoration */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>

                                <div className="relative z-10">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h2 className="text-lg font-medium text-indigo-100">Total Money Lent</h2>
                                                    <p className="text-5xl font-bold mt-1">{formatIndianCurrency(totalLent)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-4">
                                                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm">
                                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                    </svg>
                                                    <span className="text-white font-semibold">{loansSummary.filter(p => p.balance > 0).length} people</span>
                                                </div>
                                                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm">
                                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                    </svg>
                                                    <span className="text-white font-semibold">{loans.length} transactions</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                                {/* Add Loan Transaction Form */}
                                <div className="lg:col-span-1">
                                    <div className="relative bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 shadow-2xl rounded-2xl p-6 border border-gray-700/50 overflow-hidden">
                                        {/* Background decoration */}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl"></div>

                                        <div className="relative z-10">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                </div>
                                                <h2 className="text-xl font-bold text-white">Add Transaction</h2>
                                            </div>
                                            <form onSubmit={handleLoanSubmit} className="space-y-4">
                                                <div>
                                                    <label htmlFor="loanDate" className="block text-sm font-medium text-gray-300 mb-1">
                                                        Date
                                                    </label>
                                                    <input
                                                        type="date"
                                                        id="loanDate"
                                                        required
                                                        className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        value={loanFormData.Date}
                                                        onChange={(e) => setLoanFormData({ ...loanFormData, Date: e.target.value })}
                                                    />
                                                </div>

                                                <div>
                                                    <label htmlFor="personName" className="block text-sm font-medium text-gray-300 mb-1">
                                                        Person Name
                                                    </label>
                                                    {uniquePersons.length > 0 ? (
                                                        <div className="space-y-2">
                                                            <select
                                                                id="personName"
                                                                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                value={selectedPerson}
                                                                onChange={(e) => {
                                                                    setSelectedPerson(e.target.value);
                                                                    setLoanFormData({ ...loanFormData, PersonName: e.target.value });
                                                                }}
                                                            >
                                                                <option value="">-- Select or type new name --</option>
                                                                {uniquePersons.map(person => (
                                                                    <option key={person} value={person}>{person}</option>
                                                                ))}
                                                            </select>
                                                            <input
                                                                type="text"
                                                                placeholder="Or enter new name"
                                                                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                value={selectedPerson === '' ? loanFormData.PersonName : ''}
                                                                onChange={(e) => {
                                                                    setSelectedPerson('');
                                                                    setLoanFormData({ ...loanFormData, PersonName: e.target.value });
                                                                }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            id="personName"
                                                            required
                                                            className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                            value={loanFormData.PersonName}
                                                            onChange={(e) => setLoanFormData({ ...loanFormData, PersonName: e.target.value })}
                                                            placeholder="Enter person's name"
                                                        />
                                                    )}
                                                </div>

                                                <div>
                                                    <label htmlFor="transactionType" className="block text-sm font-medium text-gray-300 mb-1">
                                                        Transaction Type
                                                    </label>
                                                    <select
                                                        id="transactionType"
                                                        required
                                                        className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        value={loanFormData.TransactionType}
                                                        onChange={(e) => setLoanFormData({ ...loanFormData, TransactionType: e.target.value })}
                                                    >
                                                        <option value="LENT">Money Lent (New Loan)</option>
                                                        <option value="ADDITIONAL_LOAN">Additional Loan</option>
                                                        <option value="RECEIVED">Money Received (Repayment)</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label htmlFor="loanAmount" className="block text-sm font-medium text-gray-300 mb-1">
                                                        Amount
                                                    </label>
                                                    <input
                                                        type="number"
                                                        id="loanAmount"
                                                        required
                                                        step="0.01"
                                                        min="0"
                                                        className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        value={loanFormData.Amount}
                                                        onChange={(e) => setLoanFormData({ ...loanFormData, Amount: e.target.value })}
                                                        placeholder="0.00"
                                                    />
                                                </div>

                                                <div>
                                                    <label htmlFor="loanDescription" className="block text-sm font-medium text-gray-300 mb-1">
                                                        Description
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id="loanDescription"
                                                        className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        value={loanFormData.Description}
                                                        onChange={(e) => setLoanFormData({ ...loanFormData, Description: e.target.value })}
                                                        placeholder="Optional details"
                                                    />
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={loanSubmitting}
                                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    {loanSubmitting ? (
                                                        <>
                                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Adding...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                            </svg>
                                                            Add Transaction
                                                        </>
                                                    )}
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>

                                {/* People List and Transactions */}
                                <div className="lg:col-span-2 space-y-6">
                                    {loansSummary.length === 0 ? (
                                        <div className="relative bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 shadow-2xl rounded-2xl p-12 text-center border border-gray-700/50 overflow-hidden">
                                            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl"></div>
                                            <div className="relative z-10">
                                                <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <p className="text-gray-400 text-lg">No loan records yet. Add your first loan transaction to get started!</p>
                                            </div>
                                        </div>
                                    ) : (
                                        loansSummary.map(({ person, balance }) => {
                                            const personTransactions = getPersonTransactions(person);
                                            return (
                                                <div key={person} className="relative bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 shadow-2xl rounded-2xl overflow-hidden border border-gray-700/50">
                                                    {/* Background decoration */}
                                                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl"></div>

                                                    <div className="relative z-10">
                                                        <div className="px-6 py-5 bg-gradient-to-r from-gray-900/80 to-gray-800/80 border-b border-gray-700/50 backdrop-blur-sm">
                                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
                                                                        <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                        </svg>
                                                                    </div>
                                                                    <h3 className="text-xl font-bold text-white">{person}</h3>
                                                                </div>
                                                                <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-lg ${balance > 0
                                                                        ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-400'
                                                                        : balance < 0
                                                                            ? 'bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/30 text-red-400'
                                                                            : 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 border border-gray-500/30 text-gray-400'
                                                                    }`}>
                                                                    {balance > 0 ? '↑' : balance < 0 ? '↓' : '•'}
                                                                    <span>{formatIndianCurrency(Math.abs(balance))}</span>
                                                                    <span className="text-sm font-medium opacity-80">
                                                                        {balance > 0 ? 'owed' : balance < 0 ? 'overpaid' : 'settled'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Desktop Table View */}
                                                        <div className="hidden md:block overflow-x-auto">
                                                            <table className="min-w-full">
                                                                <thead>
                                                                    <tr className="border-b border-gray-700/30">
                                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                                            <div className="flex items-center gap-2">
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                                </svg>
                                                                                Date
                                                                            </div>
                                                                        </th>
                                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                                            <div className="flex items-center gap-2">
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                                                </svg>
                                                                                Type
                                                                            </div>
                                                                        </th>
                                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                                            <div className="flex items-center gap-2">
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                </svg>
                                                                                Description
                                                                            </div>
                                                                        </th>
                                                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                                            <div className="flex items-center justify-end gap-2">
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                                </svg>
                                                                                Amount
                                                                            </div>
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {personTransactions.map((tx, idx) => {
                                                                        const isLent = tx.TransactionType === 'LENT' || tx.TransactionType === 'ADDITIONAL_LOAN';
                                                                        return (
                                                                            <tr key={idx} className="border-b border-gray-700/20 hover:bg-gray-700/20 transition-colors group">
                                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="w-2 h-2 rounded-full bg-indigo-500/50"></div>
                                                                                        <span className="text-sm font-medium text-gray-300">{tx.Date}</span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${tx.TransactionType === 'LENT'
                                                                                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                                                            : tx.TransactionType === 'ADDITIONAL_LOAN'
                                                                                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                                                                                : 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                                                        }`}>
                                                                                        {tx.TransactionType === 'LENT' && (
                                                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                                                            </svg>
                                                                                        )}
                                                                                        {tx.TransactionType === 'ADDITIONAL_LOAN' && (
                                                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                                                            </svg>
                                                                                        )}
                                                                                        {tx.TransactionType === 'RECEIVED' && (
                                                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                                                                                            </svg>
                                                                                        )}
                                                                                        {tx.TransactionType === 'LENT' ? 'Lent' :
                                                                                            tx.TransactionType === 'ADDITIONAL_LOAN' ? 'Additional' :
                                                                                                'Received'}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-6 py-4">
                                                                                    <span className="text-sm text-gray-300">{tx.Description || '-'}</span>
                                                                                </td>
                                                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-sm ${isLent
                                                                                            ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                                                                                            : 'bg-green-500/10 border border-green-500/20 text-green-400'
                                                                                        }`}>
                                                                                        {isLent ? '+' : '-'}{formatIndianCurrency(parseFloat(tx.Amount || '0'))}
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>

                                                        {/* Mobile Card View */}
                                                        <div className="md:hidden p-4 space-y-3">
                                                            {personTransactions.map((tx, idx) => {
                                                                const isLent = tx.TransactionType === 'LENT' || tx.TransactionType === 'ADDITIONAL_LOAN';
                                                                return (
                                                                    <div key={idx} className="bg-gray-700/30 rounded-xl p-4 border border-gray-700/50 hover:bg-gray-700/40 transition-colors">
                                                                        <div className="flex justify-between items-start gap-3">
                                                                            <div className="flex-1 space-y-2">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-2 h-2 rounded-full bg-indigo-500/50"></div>
                                                                                    <span className="text-xs font-medium text-gray-400">{tx.Date}</span>
                                                                                </div>
                                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${tx.TransactionType === 'LENT'
                                                                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                                                        : tx.TransactionType === 'ADDITIONAL_LOAN'
                                                                                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                                                                            : 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                                                    }`}>
                                                                                    {tx.TransactionType === 'LENT' && (
                                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                                                        </svg>
                                                                                    )}
                                                                                    {tx.TransactionType === 'ADDITIONAL_LOAN' && (
                                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                                                        </svg>
                                                                                    )}
                                                                                    {tx.TransactionType === 'RECEIVED' && (
                                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                                                                                        </svg>
                                                                                    )}
                                                                                    {tx.TransactionType === 'LENT' ? 'Lent' :
                                                                                        tx.TransactionType === 'ADDITIONAL_LOAN' ? 'Additional' :
                                                                                            'Received'}
                                                                                </span>
                                                                                {tx.Description && (
                                                                                    <div className="text-xs text-gray-400 mt-1">
                                                                                        {tx.Description}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg font-bold text-sm whitespace-nowrap ${isLent
                                                                                    ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                                                                                    : 'bg-green-500/10 border border-green-500/20 text-green-400'
                                                                                }`}>
                                                                                {isLent ? '+' : '-'}{formatIndianCurrency(parseFloat(tx.Amount || '0'))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Edit Modal */}
                    {editOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center">
                            <div className="absolute inset-0 bg-black/70" onClick={closeEditModal} />
                            <div className="relative bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-100">Edit Transaction</h3>
                                    <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-300" aria-label="Close">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 11-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>

                                <form onSubmit={handleUpdate} className="space-y-4">
                                    {/* Is it Income Checkbox */}
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="editIsIncome"
                                            checked={editIsIncome}
                                            onChange={(e) => setEditIsIncome(e.target.checked)}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded"
                                        />
                                        <label htmlFor="editIsIncome" className="ml-2 block text-sm font-medium text-gray-300">
                                            Is it an Income
                                        </label>
                                    </div>

                                    <div>
                                        <label htmlFor="editDate" className="block text-sm font-medium text-gray-300 mb-1">
                                            Date
                                        </label>
                                        <input
                                            type="date"
                                            id="editDate"
                                            required
                                            className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={editData.Date}
                                            onChange={(e) => setEditData({ ...editData, Date: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="editAccount" className="block text-sm font-medium text-gray-300 mb-1">
                                            Account
                                        </label>
                                        <select
                                            id="editAccount"
                                            required
                                            className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={editData.Account}
                                            onChange={(e) => setEditData({ ...editData, Account: e.target.value })}
                                        >
                                            <option value="AXIS Bank">AXIS Bank</option>
                                            <option value="SBI Bank">SBI Bank</option>
                                            <option value="Credit Card">Credit Card</option>
                                            <option value="Cash">Cash</option>
                                        </select>
                                    </div>

                                    {!editIsIncome && (
                                        <div>
                                            <label htmlFor="editCategory" className="block text-sm font-medium text-gray-300 mb-1">
                                                Category
                                            </label>
                                            <select
                                                id="editCategory"
                                                required
                                                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={editData.Category}
                                                onChange={(e) => setEditData({ ...editData, Category: e.target.value })}
                                            >
                                                <option value="">Select a category</option>
                                                <option value="Food & Dining">Food & Dining</option>
                                                <option value="Transportation">Transportation</option>
                                                <option value="Shopping">Shopping</option>
                                                <option value="Entertainment">Entertainment</option>
                                                <option value="Bills & Utilities">Bills & Utilities</option>
                                                <option value="Healthcare">Healthcare</option>
                                                <option value="Education">Education</option>
                                                <option value="Groceries">Groceries</option>
                                                <option value="Rent">Rent</option>
                                                <option value="Insurance">Insurance</option>
                                                <option value="Personal Care">Personal Care</option>
                                                <option value="Travel">Travel</option>
                                                <option value="Subscriptions">Subscriptions</option>
                                                <option value="Gifts">Gifts</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label htmlFor="editDescription" className="block text-sm font-medium text-gray-300 mb-1">
                                            Description
                                        </label>
                                        <input
                                            type="text"
                                            id="editDescription"
                                            className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={editData.Description}
                                            onChange={(e) => setEditData({ ...editData, Description: e.target.value })}
                                            placeholder="Optional details"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="editAmount" className="block text-sm font-medium text-gray-300 mb-1">
                                            Amount
                                        </label>
                                        <input
                                            type="number"
                                            id="editAmount"
                                            required
                                            step="0.01"
                                            min="0"
                                            className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={editData.Amount}
                                            onChange={(e) => setEditData({ ...editData, Amount: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="flex items-center justify-end gap-3 pt-2">
                                        <button type="button" onClick={closeEditModal} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-200">
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={updating} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                                            {updating ? 'Saving...' : 'Save Changes'}
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

