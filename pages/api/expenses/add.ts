import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { addExpense, ExpenseData } from '@/lib/google-sheet';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const expenseData: ExpenseData = req.body;

        // Validate required fields
        if (!expenseData.Date || !expenseData.Account || !expenseData.Amount) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['Date', 'Account', 'Amount']
            });
        }

        // Category is required only for expenses (when amount is negative)
        const amount = parseFloat(expenseData.Amount);
        if (amount < 0 && !expenseData.Category) {
            return res.status(400).json({
                error: 'Category is required for expenses'
            });
        }

        // Validate amount is a number
        if (isNaN(amount)) {
            return res.status(400).json({ error: 'Amount must be a valid number' });
        }

        // Ensure category is set to 'Income' if amount is positive and category is not provided
        if (amount >= 0 && !expenseData.Category) {
            expenseData.Category = 'Income';
        }

        await addExpense(expenseData);
        return res.status(200).json({ message: 'Transaction added successfully' });
    } catch (error) {
        console.error('Error adding transaction:', error);
        return res.status(500).json({
            error: 'Failed to add transaction',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

