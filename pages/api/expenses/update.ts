import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { updateExpense, ExpenseData } from '@/lib/google-sheet';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { rowIndex, expenseData } = req.body as { rowIndex: number; expenseData: ExpenseData };

        if (typeof rowIndex !== 'number' || rowIndex < 0) {
            return res.status(400).json({ error: 'Invalid rowIndex' });
        }

        if (!expenseData?.Date || !expenseData?.Account || !expenseData?.Amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const amount = parseFloat(expenseData.Amount);
        if (isNaN(amount)) {
            return res.status(400).json({ error: 'Amount must be a valid number' });
        }

        if (amount < 0 && !expenseData.Category) {
            return res.status(400).json({ error: 'Category is required for expenses' });
        }

        if (amount >= 0 && !expenseData.Category) {
            expenseData.Category = 'Income';
        }

        await updateExpense(rowIndex, expenseData);
        return res.status(200).json({ message: 'Transaction updated successfully' });
    } catch (error) {
        console.error('Error updating transaction:', error);
        return res.status(500).json({
            error: 'Failed to update transaction',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}


