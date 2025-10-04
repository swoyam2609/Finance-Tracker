# Changelog

## Version 1.6.0 - Daily Expenses Chart

### New Features

#### 1. **Daily Expenses Trend Chart**
- Beautiful area chart showing daily expense patterns
- Smooth gradient fill (red for expenses)
- Interactive tooltip showing exact amounts
- Responsive design adapts to screen size

#### 2. **Chart Features**
- **Date Range**: Shows all dates with transactions
- **Period Filter**: Respects overall/month selection
- **Grid Lines**: Subtle dark theme grid for easy reading
- **Hover Info**: Tooltip displays date and exact expense amount
- **Currency Format**: All amounts shown with ₹ symbol

#### 3. **Visual Design**
- Indigo-to-purple gradient area fill matching UI theme
- Dark theme compatible styling
- Professional axis labels
- Smooth curve interpolation
- Indigo border on tooltip for consistency

### Technical Implementation

- Added `recharts` library for charting
- Created `getDailyExpenses()` function to aggregate data by date
- Area chart with gradient definition
- Custom dark theme tooltip styling
- Responsive container for mobile compatibility

### User Experience

1. **Easy Visualization**: See spending patterns at a glance
2. **Time Analysis**: Identify high-spending days
3. **Trend Detection**: Spot spending trends over time
4. **Period Comparison**: Switch between overall and monthly views

### Changes

- **Removed**: Transaction edit functionality for data integrity
- **Updated**: Chart colors from red to indigo/purple gradient for better UI consistency

---

## Version 1.5.0 - Dark Theme

### New Features

#### 1. **Complete Dark Theme Implementation**
- Converted entire application to modern dark theme
- Easy on eyes for extended use
- Professional, modern appearance

#### 2. **Dark Theme Colors**
- **Backgrounds**: Gray-900 (main), Gray-800 (cards), Gray-700 (inputs)
- **Text**: Gray-100 (primary), Gray-300 (labels), Gray-400 (muted)
- **Borders**: Gray-700 (primary), Gray-600 (inputs)
- **Accents**: Indigo (primary), Green (positive), Red (negative)

#### 3. **Styled Components**
- Login page with dark gradient background
- Dashboard with dark header and navigation
- Dark themed forms and inputs
- Dark tables with hover effects
- Dark modals with semi-transparent overlays
- Dark analytics charts and cards
- Dark loans tracking interface

#### 4. **Maintained Color Coding**
- Green for positive values/income
- Red for negative values/expenses
- Blue for money lent
- Color-coded transaction badges
- All maintain high contrast for accessibility

#### 5. **Enhanced Visuals**
- Shadow and border highlights
- Smooth hover effects
- Focus indicators with dark-aware ring offsets
- Gradient accents on special cards

### Technical Implementation

- Updated `styles/globals.css` with dark base styles
- Systematic color replacement across all components
- Dark backgrounds for all form inputs and selects
- Error messages with dark red styling
- Modal overlays with 70% opacity
- Maintained all existing functionality

### Accessibility

- WCAG AA compliant contrast ratios
- Visible focus indicators
- High contrast for critical information
- Color coding supplemented with text indicators

### Documentation

- Created `DARK_THEME_GUIDE.md` with full documentation
- Updated README with dark theme feature

---

## Version 1.4.0 - Loans Tracking System

### New Features

#### 1. **Loans Tracking Tab**
- New "Loans" tab to monitor money lent to people
- Separate Google Sheet ("Loans") for loan data
- Track multiple people and their loan balances

#### 2. **Loan Transactions**
Three types of transactions:
- **LENT**: Initial loan to a person
- **ADDITIONAL_LOAN**: Additional money lent to same person
- **RECEIVED**: Money received back (repayments)

#### 3. **Per-Person Tracking**
- Automatic calculation of outstanding balance per person
- Complete transaction history for each person
- Color-coded balances:
  - Green: Person owes you money
  - Red: Person has overpaid
  - Gray: Fully settled (₹0 balance)

#### 4. **Smart Person Selection**
- Dropdown to select existing people
- Text field to add new people
- Auto-suggestion from previous loan records

#### 5. **Visual Summary Dashboard**
- Total money lent (outstanding loans)
- Number of people with outstanding balances
- Individual person cards with:
  - Person name
  - Current balance
  - Full transaction history
  - Color-coded transaction badges

### Technical Implementation

#### Backend
- New Google Sheets functions:
  - `fetchLoans()`: Get all loan transactions
  - `addLoanTransaction()`: Add new loan transaction
  - `updateLoanTransaction()`: Update existing transaction
- New API routes:
  - `GET /api/loans/get`: Fetch all loans
  - `POST /api/loans/add`: Add loan transaction

#### Frontend
- Loans state management in main dashboard
- Calculation functions:
  - `getLoansSummary()`: Calculate balance per person
  - `getPersonTransactions()`: Filter transactions by person
  - `getUniquePersons()`: Get list of all people
- Responsive grid layout for loans tab

### Data Structure

**Loans Sheet Columns:**
- Date
- PersonName
- TransactionType (LENT/ADDITIONAL_LOAN/RECEIVED)
- Amount
- Description

### User Experience

1. **Comprehensive View**: See all loans and people in one place
2. **Easy Entry**: Simple form to record transactions
3. **Clear History**: Every transaction per person is visible
4. **Balance Tracking**: Automatically calculated balances
5. **Visual Indicators**: Color-coded badges and amounts

### Setup Required

Users need to:
1. Create a new sheet named "Loans" in their Google Sheet
2. Add column headers: Date, PersonName, TransactionType, Amount, Description
3. See `LOANS_SETUP.md` for detailed instructions

---

## Version 1.3.0 - Analytics Dashboard

### New Features

#### 1. **Analytics Tab with Expenditure Distribution**
- Added new "Analytics" tab alongside "Transactions" tab
- Comprehensive expenditure analysis dashboard
- Visual representation of spending patterns

#### 2. **Period Selection**
- Dropdown to filter data by time period:
  - **Overall**: All-time statistics
  - **Month-specific**: Individual months with available data
- Automatically detects available months from transaction history
- Displays months in human-readable format (e.g., "October 2025")

#### 3. **Summary Metrics**
- Four key metric cards:
  - **Total Income**: Sum of all income for selected period (green)
  - **Total Expenses**: Sum of all expenses for selected period (red)
  - **Net Savings**: Income minus expenses with color coding
  - **Savings Rate**: Percentage of income saved

#### 4. **Category Distribution**
- Visual breakdown of expenses by category
- Horizontal bar charts showing percentage distribution
- Shows amount and percentage for each category
- Categories sorted by highest to lowest spending
- Excludes income from category analysis

#### 5. **Account Breakdown Table**
- Detailed table showing per-account statistics:
  - Income received per account
  - Expenses from each account
  - Net amount per account (income - expenses)
- Color-coded net values (green for positive, red for negative)

### Technical Implementation

#### Frontend
- Tab navigation using React state management
- Dynamic calculations based on selected period
- Responsive grid layouts for metrics and charts
- Conditional rendering for transactions vs analytics views

#### Analytics Functions
- `getAvailableMonths()`: Extracts unique months from transaction dates
- `getFilteredExpenses()`: Filters transactions by selected period
- `getCategoryDistribution()`: Calculates category-wise expense breakdown
- `getAccountDistribution()`: Calculates per-account income/expense/net
- `getSummary()`: Computes overall income, expenses, and savings metrics

### User Experience

1. **Easy Navigation**: Tab-based interface for switching between views
2. **Period Flexibility**: Analyze overall trends or focus on specific months
3. **Visual Insights**: Bar charts make it easy to identify top spending categories
4. **Comprehensive Data**: View both category and account perspectives
5. **Color Coding**: Consistent green (positive) and red (negative) indicators

---

## Version 1.2.0 - Transaction Editing

### New Features

#### 1. **Edit Transaction Modal**
- Click pencil icon on any transaction to edit
- Modal popup with pre-populated transaction data
- Full editing capability for all fields
- Income/Expense toggle automatically adjusts form

#### 2. **Backend Update Support**
- New API endpoint: `PUT /api/expenses/update`
- Google Sheets integration for row updates
- Row index tracking for precise updates

---

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

