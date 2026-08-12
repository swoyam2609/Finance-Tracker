import { describe, it, expect } from 'vitest';
import {
    accountBalance,
    allBalances,
    creditOutstanding,
    availableCredit,
    utilization,
    nextDue,
    spendable,
    netWorth,
    investments,
    spentToday,
    monthDelta,
    summarize,
    reserves,
    isoDay,
    type MoneyTxn,
} from './finance';
import { DEFAULT_ACCOUNTS, type Account } from './accounts';

/** Local date, so tests do not depend on the runner's timezone offset. */
const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);

const account = (over: Partial<Account> & { Id: string }): Account => ({
    Label: over.Id, Kind: 'bank', Last4: '', Network: '', Art: '',
    CreditLimit: 0, MinBalance: 0, StatementDay: null, DueDay: null,
    Order: 1, Archived: false, ...over,
});

const txn = (over: Partial<MoneyTxn>): MoneyTxn => ({
    Date: '2026-08-12', Account: 'AXIS Bank', Category: 'Food & Dining', Amount: '-100', ...over,
});

// The live sheet's current state, used to pin real-world figures.
const LIVE: MoneyTxn[] = [
    txn({ Account: 'AXIS Bank', Amount: '102206.83', Category: 'Income' }),
    txn({ Account: 'SBI Bank', Amount: '100000', Category: 'Income' }),
    txn({ Account: 'Cash', Amount: '150', Category: 'Income' }),
    txn({ Account: 'Credit Card', Amount: '459.49', Category: 'Income' }),
    txn({ Account: 'Mutual Fund', Amount: '699975', Category: 'Transfer In' }),
];

describe('accountBalance', () => {
    it('sums the signed amounts for one account only', () => {
        const txns = [
            txn({ Account: 'AXIS Bank', Amount: '500' }),
            txn({ Account: 'AXIS Bank', Amount: '-200' }),
            txn({ Account: 'SBI Bank', Amount: '-999' }),
        ];
        expect(accountBalance(txns, 'AXIS Bank')).toBe(300);
    });

    it('treats an unparseable amount as zero rather than NaN', () => {
        expect(accountBalance([txn({ Amount: '' }), txn({ Amount: 'abc' })], 'AXIS Bank')).toBe(0);
    });

    it('includes transfer rows, since a transfer really moves money', () => {
        const txns = [txn({ Amount: '-20000', Category: 'Transfer Out' })];
        expect(accountBalance(txns, 'AXIS Bank')).toBe(-20000);
    });
});

describe('allBalances', () => {
    it('reports zero for a configured account with no transactions', () => {
        const balances = allBalances([], [account({ Id: 'Cash' })]);
        expect(balances['Cash']).toBe(0);
    });

    it('still reports an account seen only in transactions', () => {
        const balances = allBalances([txn({ Account: 'ICICI', Amount: '50' })], []);
        expect(balances['ICICI']).toBe(50);
    });
});

describe('creditOutstanding', () => {
    const card = account({ Id: 'CC', Kind: 'credit', CreditLimit: 200000 });

    it('turns a negative balance into a positive amount owed', () => {
        expect(creditOutstanding(card, -45780)).toBe(45780);
    });

    it('returns zero when the card is overpaid', () => {
        expect(creditOutstanding(card, 459.49)).toBe(0);
    });

    it('returns zero for non-credit accounts', () => {
        expect(creditOutstanding(account({ Id: 'AXIS Bank' }), -500)).toBe(0);
    });
});

describe('availableCredit', () => {
    it('is the limit less what is owed', () => {
        const card = account({ Id: 'CC', Kind: 'credit', CreditLimit: 200000 });
        expect(availableCredit(card, 45780)).toBe(154220);
    });

    it('is null when no limit is configured', () => {
        expect(availableCredit(account({ Id: 'CC', Kind: 'credit' }), 100)).toBeNull();
    });

    it('is null for a non-credit account', () => {
        expect(availableCredit(account({ Id: 'Cash', Kind: 'cash', CreditLimit: 5 }), 0)).toBeNull();
    });
});

describe('utilization', () => {
    it('is the fraction of the limit in use', () => {
        expect(utilization(45780, 200000)).toBeCloseTo(0.2289, 4);
    });

    it('is null when the limit is zero or missing', () => {
        expect(utilization(100, 0)).toBeNull();
    });
});

describe('nextDue', () => {
    it('returns this month when the due day is still ahead', () => {
        const due = nextDue(18, 25, day(2026, 8, 12));
        expect(due?.date).toBe('2026-08-25');
        expect(due?.daysLeft).toBe(13);
        expect(due?.isDueSoon).toBe(false);
    });

    it('rolls to next month when this month has passed', () => {
        const due = nextDue(18, 5, day(2026, 8, 12));
        expect(due?.date).toBe('2026-09-05');
        expect(due?.daysLeft).toBe(24);
    });

    it('reports zero days left on the due day itself', () => {
        const due = nextDue(18, 12, day(2026, 8, 12));
        expect(due?.date).toBe('2026-08-12');
        expect(due?.daysLeft).toBe(0);
        expect(due?.isDueSoon).toBe(true);
    });

    it('flags the five-day window', () => {
        expect(nextDue(18, 15, day(2026, 8, 12))?.isDueSoon).toBe(true);
        expect(nextDue(18, 18, day(2026, 8, 12))?.isDueSoon).toBe(false);
    });

    it('clamps a due day of 31 to the length of a short month', () => {
        expect(nextDue(20, 31, day(2026, 2, 10))?.date).toBe('2026-02-28');
        expect(nextDue(20, 31, day(2026, 4, 10))?.date).toBe('2026-04-30');
    });

    it('handles a cycle that wraps the month boundary', () => {
        // Statement on the 18th, payment due the 5th of the next month.
        expect(nextDue(18, 5, day(2026, 8, 20))?.inPaymentWindow).toBe(true);
        expect(nextDue(18, 5, day(2026, 8, 3))?.inPaymentWindow).toBe(true);
        expect(nextDue(18, 5, day(2026, 8, 12))?.inPaymentWindow).toBe(false);
    });

    it('returns null when no due day is configured', () => {
        expect(nextDue(18, null, day(2026, 8, 12))).toBeNull();
    });
});

describe('spendable', () => {
    it('subtracts reserves and what is owed from liquid balances', () => {
        const accounts = [
            account({ Id: 'AXIS Bank', MinBalance: 10000 }),
            account({ Id: 'SBI Bank', MinBalance: 5000 }),
            account({ Id: 'Cash', Kind: 'cash' }),
            account({ Id: 'Credit Card', Kind: 'credit', CreditLimit: 200000 }),
            account({ Id: 'Mutual Fund', Kind: 'investment' }),
        ];
        const balances = {
            'AXIS Bank': 102206.83, 'SBI Bank': 100000, Cash: 150,
            'Credit Card': -45780, 'Mutual Fund': 699975,
        };
        // 202356.83 liquid − 15000 reserved − 45780 owed
        expect(spendable(accounts, balances)).toBeCloseTo(141576.83, 2);
    });

    it('excludes investments from spendable cash', () => {
        const accounts = [account({ Id: 'MF', Kind: 'investment' })];
        expect(spendable(accounts, { MF: 699975 })).toBe(0);
    });

    it('treats an overpaid card as zero owed rather than extra cash', () => {
        const balances = allBalances(LIVE, DEFAULT_ACCOUNTS);
        // Liquid 202356.83 − 15000 default reserves. The card's +459.49 does not add.
        expect(spendable(DEFAULT_ACCOUNTS, balances)).toBeCloseTo(187356.83, 2);
    });

    it('still counts an archived account, so money never silently vanishes', () => {
        const accounts = [
            account({ Id: 'AXIS Bank' }),
            account({ Id: 'Old Bank', Archived: true }),
        ];
        expect(spendable(accounts, { 'AXIS Bank': 1000, 'Old Bank': 250 })).toBe(1250);
    });
});

describe('netWorth', () => {
    it('adds investments and subtracts what is owed', () => {
        const balances = allBalances(LIVE, DEFAULT_ACCOUNTS);
        // 202356.83 liquid + 699975 invested − 0 owed
        expect(netWorth(DEFAULT_ACCOUNTS, balances)).toBeCloseTo(902331.83, 2);
    });

    it('ignores minimum balances, which are a spending constraint not a debt', () => {
        const accounts = [account({ Id: 'AXIS Bank', MinBalance: 10000 })];
        expect(netWorth(accounts, { 'AXIS Bank': 50000 })).toBe(50000);
    });
});

describe('investments', () => {
    it('sums only investment-kind accounts', () => {
        const balances = allBalances(LIVE, DEFAULT_ACCOUNTS);
        expect(investments(DEFAULT_ACCOUNTS, balances)).toBe(699975);
    });
});

describe('spentToday', () => {
    const today = day(2026, 8, 12);

    it('sums today\'s negative rows as a positive figure', () => {
        const txns = [
            txn({ Date: '2026-08-12', Amount: '-420' }),
            txn({ Date: '2026-08-12', Amount: '-820' }),
            txn({ Date: '2026-08-11', Amount: '-999' }),
        ];
        expect(spentToday(txns, today)).toBe(1240);
    });

    it('ignores income and transfers dated today', () => {
        const txns = [
            txn({ Date: '2026-08-12', Amount: '81631', Category: 'Income' }),
            txn({ Date: '2026-08-12', Amount: '-20000', Category: 'Transfer Out' }),
        ];
        expect(spentToday(txns, today)).toBe(0);
    });
});

describe('monthDelta', () => {
    it('nets the calendar month and excludes transfers', () => {
        const txns = [
            txn({ Date: '2026-08-01', Amount: '50000', Category: 'Income' }),
            txn({ Date: '2026-08-31', Amount: '-8000' }),
            txn({ Date: '2026-08-15', Amount: '-20000', Category: 'Transfer Out' }),
            txn({ Date: '2026-07-31', Amount: '-99999' }),
        ];
        expect(monthDelta(txns, day(2026, 8, 12))).toBe(42000);
    });

    it('does not leak an adjacent month whose prefix looks similar', () => {
        const txns = [txn({ Date: '2026-01-05', Amount: '100', Category: 'Income' })];
        expect(monthDelta(txns, day(2026, 10, 1))).toBe(0);
    });
});

describe('summarize', () => {
    it('counts a transfer into an investment account as investment', () => {
        const accounts = [account({ Id: 'Mutual Fund', Kind: 'investment' })];
        const txns = [txn({ Account: 'Mutual Fund', Amount: '20000', Category: 'Transfer In' })];
        const result = summarize(txns, accounts);
        expect(result.totalInvestment).toBe(20000);
        expect(result.totalIncome).toBe(0);
    });

    it('skips every other transfer row', () => {
        const accounts = [account({ Id: 'AXIS Bank' })];
        const txns = [
            txn({ Amount: '-20000', Category: 'Transfer Out' }),
            txn({ Amount: '20000', Category: 'Transfer In' }),
        ];
        const result = summarize(txns, accounts);
        expect(result.totalIncome).toBe(0);
        expect(result.totalExpenses).toBe(0);
    });

    it('computes savings rate, and reports zero when there is no income', () => {
        const accounts = [account({ Id: 'AXIS Bank' })];
        const earning = summarize([
            txn({ Amount: '100000', Category: 'Income' }),
            txn({ Amount: '-25000' }),
        ], accounts);
        expect(earning.netSavings).toBe(75000);
        expect(earning.savingsRate).toBeCloseTo(75, 5);

        const spendingOnly = summarize([txn({ Amount: '-25000' })], accounts);
        expect(spendingOnly.savingsRate).toBe(0);
    });
});

describe('reserves', () => {
    it('names each account holding a reserve, for the breakdown sheet', () => {
        expect(reserves(DEFAULT_ACCOUNTS)).toEqual([
            { id: 'AXIS Bank', label: 'AXIS Bank', amount: 10000 },
            { id: 'SBI Bank', label: 'SBI Bank', amount: 5000 },
        ]);
    });
});

describe('isoDay', () => {
    it('formats in local terms, not UTC', () => {
        expect(isoDay(day(2026, 1, 5))).toBe('2026-01-05');
    });
});
