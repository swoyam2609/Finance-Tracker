# Changelog

## Version 1.1.0 - Enhanced Income/Expense Tracking

### New Features

#### 1. **Income Tracking with Checkbox**
- Added "Is it an Income" checkbox to the transaction form
- When checked:
  - Category field is automatically hidden
  - Amount is stored as positive value in Google Sheets
  - Transaction is labeled as "Income"
- When unchecked:
  - Category dropdown is shown
  - Amount is stored as negative value in Google Sheets

#### 2. **Category Dropdown with Popular Categories**
- Changed category from text input to dropdown
- Pre-populated with 15 common expense categories:
  - Food & Dining
  - Transportation
  - Shopping
  - Entertainment
  - Bills & Utilities
  - Healthcare
  - Education
  - Groceries
  - Rent
  - Insurance
  - Personal Care
  - Travel
  - Subscriptions
  - Gifts
  - Other

#### 3. **Color-Coded Balances**
- Account balances now display with color indicators:
  - **Green** for positive balances (money available)
  - **Red** for negative balances (debt/deficit)
- Applied to all account cards (AXIS Bank, SBI Bank, Credit Card, Cash)

#### 4. **Color-Coded Transaction Amounts**
- Transaction table now shows amounts with color coding:
  - **Green** for positive amounts (income)
  - **Red** for negative amounts (expenses)
- Amounts display as absolute values with color indicating type

### Technical Changes

#### Frontend (`pages/index.tsx`)
- Added `isIncome` state variable
- Updated `handleSubmit` to convert amounts to positive/negative based on income type
- Modified form to conditionally render category field
- Changed category input to select dropdown
- Added color classes to balance cards and transaction table rows
- Updated labels from "Add Expense" to "Add Transaction"

#### Backend (`pages/api/expenses/add.ts`)
- Removed category requirement for income transactions
- Added validation logic:
  - Category required only for expenses (negative amounts)
  - Auto-assigns "Income" category for positive amounts
- Updated error messages to reflect "transaction" instead of "expense"

#### Documentation
- Updated `README.md` with new features
- Added separate sections for adding expenses vs income
- Updated API route documentation with example payloads
- Created `CHANGELOG.md` to track version history

### Data Format

**Expense Entry in Google Sheet:**
```
Date: 2025-10-03
Account: AXIS Bank
Category: Food & Dining
Description: Lunch
Amount: -500
```

**Income Entry in Google Sheet:**
```
Date: 2025-10-03
Account: AXIS Bank
Category: Income
Description: Salary
Amount: 50000
```

### User Experience Improvements

1. **Visual Feedback**: Users can immediately see if their accounts are in the positive or negative
2. **Easier Data Entry**: Dropdown prevents typos in category names
3. **Income Tracking**: No need to manually add negative signs for expenses
4. **Clear Distinction**: Color coding makes it easy to distinguish income from expenses at a glance

### Backward Compatibility

⚠️ **Note**: Existing data in Google Sheets may need adjustment:
- All expenses should have negative amounts
- All income should have positive amounts
- If you have existing data with positive expenses, they will now be treated as income

### Migration Guide

If you have existing data:
1. Open your Google Sheet
2. For all expense rows, ensure amounts are negative (add a `-` sign if needed)
3. For all income rows, ensure amounts are positive and category is "Income"
4. Save the sheet and refresh your dashboard

---

## Version 1.0.0 - Initial Release

Initial MVP release with:
- NextAuth.js authentication
- Google Sheets integration
- Basic expense tracking
- Account balance summaries
- Responsive Tailwind CSS design

