# Dark Theme Implementation Guide

## Overview

The Expense Tracker application has been converted to a comprehensive dark theme for better visual comfort and modern aesthetics.

## Color Scheme

### Background Colors
- **Primary Background**: `bg-gray-900` (Very dark gray for main background)
- **Card/Panel Background**: `bg-gray-800` (Dark gray for cards, modals, forms)
- **Alternate Background**: `bg-gray-700` (Slightly lighter for inputs and nested elements)

### Text Colors
- **Primary Text**: `text-gray-100` (Near white for main content)
- **Secondary Text**: `text-gray-200` (Slightly muted white)
- **Tertiary Text**: `text-gray-300` (Medium gray for labels)
- **Muted Text**: `text-gray-400` (Light gray for placeholders and secondary info)

### Border Colors
- **Primary Borders**: `border-gray-700` (Visible but subtle)
- **Secondary Borders**: `border-gray-600` (For inputs and form elements)

### Accent Colors
- **Primary Accent**: Indigo (`indigo-500`, `indigo-600`, `indigo-700`)
- **Success/Positive**: Green (`green-600`)
- **Error/Negative**: Red (`red-600`, `red-700`, `red-200` for text)
- **Warning**: Red tones
- **Info**: Blue tones

## Components Styled

### 1. Login Page (`pages/login.tsx`)
- Dark gradient background (gray-900 to gray-800)
- Dark card background (gray-800)
- Border highlight (gray-700)
- Dark form inputs (gray-700 background)
- Error messages with dark red background

### 2. Main Dashboard (`pages/index.tsx`)

#### Header
- Background: `bg-gray-800`
- Border: `border-gray-700`
- Text: `text-gray-100`

#### Tab Navigation
- Active tab: Indigo accent with border
- Inactive tab: Gray text with hover effect

#### Account Balance Cards
- Background: `bg-gray-800`
- Text: Color-coded (green for positive, red for negative)
- Total card: Indigo gradient

#### Forms (Add Transaction, Add Loan)
- Card background: `bg-gray-800`
- Input backgrounds: `bg-gray-700`
- Input text: `text-gray-100`
- Labels: `text-gray-300`
- Borders: `border-gray-600`

#### Tables (Transactions, Loans)
- Header background: `bg-gray-900`
- Row background: `bg-gray-800`
- Hover state: Slightly lighter gray
- Text: `text-gray-100`

#### Modals (Edit Transaction)
- Overlay: `bg-black/70` (70% opacity)
- Modal background: `bg-gray-800`
- Border: `border-gray-700`

#### Analytics Tab
- Summary cards: `bg-gray-800`
- Charts: Indigo progress bars
- Period selector: Dark dropdown

#### Loans Tab
- Summary card: Gradient (indigo-500 to purple-600)
- Person cards: `bg-gray-800`
- Transaction badges: Color-coded
- Amount text: Blue for lent, green for received

### 3. Global Styles (`styles/globals.css`)
- Base background: `bg-gray-900`
- Base text: `text-gray-100`

## Special Styling Notes

### Color-Coded Elements
These maintain their color coding in dark theme:
- **Green** (`text-green-600`): Positive balances, income, received payments
- **Red** (`text-red-600`): Negative balances, expenses, errors
- **Blue** (`text-blue-600`): Money lent
- **Purple** (`bg-purple-600`): Additional loans badge

### Error Messages
- Background: `bg-red-900/50` (50% opacity)
- Border: `border-red-700`
- Text: `text-red-200`

### Focus States
- Ring color: `ring-indigo-500`
- Ring offset: `ring-offset-gray-800` (dark background aware)

### Button Styles
- Primary buttons: `bg-indigo-600 hover:bg-indigo-700`
- Cancel buttons: `bg-gray-100 hover:bg-gray-200 text-gray-800`
- Sign out: `bg-red-600 hover:bg-red-700`

## Accessibility

### Contrast Ratios
All text colors meet WCAG AA standards for contrast against their backgrounds:
- `text-gray-100` on `bg-gray-900`: High contrast
- `text-gray-300` on `bg-gray-800`: Good contrast for labels
- `text-gray-400` on `bg-gray-700`: Sufficient for placeholders

### Focus Indicators
- Visible focus rings on all interactive elements
- Ring offset accounts for dark backgrounds
- 2px ring width for visibility

## Customization

To adjust the dark theme:

### Change Darkness Level
Edit `styles/globals.css`:
```css
body {
  @apply bg-gray-900 text-gray-100; /* Change gray-900 to gray-800 for lighter
}
```

### Change Accent Color
Replace all `indigo` classes with your preferred color:
- `indigo-500` → `blue-500` (or any Tailwind color)
- `indigo-600` → `blue-600`
- `indigo-700` → `blue-700`

### Adjust Card Backgrounds
Replace `bg-gray-800` with:
- `bg-gray-900` for darker cards
- `bg-gray-700` for lighter cards

## Browser Compatibility

The dark theme works across all modern browsers:
- Chrome/Edge 90+
- Firefox 90+
- Safari 14+

## Performance

- No runtime overhead (pure CSS classes)
- All colors are standard Tailwind utilities
- No custom CSS or JavaScript required

## Future Enhancements

Possible improvements:
1. **Theme Toggle**: Add a button to switch between light/dark
2. **Auto Theme**: Respect system preference (`prefers-color-scheme`)
3. **Custom Theme Colors**: Allow users to choose accent colors
4. **High Contrast Mode**: Option for WCAG AAA compliance

## Summary

The dark theme provides:
- ✅ Consistent visual hierarchy
- ✅ Reduced eye strain in low-light conditions
- ✅ Modern, professional appearance
- ✅ Maintained color-coding for data visualization
- ✅ Accessible contrast ratios
- ✅ Smooth, cohesive user experience

