# SKS Global Export

## Current State
The app has:
- `TariffManagementPage` — full CRUD for courier tariff rate entries (brand/zone/pricing slabs)
- `CustomersPage` with a `CustomerTariffDialog` — allows setting custom price overrides per tariff entry per customer, but it is a modal with no standalone CRUD page
- Customer tariff data is stored in `localStorage` via `getCustomerTariffMap` / `setCustomerTariffMap` keyed by `companyId` and `customerId`
- The `CustomerTariffAssignment` type has: `tariffId`, `brandName`, `productType`, `zone`, `customPrice`

## Requested Changes (Diff)

### Add
- A dedicated **Customer Tariff Rates** page (new sidebar entry under "Tariff Rates" or as a sub-section) that provides full CRUD for customer-tariff assignments:
  - **List view**: table showing all customer tariff assignments across all customers, filterable by customer name and brand
  - **Add**: dialog to select a customer (registered only), select a tariff entry (brand/productType/zone), and enter a custom price
  - **Edit**: inline or dialog edit of the custom price for an existing assignment
  - **Delete**: delete a single assignment with confirmation, and a "Clear All" for a customer
- The existing Tag icon in the Customers page (CustomerTariffDialog) should remain but can optionally link to the new page filtered to that customer

### Modify
- Sidebar navigation: add "Customer Tariffs" as a navigation entry (can be grouped near "Tariff Rates")
- The CustomerTariffDialog in CustomersPage should also show a "View All / Manage in Tariff Page" link that navigates to the new Customer Tariff Rates page filtered to that customer

### Remove
- Nothing removed — the existing CustomerTariffDialog stays as a quick-access shortcut

## Implementation Plan
1. Create `src/frontend/src/pages/CustomerTariffsPage.tsx` with:
   - Summary cards: total assignments, customers with custom rates, brands covered
   - Filter bar: by customer name, by brand
   - Table: columns = Customer, Brand, Product Type, Zone, Standard Rate, Custom Price, GST Inclusive, Actions (Edit / Delete)
   - Add button → dialog: select customer (dropdown from registered customers), select tariff entry (dropdown showing brand - productType - zone), enter custom price
   - Edit button → dialog: shows current tariff info, editable custom price field
   - Delete button → AlertDialog confirmation
   - "Clear Customer" button per customer row group or inline to remove all assignments for that customer
2. Read customer tariff map from `getCustomerTariffMap(activeCompanyId)` and tariffs from `getTariffs(activeCompanyId)` to resolve standard rates
3. Add "Customer Tariffs" to the sidebar navigation in `Sidebar.tsx` (use `Tags` or `UserCheck` icon, placed after "Tariff Rates")
4. In `CustomerTariffDialog` (CustomersPage.tsx), add a small "Manage in Customer Tariffs page" link button that sets a URL param or a navigation state to open the new page filtered by that customer
5. Apply deterministic `data-ocid` markers to all interactive elements
