import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { addTransfer, TransferData } from '@/lib/google-sheet';

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
        const transferData: TransferData = req.body;

        // Validate required fields
        if (!transferData.Date || !transferData.FromAccount || !transferData.ToAccount || !transferData.Amount) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['Date', 'FromAccount', 'ToAccount', 'Amount']
            });
        }

        // Validate that FromAccount and ToAccount are different
        if (transferData.FromAccount === transferData.ToAccount) {
            return res.status(400).json({
                error: 'Source and destination accounts must be different'
            });
        }

        // Validate amount is a positive number
        const amount = parseFloat(transferData.Amount);
        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Amount must be a positive number' });
        }

        await addTransfer(transferData);
        return res.status(200).json({ message: 'Transfer recorded successfully' });
    } catch (error) {
        console.error('Error adding transfer:', error);
        return res.status(500).json({
            error: 'Failed to record transfer',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
