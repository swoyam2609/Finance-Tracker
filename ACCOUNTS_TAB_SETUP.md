# Accounts Tab Setup

Card faces need metadata the transaction rows don't carry: which account is a credit card, its
limit, its due date, how it should look. That lives in a new tab called `Accounts` in the same
spreadsheet.

**The app works without this tab.** If it's missing, `getAccounts()` falls back to built-in
defaults describing the current five accounts, with a 10,000 reserve on AXIS and 5,000 on SBI —
reproducing the old hardcoded 15,000 buffer. Create the tab when you want real card faces.

## Critical: do not make it the first tab

`lib/google-sheet.ts` resolves the transactions sheet **positionally** as `doc.sheetsByIndex[0]`.
If `Accounts` ends up first, every transaction read breaks. Add it to the right of the existing
tabs and leave the transactions sheet in position 1.

## Columns

Header row must use these exact names. Order doesn't matter; extra columns are ignored.

| Column | Required | Notes |
|---|---|---|
| `Id` | yes | **Join key.** Must exactly match the `Account` value in your transaction rows — `AXIS Bank`, `SBI Bank`, `Credit Card`, `Cash`, `Mutual Fund`. Rows with a blank `Id` are skipped. |
| `Label` | no | Display name. Defaults to `Id`. Change this freely — history joins on `Id`, so renaming never orphans transactions. |
| `Kind` | no | `bank`, `credit`, `cash`, or `investment`. Anything else is read as `bank`. |
| `Last4` | no | Last four digits, e.g. `9034`. Renders as `•••• •••• •••• 9034`. |
| `Network` | no | `visa`, `mastercard`, `rupay`, `amex`. |
| `Art` | no | Bloom colour: `maroon`, `blue`, `violet`, `green`, `teal`, `amber`, `pink`, `slate`, or a raw hex like `#7A5CFF`. Blank picks by `Kind`. |
| `CreditLimit` | credit only | Enables the utilization ring and the "₹X available of ₹Y" line. Leave blank and both are omitted rather than showing zeros. |
| `MinBalance` | no | Reserve held back from Spendable. Named in the hero breakdown, so you can always see which account holds it. |
| `StatementDay` | credit only | 1–31. Statement generation day. |
| `DueDay` | credit only | 1–31. Payment due day. Clamped to short months, so 31 lands on the 28th in February. |
| `Order` | no | Carousel order, ascending. Blank falls back to row position. |
| `Archived` | no | `true` / `yes` / `1` hides the account from the carousel. Its balance still counts toward totals and its transactions still appear in history, so nothing silently vanishes. |

Amounts tolerate `₹` and commas — `2,00,000` and `₹200000` both parse.

## Example

| Id | Label | Kind | Last4 | Network | Art | CreditLimit | MinBalance | StatementDay | DueDay | Order | Archived |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AXIS Bank | Axis Savings | bank | 9034 | rupay | maroon | | 10000 | | | 1 | |
| Credit Card | HDFC Millennia | credit | 4821 | mastercard | violet | 200000 | | 18 | 5 | 2 | |
| SBI Bank | SBI Savings | bank | 1182 | visa | blue | | 5000 | | | 3 | |
| Cash | Cash | cash | | | green | | | | | 4 | |
| Mutual Fund | Mutual Fund | investment | | | teal | | | | | 5 | |

## How the numbers use it

```
Spendable  = bank + cash balances − Σ MinBalance − Σ credit outstanding
Net worth  = bank + cash + investment balances − Σ credit outstanding
```

Credit outstanding is `-min(0, balance)`. An overpaid card — a positive stored balance — counts as
zero owed, treating the surplus as credit headroom rather than spendable cash.

No caching: the tab is read on every request, so an edit in the sheet shows up on the next refresh.
