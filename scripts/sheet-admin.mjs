/**
 * Spreadsheet admin helper.
 *
 *   node scripts/sheet-admin.mjs list             — list every tab, its index and headers
 *   node scripts/sheet-admin.mjs create-accounts  — create the Accounts tab (never first)
 *
 * Read-only by default. `create-accounts` only ADDS a tab; it never edits or
 * reorders existing sheets, and it refuses to run if an Accounts tab exists.
 */

import { readFileSync } from 'node:fs';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Minimal .env.local reader — avoids adding dotenv as a dependency.
function loadEnv() {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    const env = {};
    raw.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eq = trimmed.indexOf('=');
        if (eq === -1) return;
        env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    });
    return env;
}

async function open() {
    const env = loadEnv();
    const auth = new JWT({
        email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: Buffer.from(env.GOOGLE_PRIVATE_KEY_BASE64, 'base64').toString('utf8'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(env.GOOGLE_SHEET_ID, auth);
    await doc.loadInfo();
    return doc;
}

const ACCOUNT_HEADERS = [
    'Id', 'Label', 'Kind', 'Last4', 'Network', 'Art',
    'CreditLimit', 'MinBalance', 'StatementDay', 'DueDay', 'Order', 'Archived',
];

const SEED = [
    { Id: 'AXIS Bank', Label: 'AXIS Bank', Kind: 'bank', Art: 'maroon', MinBalance: 12000, Order: 1 },
    { Id: 'SBI Bank', Label: 'SBI Bank', Kind: 'bank', Art: 'blue', MinBalance: 3000, Order: 2 },
    { Id: 'Credit Card', Label: 'Credit Card', Kind: 'credit', Art: 'violet', Order: 3 },
    { Id: 'Cash', Label: 'Cash', Kind: 'cash', Art: 'green', Order: 4 },
    { Id: 'Mutual Fund', Label: 'Mutual Fund', Kind: 'investment', Art: 'teal', Order: 5 },
];

async function list(doc) {
    console.log(`Spreadsheet: ${doc.title}\n`);
    for (let index = 0; index < doc.sheetCount; index += 1) {
        const sheet = doc.sheetsByIndex[index];
        let headers = [];
        try {
            await sheet.loadHeaderRow();
            headers = sheet.headerValues;
        } catch (error) {
            headers = [`<no header row: ${error.message}>`];
        }
        console.log(`[${index}] "${sheet.title}"  rows=${sheet.rowCount}`);
        console.log(`     headers: ${headers.join(' | ')}\n`);
    }

    const loans = doc.sheetsByTitle['Loans'];
    console.log(loans
        ? `Loans tab: FOUND (index ${doc.sheetsByIndex.indexOf(loans)})`
        : 'Loans tab: MISSING — /api/loans/get will 500 until a tab named exactly "Loans" exists');
    const accounts = doc.sheetsByTitle['Accounts'];
    console.log(accounts
        ? `Accounts tab: FOUND (index ${doc.sheetsByIndex.indexOf(accounts)})`
        : 'Accounts tab: MISSING — the app is running on built-in defaults');
}

async function createAccounts(doc) {
    if (doc.sheetsByTitle['Accounts']) {
        console.log('Accounts tab already exists — nothing to do.');
        return;
    }

    // addSheet appends, so the transactions sheet keeps index 0. That matters:
    // lib/google-sheet.ts resolves transactions positionally as sheetsByIndex[0].
    const sheet = await doc.addSheet({ title: 'Accounts', headerValues: ACCOUNT_HEADERS });
    await sheet.addRows(SEED);

    const index = doc.sheetsByIndex.indexOf(doc.sheetsByTitle['Accounts']);
    console.log(`Created "Accounts" at index ${index} with ${SEED.length} seeded rows.`);
    if (index === 0) console.error('WARNING: Accounts landed at index 0 — move it right of the transactions sheet.');
}

const command = process.argv[2] ?? 'list';
const doc = await open();

if (command === 'list') await list(doc);
else if (command === 'create-accounts') await createAccounts(doc);
else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
