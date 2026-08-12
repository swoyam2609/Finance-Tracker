# Finance Tracker UI Revamp — M1: Foundation + Wallet

Date: 2026-08-12
Status: approved for implementation

## Context

The app is a single-user personal finance tracker: Next.js 14 pages router, Google Sheets as the
database, NextAuth for login. All UI lives in `pages/index.tsx` (1759 lines) as a four-tab
single page. Accounts render as five small icon tiles with a name and a balance. The total
balance line hardcodes `- 15000` as a minimum-balance buffer.

The goal is a card-forward interface: each account renders as a real card face showing the fields
that matter for its kind, with a credit card showing outstanding, limit, utilization and due date.

The reference given was a Figma community template ("Finance Management App", file
1024566846450249486). That URL returns HTTP 403 to automated fetches, so the design was
developed from the template genre plus rendered mockups reviewed in the visual companion.
Mockups are preserved in `.superpowers/brainstorm/` (gitignored).

## Decisions taken

| Decision | Choice |
|---|---|
| Form factor | Mobile-first at 390px, desktop adapts from the same components |
| Card aesthetic | Frosted glass — translucent panels, one colour bloom per account, hairline borders |
| Home layout | Snap carousel of cards + pulse tiles, transactions above the fold |
| Card metadata source | New `Accounts` tab in the existing Google Sheet |
| Hero figure | Spendable leads; tap label to cycle to Net worth and Investments |
| Routing | Real Next routes, not tabs in one page |
| Scope | Decomposed into four milestones; this spec covers M1 only |

## Milestone map

M1 (this spec) — foundation, wallet cards, hero, nav, account detail.
M2 — input overhaul: quick-add sheet with keypad and category grid, swipe-to-edit, search.
M3 — insight layer: analytics rebuild, spend heatmap, category budgets, month-over-month cards.
M4 — polish: route transitions everywhere, skeletons, pull-to-refresh, light theme.

Each later milestone gets its own spec and plan. M1 must leave the other three tabs working,
restyled only as far as the shared shell forces.

## Money model

All figures derive from one pure module. No component computes money.

```
accountBalance(txns, id)    = Σ signed Amount where Account === id
creditOutstanding(acct, b)  = -min(0, b)                      // credit kind only
availableCredit(acct, out)  = CreditLimit - out
utilization(out, limit)     = limit > 0 ? out / limit : null
spendable(accounts, bals)   = Σ(bank+cash balances) - Σ MinBalance - Σ creditOutstanding
netWorth(accounts, bals)    = Σ(bank+cash+investment balances) - Σ creditOutstanding
investments(accounts, bals) = Σ(investment balances)
nextDue(statementDay, dueDay, today) -> { date, daysLeft, isPastDue }
spentToday(txns)            = |Σ negative Amount where Date === today|, excluding Transfer In/Out
monthDelta(txns, today)     = net change across the current calendar month
```

The hardcoded `- 15000` is removed. That reserve becomes per-account `MinBalance` in the sheet,
so the hero breakdown can name which account holds it.

`Transfer In` and `Transfer Out` categories are excluded from income/expense aggregates, matching
current behavior. Transfers into `Mutual Fund` count as investment, also matching current behavior.

## Data layer

### New sheet tab: `Accounts`

| Column | Type | Meaning |
|---|---|---|
| Id | string | Join key. Must equal the `Account` value written in Expenses rows. |
| Label | string | Display name. Changing it never orphans history. |
| Kind | enum | `bank` \| `credit` \| `cash` \| `investment` |
| Last4 | string | Masked number suffix. Optional. |
| Network | string | `visa` \| `mastercard` \| `rupay` \| blank |
| Art | string | Preset name or `#rrggbb`. Blank falls back by Kind. |
| CreditLimit | number | Credit kind only |
| MinBalance | number | Reserve held back from Spendable |
| StatementDay | 1-31 | Credit kind only |
| DueDay | 1-31 | Credit kind only |
| Order | number | Carousel order |
| Archived | boolean | Hidden from UI, still counted in history |

`Id` is the contract with existing data. A row whose `Id` matches no transaction still renders
with a zero balance; a transaction whose `Account` matches no row falls back to a synthesized
`bank`-kind account so no history is ever hidden.

### API

`pages/api/accounts/get.ts` — session-guarded, mirrors the existing expenses route. Reads the
`Accounts` tab via a new `getAccounts()` in `lib/google-sheet.ts`. If the tab is absent or empty,
returns built-in defaults describing today's five accounts (AXIS Bank, SBI Bank, Credit Card,
Cash, Mutual Fund) with AXIS holding a 10000 and SBI a 5000 MinBalance, preserving the current
15000 total. The app therefore works before the sheet tab is created.

Malformed rows are skipped with a warning rather than failing the whole response.

### Client data flow

`components/data/FinanceProvider.tsx` — context mounted in `_app.tsx`, inside `SessionProvider`.
Fetches expenses and accounts once, exposes `{ transactions, accounts, balances, derived,
loading, error, refresh }`. Route changes do not refetch. Mutations (add/edit/transfer/loan) call
`refresh()`, matching today's refetch-after-write behavior rather than introducing optimistic
updates.

## Routes and shell

```
/                  Home: hero, carousel, pulse tiles, recent transactions
/accounts/[id]     Detail: hero card face, period chart, stats, filtered history
/transfers         existing logic, restyled by shell only
/analytics         existing logic, restyled by shell only
/loans             existing logic, restyled by shell only
/login             unchanged
```

`[id]` is the URL-encoded account `Id`. Unknown id renders a not-found state with a link home.

`components/layout/AppShell.tsx` owns the auth guard (moved out of `index.tsx`), the toast host,
`BottomNav` below `md`, `SideRail` at `md` and above, and the page transition wrapper.

## Visual system

Extends the existing `sys.*` iOS palette; nothing is removed.

```
sys.glass        rgba(255,255,255,0.055)   card fill
sys.glass-stroke rgba(255,255,255,0.13)    hairline border
sys.glass-hi     rgba(255,255,255,0.09)    inset top highlight
```

A `.glass` component class in `globals.css` composes fill, hairline, `backdrop-blur-xl` and the
inset highlight. Each card carries one blurred radial bloom positioned top-right, coloured from
the account's `Art`.

Art presets: `maroon #C2415A`, `blue #3D7DFF`, `violet #7A5CFF`, `green #26A862`,
`teal #00B8A9`, `amber #FF9F0A`, `pink #FF375F`, `slate #6E6E78`.
Kind fallback: bank→blue, credit→violet, cash→green, investment→teal.

A `.money` class applies `font-variant-numeric: tabular-nums` to every currency figure, so
animated counters do not shift layout inside the carousel.

## Components

```
components/
  layout/    AppShell  BottomNav  SideRail  PageHeader  SkeletonCard
  wallet/    AccountCard  CreditBody  BankBody  CashBody  InvestmentBody
             UtilizationRing  DueRow  AccountCarousel
  hero/      HeroBalance  BreakdownSheet  PulseTile
  txn/       TransactionRow  TransactionGroup  AccountChips  CategoryChips
  data/      FinanceProvider
hooks/       useAnimatedCounter (extracted from index.tsx)
lib/         finance.ts  accounts.ts (types, presets, defaults)
```

`AccountCard` takes `variant: 'rail' | 'hero' | 'grid' | 'row'` and dispatches its body by `Kind`:

- `CreditBody` — Outstanding, `UtilizationRing`, "₹X available of ₹Y"
- `BankBody` — Available, "₹X min balance held" when MinBalance > 0
- `CashBody` — Balance
- `InvestmentBody` — Value plus sparkline

`UtilizationRing` animates its dashoffset on mount; stroke turns amber above 70% and red above
90%. `DueRow` shows days remaining, amber under five days, red when past due, and a
"Log payment" action that navigates to `/transfers` prefilled to pay that card.

`AccountCarousel` uses CSS scroll snap (`snap-x snap-mandatory overflow-x-auto scrollbar-hide`)
with dots driven by `IntersectionObserver`. No drag library is added.

`HeroBalance` cycles Spendable → Net worth → Investments when the label is tapped. Tapping the
number opens `BreakdownSheet`, which shows the arithmetic line by line so an unexpected total is
always explainable.

At `md` and above the carousel container becomes a two-column grid and `BottomNav` is replaced by
`SideRail`. There is no separate desktop component tree.

## Motion

`framer-motion` is already a dependency. Card to detail uses a shared `layoutId` on the card face
so the carousel card morphs into the detail hero. `AnimatePresence` in `_app.tsx` cross-fades
routes. Cards stagger in on first mount only, not on every data refresh. Counters animate via the
extracted `useAnimatedCounter`.

`prefers-reduced-motion` disables counters, the ring draw, staggering and route transitions;
final values render immediately.

## States

- Loading: `SkeletonCard` shapes matching real card geometry, replacing the current full-screen
  spinner. Hero shows a shimmer block.
- Error: inline banner above the carousel with a retry that calls `refresh()`. Cached data stays
  on screen; an error never blanks the page.
- Empty: no accounts → prompt describing the `Accounts` tab. No transactions for an account →
  message plus a quick-add affordance.
- Offline / fetch failure on a route change: keeps last good data, banner explains staleness.

## Verification

- `vitest` added, covering `lib/finance.ts` only. Cases include: credit balance positive
  (overpaid) yields zero outstanding; `utilization` with zero or missing limit returns null;
  `nextDue` where `DueDay` is earlier in the month than `StatementDay` and so rolls to the next
  month; past-due dates; month boundaries for `monthDelta`; `spendable` with an archived account.
- `npx tsc --noEmit` and `npm run build` must pass.
- Manual pass against the no-regression inventory of current behaviors: every filter, grouping,
  exclusion rule, empty state and edit flow in today's `index.tsx` must still work.

## Risks

- **Id mismatch between the Accounts tab and historical rows** — mitigated by the fallback
  synthesized account, so no transaction is ever dropped from view.
- **Sheet tab missing** — mitigated by built-in defaults reproducing current behavior.
- **Scope creep from M2–M4** — this milestone ships wallet and shell only. Input overhaul,
  insights and polish are explicitly out.
- **`index.tsx` shrinking gradually** leaves a period where both old and new patterns exist.
  Accepted: routes move one at a time, each landing green.

## Out of scope for M1

Quick-add sheet and keypad, swipe-to-edit, transaction search, spend heatmap, category budgets,
month-over-month insight cards, analytics chart rebuild, pull-to-refresh, light theme.
