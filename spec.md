# SKS Global Export

## Current State
Full-featured courier + billing management app. Version 61 in production. Key files:
- `POSBillingPage.tsx` — POS billing with slab/tier pricing, discounts, courier booking
- `InvoicesPage.tsx` — Invoice generation, 3 templates, invoice history with edit
- `ProductsPage.tsx` — Product CRUD with MRP, pricing tiers, slabs
- `barcodeLoader.ts` — Loads QRCode from CDN (unpkg) — fails in deployed environment
- Invoice edit dialog — only allows editing paymentStatus, paymentMethod, notes

## Requested Changes (Diff)

### Add
- `priceIncludesGST?: boolean` field to `GeneralProduct`, `XeroxProduct`, `ServiceProduct` in types
- MRP display in POS product cards (show MRP alongside selling price)
- Price type indicator in product form: "Price includes GST" / "Price excludes GST" toggle
- Full invoice edit: editable fields for Date, Invoice No, Customer Name, Customer Address, Customer GSTIN, Payment Status, Payment Method, Notes, and inline item editing (productName, description, qty, unitPrice, gstRate)
- Self-contained QR code generation (replace CDN-based barcodeLoader QR with bundled pure-JS implementation using qrcode npm package)

### Modify
- **Slab price display in POS**: The `Slab ×N` badge only shows when `slabPrice !== gp.sellingPrice`. Fix: always show the slab badge when `usePricingSlabs === true` and slabs exist, regardless of whether resolved price equals base price. Also ensure the product card shows the resolved slab price at qty=1 prominently.
- **Invoice Unit Price → Unit Rate**: In GST invoice templates (all 3 templates), rename column "Unit Price" to "Unit Rate". The Unit Rate must be the GST-EXCLUDING price: if item stores price including GST, calculate `unitRate = totalPrice / quantity / (1 + gstRate/100)`. The Amount column should also show the pre-GST amount, and GST is added in the totals section.
- **Billed product invoice unit price**: When invoice is created from billed products, if an item has discountAmount, the effective unit rate shown in invoice should be `(totalPrice / quantity)` not the original `unitPrice`. Store this as `effectiveUnitRate` on the invoice item, and display `effectiveUnitRate` instead of `unitPrice` in all invoice templates.
- **Invoice QR code**: Replace `barcodeLoader.ts` QR loading (CDN-based) with bundled qrcode npm package. The `QRCodeDisplay` component and `generateQRDataUrl` utility should use the npm package directly via `import QRCode from 'qrcode'`.
- **Export/Import Backup**: Ensure `priceIncludesGST` field is included when products are exported and restored.
- Products page: Add "Price includes GST" checkbox/toggle in General Product, Xerox, and Service product forms. When checked, show note "Selling price entered includes GST".

### Remove
- CDN fallback for QRCode loading (replace entirely with npm bundled version)

## Implementation Plan
1. Update `barcodeLoader.ts` to use `import QRCode from 'qrcode'` instead of CDN; update `QRCodeDisplay.tsx` and `generateQRDataUrl` helper
2. Update `types/index.ts`: add `priceIncludesGST?: boolean` to GeneralProduct, XeroxProduct, ServiceProduct; add `effectiveUnitRate?: number` to InvoiceItem / BillItem when used in invoice
3. Update `ProductsPage.tsx`: add `priceIncludesGST` toggle in product forms
4. Update `POSBillingPage.tsx`: fix slab badge to always show when slabs active; show MRP in product cards
5. Update `InvoicesPage.tsx`:
   a. When generating invoice from billed items, compute `effectiveUnitRate = totalPrice / quantity` per item
   b. Rename "Unit Price" → "Unit Rate" in all 3 templates
   c. For GST invoices: display Unit Rate as pre-GST value = `effectiveUnitRate / (1 + gstRate/100)` (or `totalPrice / qty / (1 + gstRate/100)`)
   d. Expand invoice edit dialog to support full editing: date, invoiceNo, customerName, customerAddress, customerGstin, paymentStatus, paymentMethod, notes, and per-item editing (productName, description, qty, unitPrice, gstRate) with recalculated totals
6. Verify backup export/import includes `priceIncludesGST`
