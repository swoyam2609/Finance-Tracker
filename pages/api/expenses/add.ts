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
        if (!expenseData.Date || !expenseData.Account || !expenseData.Category || !expenseData.Amount) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['Date', 'Account', 'Category', 'Amount']
            });
        }

        // Validate amount is a number
        if (isNaN(Number(expenseData.Amount))) {
            return res.status(400).json({ error: 'Amount must be a valid number' });
        }

        await addExpense(expenseData);
        return res.status(200).json({ message: 'Expense added successfully' });
    } catch (error) {
        console.error('Error adding expense:', error);
        return res.status(500).json({
            error: 'Failed to add expense',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

