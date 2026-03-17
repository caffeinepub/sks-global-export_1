# SKS Global Export

## Current State
- Quick Actions floating button (⚡) exists at bottom-right in App.tsx
- Bills edit opens a simple dialog with only payment status, method, amount fields
- POS Billing has no billing number display next to Date
- Courier tariff rate items in POS sometimes show without tax
- No task management system exists
- Backup/restore covers all entities A-Z

## Requested Changes (Diff)

### Add
- **Keyboard Shortcuts**: Global keyboard shortcuts to replace Quick Actions button:
  - Alt+B = New Bill (navigate to POS billing)
  - Alt+C = Customers
  - Alt+P = Schedule Pickup
  - Alt+I = New Invoice
  - Alt+Q = Query Follow-up
  - Alt+D = Dashboard
  - Show shortcut hint toast when user presses Alt+? or floating help icon in top-right
- **Billing Number in POS**: Show bill number (e.g. SKSBILL0023) next to the date field at top of POS — editable, auto-generated, with full CRUD
- **Task Management System** (`TasksPage` + `TasksIcon` in header):
  - Admin creates tasks manually (title, description, assigned employee, priority, due date, source: Manual/Query Follow-up/etc.)
  - Task states: Pending → Noted → Done
  - Employee sees task window; first button is "Noted" (acknowledges task). After clicking Noted, button changes to "Done".
  - If all tasks are Done, window does not show again automatically
  - Task icon placed in header next to the contacts book icon
    - Icon is RED if any tasks are pending/noted
    - Icon is GREEN if all tasks are done or no tasks
  - On employee login: if there are pending/noted tasks, auto-show the task window once per session
  - Notification toast (non-intrusive, top-right): 
    - When a new task is assigned: "Your Boss assigned a task for you" (shown before Noted is clicked)
    - After Noted: "Your task is pending"
    - Show once per session, does not block work
  - Tasks can be created from Query Follow-up page with a button "Create Task from Query"
  - Task list shows: title, description, priority, due date, assigned by, source, status
  - Admin can view all tasks (all employees); employees see only their own tasks
  - CRUD for tasks (admin: create/edit/delete; employee: update status only)
- **Backup**: Include tasks data in all export/import/Google Drive sync operations

### Modify
- **Bills Edit → Open POS in Edit Mode**: When clicking Edit on a bill in BillsPage, instead of opening a limited edit dialog, navigate to POSBillingPage with the bill's data pre-loaded (all products, quantities, customer, payment details). Changes are saved back as a bill update. If the bill has a linked invoice, prompt to update the invoice as well.
- **POS Tax Bug Fix**: All items in POS must show tax amount. Courier tariff rate items must always display with GST amount. Fix the logic so: if `isGSTInclusive=true`, show breakdown (base + GST = total); if `isGSTInclusive=false`, add GST on top and show total with tax. Ensure no item is added to bill without correct tax calculation.
- **Invoice Sync on Bill Edit**: After editing a bill that has a linked invoice (matching bill number or customer + date), prompt user: "This bill has a linked invoice. Update invoice totals too?" — if yes, update the invoice amounts to match.
- **Remove Quick Actions floating button** from App.tsx entirely.

### Remove
- Quick Actions floating ⚡ button and all related state (quickOpen, quickRef) from App.tsx

## Implementation Plan
1. **App.tsx**: Remove Quick Actions button and state. Add `useEffect` for global `keydown` listener for Alt+B/C/P/I/Q/D shortcuts. Add keyboard shortcut help tooltip near header.
2. **POSBillingPage.tsx**: Add billing number field next to Date at top (auto-generated from sequence, editable). Add `editBillId` prop support so the page loads a bill's items/customer/notes when editing. After save in edit mode, call `updateBill()` instead of `addBill()`. Check for linked invoice and prompt sync.
3. **BillsPage.tsx**: Change Edit button to navigate to `billing/edit/:billId` (or pass state) instead of opening dialog. Remove the limited edit dialog.
4. **POSBillingPage tax fix**: Audit `addItemToCart` and courier booking logic — ensure `gstAmount`, `taxableAmount`, and `totalPrice` are always correctly set. Courier tariff: always compute `basePrice = tariffPrice / (1 + gstRate/100)` when inclusive, then `gstAmount = basePrice * gstRate/100`, `totalPrice = basePrice + gstAmount`.
5. **TasksPage.tsx**: New page with Admin view (create/manage tasks, assign to employees) and Employee view (see own tasks, click Noted → Done). Include filters by status/priority/employee.
6. **Header.tsx**: Add task bell/clipboard icon next to contacts icon. Color it red/green based on task state for current user. On icon click, open task panel/page.
7. **App.tsx task session logic**: On login, check if current user has pending/noted tasks → auto-open task window once. Show toast notification.
8. **CourierQueriesPage.tsx**: Add "Create Task" button on each query to quickly create a task from that query.
9. **Backup/Restore (SettingsPage.tsx)**: Include `tasks` array in export data object and restore it on import/merge.
