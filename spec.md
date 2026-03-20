# SKS Global Export

## Current State
Full-featured billing/business management platform. POS billing has critical tax calculation bugs where GST-inclusive vs GST-exclusive pricing is mishandled, causing wrong totals. Chartered Accounting module is referenced but not fully implemented as a standalone double-entry accounting system.

## Requested Changes (Diff)

### Add
- Full Chartered Accounting module (separate sidebar menu): double-entry journal entries, chart of accounts (assets/liabilities/income/expenses/equity), general ledger, trial balance, profit & loss statement, balance sheet, accounts receivable/payable tracking, bank reconciliation, auto-posting from bills/invoices/purchase invoices
- Export/Import backup: include all accounting/journal/ledger/chartOfAccounts data

### Modify
- **POS Billing Tax Calculation (CRITICAL FIX)**:
  1. `addCourierWithDetails`: For GST-inclusive tariffs, unitPrice should be the GST-inclusive total divided by qty (not the pre-GST base). totalPrice = qty × unitPrice always.
  2. `subtotalBeforeDiscounts` in bill totals: must use `i.totalPrice` (not `qty × i.unitPrice`) for correct sum
  3. Bill summary display: Do NOT show GST as a separate "+GST" line for items where price already includes GST. Instead show a breakdown line "Incl. GST (X%): ₹Y" as informational only, not added again
  4. `handleSaveBill`: Save `bill.subtotal` as GST-exclusive base (reverse-calculate from totalPrice), `bill.taxAmount` as total GST, `bill.total` = subtotal + tax + charges - discount
  5. BillsPage generateInvoice: use reverse-GST calculation `totalPrice * 100 / (100 + gstRate)` for subtotal, NOT sum of totalPrice
  6. Cart item model: unitPrice should ALWAYS equal totalPrice/qty (GST-inclusive unit price). Remove the pre-GST unitPrice inconsistency for couriers.
- Export/Import Backup: add `accountingJournal_shared`, `chartOfAccounts_shared`, `accountingSettings_shared` to exported keys

### Remove
- Nothing removed

## Implementation Plan
1. Fix all 5 tax calculation bugs in POSBillingPage.tsx (unitPrice consistency, subtotal calc, display, saved bill fields)
2. Fix BillsPage.tsx invoice generation subtotal calculation
3. Create AccountingPage.tsx with:
   - Chart of Accounts (add/edit/delete accounts: Assets, Liabilities, Capital, Income, Expenses)
   - Journal Entry (debit/credit double-entry, date, narration, auto-number)
   - General Ledger (per account, date-filtered)
   - Trial Balance (all accounts, debit/credit columns)
   - Profit & Loss Statement (income vs expenses, period selector, PDF/Excel)
   - Balance Sheet (assets vs liabilities+equity, PDF/Excel)
   - Auto-posting: when a bill/invoice is saved, auto-post journal entries (Debit: Accounts Receivable, Credit: Sales + GST Payable)
   - Bank Reconciliation tab
4. Add `accountingJournal_shared`, `chartOfAccounts_shared` to storage.ts KEYS and export/import functions
5. Add Accounting to sidebar under Finance group
