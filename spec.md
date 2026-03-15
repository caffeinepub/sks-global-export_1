# SKS Global Export

## Current State
Version 69 is live. The app has GST Invoice auto-prefix but it only generates for GST invoices. Non-GST Invoice and Billing sequences are not getting the same auto-prefix logic. All three (GST Invoice, Non-GST Invoice, Billing) must have separate, independent prefix+sequence per company. Pickup Schedule currently shows Service and Product Details fields that are not needed. Sub-windows, dialogs, and print/invoice preview windows lack consistent width/height constraints and scrollbars for overflow content. The app is not fully responsive for tablet and mobile. There is no admin-controlled theme/color template system. User role/permission settings exist but designations (Delivery & Pickup, Receptionist, Supervisor, etc.) are not configurable. Backup/restore does not fully include theme settings or user designation data.

## Requested Changes (Diff)

### Add
- Invoice auto-prefix generator for Non-GST Invoice: same logic as GST (company initials + FY + sequence), separate prefix field
- Invoice auto-prefix generator for Billing: company initials + BILL + sequence (no FY), separate prefix field
- Each company has 3 independent prefix+sequence configurations: GST Invoice, Non-GST Invoice, Billing
- Settings > Appearance tab: admin-only theme templates (Minimal, Professional, Dark, Vibrant) and primary color picker
- Settings > Users tab: user designations (configurable list: Delivery & Pickup, Receptionist, Supervisor, Accountant, Manager, custom)
- User creation/edit form includes designation field dropdown
- Role-based permissions matrix in Settings > Users: per-role permission toggles for each module
- Backup/restore includes theme settings and user designations

### Modify
- Settings > Invoice Settings: show all three prefix/sequence panels (GST Invoice, Non-GST Invoice, Billing) with Auto-generate buttons for each
- Sub-windows and dialogs: add max-height with overflow-y-auto, max-width constraints, proper responsive sizing
- Print preview and invoice preview windows: fixed A4 dimensions with scroll wrapper
- Pickup Schedule form: remove Service Type and Product Details fields entirely; keep Name (required), Mobile (optional), Location (optional), Date (auto current), Time (default 6pm)
- App layout: sidebar collapses to hamburger on mobile, all tables/forms use responsive breakpoints

### Remove
- Service and Product Details fields from Pickup Schedule form

## Implementation Plan
1. Update SettingsPage.tsx: add Non-GST and Billing prefix auto-generation logic (matching GST logic pattern), update invoice sequence storage per company with three separate keys
2. Update POSBillingPage.tsx and InvoicesPage.tsx: use company-specific prefix for generating bill/invoice numbers
3. Update PickupsPage.tsx: remove serviceType, productDetails fields from form
4. Add global CSS/Tailwind responsive utilities: all dialogs get max-h-[90vh] overflow-y-auto, all tables get overflow-x-auto
5. Add theme system: CSS custom properties driven theme, Settings > Appearance tab with 4 presets + color picker, stored in localStorage, applied at app root, admin-only
6. Update Settings > Users: add designations list management, add designation field to user form, add permissions matrix per role
7. Update backup export/import: include themeSettings, userDesignations in backup payload
8. Ensure App.tsx applies theme CSS variables from stored settings on load
