# PRD Audit Report v3 — Snapdeal Influencer Hub

> Audit date: August 2026 (v3 — major update)
> Audited against: PRD "Influencer Onboarding & Invoice Management Panel"
> Scope: Full codebase — every page, service, mock, placeholder. Includes all changes since v2 audit.

---

## What Changed Since v2

1. **Payment Details ownership restructured** — Supplier Type, Mode of Payment, Payment Terms, Vendor TDS Type moved from influencer-owned to Finance-owned. FM must fill all 4 before approving. Service-layer validation enforces this.
2. **BM payment-edit feature fully removed** — Built in an earlier iteration, now reverted. Zero dead code remains (verified: no `paymentEdits`, `editEInvoice`, `editModeOfPayment`, `paymentDetailsEditedByBm`, `paymentDetailsOriginal` references in codebase).
3. **`onboarding_payment_details_edited` audit action removed** — Gone from `AuditAction` type, `ACTION_LABELS` map, and all mock service code.
4. **Country field added** to `AddressDetails` type and Address onboarding step (editable, default "India").
5. **Alternative Name field added** to `BankAccount` type and Bank onboarding step (optional, `string | null`).
6. **Excel export updated** — 35 columns in exact specified order. Payment fields sourced from `financePaymentDetails`. Old columns removed (Payment Details Edited by BM, 4 Original columns).
7. **Help and Account pages removed** — Nav links and routes for `/influencer/help`, `/influencer/account`, `/business/account`, `/finance/account` are gone. Logout accessible via sidebar identity block.
8. **KYC masking changed** — BM now sees full unmasked PAN/bank (same as FM/admin/self). `redactForRole()` returns full data for BM, FM, admin, and self.
9. **"Other" campaign option** — Influencer invoice creation includes an "Other" campaign choice visible to all BMs.
10. **Generic approval terminology** — Influencer-facing screens use "Under Review" / "Approved" / "Changes Requested" — no BM/FM language visible.
11. **Influencer Details page** with Excel export on BM and FM portals.
12. **Export to Excel on invoice approval queues** — Both BM and FM invoice approval queue pages have export.
13. **All tab on onboarding queues** — Both BM and FM onboarding queues show an "All" filter tab.
14. **`StatusBadge` with `variant="influencer"` vs `variant="internal"`** for role-appropriate labeling.
15. **`approveOnboardingAsBM` signature simplified** — Now `(requestId: string)`, no `paymentEdits` param. All callers updated. Zero callers use old signature.
16. **`approveOnboardingAsFinance` signature changed** — Now `(requestId: string, financePaymentDetails: FinancePaymentDetails)`. Service-layer validation throws if any of the 4 fields are missing/empty.

---

## 1. DONE — Matches PRD, Working End to End

### Auth / Sign-in (PRD §5)

**Mobile OTP Login** (`/login` + `/login/verify`)
- Real mock logic: `auth.requestMobileOtp()` → `auth.verifyMobileOtp()`. OTP hygiene: 3 attempts → lockout, 30s resend cooldown, 5-min expiry. Auto-creates new influencer user for unknown mobile numbers.
- `checkMobileExists(mobile)` validates whether mobile belongs to an existing user (determines Log In vs Sign Up intent).
- Post-OTP routing: influencer with `onboardingStatus === "active"` → `/influencer`. All other influencers → `/onboarding`. Non-influencer roles → ROLE_HOME.

**Route protection** (`src/proxy.ts`)
- Edge proxy reads session cookie, decodes JSON, checks role-path RBAC. Wrong role → role home. No session → `/login`. Public paths (`/login`, `/onboarding`, `/dev`) allowed unconditionally.

### Two-Stage Onboarding Approval (PRD §4)

**Data Model** (`src/lib/types/onboarding-request.ts`)
- `OnboardingRequest` entity with: `id`, `userId`, `draftData` (influencer KYC + E-Invoice + Currency), `status` (`pending_bm_review | pending_finance_review | approved | rejected`), BM reviewer fields, FM reviewer fields, `rejectedByStage` (`"bm" | "finance" | null`), `generatedInfluencerId` (null until FM approval), `financePaymentDetails` (null until FM fills and approves), `submittedAt`.
- `OnboardingRequestDraftData` contains: identity (name, mobile, email), KYC (pan, bank, address, gst, msme), and influencer-owned payment fields (`eInvoiceApplicable`, `currency`).
- `FinancePaymentDetails` (separate object): `supplierType`, `modeOfPayment`, `paymentTerms`, `vendorTdsType`. Clear ownership boundary — not merged into draftData.

**Service Methods** (`src/lib/services/mock/onboarding.ts`) — all wired with real mock logic:

| Method | What it does | SIF ID? | Notifications? | Audit? |
|--------|-------------|---------|----------------|--------|
| `submit()` | Creates OnboardingRequest, status → `pending_bm_review`. Draft status → `"submitted"`. Notifies all active BMs. | ❌ No | ✅ BM in-app | ✅ `onboarding_submitted` |
| `approveOnboardingAsBM(requestId)` | Status → `pending_finance_review`. Sets bmReviewerUserId/bmReviewedAt. Notifies all active FMs. No payment detail editing. | ❌ No | ✅ FM in-app | ✅ `onboarding_bm_approved` |
| `rejectOnboardingAsBM(requestId, comment)` | Status → `rejected`. Sets `rejectedByStage: "bm"`. Resets draft to `email_verified`. | ❌ No | ❌ No | ✅ `onboarding_bm_rejected` |
| `approveOnboardingAsFinance(requestId, financePaymentDetails)` | **Validates all 4 finance fields** (throws VALIDATION error listing missing). Status → `approved`. Stores `financePaymentDetails`. **GENERATES SIF ID** via `nextInfluencerId()`. Activates influencer (`onboardingStatus: "active"`). | ✅ Yes | ✅ 3 (SMS, email, in-app) | ✅ `onboarding_finance_approved` |
| `rejectOnboardingAsFinance(requestId, comment)` | Status → `rejected`. Sets `rejectedByStage: "finance"`. Resets draft to `email_verified`. | ❌ No | ❌ No | ✅ `onboarding_finance_rejected` |
| `getMyOnboardingRequest()` | Returns most recent request for current user (sorted by submittedAt desc). | — | — | — |
| `listOnboardingRequests(filters?)` | Returns all requests, optionally filtered by status. | — | — | — |

**SIF ID generation traced**: Only in `approveOnboardingAsFinance()`. Confirmed NOT called in `submit()` or `approveOnboardingAsBM()`.

**Finance payment validation traced**: `approveOnboardingAsFinance()` checks all 4 fields (`supplierType`, `modeOfPayment`, `paymentTerms`, `vendorTdsType`) are non-empty strings. Throws `ServiceError("Complete Payment Details before approving. Missing: X, Y.", "VALIDATION", 400)` if any are missing. This is in addition to the UI-side disabled button — defense in depth.

### Payment Details Ownership (CHANGED)

| Field | Owner | Where Filled | Where Stored |
|-------|-------|-------------|-------------|
| E-Invoice Applicable | Influencer | Onboarding step 4 (Yes/No toggle) | `draftData.eInvoiceApplicable` |
| Currency | Constant | Always "INR" (read-only display) | `draftData.currency` |
| Supplier Type | Finance | FM onboarding detail page (dropdown, prefilled "Influencer Marketing") | `financePaymentDetails.supplierType` |
| Mode of Payment | Finance | FM onboarding detail page (dropdown, prefilled "RTGS") | `financePaymentDetails.modeOfPayment` |
| Payment Terms | Finance | FM onboarding detail page (dropdown, 6 options) | `financePaymentDetails.paymentTerms` |
| Vendor TDS Type | Finance | FM onboarding detail page (dropdown, 4 options) | `financePaymentDetails.vendorTdsType` |

**FM Payment Details UI** (verified in `finance/onboarding/[requestId]/page.tsx`):
- When `status === "pending_finance_review"`: 4 editable Select dropdowns. Payment Terms and Vendor TDS Type marked with red asterisk. Approve button disabled + amber warning "Complete Payment Details before approving" until all 4 filled.
- After approval: fields switch to read-only display from `financePaymentDetails`.

**BM sees**: Only E-Invoice Applicable + Currency (read-only). No Supplier Type/Mode of Payment/Payment Terms/Vendor TDS Type shown.

**Influencer onboarding step** (`step-payment.tsx`): Only E-Invoice Applicable (Yes/No toggle) + Currency (read-only "INR"). Helper text: "Additional payment configuration will be completed by the Finance team during review."

### BM Payment-Edit Feature — FULLY REMOVED (Dead Code Verification)

The previous BM-edit feature (edit payment details on onboarding detail page) has been completely removed. Verified:
- `paymentEdits` — 0 matches
- `editEInvoice`, `editModeOfPayment`, `editPaymentTerms`, `editVendorTds` — 0 matches
- `paymentDetailsEditedByBm` — 0 matches
- `paymentDetailsOriginal` — 0 matches
- `onboarding_payment_details_edited` — 0 matches (removed from `AuditAction` type and `ACTION_LABELS`)
- `approveOnboardingAsBM` old signature with `paymentEdits` param — 0 callers. All callers pass `(requestId)` only.
- **No dead code remains.**

### Country Field (Address Step) — NEW

- `AddressDetails` type: `country: string` (required).
- Onboarding context default: `country: "India"`.
- Address step: editable text input for Country, prefilled "India".
- Review step: Country shown in address summary.
- BM/FM onboarding detail pages: Country shown in address line.
- Seed data: all address objects have `country: "India"`.
- Excel export: "Country" column positioned after "State", before "PIN Code".

### Alternative Name Field (Bank Step) — NEW

- `BankAccount` type: `alternativeName: string | null`.
- Onboarding context: `alternativeName: string` (default empty).
- Bank step: optional text input below Account Holder Name with helper text.
- Review step: shown when populated.
- BM/FM onboarding detail pages: shown when populated.
- Seed data: all bank objects have `alternativeName: null`.
- Excel export: "Alternative Name" column positioned after "Account Holder Name".

### Influencer-Side Screens (`/onboarding`)

| Scenario | Screen shown | Verified |
|----------|-------------|----------|
| New user, no request | 8-step onboarding form (Contact, PAN, Bank, Payment, Address, GST, MSME, Review) | ✅ |
| Just submitted this session | "Application Submitted" (no SIF ID, no dashboard CTA) | ✅ |
| Returning, `pending_bm_review` | "Application Under Review" + timeline + generic "Pending Review" badge | ✅ |
| Returning, `pending_finance_review` | "Application Under Review" + generic badge | ✅ |
| Returning, `rejected` | "Changes Requested" + rejection card (reason, date) + "Fix and Resubmit" CTA | ✅ |
| Returning, `approved` | Redirects to `/influencer` (dashboard accessible) | ✅ |

**Generic terminology confirmed**: Influencer sees "Under Review" / "Changes Requested" / "Approved" — no "BM" or "FM" language visible.

**Resubmit flow**: Pre-fills context from `existingRequest.draftData`, switches to form mode. Creates NEW `OnboardingRequest` — old one preserved.

### KYC Masking — CHANGED

| Viewer | PAN | Bank Account | Behavior |
|--------|-----|-------------|----------|
| Influencer (self) | Full | Full | `redactForRole` → `reveal = true` |
| Business Manager | **Full (CHANGED)** | **Full (CHANGED)** | `reveal = true` for `business_manager` |
| Finance Manager | Full | Full | `reveal = true` for `finance_manager` |
| Admin | Full | Full | `reveal = true` for `admin` |

**BM onboarding detail page**: Displays `d.pan.panNumber` and `d.bank.accountNumber` directly (no masking imports).
**FM onboarding detail page**: Same — full unmasked KYC in "Identity & Payout Verification" card.

### Influencer Invoice Lifecycle (PRD §6–§8)

All previously verified flows remain functional and unchanged:
- Invoice submission with campaign selection (including "Other" option)
- Invoice history (DataTable, filters, search)
- Invoice detail with approval timeline (generic "Approved" / "Payment Processed" labels for influencer)
- BM approval queue + detail (approve/reject, server-side campaign ownership filter, **Export to Excel**)
- FM approval queue + detail (KYC verification, approve/reject/mark-as-paid, **Export to Excel**)
- Mark as Paid modal: requires UTR/ERP reference (single field). No payment mode dropdown — service contract is `markPaid(requestId, paymentReference)`.
- Profile & KYC (read-only, request-update modal)
- Shared NotificationCenter (all 4 roles)
- Influencer dashboard (live stats, recent requests)

### Campaign Management (BM-Owned)

| Action | Who | Enforcement |
|--------|-----|-------------|
| Create | BM or Admin | BM's `owningBmUserId` forced to self in service |
| Edit (name/code/status) | BM (own) or Admin (any) | Service checks `campaign.owningBmUserId !== user.id` → FORBIDDEN |
| Reassign owner | Admin only | Service checks `user.role !== "admin"` → FORBIDDEN |

**"Other" campaign**: Visible to all BMs in invoice approval. Influencer can select "Other" during invoice creation.

### Influencer Details Page (BM/FM) — NEW

- **Route**: `/business/influencers` (BM) and `/finance/influencers` (FM) — shared component `InfluencerDetailsPage`.
- **Table**: Name, ID, Mobile, PAN, Account, IFSC, Bank, GST, MSME, Onboarded date. Full unmasked data.
- **Filters**: Search, GST filter, MSME filter, State filter, date range (from/to).
- **Export to Excel**: 35-column export. Button at top right.

**Excel export column order** (verified against code):
1. Name, 2. Influencer ID, 3. Mobile, 4. Email, 5. Onboarding Date, 6. PAN Number, 7. Name as on PAN, 8. PAN Verification Status, 9. Account Holder Name, 10. Alternative Name, 11. Account Number, 12. IFSC Code, 13. Bank Name, 14. Bank Verification Status, 15. Address Line 1, 16. Address Line 2, 17. City, 18. State, 19. Country, 20. PIN Code, 21. GST Registered, 22. GSTIN, 23. GST Verification Status, 24. MSME Registered, 25. MSME Registration Number, 26. MSME Verification Status, 27. Supplier Type, 28. E-Invoice Applicable, 29. Mode of Payment, 30. Payment Terms, 31. Vendor TDS Type, 32. Currency, 33. Onboarding Request Status, 34. BM Approved By, 35. FM Approved By.

**Payment field sourcing confirmed**: Supplier Type, Mode of Payment, Payment Terms, Vendor TDS Type all read from `req.financePaymentDetails`. E-Invoice Applicable and Currency read from `req.draftData`.

### Approval Queue Export to Excel (BM/FM Invoice Queues)

- **BM** (`/business/requests`): Export button exports filtered rows with Request ID, Influencer ID, Campaign, Invoice #, Date, Amount, Status.
- **FM** (`/finance/requests`): Same export pattern.
- **Onboarding queues** (`/business/onboarding`, `/finance/onboarding`): Have "All" tab filter but do NOT have Export to Excel.

### Removed Pages — Confirmed Gone

| Route | Nav link removed | Page/route removed |
|-------|-----------------|-------------------|
| `/influencer/help` | ✅ Gone | ✅ Gone |
| `/influencer/account` | ✅ Gone | ✅ Gone |
| `/business/account` | ✅ Gone | ✅ Gone |
| `/finance/account` | ✅ Gone | ✅ Gone |

**Logout**: Accessible via sidebar identity block (user avatar/name area in AppShell). Not dependent on any Account page.

**Navigation items per role** (verified from layout files):
- **Influencer**: Home, Invoices, Profile & KYC, Notifications
- **BM**: Approval Queue, Onboarding Requests, Campaigns, Influencer Details, Notifications
- **FM**: Approval Queue, Onboarding Requests, Influencer Details, Payment Pending, Notifications
- **Admin**: Overview, Users, Campaigns, Audit Log, Notifications

### Admin

- **Overview** (`/admin`): 5 stat cards from live data. ✅
- **Users** (`/admin/users`): User list, search, role filter, create user, edit requests. ✅
- **Campaigns** (`/admin/campaigns`): View-only + reassign. ✅
- **Audit Log** (`/admin/audit`): All current audit actions labeled. `onboarding_payment_details_edited` label REMOVED (action no longer exists). ✅
- **Notifications** (`/admin/notifications`): Shared NotificationCenter. ✅

---

## 2. NOT DONE — Missing Entirely

*(Backend/infrastructure items expected to be missing from a frontend prototype)*

### Real Backend / Database
- All data in-memory `MockStore`, resets on hard refresh.

### Real OTP Delivery (SMS/Email)
- Mock code `123456`. No actual SMS/email sent.

### Real PAN Verification (NSDL/Protean)
- Mock: PAN ending "K" → inoperative, wrong length → invalid.

### Real IFSC Verification
- Mock: 3 hardcoded IFSCs + "Mock Bank" fallback.

### Real GST Verification
- Mock: format check + simulated delay.

### Real MSME Verification
- Mock: starts with "UDYAM" → verified.

### Real Document Storage
- Client-side simulated upload progress. Static `/mock-docs/` paths.

### Session Timeout Enforcement
- `expiresAt` field exists in cookie but NEVER validated in proxy.

### Real Role-Based Auth
- URL-encoded JSON cookie, no encryption/signature.

### Immutable / Persisted Audit Log
- In-memory, resets on restart.

### DPDP Act 2023 Compliance
- No consent collection, retention policy, or data subject access/deletion.

### Real Email Notifications
- In-app notification created (with `channel: "email"` metadata). No actual email sent.

---

## 3. NEEDS CHANGES — Built but Wrong, Incomplete, or Diverges

### 3.1 Admin Edit Request Approve/Deny — STILL UI-ONLY

- **Current**: `handleEditRequestAction()` in `/admin/users/page.tsx` updates local React state only.
- **Required**: Should call a service method to persist the resolution.

### 3.2 Audit Log — Missing before/after status

- **Current**: Actions logged without `beforeStatus`/`afterStatus` in metadata.
- **Impact**: Low — action name implies the transition.

### 3.3 Duplicate Invoice Number — All statuses checked

- **Current**: Uniqueness check includes all statuses including rejected.
- **Open question**: Should rejected invoices be excluded to allow resubmission?

### 3.4 BM Onboarding Queue — Shows ALL Requests (not scoped)

- **Current**: `listOnboardingRequests()` returns all requests regardless of role.
- **Impact**: Medium. Consider adding request assignment mechanism in production.

### 3.5 FM Onboarding Queue — Client-Side Filtering Only

- **Current**: FM page calls `listOnboardingRequests()` (all), then filters client-side to exclude `pending_bm_review`.
- **Impact**: Low for prototype. Service should enforce server-side in production.

### 3.6 Session Expiry — NOT ENFORCED

- `expiresAt` is set but never validated in `decodeSessionCookie()`.

### Explicit Security Checks

| Check | Result |
|-------|--------|
| BM invoice queue — server-side owned-campaign filter? | ✅ YES |
| Duplicate invoice number — all statuses? | ✅ YES (matches PRD text) |
| Bank details direct edit blocked? | ✅ YES — no `updateKyc()` method |
| Mark as Paid — reference required in UI AND service? | ✅ YES — UI disables button, service throws VALIDATION |
| FM sees unmasked PAN/bank? | ✅ YES |
| BM sees unmasked PAN/bank? | ✅ YES (CHANGED from v2 — BM now sees full data) |
| FM payment validation — service-layer? | ✅ YES — throws VALIDATION listing missing fields |
| FM payment validation — UI-layer? | ✅ YES — Approve button disabled until all 4 filled |
| Audit entries on every mutating action? | ✅ YES |
| SIF ID only on FM approval? | ✅ YES |
| Notifications only on FM approval? | ✅ YES (3 to influencer) + BM notified on submit + FM notified on BM approve |
| Resubmit creates NEW request? | ✅ YES |
| Campaign create — BM can't assign to other BMs? | ✅ YES |
| Campaign edit — BM can only edit own? | ✅ YES |
| Campaign mapOwner — admin-only? | ✅ YES |
| `approveOnboardingAsBM` — any callers with old signature? | ✅ ZERO — all callers use `(requestId)` only |
| Dead code from BM-edit feature? | ✅ ZERO — grep verified 0 matches across entire codebase |
| `onboarding_payment_details_edited` in AuditAction? | ✅ GONE |
| Excel column order matches spec? | ✅ YES — 35 columns in exact specified order |
| Payment fields in export from financePaymentDetails? | ✅ YES — Supplier Type, Mode of Payment, Payment Terms, Vendor TDS Type all from `fp` |

---

## 4. BROKEN / DUMMY

### 4.1 Admin Edit Request Approve/Deny — State Not Persisted
- Toast + local state update only. Store not modified.

### 4.2 Onboarding Data Lost on Hard Refresh (expected for prototype)
- Onboarding form context is React state — resets on hard refresh.
- `getMyOnboardingRequest()` correctly detects returning users with pending requests.

### 4.3 Mock Store Resets on Hard Refresh (expected for prototype)
- All mutations lost. Only session cookie survives.

### 4.4 "Download Sample Invoice Template" — Dead End
- `href="#"` with `preventDefault()`.

### 4.5 Hardcoded Name Maps
- `INFLUENCER_NAMES`, `ACTOR_NAMES`, `BM_NAMES` in multiple pages. Fallback to raw IDs.

### 4.6 `listOnboardingRequests()` Has No Role-Based Server-Side Filter
- Returns all requests to any caller. BM and FM pages filter client-side.

### 4.7 Placeholder Pages (3 remaining)

| Route | Content |
|-------|---------|
| `/influencer/profile/request-edit` | Placeholder (unused — modal handles this) |
| `/finance/payments` | Placeholder (covered by FM queue tab) |
| `/admin/settings` | Placeholder |

**Previously listed placeholders now removed**: `/influencer/account`, `/influencer/help`, `/business/account`, `/finance/account` — all gone from nav and routes.

### Cross-Role Sync — Verified Working
- BM approves onboarding → FM queue shows it immediately ✅
- FM fills payment details + approves → influencer sees "You're Onboarded!" ✅
- FM approval stores `financePaymentDetails` on request → visible in export ✅
- BM approves invoice → FM queue shows it ✅
- FM marks paid → influencer history reflects ✅
- BM creates campaign → appears in influencer dropdown ✅

---

## 5. Backend Work Breakdown — What Needs a Developer vs. What Doesn't

### Category A: CAN BE CONFIGURED / PROVISIONED WITHOUT A DEVELOPER

These are account setup, SaaS configuration, or vendor onboarding tasks. A project manager or DevOps engineer can handle them.

| Item | Why it's configuration, not code |
|------|--------------------------------|
| **SMS gateway account** (MSG91, Twilio, AWS SNS) | Sign up, get API key, configure sender ID. The API contract (send OTP to mobile) is standard. |
| **Email provider account** (AWS SES, SendGrid) | Provision account, verify domain, get SMTP/API credentials. Templating is code, but account setup isn't. |
| **S3 bucket for document storage** | Create bucket, configure CORS, set up IAM role. File upload endpoint is code; the bucket is infra. |
| **PAN verification vendor account** (NSDL/Protean, Karza, Surepass) | Sign vendor agreement, get API key. The vendor provides the API — calling it is code, but onboarding is business process. |
| **IFSC lookup data** (RBI published list or RazorpayX IFSC API) | Download RBI dataset or subscribe to API. No custom logic needed — it's a lookup. |
| **GST verification vendor** (ClearTax, MasterGST) | Similar to PAN — vendor agreement + API key. |
| **MSME verification** (Udyam portal API) | Government API access registration. |
| **Database provisioning** (PostgreSQL, MySQL on RDS/Cloud SQL) | Provision instance, configure security groups, create database. Schema design IS code (Category B). |
| **Redis for OTP/session store** | Provision ElastiCache/Cloud Memorystore instance. Session logic is code. |
| **Monitoring / logging** (CloudWatch, Datadog) | SaaS setup. Instrumentation hooks are code. |
| **SSL certificate** | ACM/Let's Encrypt — automated. |
| **Domain / DNS** | Route53/Cloudflare config. |

### Category B: REQUIRES A DEVELOPER TO WRITE/INTEGRATE CODE

| Item | Why it needs a developer | Estimated complexity |
|------|------------------------|---------------------|
| **Database schema design** | Must translate TypeScript types (`Influencer`, `OnboardingRequest`, `InvoiceRequest`, `Campaign`, `User`, `AuditLogEntry`, etc.) into relational tables with proper indexes, foreign keys, and migration scripts. This is application design, not configuration. | Medium |
| **Real auth (JWT + session management)** | Requires writing JWT issuance on OTP verification, HttpOnly cookie signing, session validation middleware, token refresh logic, and role extraction — all against our specific 4-role model. The proxy already expects `{userId, role}` from the cookie; the developer must make that real. | High |
| **Real OTP flow** | Beyond calling the SMS/email API: generate secure random code, store in Redis with TTL, validate attempts, enforce lockout after 3 failures, implement resend cooldown. The `OtpChallenge` type already defines the contract. | Medium |
| **OnboardingService implementation** | Replace all 9 methods with database-backed versions. `submit()` must atomically create the request. `approveOnboardingAsFinance()` must validate finance payment fields (server-side validation already defined in mock), generate SIF ID (unique constraint), activate influencer, fire notifications — all in a transaction. | High |
| **InvoiceService implementation** | Replace all 6 methods. `submit()` needs file upload to S3 + metadata insert. `approve()` / `reject()` need status transition guards. `markPaid()` needs UTR validation. Role-based `listForCurrentUser()` filtering (BM sees only own campaigns' invoices) must be enforced server-side. | High |
| **KycService implementation** | `getByInfluencerId()` must apply role-based redaction server-side (masking PAN/bank for unauthorized viewers). `listActiveInfluencers()` needs efficient query with KYC join. | Medium |
| **CampaignService implementation** | 5 methods. `editCampaign()` must enforce ownership. `mapOwner()` must enforce admin-only. | Low–Medium |
| **File upload endpoint** | Multipart upload handler → S3 with signed URLs. Must support PAN doc, cancelled cheque, GST cert, MSME cert, invoice PDF. Return `UploadedDocument` shape. | Medium |
| **Notification delivery** | Beyond in-app: implement real SMS send (via gateway), real email send (via SES/SendGrid), and persist in-app notifications in DB. The 3 notification types on FM approval must actually fire. | Medium |
| **Audit log persistence** | Write `appendAudit()` to append-only table. Add `beforeStatus`/`afterStatus` to metadata. Ensure immutability (no UPDATE/DELETE on audit table). | Low |
| **Admin edit request persistence** | Add `resolveEditRequest(requestId, action, resolvedByUserId)` to service contract and implement. Currently UI-only. | Low |
| **Session expiry enforcement** | Add `expiresAt` check to `decodeSessionCookie()` in proxy. If expired, clear cookie and redirect to `/login`. | Low |
| **Server-side onboarding request filtering** | Add role-based filtering to `listOnboardingRequests()` so BMs only see their assigned requests and FMs don't see `pending_bm_review`. | Low |
| **Hardcoded name resolution** | Replace `ACTOR_NAMES`/`INFLUENCER_NAMES` maps with a user lookup service or include `displayName` in API responses alongside user IDs. | Low |
| **Real-time notifications** | WebSocket/SSE for live notification delivery. Polling works for MVP. | Low (defer) |
| **Pagination** | Add `page`/`limit` params to list methods. Current prototype loads all records. | Low (defer) |
| **CSRF protection** | Add CSRF token generation and validation for state-changing requests. | Low |

---

## 6. Priority Recommendation

### CRITICAL — Security / Compliance

1. **Real auth (JWT, HttpOnly cookies)** — Forgeable cookie. Blocks production.
2. **Session timeout enforcement** — `expiresAt` not checked. Low effort, high impact.
3. **Server-side onboarding request filtering** — All roles see all requests.
4. **DPDP Act 2023 compliance** — Legal sign-off required before go-live.
5. **Document encryption at rest** — PRD explicitly requires this.
6. **CSRF protection** — No tokens for state-changing operations.

### CORE — Blocks Real Usage

7. **Real backend / database** — All state resets on restart.
8. **Real OTP delivery** — Can't onboard real users.
9. **Real PAN/IFSC/GST/MSME verification APIs** — KYC compliance.
10. **Real file upload / storage** — Documents currently fake.
11. **Real email/SMS notifications** — PRD requires actual delivery.
12. **Admin edit request persistence** — Fix to call a service method.
13. **Audit log persistence + before/after status** — Compliance trail.
14. **Onboarding request assignment** — Which BM reviews which request?
15. **Hardcoded name resolution** — Replace with user lookup.

### LATER — Can Ship Without

16. **Sample invoice template download** — Wire up actual PDF.
17. **Pagination** — Lists load full dataset.
18. **Real-time notifications** — WebSocket/SSE.
19. **Dark mode** — Tokens ready, needs toggle.
20. **Onboarding queue export** — Queues have "All" tab but no Excel export (invoice queues do).
21. **Admin settings** — Placeholder page.
22. **Duplicate invoice number policy** — Decide if rejected invoices should be excluded.
