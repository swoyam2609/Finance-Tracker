import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { addLoanTransaction, LoanTransaction } from '@/lib/google-sheet';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const loanData: LoanTransaction = req.body;

        // Validate required fields
        if (!loanData.Date || !loanData.PersonName || !loanData.TransactionType || !loanData.Amount) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['Date', 'PersonName', 'TransactionType', 'Amount']
            });
        }

        // Validate transaction type
        const validTypes = ['LENT', 'RECEIVED', 'ADDITIONAL_LOAN'];
        if (!validTypes.includes(loanData.TransactionType)) {
            return res.status(400).json({
                error: 'Invalid TransactionType',
                valid: validTypes
            });
        }

        // Validate amount is a number
        const amount = parseFloat(loanData.Amount);
        if (isNaN(amount)) {
            return res.status(400).json({ error: 'Amount must be a valid number' });
        }

        await addLoanTransaction(loanData);
        return res.status(200).json({ message: 'Loan transaction added successfully' });
    } catch (error) {
        console.error('Error adding loan transaction:', error);
        return res.status(500).json({
            error: 'Failed to add loan transaction',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

