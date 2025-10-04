import { useState, useEffect, FormEvent } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ExpenseData, LoanTransaction } from '@/lib/google-sheet';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Transaction = ExpenseData & { RowIndex?: number };
type LoanTx = LoanTransaction & { RowIndex?: number };

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
    const [activeTab, setActiveTab] = useState<'transactions' | 'analytics' | 'loans'>('transactions');
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

    // Calculate account balances
    const calculateBalances = () => {
        const accounts = ['AXIS Bank', 'SBI Bank', 'Credit Card', 'Cash'];
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
            if (amount < 0 && exp.Category && exp.Category !== 'Income') {
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
            if (amount >= 0) {
                totalIncome += amount;
            } else {
                totalExpenses += Math.abs(amount);
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

    // Calculate daily expenses for chart
    const getDailyExpenses = () => {
        const filtered = getFilteredExpenses();
        const dailyData: { [key: string]: { date: string; expenses: number; income: number } } = {};

        filtered.forEach(exp => {
            if (!exp.Date) return;

            const date = exp.Date;
            const amount = parseFloat(exp.Amount || '0');

            if (!dailyData[date]) {
                dailyData[date] = { date, expenses: 0, income: 0 };
            }

            if (amount < 0) {
                dailyData[date].expenses += Math.abs(amount);
            } else {
                dailyData[date].income += amount;
            }
        });

        // Sort by date and format for chart
        return Object.values(dailyData)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(item => ({
                date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                fullDate: item.date,
                expenses: item.expenses,
                income: item.income,
            }));
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
                            <nav className="-mb-px flex space-x-8">
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
                            {/* Account Balances */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                                {Object.entries(balances).map(([account, balance]) => (
                                    <div key={account} className="bg-gray-800 overflow-hidden shadow rounded-lg">
                                        <div className="px-4 py-5 sm:p-6">
                                            <dt className="text-sm font-medium text-gray-400 truncate">{account}</dt>
                                            <dd className={`mt-1 text-2xl font-semibold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                ₹{balance.toFixed(2)}
                                            </dd>
                                        </div>
                                    </div>
                                ))}
                                <div className="bg-indigo-600 overflow-hidden shadow rounded-lg">
                                    <div className="px-4 py-5 sm:p-6">
                                        <dt className="text-sm font-medium text-indigo-100 truncate">Total Balance</dt>
                                        <dd className="mt-1 text-2xl font-semibold text-white">
                                            ₹{totalBalance.toFixed(2)}
                                        </dd>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'transactions' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Add Transaction Form */}
                            <div className="lg:col-span-1">
                                <div className="bg-gray-800 shadow rounded-lg p-6">
                                    <h2 className="text-lg font-semibold text-gray-100 mb-4">Add Transaction</h2>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {/* Is it Income Checkbox */}
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="isIncome"
                                                checked={isIncome}
                                                onChange={(e) => setIsIncome(e.target.checked)}
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded"
                                            />
                                            <label htmlFor="isIncome" className="ml-2 block text-sm font-medium text-gray-300">
                                                Is it an Income
                                            </label>
                                        </div>

                                        <div>
                                            <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-1">
                                                Date
                                            </label>
                                            <input
                                                type="date"
                                                id="date"
                                                required
                                                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={formData.Date}
                                                onChange={(e) => setFormData({ ...formData, Date: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="account" className="block text-sm font-medium text-gray-300 mb-1">
                                                Account
                                            </label>
                                            <select
                                                id="account"
                                                required
                                                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={formData.Account}
                                                onChange={(e) => setFormData({ ...formData, Account: e.target.value })}
                                            >
                                                <option value="AXIS Bank">AXIS Bank</option>
                                                <option value="SBI Bank">SBI Bank</option>
                                                <option value="Credit Card">Credit Card</option>
                                                <option value="Cash">Cash</option>
                                            </select>
                                        </div>

                                        {/* Category - Only show if NOT income */}
                                        {!isIncome && (
                                            <div>
                                                <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-1">
                                                    Category
                                                </label>
                                                <select
                                                    id="category"
                                                    required
                                                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                            </div>
                                        )}

                                        <div>
                                            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                                                Description
                                            </label>
                                            <input
                                                type="text"
                                                id="description"
                                                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={formData.Description}
                                                onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                                                placeholder="Optional details"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-1">
                                                Amount
                                            </label>
                                            <input
                                                type="number"
                                                id="amount"
                                                required
                                                step="0.01"
                                                min="0"
                                                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={formData.Amount}
                                                onChange={(e) => setFormData({ ...formData, Amount: e.target.value })}
                                                placeholder="0.00"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {submitting ? 'Adding...' : (isIncome ? 'Add Income' : 'Add Expense')}
                                        </button>
                                    </form>
                                </div>
                            </div>

                            {/* Expenses List */}
                            <div className="lg:col-span-2">
                                <div className="bg-gray-800 shadow rounded-lg overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-700">
                                        <h2 className="text-lg font-semibold text-gray-100">Recent Transactions</h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-900">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                        Date
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                        Account
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                        Category
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                        Description
                                                    </th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                        Amount
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-gray-800 divide-y divide-gray-200">
                                                {expenses.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                                            No transactions found. Add your first transaction to get started!
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    expenses.slice().reverse().map((expense, index) => {
                                                        const amount = parseFloat(expense.Amount || '0');
                                                        const isPositive = amount >= 0;
                                                        return (
                                                            <tr key={index} className="hover:bg-gray-900">
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                                                                    {expense.Date}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                                                                    {expense.Account}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                                                                    {expense.Category}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-100">
                                                                    {expense.Description}
                                                                </td>
                                                                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                                                    ₹{Math.abs(amount).toFixed(2)}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
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
                                            ₹{summary.totalIncome.toFixed(2)}
                                        </dd>
                                    </div>
                                </div>
                                <div className="bg-gray-800 overflow-hidden shadow rounded-lg">
                                    <div className="px-4 py-5 sm:p-6">
                                        <dt className="text-sm font-medium text-gray-400 truncate">Total Expenses</dt>
                                        <dd className="mt-1 text-2xl font-semibold text-red-600">
                                            ₹{summary.totalExpenses.toFixed(2)}
                                        </dd>
                                    </div>
                                </div>
                                <div className="bg-gray-800 overflow-hidden shadow rounded-lg">
                                    <div className="px-4 py-5 sm:p-6">
                                        <dt className="text-sm font-medium text-gray-400 truncate">Net Savings</dt>
                                        <dd className={`mt-1 text-2xl font-semibold ${summary.netSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ₹{summary.netSavings.toFixed(2)}
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
                            <div className="bg-gray-800 shadow rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-100 mb-4">Daily Expenses Trend</h3>
                                {dailyExpensesData.length === 0 ? (
                                    <p className="text-gray-400 text-center py-8">No transaction data for this period</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={dailyExpensesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis
                                                dataKey="date"
                                                stroke="#9ca3af"
                                                style={{ fontSize: '12px' }}
                                            />
                                            <YAxis
                                                stroke="#9ca3af"
                                                style={{ fontSize: '12px' }}
                                                tickFormatter={(value) => `₹${value}`}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#1f2937',
                                                    border: '1px solid #6366f1',
                                                    borderRadius: '8px',
                                                    color: '#f3f4f6'
                                                }}
                                                formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Expenses']}
                                                labelStyle={{ color: '#9ca3af' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="expenses"
                                                stroke="#6366f1"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorExpenses)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            {/* Category Distribution */}
                            <div className="bg-gray-800 shadow rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-100 mb-4">Expenses by Category</h3>
                                {categoryDistribution.length === 0 ? (
                                    <p className="text-gray-400 text-center py-8">No expense data for this period</p>
                                ) : (
                                    <div className="space-y-4">
                                        {categoryDistribution.map(cat => (
                                            <div key={cat.category}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-medium text-gray-300">{cat.category}</span>
                                                    <span className="text-sm font-semibold text-gray-100">
                                                        ₹{cat.amount.toFixed(2)} ({cat.percentage.toFixed(1)}%)
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                    <div
                                                        className="bg-indigo-600 h-2.5 rounded-full"
                                                        style={{ width: `${cat.percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Account Distribution */}
                            <div className="bg-gray-800 shadow rounded-lg overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-700">
                                    <h3 className="text-lg font-semibold text-gray-100">Account Breakdown</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-900">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                    Account
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                    Income
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                    Expenses
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                    Net
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-gray-800 divide-y divide-gray-200">
                                            {accountDistribution.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                                                        No account data for this period
                                                    </td>
                                                </tr>
                                            ) : (
                                                accountDistribution.map(acc => (
                                                    <tr key={acc.account} className="hover:bg-gray-900">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                                                            {acc.account}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                                                            ₹{acc.income.toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                                                            ₹{acc.expenses.toFixed(2)}
                                                        </td>
                                                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${acc.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            ₹{acc.net.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loans Tab */}
                    {activeTab === 'loans' && (
                        <div className="space-y-6">
                            {/* Summary Card */}
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                                <h2 className="text-2xl font-bold mb-2">Total Money Lent</h2>
                                <p className="text-4xl font-bold">₹{totalLent.toFixed(2)}</p>
                                <p className="text-indigo-100 mt-2">Amount owed to you by {loansSummary.filter(p => p.balance > 0).length} people</p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Add Loan Transaction Form */}
                                <div className="lg:col-span-1">
                                    <div className="bg-gray-800 shadow rounded-lg p-6">
                                        <h2 className="text-lg font-semibold text-gray-100 mb-4">Add Loan Transaction</h2>
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
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {loanSubmitting ? 'Adding...' : 'Add Transaction'}
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                {/* People List and Transactions */}
                                <div className="lg:col-span-2 space-y-6">
                                    {loansSummary.length === 0 ? (
                                        <div className="bg-gray-800 shadow rounded-lg p-8 text-center">
                                            <p className="text-gray-400">No loan records yet. Add your first loan transaction to get started!</p>
                                        </div>
                                    ) : (
                                        loansSummary.map(({ person, balance }) => {
                                            const personTransactions = getPersonTransactions(person);
                                            return (
                                                <div key={person} className="bg-gray-800 shadow rounded-lg overflow-hidden">
                                                    <div className="px-6 py-4 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
                                                        <h3 className="text-lg font-semibold text-gray-100">{person}</h3>
                                                        <span className={`text-2xl font-bold ${balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                            ₹{Math.abs(balance).toFixed(2)} {balance > 0 ? 'owed' : balance < 0 ? 'overpaid' : 'settled'}
                                                        </span>
                                                    </div>
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full divide-y divide-gray-200">
                                                            <thead className="bg-gray-900">
                                                                <tr>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                                                        Date
                                                                    </th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                                                        Type
                                                                    </th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                                                        Description
                                                                    </th>
                                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                                                                        Amount
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-gray-800 divide-y divide-gray-200">
                                                                {personTransactions.map((tx, idx) => {
                                                                    const isLent = tx.TransactionType === 'LENT' || tx.TransactionType === 'ADDITIONAL_LOAN';
                                                                    return (
                                                                        <tr key={idx} className="hover:bg-gray-900">
                                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                                                                                {tx.Date}
                                                                            </td>
                                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${tx.TransactionType === 'LENT' ? 'bg-blue-100 text-blue-800' :
                                                                                    tx.TransactionType === 'ADDITIONAL_LOAN' ? 'bg-purple-100 text-purple-800' :
                                                                                        'bg-green-100 text-green-800'
                                                                                    }`}>
                                                                                    {tx.TransactionType === 'LENT' ? 'Lent' :
                                                                                        tx.TransactionType === 'ADDITIONAL_LOAN' ? 'Additional' :
                                                                                            'Received'}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-6 py-4 text-sm text-gray-100">
                                                                                {tx.Description || '-'}
                                                                            </td>
                                                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${isLent ? 'text-blue-600' : 'text-green-600'}`}>
                                                                                {isLent ? '+' : '-'}₹{parseFloat(tx.Amount || '0').toFixed(2)}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
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

