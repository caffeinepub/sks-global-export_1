# SKS Global Export

## Current State
- Full POS billing with courier brand selection form (sender/receiver/weight/tariff)
- Customer section in POS supports walking customer (name+phone) or registered customer search
- Customers page has Add/Edit/Delete with GSTIN field (text-only, no validation)
- Receiver pincode field in courier form is plain text input, no lookup
- Sender section in courier form is blank by default, not pre-filled from billing customer

## Requested Changes (Diff)

### Add
- **Pincode Auto-Lookup**: When user types a 6-digit pincode in the receiver pincode field (or any pincode field), call India Post Pincode API (api.postalpincode.in) to fetch area, city (district), state, and metro/non-metro classification. Show fetched data inline below the pincode field as auto-filled chips. Auto-populate receiverAddress with "Area, City, State" if address is empty.
- **Metro/Non-Metro Classification**: After pincode lookup, classify the city as Metro or Non-Metro based on a known list of Indian metro cities. Show a badge on the courier form.
- **Sender Auto-Fill from Billing Customer**: When a customer is selected (registered or walking) in the POS billing section, and user opens a courier brand form, auto-populate sender name and phone from the customer data. This applies to both registered customers and walking customers.
- **GST Number Verification in Customers page**: When user enters a GSTIN in the Add/Edit Customer form, add a "Verify GST" button. On click, call the GST API (https://sheet.gstincheck.co.in/check/... or use free public API) to verify and auto-fill business name, address, state. Show loading/success/error states. Also validate GSTIN format (15-char alphanumeric pattern).

### Modify
- **POSBillingPage**: When selectedCustomer or walkingName+walkingPhone changes, and when user selects a courier brand, pre-fill courierForm.senderName and courierForm.senderPhone from customer data.
- **CustomersPage Add/Edit form**: Add GSTIN verification button with auto-fill logic for name and address.
- **Courier form receiver section**: Pincode field triggers auto-lookup on 6-digit input, shows area/city/state below, adds metro badge.

### Remove
- Nothing removed

## Implementation Plan
1. Create `/src/frontend/src/utils/pincodeApi.ts` — fetchPincodeData(pin) using api.postalpincode.in, returns {area, city, state, isMetro}
2. Create `/src/frontend/src/utils/gstApi.ts` — verifyGST(gstin) using a free public GSTIN check API, returns {businessName, address, state, status}
3. Add METRO_CITIES constant (list of major Indian metro cities) in pincodeApi.ts
4. Modify POSBillingPage.tsx:
   - Add useEffect: when selectedCustomer/walkingName changes, update senderName+senderPhone in courierForm
   - Pincode field: onBlur/onChange trigger fetchPincodeData when 6 digits, show result chips, auto-fill receiverAddress
   - Show Metro/Non-Metro badge next to pincode result
5. Modify CustomersPage.tsx:
   - GSTIN input: validate 15-char format with regex on change, show format hint
   - Add "Verify GST" button next to GSTIN field (disabled if < 15 chars)
   - On verify: show loading spinner, call verifyGST, auto-fill name/address/state fields, show success/error toast
