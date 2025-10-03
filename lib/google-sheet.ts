import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export interface ExpenseData {
    Date: string;
    Account: string;
    Category: string;
    Description: string;
    Amount: string;
}

// Connect to Google Sheets
async function getSheetsDoc() {
    const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const GOOGLE_PRIVATE_KEY_BASE64 = process.env.GOOGLE_PRIVATE_KEY_BASE64;

    if (!GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY_BASE64) {
        throw new Error('Missing Google Sheets configuration in environment variables');
    }

    // Decode the base64 private key
    const privateKey = Buffer.from(GOOGLE_PRIVATE_KEY_BASE64, 'base64').toString('utf-8');

    const serviceAccountAuth = new JWT({
        email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    return doc;
}

// Fetch all expense data from the sheet
export async function fetchData(): Promise<(ExpenseData & { RowIndex: number })[]> {
    try {
        const doc = await getSheetsDoc();
        const sheet = doc.sheetsByIndex[0]; // Use the first sheet

        if (!sheet) {
            throw new Error('No sheets found in the document');
        }

        await sheet.loadHeaderRow();
        const rows = await sheet.getRows();

        const data = rows.map((row, index) => ({
            Date: row.get('Date') || '',
            Account: row.get('Account') || '',
            Category: row.get('Category') || '',
            Description: row.get('Description') || '',
            Amount: row.get('Amount') || '',
            RowIndex: index,
        }));

        return data;
    } catch (error) {
        console.error('Error fetching data from Google Sheets:', error);
        throw error;
    }
}

// Add a new expense to the sheet
export async function addExpense(expenseData: ExpenseData): Promise<void> {
    try {
        const doc = await getSheetsDoc();
        const sheet = doc.sheetsByIndex[0]; // Use the first sheet

        if (!sheet) {
            throw new Error('No sheets found in the document');
        }

        await sheet.loadHeaderRow();
        await sheet.addRow({
            Date: expenseData.Date,
            Account: expenseData.Account,
            Category: expenseData.Category,
            Description: expenseData.Description,
            Amount: expenseData.Amount,
        });
    } catch (error) {
        console.error('Error adding expense to Google Sheets:', error);
        throw error;
    }
}

// Update an existing expense row in the sheet
export async function updateExpense(rowIndex: number, expenseData: ExpenseData): Promise<void> {
    try {
        const doc = await getSheetsDoc();
        const sheet = doc.sheetsByIndex[0];

        if (!sheet) {
            throw new Error('No sheets found in the document');
        }

        await sheet.loadHeaderRow();
        const rows = await sheet.getRows();

        if (rowIndex < 0 || rowIndex >= rows.length) {
            throw new Error('Invalid row index');
        }

        const row = rows[rowIndex];
        const nextValues = {
            Date: expenseData.Date,
            Account: expenseData.Account,
            Category: expenseData.Category,
            Description: expenseData.Description,
            Amount: expenseData.Amount,
        } as Record<string, string | number>;

        // If amount is numeric-like, store as number to avoid string formatting issues
        const amt = Number(expenseData.Amount);
        if (!Number.isNaN(amt)) {
            nextValues.Amount = amt;
        }

        // Prefer set() to ensure proper dirty state tracking
        (row as any).set(nextValues);
        await (row as any).save();
    } catch (error) {
        console.error('Error updating expense in Google Sheets:', error);
        throw error;
    }
}

