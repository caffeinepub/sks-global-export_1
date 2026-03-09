# SKS Global Export

## Current State
- Settings > Invoice tab shows GST and Non-GST invoice prefix fields (editable) but sequence numbers are display-only (read-only spans)
- Bill prefix and sequence are editable
- No Finance Year Closing feature exists
- Export backup exports per-company data correctly using SHARED_DATA_ID pattern
- Import backup (full restore and merge) exists but has issues: the backup export uses company.id as key but SHARED_DATA_ID ("shared") is actually used for all data, so import tries to restore per-company keys that don't match the actual stored keys
- Google Drive backup/restore calls exportAllData() which should be correct, but restore has the same key mismatch issue

## Requested Changes (Diff)

### Add
- Editable GST invoice sequence number field in Settings > Invoice (allows user to set next number, e.g. if currently at 94, keep it or change it)
- Editable Non-GST invoice sequence number field per company
- Finance Year Closing tab/section in Settings page with:
  - Display current FY (April to March)
  - Show summary: total bills, invoices, revenue for current FY
  - Close FY action: archives current data with FY label, resets invoice/bill sequences to 1, keeps master data (products, customers, vendors, tariffs)
  - FY history list showing past closed years

### Modify
- Settings > Invoice tab: Convert GST sequence and Non-GST sequence from read-only display to editable input fields with save button
- storage.ts exportAllData(): Fix to use SHARED_DATA_ID for all transactional data keys (bills, invoices, products, customers, vendors, courier brands, AWB serials, pickups, purchase invoices, tariffs, cost tariffs, customer tariffs, expenses, design orders, design pricing, courier queries, settings). Currently it iterates companies and uses company.id as key, but all data is stored under SHARED_DATA_ID
- storage.ts importAllData(): Fix to restore data to SHARED_DATA_ID key instead of per-company keys
- storage.ts mergeImportData(): Fix to read/write from SHARED_DATA_ID
- Also add manual contacts export/import to backup

### Remove
- Nothing removed

## Implementation Plan
1. Fix storage.ts exportAllData() - export transactional data using SHARED_DATA_ID key, also export manual contacts
2. Fix storage.ts importAllData() - import transactional data to SHARED_DATA_ID key, also restore manual contacts
3. Fix storage.ts mergeImportData() - merge transactional data from/to SHARED_DATA_ID
4. Update SettingsPage.tsx Invoice tab: Add editable inputs for GST sequence and Non-GST sequence with a "Set Sequence" save that writes directly to the localStorage keys
5. Add Finance Year Closing tab to Settings with FY summary, close action (with confirmation), and archived FY history stored in localStorage
6. Add setGSTInvoiceSeq() and setNonGSTInvoiceSeq() helper functions to storage.ts
