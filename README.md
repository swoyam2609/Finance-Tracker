# Expense Tracker MVP

A personal expense tracking application built with Next.js, NextAuth.js, and Google Sheets as the data backend.

## Features

- 🔐 Secure single-user authentication with NextAuth.js
- 📊 Real-time expense and income tracking with Google Sheets integration
- 💰 Account balance summaries (AXIS Bank, SBI Bank, Credit Card, Cash)
- 💚❤️ Color-coded balances (green for positive, red for negative)
- 📝 Add expenses with category selection from popular categories
- 💵 Income tracking with automatic category assignment
- ✏️ Edit existing transactions with modal popup
- 📈 Analytics dashboard with expenditure distribution
- 📅 Month-wise and overall expense analysis
- 📊 Category-wise expense breakdown with visual charts
- 💳 Account-wise income/expense breakdown
- 💰 Loans tracking system to monitor money lent to people
- 👥 Track loans per person with transaction history
- 💸 Record money lent, additional loans, and repayments
- 🌙 Modern dark theme for comfortable viewing
- 📱 Responsive design with Tailwind CSS
- 🔄 Automatic data synchronization with Google Sheets
- 🎨 Visual indicators for income (positive/green) vs expenses (negative/red)

## Tech Stack

- **Framework**: Next.js (Pages Router)
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js (Credentials Provider)
- **Data Storage**: Google Sheets API via `google-spreadsheet`
- **Language**: TypeScript

## Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v18 or higher) installed
2. **A Google Sheet** set up with the following columns in row 1:
   - Date
   - Account
   - Category
   - Description
   - Amount

3. **Google Service Account**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Sheets API
   - Create a Service Account and download the JSON key file
   - Share your Google Sheet with the Service Account email (with Editor permissions)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# --- NextAuth Configuration ---
NEXTAUTH_SECRET=your_nextauth_secret_here_generate_with_openssl
NEXTAUTH_URL=http://localhost:3000

# Credentials for single user auth
USER_EMAIL=your.email@example.com
USER_PASSWORD=your_secure_password

# --- Google Sheet Configuration ---
GOOGLE_SHEET_ID=your_google_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY_BASE64=your_base64_encoded_private_key
```

#### How to get each value:

- **NEXTAUTH_SECRET**: Generate a random secret:
  ```bash
  openssl rand -base64 32
  ```

- **USER_EMAIL & USER_PASSWORD**: Your login credentials for the app

- **GOOGLE_SHEET_ID**: Found in your Google Sheet URL:
  ```
  https://docs.google.com/spreadsheets/d/[THIS_IS_YOUR_SHEET_ID]/edit
  ```

- **GOOGLE_SERVICE_ACCOUNT_EMAIL**: Found in your Service Account JSON file (`client_email` field)

- **GOOGLE_PRIVATE_KEY_BASE64**: Base64 encode the private key from your Service Account JSON:
  ```bash
  # On macOS/Linux:
  echo -n "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n" | base64
  
  # Or use Node.js:
  node -e "console.log(Buffer.from('YOUR_PRIVATE_KEY_WITH_NEWLINES').toString('base64'))"
  ```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Login

Use the email and password you configured in `.env.local` to sign in.

## Usage

### Adding Transactions

#### Adding Expenses
1. Leave "Is it an Income" checkbox unchecked
2. Fill out the form: date, account, category (from dropdown), and amount
3. Optionally add a description
4. Click "Add Expense" to save to Google Sheets
5. Amount will be stored as negative and displayed in red

#### Adding Income
1. Check the "Is it an Income" checkbox
2. The category field will hide automatically
3. Fill out the form: date, account, and amount
4. Optionally add a description
5. Click "Add Income" to save to Google Sheets
6. Amount will be stored as positive and displayed in green

### Viewing Transactions

- All transactions (expenses and income) are displayed in the table on the right
- Most recent transactions appear at the top
- Income appears in green, expenses in red
- Account balances are shown in cards at the top of the page
- Positive balances are green, negative balances are red
- Click the edit icon (pencil) on any transaction to modify it

### Analytics Dashboard

1. Click the "Analytics" tab at the top of the page
2. Use the period dropdown to select:
   - **Overall**: View all-time statistics
   - **Specific Month**: View data for any month with recorded transactions
3. View key metrics:
   - Total Income, Total Expenses, Net Savings, Savings Rate
4. Expense breakdown by category with visual percentage bars
5. Account breakdown showing income, expenses, and net per account

### Loans Tracking

1. Click the "Loans" tab at the top
2. View total money lent and balances per person
3. Add loan transactions:
   - **Money Lent**: Record when you lend money to someone
   - **Additional Loan**: Add more money lent to same person
   - **Money Received**: Record repayments
4. Each person shows:
   - Current balance (amount owed to you)
   - Complete transaction history
   - Color-coded status (green = owe you, red = overpaid, gray = settled)

**Setup Required**: See `LOANS_SETUP.md` for Google Sheet setup instructions

### Account Balances

The dashboard displays balances for:
- AXIS Bank
- SBI Bank
- Credit Card
- Cash
- Total Balance (sum of all accounts)

## Project Structure

```
expense-tracker/
├── pages/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth].ts    # NextAuth configuration
│   │   └── expenses/
│   │       ├── get.ts               # Fetch expenses API
│   │       └── add.ts               # Add expense API
│   ├── _app.tsx                     # App wrapper with SessionProvider
│   ├── index.tsx                    # Main dashboard (protected)
│   └── login.tsx                    # Login page
├── lib/
│   └── google-sheet.ts              # Google Sheets utility functions
├── styles/
│   └── globals.css                  # Global styles with Tailwind
├── .env.local                       # Environment variables (create this)
├── .env.local.example               # Environment variables template
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript configuration
├── tailwind.config.js               # Tailwind CSS configuration
└── next.config.js                   # Next.js configuration
```

## API Routes

### GET `/api/expenses/get`
- **Authentication**: Required
- **Description**: Fetches all expenses from Google Sheets
- **Response**: Array of expense objects

### POST `/api/expenses/add`
- **Authentication**: Required
- **Description**: Adds a new transaction (expense or income) to Google Sheets
- **Body for Expense**: 
  ```json
  {
    "Date": "2025-10-03",
    "Account": "AXIS Bank",
    "Category": "Food & Dining",
    "Description": "Lunch",
    "Amount": "-500"
  }
  ```
- **Body for Income**: 
  ```json
  {
    "Date": "2025-10-03",
    "Account": "AXIS Bank",
    "Category": "Income",
    "Description": "Salary",
    "Amount": "50000"
  }
  ```
- **Note**: Positive amounts are income, negative amounts are expenses

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.local`
4. Update `NEXTAUTH_URL` to your production URL
5. Deploy

### Important Notes for Production

- Use strong passwords
- Consider implementing rate limiting
- For better security, hash the `USER_PASSWORD` using bcrypt before storing
- Regularly rotate your Google Service Account keys
- Keep your `.env.local` file secure and never commit it to version control

## Troubleshooting

### "Failed to fetch expenses"
- Check if Google Sheets API is enabled in your Google Cloud Console
- Verify the Service Account has access to your Google Sheet
- Ensure the private key is correctly base64 encoded

### "Unauthorized" error
- Check if your login credentials match those in `.env.local`
- Verify `NEXTAUTH_SECRET` is set

### Sheet not updating
- Confirm the sheet columns match exactly: Date, Account, Category, Description, Amount
- Check Service Account permissions (should be Editor)

## License

MIT

## Support

For issues and questions, please check:
1. Environment variables are correctly set
2. Google Service Account has proper permissions
3. Sheet columns are correctly named
4. Node.js version is v18 or higher

