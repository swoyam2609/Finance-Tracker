import { useState, useEffect, FormEvent } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ExpenseData } from '@/lib/google-sheet';

export default function Home() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [expenses, setExpenses] = useState<ExpenseData[]>([]);
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
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {expenses.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
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
                </main>
            </div>
        </>
    );
}

