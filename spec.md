# SKS Global Export

## Current State
- Auth uses localStorage for ACTIVE_USER, so session persists after browser/tab close
- EDD Management Page exists but may render blank due to a routing or lazy-init issue
- Courier booking form has no Eway Bill or Risk Surcharge fields
- BillItem has no eWayBillNo, itemValue, riskSurchargeType, riskSurchargeAmount fields
- Backup/restore exists with comprehensive data export

## Requested Changes (Diff)

### Add
- Eway Bill No field in courier booking when item value > Rs.49999 (Tamilnadu: > Rs.99999)
- Risk Surcharge selection (Owner Risk / Carrier Risk) when Eway Bill is required
- Risk Surcharge calculation:
  - Owner Risk: 0.1%–0.3% of value + 18% GST (tiered by value)
  - Carrier Risk: 1%–3% of value + 18% GST (tiered by value)
  - Tiers: <=1L = low rate, <=5L = mid rate, >5L = high rate
- Risk Surcharge amount auto-added to courier item total
- Risk Surcharge description in invoice item: ReceiverName + Pincode + Weight + ItemValue + ✓ (Risk Surcharge applied) + Date
- Booking slip to show: EwayBillNo, Risk Surcharge type/amount, Declared Value
- New fields on BillItem: itemValue, eWayBillNo, riskSurchargeType, riskSurchargeAmount
- Backup includes all new fields automatically (raw snapshot covers it)

### Modify
- ACTIVE_USER storage: switch from localStorage to sessionStorage so auth clears on window/tab close
- EDD Management Page: fix blank page issue by ensuring state initializes synchronously
- Courier booking form: add Item Value (Rs.), Eway Bill No (conditional), Risk Surcharge section (conditional)
- Booking slip: show Eway Bill, Risk Surcharge, Declared Value in the 7-field section (already has those placeholders)

### Remove
- Nothing removed

## Implementation Plan
1. In storage.ts: change getActiveUser/setActiveUser to use sessionStorage instead of localStorage
2. Fix EDDManagementPage: ensure getEDDRules() is called correctly; add error boundary or fallback
3. In types/index.ts: add itemValue, eWayBillNo, riskSurchargeType, riskSurchargeAmount to BillItem
4. In POSBillingPage: add Item Value field to courier form; conditionally show Eway Bill No; conditionally show Risk Surcharge selector; auto-calculate and add risk surcharge to item amount
5. In BillsPage/InvoicesPage: show risk surcharge description line
6. In booking slip: populate Eway Bill and Surcharge fields
