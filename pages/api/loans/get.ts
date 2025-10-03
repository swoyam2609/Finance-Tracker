import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { fetchLoans } from '@/lib/google-sheet';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const loans = await fetchLoans();
        return res.status(200).json(loans);
    } catch (error) {
        console.error('Error fetching loans:', error);
        return res.status(500).json({
            error: 'Failed to fetch loans',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

