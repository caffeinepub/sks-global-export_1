# SKS Global Export

## Current State
Version 79 deployed. Courier booking has pincode/area dropdowns but the receiver area dropdown appears below both sender+receiver columns (outside the grid). Billed Products checkboxes for invoiced items are not disabled. Search fields show full dropdown lists without text filtering. Payment method doesn't pre-fill from bill when opening confirm dialog. Discount double-counting: subtotalBeforeDiscounts uses `i.totalPrice` (already post-discount) then subtracts discounts again.

## Requested Changes (Diff)

### Add
- Special Zone detection in courier booking: function mapping state → zone (North Zone: HP, J&K; East Zone: A&N Islands, NE states; South Zone: parts of Kerala & Goa; West Zone: parts of CG, MP, Vidarbha). Show zone badge after Metro/Non-Metro badge for receiver pincode.
- Dashboard Pay In / Pay Out quick-entry buttons (short window for unpaid invoice payment with customer name, payment method, amount, invoice list with auto-match and advance payment logic)

### Modify
- **POSBillingPage.tsx** (courier pincode layout): Move receiver area dropdown INSIDE the receiver pincode column div, same structure as sender (area dropdown appears immediately below receiver pincode field, same width). Add Special Zone badge after Metro/Non-Metro.
- **POSBillingPage.tsx** (discount fix): Fix `subtotalBeforeDiscounts` to use `i.quantity * i.unitPrice` (pre-discount gross) not `i.totalPrice`. This eliminates double-discount. Summary: Gross Subtotal - Item Discounts = Net Items Total - Bill Discount = Grand Total.
- **BillsPage.tsx** (payment method): In `openPaymentDialog`, pre-fill `setPaymentMethod(bill.paymentMethod || 'cash')` instead of hardcoding 'cash'.
- **InvoicesPage.tsx** (billed products disable): Add `disabled={item.isInvoiced}` to each row Checkbox in the billed products table. Also make `toggleAll` skip invoiced items.
- **InvoicesPage.tsx** (invoice payment sync): When invoice is marked paid/partially paid, propagate paymentStatus and paymentMethod back to related bills.
- All major Select/dropdown fields (customer select in InvoicesPage, product select, etc.): Convert to searchable combobox with text input filter + scrollable dropdown. Minimum: customer field in invoice generation and bill search must have text-type search.
- **Backup**: Include all new data in export/import/Google Drive.

### Remove
- Nothing removed

## Implementation Plan
1. Fix `subtotalBeforeDiscounts` in POSBillingPage to use pre-discount gross (quantity * unitPrice)
2. Fix receiver area dropdown layout — move inside receiver column
3. Add Special Zone detection function and badge display after Metro/Non-Metro
4. Fix `openPaymentDialog` in BillsPage to pre-fill payment method from bill
5. Disable invoiced item checkboxes in InvoicesPage billed products table
6. Add text-search filter to customer combobox in InvoicesPage and BillsPage
7. Propagate invoice payment info to related bills
8. Add Pay In / Pay Out buttons on dashboard
9. Ensure backup covers all data
