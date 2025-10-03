import { useState, useEffect, FormEvent } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ExpenseData } from '@/lib/google-sheet';

type Transaction = ExpenseData & { RowIndex?: number };

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
    const [activeTab, setActiveTab] = useState<'transactions' | 'analytics'>('transactions');
    const [selectedPeriod, setSelectedPeriod] = useState<string>('overall');

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
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
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
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white shadow">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-900">Expense Tracker</h1>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">{session?.user?.email}</span>
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
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-8">
                                <button
                                    onClick={() => setActiveTab('transactions')}
                                    className={`${activeTab === 'transactions'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                                >
                                    Transactions
                                </button>
                                <button
                                    onClick={() => setActiveTab('analytics')}
                                    className={`${activeTab === 'analytics'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                                >
                                    Analytics
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 rounded-md bg-red-50 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-red-800">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'transactions' && (
                        <>
                            {/* Account Balances */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                                {Object.entries(balances).map(([account, balance]) => (
                                    <div key={account} className="bg-white overflow-hidden shadow rounded-lg">
                                        <div className="px-4 py-5 sm:p-6">
                                            <dt className="text-sm font-medium text-gray-500 truncate">{account}</dt>
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
                                <div className="bg-white shadow rounded-lg p-6">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Transaction</h2>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {/* Is it Income Checkbox */}
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="isIncome"
                                                checked={isIncome}
                                                onChange={(e) => setIsIncome(e.target.checked)}
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="isIncome" className="ml-2 block text-sm font-medium text-gray-700">
                                                Is it an Income
                                            </label>
                                        </div>

                                        <div>
                                            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                                                Date
                                            </label>
                                            <input
                                                type="date"
                                                id="date"
                                                required
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={formData.Date}
                                                onChange={(e) => setFormData({ ...formData, Date: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="account" className="block text-sm font-medium text-gray-700 mb-1">
                                                Account
                                            </label>
                                            <select
                                                id="account"
                                                required
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Category
                                                </label>
                                                <select
                                                    id="category"
                                                    required
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                                Description
                                            </label>
                                            <input
                                                type="text"
                                                id="description"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={formData.Description}
                                                onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                                                placeholder="Optional details"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                                                Amount
                                            </label>
                                            <input
                                                type="number"
                                                id="amount"
                                                required
                                                step="0.01"
                                                min="0"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                <div className="bg-white shadow rounded-lg overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-200">
                                        <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Date
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Account
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Category
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Description
                                                    </th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Amount
                                                    </th>
                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {expenses.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                            No transactions found. Add your first transaction to get started!
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    expenses.slice().reverse().map((expense, index) => {
                                                        const amount = parseFloat(expense.Amount || '0');
                                                        const isPositive = amount >= 0;
                                                        return (
                                                            <tr key={index} className="hover:bg-gray-50">
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                    {expense.Date}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                    {expense.Account}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                    {expense.Category}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                                    {expense.Description}
                                                                </td>
                                                                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                                                    ₹{Math.abs(amount).toFixed(2)}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openEditModal(expense)}
                                                                        className="inline-flex items-center p-2 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                                                                        aria-label="Edit"
                                                                        title="Edit"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                                                            <path d="M21.731 2.269a2.625 2.625 0 00-3.714 0l-1.157 1.157 3.714 3.714 1.157-1.157a2.625 2.625 0 000-3.714z" />
                                                                            <path d="M3 17.25V21h3.75L19.31 8.44l-3.714-3.714L3 17.25z" />
                                                                        </svg>
                                                                    </button>
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
                                <h2 className="text-xl font-semibold text-gray-900">Expenditure Analysis</h2>
                                <div>
                                    <label htmlFor="period" className="mr-2 text-sm font-medium text-gray-700">
                                        Period:
                                    </label>
                                    <select
                                        id="period"
                                        value={selectedPeriod}
                                        onChange={(e) => setSelectedPeriod(e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                <div className="bg-white overflow-hidden shadow rounded-lg">
                                    <div className="px-4 py-5 sm:p-6">
                                        <dt className="text-sm font-medium text-gray-500 truncate">Total Income</dt>
                                        <dd className="mt-1 text-2xl font-semibold text-green-600">
                                            ₹{summary.totalIncome.toFixed(2)}
                                        </dd>
                                    </div>
                                </div>
                                <div className="bg-white overflow-hidden shadow rounded-lg">
                                    <div className="px-4 py-5 sm:p-6">
                                        <dt className="text-sm font-medium text-gray-500 truncate">Total Expenses</dt>
                                        <dd className="mt-1 text-2xl font-semibold text-red-600">
                                            ₹{summary.totalExpenses.toFixed(2)}
                                        </dd>
                                    </div>
                                </div>
                                <div className="bg-white overflow-hidden shadow rounded-lg">
                                    <div className="px-4 py-5 sm:p-6">
                                        <dt className="text-sm font-medium text-gray-500 truncate">Net Savings</dt>
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

                            {/* Category Distribution */}
                            <div className="bg-white shadow rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h3>
                                {categoryDistribution.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">No expense data for this period</p>
                                ) : (
                                    <div className="space-y-4">
                                        {categoryDistribution.map(cat => (
                                            <div key={cat.category}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-medium text-gray-700">{cat.category}</span>
                                                    <span className="text-sm font-semibold text-gray-900">
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
                            <div className="bg-white shadow rounded-lg overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900">Account Breakdown</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Account
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Income
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Expenses
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Net
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {accountDistribution.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                                        No account data for this period
                                                    </td>
                                                </tr>
                                            ) : (
                                                accountDistribution.map(acc => (
                                                    <tr key={acc.account} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
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

                    {/* Edit Modal */}
                    {editOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center">
                            <div className="absolute inset-0 bg-black/50" onClick={closeEditModal} />
                            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Edit Transaction</h3>
                                    <button onClick={closeEditModal} className="text-gray-500 hover:text-gray-700" aria-label="Close">
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
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="editIsIncome" className="ml-2 block text-sm font-medium text-gray-700">
                                            Is it an Income
                                        </label>
                                    </div>

                                    <div>
                                        <label htmlFor="editDate" className="block text-sm font-medium text-gray-700 mb-1">
                                            Date
                                        </label>
                                        <input
                                            type="date"
                                            id="editDate"
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={editData.Date}
                                            onChange={(e) => setEditData({ ...editData, Date: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="editAccount" className="block text-sm font-medium text-gray-700 mb-1">
                                            Account
                                        </label>
                                        <select
                                            id="editAccount"
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                            <label htmlFor="editCategory" className="block text-sm font-medium text-gray-700 mb-1">
                                                Category
                                            </label>
                                            <select
                                                id="editCategory"
                                                required
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                        <label htmlFor="editDescription" className="block text-sm font-medium text-gray-700 mb-1">
                                            Description
                                        </label>
                                        <input
                                            type="text"
                                            id="editDescription"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={editData.Description}
                                            onChange={(e) => setEditData({ ...editData, Description: e.target.value })}
                                            placeholder="Optional details"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="editAmount" className="block text-sm font-medium text-gray-700 mb-1">
                                            Amount
                                        </label>
                                        <input
                                            type="number"
                                            id="editAmount"
                                            required
                                            step="0.01"
                                            min="0"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={editData.Amount}
                                            onChange={(e) => setEditData({ ...editData, Amount: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="flex items-center justify-end gap-3 pt-2">
                                        <button type="button" onClick={closeEditModal} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800">
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

