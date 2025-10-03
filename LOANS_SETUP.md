# Loans Feature Setup Guide

## Google Sheet Changes Required

To use the loans tracking feature, you need to add a **second sheet** to your existing Google Sheets file.

### Step 1: Add a New Sheet

1. Open your existing Google Sheet (the one with your expense data)
2. At the bottom of the sheet, click the **"+"** button to add a new sheet
3. **Important**: Rename this new sheet to exactly **`Loans`** (case-sensitive)

### Step 2: Add Column Headers

In the **first row** of the Loans sheet, add these exact column headers:

| Date | PersonName | TransactionType | Amount | Description |
|------|------------|----------------|--------|-------------|

**Column Details:**
- **Date**: Date of the transaction (format: YYYY-MM-DD or DD/MM/YYYY)
- **PersonName**: Name of the person you lent money to or received money from
- **TransactionType**: Type of transaction (LENT, ADDITIONAL_LOAN, or RECEIVED)
- **Amount**: The amount of money (always positive numbers)
- **Description**: Optional notes about the transaction

### Step 3: Share Access (If Not Already Done)

If you created a new Google Sheet file:
1. Click the "Share" button
2. Add your Service Account email (from your `.env.local` file)
3. Give it "Editor" permission
4. Uncheck "Notify people"
5. Click "Share"

**Note**: If you're using the same Google Sheet file as your expenses (recommended), the Service Account already has access.

## How the Loans Feature Works

### Transaction Types

1. **LENT** (Money Lent / New Loan)
   - Use this when you lend money to someone for the first time or as a new loan
   - Increases the amount they owe you
   - Example: You lent ₹5000 to John

2. **ADDITIONAL_LOAN** (Additional Loan)
   - Use this when you lend more money to someone who already owes you
   - Also increases the amount they owe you
   - Example: John already owes ₹5000, you lent him another ₹2000

3. **RECEIVED** (Money Received / Repayment)
   - Use this when someone pays you back (partial or full repayment)
   - Decreases the amount they owe you
   - Example: John paid back ₹3000

### Example Data

Here's how your Loans sheet might look:

| Date       | PersonName | TransactionType   | Amount | Description          |
|------------|------------|-------------------|--------|----------------------|
| 2025-10-01 | John       | LENT              | 5000   | Emergency loan       |
| 2025-10-05 | Sarah      | LENT              | 3000   | Business investment  |
| 2025-10-10 | John       | RECEIVED          | 2000   | Partial payment      |
| 2025-10-15 | John       | ADDITIONAL_LOAN   | 1500   | Medical expense help |
| 2025-10-20 | Sarah      | RECEIVED          | 3000   | Full payment         |

**Balance Calculation:**
- **John**: 5000 (lent) - 2000 (received) + 1500 (additional) = **₹4500 owed**
- **Sarah**: 3000 (lent) - 3000 (received) = **₹0 settled**

## Using the Loans Tab

### Viewing Loans

1. Click the **"Loans"** tab in your expense tracker dashboard
2. You'll see:
   - **Total Money Lent**: Sum of all outstanding loans
   - **People**: List of all people with loan transactions
   - **Individual Balances**: How much each person owes (or has overpaid)

### Adding Loan Transactions

1. Use the form on the left side
2. Fill in:
   - **Date**: When the transaction occurred
   - **Person Name**: 
     - Select from dropdown (if person exists)
     - OR type a new name in the text field
   - **Transaction Type**:
     - "Money Lent (New Loan)" - First time lending to someone
     - "Additional Loan" - Lending more to same person
     - "Money Received (Repayment)" - Person paid you back
   - **Amount**: Enter the amount (always positive)
   - **Description**: Optional notes
3. Click "Add Transaction"

### Understanding the Display

#### Summary Card (Top)
- Shows total amount owed to you
- Number of people with outstanding balances

#### Person Cards
Each person has their own card showing:
- **Person's Name**
- **Current Balance**:
  - Green = They owe you money
  - Red = They've overpaid (you owe them)
  - Gray = Fully settled
- **Transaction History**: All transactions with that person

#### Transaction History
- **Blue badge (Lent)**: Initial loan
- **Purple badge (Additional)**: Additional loan
- **Green badge (Received)**: Money received
- **Amounts**:
  - Blue text with "+": Money you lent
  - Green text with "-": Money you received

## Troubleshooting

### "Loans sheet not found" Error
- Make sure your new sheet is named exactly **"Loans"** (capital L, no spaces)
- Refresh the page after creating the sheet

### Transactions Not Showing
- Check that column headers match exactly (case-sensitive)
- Ensure the Service Account has Editor access to the sheet
- Verify the `.env.local` file has correct credentials

### Balance Seems Wrong
- Check all TransactionType values are spelled correctly:
  - `LENT`, `ADDITIONAL_LOAN`, or `RECEIVED` (all caps)
- Make sure Amount column contains only numbers (no currency symbols)
- Verify there are no duplicate or missing entries

## Tips

1. **Use Descriptions**: Add notes like "Birthday loan", "Emergency", etc. for easy reference
2. **Regular Updates**: Record transactions as they happen for accurate tracking
3. **Partial Payments**: You can record multiple RECEIVED transactions for partial repayments
4. **Settlement**: When someone fully pays you back, the balance will show as ₹0
5. **Overpayment**: If someone pays more than they owe, balance will be negative (red)

## Data Structure Summary

```
Your Google Sheet File
│
├── Sheet 1 (any name - your expenses)
│   └── Columns: Date, Account, Category, Description, Amount
│
└── Loans (must be named exactly "Loans")
    └── Columns: Date, PersonName, TransactionType, Amount, Description
```

## Need Help?

If you encounter issues:
1. Check the browser console for error messages
2. Verify Sheet name is exactly "Loans"
3. Confirm column headers match exactly
4. Check Service Account permissions
5. Refresh the page after making changes to the Google Sheet

---

**Note**: The Loans feature is completely separate from your expense tracking. Your expense data and loan data are stored in different sheets within the same Google Sheets file.

