# Quick Setup Guide

Follow these steps to get your Expense Tracker running:

## Step 1: Google Sheet Setup

1. Create a new Google Sheet
2. In the first row, add these exact column headers:
   - `Date`
   - `Account`
   - `Category`
   - `Description`
   - `Amount`

## Step 2: Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable "Google Sheets API":
   - Click "Enable APIs and Services"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create Service Account:
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Give it a name (e.g., "expense-tracker")
   - Click "Create and Continue"
   - Skip role assignment (optional)
   - Click "Done"
5. Create and Download Key:
   - Click on your new service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create New Key"
   - Choose "JSON"
   - Download the JSON file
6. Share your Google Sheet:
   - Open your Google Sheet
   - Click "Share"
   - Paste the service account email from the JSON file (looks like: `name@project-id.iam.gserviceaccount.com`)
   - Give it "Editor" access
   - Uncheck "Notify people"
   - Click "Share"

## Step 3: Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and fill in:

   ```bash
   # Generate this:
   NEXTAUTH_SECRET=$(openssl rand -base64 32)
   NEXTAUTH_URL=http://localhost:3000

   # Your login credentials (make them secure!):
   USER_EMAIL=your@email.com
   USER_PASSWORD=your_secure_password

   # From your Google Sheet URL:
   # https://docs.google.com/spreadsheets/d/[COPY_THIS_ID]/edit
   GOOGLE_SHEET_ID=your_sheet_id_here

   # From the JSON file you downloaded:
   GOOGLE_SERVICE_ACCOUNT_EMAIL=name@project-id.iam.gserviceaccount.com

   # Base64 encode the private key from JSON:
   # Copy the "private_key" value from JSON file (including \\n characters)
   # Then encode it:
   GOOGLE_PRIVATE_KEY_BASE64=$(echo -n "PASTE_PRIVATE_KEY_HERE" | base64)
   ```

### Encoding the Private Key (Important!)

Open your downloaded JSON file and find the `private_key` field. It will look like:
```json
"private_key": "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBA...\\n-----END PRIVATE KEY-----\\n"
```

**Option 1 - Using Terminal (macOS/Linux):**
```bash
# Copy the entire private key value (with \\n) and run:
echo -n "-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n" | base64
```

**Option 2 - Using Node.js:**
```bash
node -e "const key = 'PASTE_PRIVATE_KEY_HERE'; console.log(Buffer.from(key).toString('base64'))"
```

**Option 3 - Manual:**
1. Copy the entire `private_key` value from JSON (including \\n characters)
2. Go to https://www.base64encode.org/
3. Paste and encode
4. Copy the result to your `.env.local`

## Step 4: Run the Application

```bash
# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

Open http://localhost:3000 in your browser and log in with your credentials!

## Troubleshooting

### "Cannot find module 'google-auth-library'"
```bash
npm install google-auth-library
```

### "Failed to fetch expenses"
- Make sure the Service Account email has access to your Google Sheet
- Verify Google Sheets API is enabled
- Check that the private key is correctly base64 encoded

### "Unauthorized" when logging in
- Double-check your `USER_EMAIL` and `USER_PASSWORD` in `.env.local`
- Make sure `NEXTAUTH_SECRET` is set

### Sheet not updating
- Verify column headers match exactly: Date, Account, Category, Description, Amount
- Check Service Account has "Editor" permissions

### Module not found errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. ✅ Log in with your credentials
2. ✅ Add your first expense
3. ✅ Check that it appears in your Google Sheet
4. ✅ View your account balances

Enjoy tracking your expenses! 🎉

