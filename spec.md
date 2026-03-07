# SKS Global Export

## Current State
- Full-stack billing/POS app with multi-company, multi-user support
- Inventory page shows General Products (read-only stock view + add stock button) and Courier AWB serials with add range button — no Edit or Delete on stock items or AWB ranges
- POS Billing assigns AWB serials automatically (next available from inventory) for partner courier brands
- No discount field on bill items or bill total
- No additional charges (packing, pickup, old balance, wastage) on bills
- Bill types: General, Courier AWB, Xerox, Services
- BillItem type has: id, productId, productType, productName, description, quantity, unit, unitPrice, totalPrice, gstRate, and courier-specific fields
- Bill type has: subtotal, total, paymentMethod, paymentStatus, amountPaid, balanceDue

## Requested Changes (Diff)

### Add
1. **Stock Management CRUD**: Edit and Delete actions on General Product stock entries (edit name, category, unit, selling price, purchase price, gst rate, HSN code, min stock alert, current stock). Delete with confirmation. Also Edit and Delete on AWB Serial Ranges (edit purchase date, from/to serial, quantity, vendor; delete with confirmation).
2. **POS Discount**: Per-item discount field (amount in ₹ or % toggle). Bill-level total discount field. When discount applied, show discounted price; original price struck through.
3. **POS Additional Charges**: A section below bill items with checkboxes for: Packing Charge, Pickup Charge, Old Balance, Wastage Charge. Each has:
   - A label, an amount input field
   - A "Show in Bill" toggle: if ON, it appears as a separate line item in the printed/saved bill; if OFF, the charge is silently added/distributed proportionally into the existing product amounts (not shown as separate line)
   - Charges can be positive (add to total) or negative (deduct from total)
4. **POS Courier Manual AWB Entry**: For partner brands (non-own-brand), replace the auto-assign logic with a manual input/scan field. When user clicks a courier brand card:
   - Show an AWB number input field with a "Scan / Enter AWB" placeholder
   - User types or scans the AWB number manually
   - On entry (blur or Enter key), validate:
     a. Check if AWB exists in inventory stock (awbSerials available serials) — if not in stock, show warning but allow override with confirmation
     b. Check if AWB was already used in a saved bill — if yes, block and show previous sender name + date
     c. Check if AWB already added in current unsaved bill — if yes, block
   - If stock match found, consume from inventory; if not in stock but user confirms override, add to bill without consuming inventory
5. **BillItem type update**: Add `discountType?: 'amount' | 'percent'`, `discountValue?: number`, `discountAmount?: number` fields
6. **Bill type update**: Add `billDiscount?: number` (total bill discount), `additionalCharges?: AdditionalCharge[]`
7. **New AdditionalCharge type**: `{ id, label, amount, showInBill: boolean, adjustType: 'proportional' | 'product' | 'courier' | 'service' }`

### Modify
1. **InventoryPage.tsx**: Add Edit (pencil icon) and Delete (trash icon) buttons to each General Product row and each AWB serial range row. Edit opens a dialog pre-filled with current values. Delete shows confirmation dialog.
2. **POSBillingPage.tsx**:
   - Add per-item discount UI in the bill item card (small % or ₹ toggle + input)
   - Add Additional Charges section between bill items and the summary panel
   - Courier tab: replace auto-assign with manual AWB input field; show stock check result inline
   - Bill Summary: show subtotal, item discounts subtracted, additional charges (show-in-bill ones), bill discount, then final total
3. **Bill calculation**: subtotal = sum of item totals after item discounts; add visible charges; subtract bill discount; final total
4. **handleSaveBill**: include additionalCharges and discounts in saved Bill object; for hidden charges, distribute amount into item totalPrices proportionally before saving

### Remove
- Nothing removed; existing functionality preserved

## Implementation Plan
1. **types/index.ts**: Add `AdditionalCharge` interface; extend `BillItem` with discount fields; extend `Bill` with `billDiscount` and `additionalCharges` fields
2. **InventoryPage.tsx**: 
   - Add `editProduct/deleteProduct` from store; add edit/delete dialogs for General Products
   - Add `deleteAWBSerial` to store (useAppStore); add edit/delete for AWB ranges
3. **useAppStore.ts**: Add `deleteAWBSerial` action
4. **storage utils**: Ensure deleteAWBSerial is available
5. **POSBillingPage.tsx**:
   - Per-item discount: add discount toggle (% vs ₹) and input per bill item; recalculate totalPrice = qty × unitPrice × (1 - discount%)
   - Additional Charges section: list of charge rows with checkbox (show in bill), label, amount input; manage state as array
   - Courier manual AWB: remove auto-assign; add awbInput state per brand; validate on blur/Enter; show stock status badge
   - Bill summary recalculation with discounts and charges
   - Save bill: distribute hidden charges into items proportionally; save visible charges separately
