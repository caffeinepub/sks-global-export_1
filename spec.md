# SKS Global Export

## Current State
- `CourierBrand` type has a single `productType` string, one `serialLogic`, one `serialPrefix`, and one `transportModes`.
- Products page Courier Brands tab shows a flat list of brands.
- Inventory page Courier AWB tab groups AWB ranges by brand.
- No brand category (Courier vs Cargo), no per-brand product sub-list, no AWB prefix identification helper.

## Requested Changes (Diff)

### Add
- `category` field on `CourierBrand`: "Courier" | "Cargo" | "Both" — brand-level classification.
- New `CourierProduct` sub-type (stored in a `courierProducts` array on `CourierBrand`): each product has its own `productType`, `serialLogic`, `serialPrefix` (prefix letters/numbers that identify the AWB), `serialGap`, `transportModes`, `sellingPrice`, `gstRate`, `isActive`.
- AWB prefix field description/help text: "AWB numbers for this product start with this prefix (letters or numbers) to identify them — e.g. 'D' for DTDC D Express, '48' for Delhivery numeric prefix".
- Products page Courier Brands tab: brand row is expandable — click to show its product list inline with Add/Edit/Delete product actions per brand.
- Inventory AWB tab: "Add AWB Range" now requires selecting brand + product (not just brand), and the AWB range stores the productId as well.

### Modify
- `CourierBrand` type: add `category: "Courier" | "Cargo" | "Both"`, add `courierProducts?: CourierProduct[]` array.
- Products page Add/Edit Courier Brand dialog: add Category dropdown, and a section to manage brand products (list + Add/Edit/Delete product inline or via sub-dialog).
- `AWBSerialRange`: add optional `productId` and `productTypeName` fields.
- Inventory Add AWB Range dialog: add Product dropdown (filtered by selected brand's products).
- POS Billing courier booking: when a brand has `courierProducts`, show a product selector step before AWB entry.

### Remove
- Top-level `productType`, `serialLogic`, `serialGap`, `serialPrefix`, `transportModes` fields from `CourierBrand` are kept for backward compatibility with existing data, but new brands should use `courierProducts` array instead.

## Implementation Plan
1. Update `CourierBrand` type: add `category`, add `courierProducts?: CourierProduct[]`.
2. Add `CourierProduct` interface to types/index.ts.
3. Update `AWBSerialRange` type: add `productId?`, `productTypeName?`.
4. Update ProductsPage.tsx:
   - Add Category field to Add/Edit Courier Brand form.
   - Add expandable brand row showing product list.
   - Add/Edit/Delete products within a brand via a sub-dialog.
5. Update InventoryPage.tsx:
   - Add Product dropdown in Add AWB Range dialog (when selected brand has courierProducts).
   - Show product name in AWB range rows.
6. Update POSBillingPage.tsx: when a brand has courierProducts, show product select before AWB entry.
7. Seed/migrate: existing brands without courierProducts keep working (fallback to top-level fields).
