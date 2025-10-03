import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { fetchData } from '@/lib/google-sheet';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const expenses = await fetchData();
        return res.status(200).json(expenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        return res.status(500).json({
            error: 'Failed to fetch expenses',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

