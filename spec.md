# SKS Global Export

## Current State

`PurchaseInvoicesPage.tsx` exists but has limited functionality:
- Create-only (no Edit, no Delete)
- View dialog (read-only)
- Excel export per invoice
- No print/PDF/JPEG/PNG download
- No search/filter controls
- No payment tracking details (partial payments)
- No GST breakdown per item (flat 18%)
- No notes/remarks field

`storage.ts` `exportAllData` / `importAllData` / `mergeImportData` are complete but do NOT include:
- `courierQueries` per company in export
- `designOrders`/`designPricing` keys are exported but NOT merged in `mergeImportData`
- AWB serials are exported but NOT merged in `mergeImportData`
- Pickups are exported but NOT merged in `mergeImportData`
- Tariffs are partially merged (only tariffs, not costTariffs or customerTariffs)
- No export of manual contacts (`sks_manual_contacts`)

`useAppStore` has `addPurchaseInvoice` but no `updatePurchaseInvoice` or `deletePurchaseInvoice`.

## Requested Changes (Diff)

### Add
- **Edit Purchase Invoice** — edit all fields (vendor, invoice no, date, items, payment status, notes). Stock adjustment on edit (reverse old qty, apply new qty for general products).
- **Delete Purchase Invoice** — with confirmation dialog. Reverse stock changes on delete.
- **Search & Filter** — search by invoice no or vendor name; filter by payment status and date range.
- **Notes/Remarks field** — free text on purchase invoice for internal notes.
- **Per-item GST rate** — instead of flat 18%, each item has its own GST rate selector (0, 5, 12, 18, 28%).
- **Payment details** — for partial status: amount paid field and balance calculated.
- **Print** — opens a clean A4 print popup with a professional purchase invoice layout (company letterhead, vendor details, items table with GST, totals, notes, payment status).
- **PDF download** — opens print popup (browser Save as PDF).
- **JPEG/PNG download** — uses browser Canvas API to capture invoice content and download.
- **Summary cards** — Total invoices, Total value, Paid, Pending amount cards at top.
- **Bulk actions** — select multiple invoices, mark as paid, export to Excel.
- **Excel export all** — export the full filtered list (not just single invoice).

### Modify
- `useAppStore` — add `updatePurchaseInvoice(inv)` and `deletePurchaseInvoice(id)` actions with localStorage persistence.
- `storage.ts` `mergeImportData` — add merging for: `awbSerials`, `pickups`, `costTariffs`, `customerTariffs`, `designOrders`, `designPricing`, `courierQueries`.
- `storage.ts` `exportAllData` — add `courierQueries_${cid}` to the export loop.
- `PurchaseInvoicesPage.tsx` — full rebuild with all new features above.

### Remove
- Nothing removed.

## Implementation Plan

1. **`useAppStore`** — add `updatePurchaseInvoice` and `deletePurchaseInvoice` to the store (read current file first to locate the purchase invoice slice).
2. **`storage.ts`** — fix `mergeImportData` to include all missing data types; fix `exportAllData` to include `courierQueries`.
3. **`PurchaseInvoicesPage.tsx`** — full rewrite:
   - Summary cards (total count, total value, paid total, pending total)
   - Search bar + Status filter + Date range filter
   - Table with checkboxes for bulk actions
   - Action buttons per row: View, Edit, Delete, Print, PDF, JPEG/PNG, Excel
   - Create/Edit dialog: vendor, invoice no, date, payment status, amount paid (if partial), notes; items section with per-item GST rate
   - View dialog: professional read-only layout with print/PDF/JPEG/PNG buttons
   - Print popup utility (same pattern as invoice templates already in app)
   - Bulk action toolbar: Mark Paid, Export Excel
   - Delete confirmation dialog
   - All `data-ocid` markers on interactive elements
