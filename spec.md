# SKS Global Export

## Current State
- Multi-company billing software with full POS, invoicing, inventory, customers, vendors, reports, design studio, courier tracking, and more.
- Company switching reloads company-specific data (bills, invoices, products, customers, vendors, etc.) entirely per company.
- Customer form has: name, phone, email, GSTIN, address, customer type.
- Header top-right has: company switcher, notifications bell, user menu.
- No location link field on customers. No WhatsApp share from customer details.
- No quick-access contacts panel in the header.

## Requested Changes (Diff)

### Add
- **Location link field** on Customer add/edit form: a URL field where a Google Maps or any location link can be stored.
- **Copy location link button** in customer list row and in view dialog: one click copies the link to clipboard.
- **WhatsApp share button** for location link: opens `wa.me/?text=<encoded link>` in a new tab.
- **Quick Contacts panel** in the header top-right (between notifications bell and user menu):
  - Small icon button (Phone/Contacts icon) that opens a popover.
  - Two tabs: "Customers" and "Vendors" — lists names + mobile numbers pulled live from the customers/vendors store.
  - Search box within the popover.
  - A "Manual Contacts" tab where admin can manually add Name + Mobile pairs and they persist in localStorage (global, not company-specific).
  - Each manual contact has a delete button.
  - All contacts (customer, vendor, manual) show a WhatsApp chat quick-link.

### Modify
- **Company switching behavior**: currently loads per-company bills/invoices/products/customers/vendors. This must stay as-is (data IS per-company already — it reads from `sks_bills_<companyId>` etc.).
  - The user's complaint is that switching company changes "all data". This is correct behavior — each company has its own data.
  - What must be addressed: the user wants bills/customers/products to be **shared across companies** (one pool), and only company header info (name, address, GSTIN) + invoice sequences to change per company.
  - Implement a **"Shared Data" model**: bills, invoices, products, customers, vendors, inventory, AWB serials, pickups, purchase invoices, expenses, design orders, tariffs — all stored under a single shared key (not per company). Only company profile fields and invoice sequences are per-company.
  - `switchCompany` updates `activeCompanyId` (for header display and invoice seq) but does NOT reload products/customers/bills — those always read from shared storage.
- **Customer type `Customer`**: add optional `locationLink?: string` field.
- **Storage**: add `getManualContacts` / `setManualContacts` — global key `sks_manual_contacts`.

### Remove
- Nothing removed.

## Implementation Plan
1. Add `locationLink?: string` to `Customer` type in `types/index.ts`.
2. Add `getManualContacts` / `setManualContacts` to `storage.ts`.
3. Update `useAppStore.ts` `switchCompany` so it only updates company identity fields — shared data (products, customers, vendors, bills, invoices, etc.) is always read from a shared company ID ("shared") or the first company, not reloaded on switch.
   - Strategy: use a fixed shared storage key `"shared"` for all transactional data. Bills/customers/products are stored under `sks_bills_shared`, etc. Company switch only changes which company's profile/invoice-seq is active.
   - On first load/migration, move existing per-company data to `"shared"` key if `"shared"` key is empty.
4. Update `CustomersPage.tsx`:
   - Add `locationLink` input to add/edit form.
   - In table row actions: show copy link + WhatsApp icons when `locationLink` is set.
   - In view dialog: show location link with copy + WhatsApp buttons.
5. Update `Header.tsx`:
   - Add a Quick Contacts popover button (phone book icon) between bell and user menu.
   - Popover has 3 tabs: Customers (from store), Vendors (from store), Manual (from localStorage).
   - Manual contacts: add name + mobile form, list with delete. Stored globally.
   - All entries show WhatsApp quick-link icon.
