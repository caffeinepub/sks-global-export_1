# SKS Global Export

## Current State
- Accounting page exists (AccountingPage.tsx) and is routed in App.tsx (case 'accounting')
- Sidebar Finance section only has Expenses and Reports — Accounting link is missing
- No EDD (Estimated Delivery Date) concept exists in the system
- Dashboard shows stats, pickups, low stock alerts

## Requested Changes (Diff)

### Add
- EDD (Estimated Delivery Date) configuration: per Product Type, City, State, and Metro zone
- EDD storage in localStorage (getEDDConfig/saveEDDConfig)
- EDD field on BillItem for courier AWB items — set at billing time
- EDD Management page/tab in Courier section (or Settings > Courier)
- Dashboard EDD Follow List: top-right panel showing overdue (EDD failed) and due-soon (within 12-24 hrs) courier shipments
- Toast/warning notifications for EDD approaching and EDD failures

### Modify
- Sidebar: Add `{ label: 'Accounting', icon: BookOpen, path: 'accounting' }` to Finance children
- BillItem type: add optional `eddDate?: string` field
- POSBillingPage: auto-calculate EDD when courier AWB item is added (lookup by product type/city/state/metro)
- DashboardPage: add EDD Follow List panel on the right side at the top
- CourierTrackingPage or new EDDPage: manage EDD rules

### Remove
- Nothing removed

## Implementation Plan
1. Add `eddDate` to BillItem type in types/index.ts
2. Add EDD config storage types and helpers in storage.ts
3. Add Accounting to Sidebar Finance children
4. Add EDD management tab in SettingsPage or a dedicated EDDConfigPage component
5. Update POSBillingPage to auto-set eddDate on courier items based on EDD rules
6. Update DashboardPage to add top-right EDD Follow List panel with overdue and warning states
