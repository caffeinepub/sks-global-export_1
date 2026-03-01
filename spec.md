# SKS Global Export

## Current State
- Full-stack billing/POS application with localStorage persistence
- Auth system uses btoa hashing. New employees created via Admin Panel use `hashPassword()` from helpers.ts (which is also btoa), but the `addUser` action in `useAppStore` calls `hashPassword(user.passwordHash)` - this double-hashes new users, making their passwords unverifiable at login
- Courier POS tab shows brands in a list with service mode selector and Add button; no sender/receiver/weight/volumetric form
- No auto-save indicator; no Google Drive backup integration
- `seedInitialData` ensures admin/operator always exist, but double-hashing bug breaks newly created employee logins

## Requested Changes (Diff)

### Add
1. **Auto-save indicator (non-intrusive top bar pill)** -- small fixed pill at top-center showing "Saving..." spinner when a write is in progress, "Saved" checkmark on success (fades after 2s). Must not block UI or interrupt workflow.
2. **Google Drive auto-backup every 5 minutes** -- Settings > Backup section with "Connect Google Drive" button (uses Google Identity Services / gapi). Once connected, exports all data JSON and uploads to user's Drive every 5 min silently. Shows last backup time + status pill.
3. **POS Courier tab: Brand Cards with logo + Courier Detail Form** -- Replace list view with brand logo cards grid (brand-colored initials logo or actual logo). Clicking a brand opens an inline form/drawer with:
   - Sender details (name, phone, address)
   - Receiver details (name, phone, address, pincode)
   - Weight (kg) field
   - Dimensions (L x W x H cm) fields with auto-calculated volumetric weight (L×W×H/5000)
   - Product type (Document, Parcel, etc.)
   - Mode of transport (Air / Surface / GEC, from brand's serviceModes)
   - Price calculation panel: base price, GST, total - updates live
   - AWB serial display (next available)
   - "Add to Bill" button
4. **Login fix: new employee passwords** -- Fix double-hashing bug so newly created users can log in

### Modify
1. **useAppStore `addUser`** -- Remove the extra `hashPassword()` call on `passwordHash` (password is already hashed by caller via AdminPage)
2. **AdminPage `addUser` call** -- Ensure password is hashed exactly once before calling store's `addUser`
3. **POSBillingPage courier tab** -- Rewrite to show brand cards, open courier detail form on click
4. **App.tsx** -- Add auto-save context/hook that triggers save indicator when any storage write occurs; add 5-min backup timer when Google Drive is connected

### Remove
- Nothing removed

## Implementation Plan
1. Fix double-hash bug: in `useAppStore.addUser`, remove the `hashPassword()` wrapping (password already comes pre-hashed from AdminPage). Audit AdminPage to ensure it hashes once.
2. Create `useAutoSave` hook that wraps localStorage writes and emits save events; add `SaveIndicator` component (fixed top-center pill) that listens to those events.
3. Create `useGoogleDriveBackup` hook:
   - Loads Google Identity Services script dynamically
   - Provides `connect()`, `disconnect()`, `backupNow()` functions
   - Runs `backupNow()` every 5 minutes if connected
   - Stores token + connection state in localStorage
4. Update SettingsPage Backup tab to show Drive connection UI, last backup time, manual backup button
5. Rewrite POSBillingPage courier tab:
   - Show brand cards in a grid (colored initial logo, brand name, product type, price)
   - On card click: set `selectedBrand` state, show CourierDetailForm below/overlay
   - CourierDetailForm: sender/receiver fields, weight, L/W/H, productType select, transport mode select
   - Live price calc: base + GST = total
   - "Add to Bill" calls existing `addCourierProduct` logic with enriched BillItem
6. SaveIndicator integrated into App.tsx layout (above main content, z-50)
