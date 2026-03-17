# SKS Global Export

## Current State
Full-featured billing/invoicing app with GST/Non-GST invoices, POS billing, courier management, AWB tracking, backup/restore, and more.

## Requested Changes (Diff)

### Add
1. **Invoice Date Range Filter** — In GST/Non-GST invoice generation dialog, add "From Date" and "To Date" fields for filtering bills. When date range is selected, it appears on the invoice. If not selected, no date range shown.
2. **Courier Status in Invoice/Billing** — Show courier AWB status (Booked/In Transit/Out for Delivery/Delivered/RTO/Exception) alongside existing Brand Name and Mode of Transport in invoice line items. Add toggle option in billing/invoice generation to show or hide courier status.
3. **Bulk Courier Status Update** — New section/tab for updating courier status:
   - Individual status update per AWB
   - Bulk update via Excel file (only AWB No column required)
   - Sample Excel file download
   - Filtered list with Brand and Status filters
   - Export filtered list as Excel
4. **Logo Size Increase** — Increase company logo size in billing receipts and all invoice templates.
5. **Backup/Restore updates** — All new fields (date range, courier status, bulk status updates) included in export/import and Google Drive sync.

### Modify
- InvoicesPage.tsx: Add date range fields to invoice generation, add courier status show/hide toggle
- POSBillingPage.tsx: Show courier status in line items, option to apply/hide status
- CourierTrackingPage.tsx or new page: Add bulk status update tab with Excel upload
- All invoice print/PDF templates: Increase logo size, show courier status if enabled
- SettingsPage.tsx: Ensure new data fields in backup/restore

### Remove
- Nothing removed

## Implementation Plan
1. Add `courierStatus` field to booked courier items in bill/invoice data model
2. Add date range (fromDate/toDate) fields to invoice generation form
3. Show date range in invoice templates when provided
4. Add `showCourierStatus` toggle in billing POS and invoice generation
5. Display Brand Name + Mode + Status in invoice line items when toggle is ON
6. Add "Courier Status" tab or section in CourierTrackingPage for individual + bulk updates
7. Bulk update: Excel upload with AWB No column, parse and update matching bills
8. Sample Excel download for bulk status update
9. Filter list by Brand and Status with Excel export
10. Increase logo img size in bill print template and all 3 invoice templates
11. Include all new data in backup export/import
