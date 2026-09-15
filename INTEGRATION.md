# Backend Integration Guide

> **Version**: v2 — August 2026
>
> This document is for the backend team integrating real APIs into the
> Snapdeal Influencer Hub frontend. The UI is fully built against typed
> service interfaces — swapping mock for real requires implementing these
> interfaces and setting one env var. Zero UI component changes needed.

---

## Table of Contents

1. [How Backend Integration Works — The Big Picture](#how-backend-integration-works--the-big-picture)
2. [How the Swap Works](#how-the-swap-works)
3. [Service Interfaces & Methods](#service-interfaces--methods)
4. [Type Shapes (Request/Response)](#type-shapes-requestresponse)
5. [Auth & Session Handling](#auth--session-handling)
6. [Simulated Behaviors to Replace](#simulated-behaviors-to-replace)
7. [Known Prototype Shortcuts](#known-prototype-shortcuts)
8. [Backend Build Order](#backend-build-order)

---

## How Backend Integration Works — The Big Picture

Every screen and component in this app talks to a **service interface** —
never to mock data directly. There are 8 service interfaces (Auth,
Onboarding, KYC, Campaign, Invoice, Notification, Audit, Admin), each
defined as a TypeScript interface in `src/lib/services/contracts/`. The
mock implementations in `src/lib/services/mock/` are what the app uses
today; they store everything in memory and reset on page refresh.

A backend developer's job is to write a **new implementation** of each
interface that talks to a real database and real external APIs (OTP
gateway, PAN verification, S3, etc.) instead of the in-memory mock store.
You don't touch any React components, pages, or UI code. You implement the
same methods with the same signatures, and the UI just works.

### Where the swap happens

One environment variable controls which implementation the app uses:

```
NEXT_PUBLIC_DATA_SOURCE=mock   →  uses src/lib/services/mock/   (current)
NEXT_PUBLIC_DATA_SOURCE=api    →  uses src/lib/services/api/    (your code)
```

The swap happens in **`src/lib/services/index.ts`**:

```ts
export function getServices(): AppServices {
  if (DATA_SOURCE === "api") {
    const { apiServices } = require("@/lib/services/api");
    return apiServices;
  }
  const { mockServices } = require("@/lib/services/mock");
  return mockServices;
}
```

Every React component calls `useServices()` (a hook wrapping `getServices()`)
to get the service bundle. Nothing else needs to change.

### What a backend developer builds, roughly in order

1. **Database schema** — Translate the TypeScript types already defined in
   `src/lib/types/` into relational tables. The types are your spec: an
   `OnboardingRequest` row has the exact fields listed in
   `OnboardingRequest` interface, a `Campaign` row matches the `Campaign`
   type, and so on.

2. **Real auth** — Implement JWT issuance on OTP verification, HttpOnly
   cookie signing, session validation in middleware. The proxy
   (`src/proxy.ts`) already reads a session cookie and extracts
   `{userId, role}` — you just need to make that decode a real JWT instead
   of URL-encoded JSON.

3. **Real service implementations, one by one** — Start with `AuthService`
   (login must work first), then `OnboardingService` (the core flow), then
   `InvoiceService`, then the rest. Each service is independent — you can
   ship them incrementally.

4. **Wire up the swap** — Put your implementations in
   `src/lib/services/api/`, export them as `apiServices`, set the env var.
   Test each swapped service against the same UI that currently works with
   mocks.

### Parallel development

Because of this architecture, **backend work happens entirely without
touching or breaking any frontend code**. The frontend team can keep
building new features on mocks while the backend team implements real
services in parallel. When a real service is ready, flip the env var (or
implement per-service feature flags) and the UI picks it up automatically.

---

## How the Swap Works

```
NEXT_PUBLIC_DATA_SOURCE=mock   →  src/lib/services/mock/   (current)
NEXT_PUBLIC_DATA_SOURCE=api    →  src/lib/services/api/    (your code)
```

**File:** `src/lib/services/index.ts`

The `getServices()` factory reads the env var and returns the matching
`AppServices` bundle. The `useServices()` React hook (in
`src/components/providers/`) exposes it to all components. Nothing else
needs to change.

**Steps:**
1. Implement each interface in `src/lib/services/api/*.ts`
2. Set `NEXT_PUBLIC_DATA_SOURCE=api` in your deployment env
3. Set `NEXT_PUBLIC_ENABLE_ROLE_SWITCHER=false` (disable demo user switcher)
4. Done — all UI calls route to your implementations

---

## Service Interfaces & Methods

All interfaces live in `src/lib/services/contracts/`. Every method returns
a `Promise<T>`. The `AppServices` bundle type
(`src/lib/services/contracts/index.ts`) aggregates all 8 services:

```ts
interface AppServices {
  auth: AuthService;
  onboarding: OnboardingService;
  kyc: KycService;
  campaigns: CampaignService;
  invoices: InvoiceService;
  notifications: NotificationService;
  audit: AuditService;
  admin: AdminService;
}
```

### AuthService (`contracts/auth.ts`)

| Method | Params | Returns | Notes |
|--------|--------|---------|-------|
| `getSession()` | — | `Session \| null` | Check current auth state |
| `checkMobileExists(mobile)` | `string` (10-digit) | `MobileCheckResult` | Returns `{exists, role?}` — determines Log In vs Sign Up intent |
| `requestMobileOtp(mobile)` | `string` | `OtpChallenge` | Triggers SMS OTP |
| `verifyMobileOtp(challengeId, code)` | `string, string` | `Session` | Validates OTP, creates session |
| `requestEmailOtp(email)` | `string` | `OtpChallenge` | Triggers email OTP (onboarding) |
| `verifyEmailOtp(challengeId, code)` | `string, string` | `Session` | Validates email OTP |
| `logout()` | — | `void` | Destroys session |
| `switchDemoUser(input)` | `{role, userId?}` | `Session` | **Dev-only** — throw in production |
| `listDemoUsers()` | — | `User[]` | **Dev-only** — return `[]` in production |

**OtpChallenge shape:**
```ts
{
  challengeId: string;
  channel: "mobile" | "email";
  destinationMasked: string;   // e.g. "******3210"
  expiresAt: string;           // ISO timestamp
  resendAvailableAt: string;   // ISO timestamp
  attemptsRemaining: number;   // starts at 3
  lockedUntil: string | null;  // set after max failures
}
```

**MobileCheckResult shape:**
```ts
{
  exists: boolean;
  role?: UserRole;
}
```

### OnboardingService (`contracts/onboarding.ts`)

| Method | Params | Returns | Notes |
|--------|--------|---------|-------|
| `getCurrentDraft()` | — | `Influencer \| null` | Get current user's onboarding draft |
| `saveDraft(input)` | `OnboardingDraftInput` | `Influencer` | Save partial onboarding data |
| `verifyPan(panNumber, nameOnPan)` | `string, string` | `PanDetails` | Call NSDL/Protean PAN verification |
| `validateIfsc(ifsc)` | `string` | `{valid: boolean, bankName: string \| null}` | Validate IFSC code |
| `submit()` | — | `OnboardingRequest` | Creates request with status `"pending_bm_review"`. Does NOT generate SIF ID. |
| `getMyOnboardingRequest()` | — | `OnboardingRequest \| null` | Get latest request for current user |
| `approveOnboardingAsBM(requestId)` | `string` | `OnboardingRequest` | BM approves → status `"pending_finance_review"` |
| `rejectOnboardingAsBM(requestId, comment)` | `string, string` | `OnboardingRequest` | BM rejects → status `"rejected"`, comment required |
| `approveOnboardingAsFinance(requestId, financePaymentDetails)` | `string, FinancePaymentDetails` | `OnboardingRequest` | FM approves → status `"approved"`, generates SIF ID, activates influencer. **All 4 finance payment fields required** — throws VALIDATION error if any missing. |
| `rejectOnboardingAsFinance(requestId, comment)` | `string, string` | `OnboardingRequest` | FM rejects → status `"rejected"`, comment required |
| `listOnboardingRequests(filters?)` | `{status?}` | `OnboardingRequest[]` | List all requests, optionally filtered |

**OnboardingDraftInput:**
```ts
{
  pan?: Omit<PanDetails, "panNumberMasked" | "verifiedAt" | "nameMatches"> & { panNumber: string };
  bank?: Omit<BankAccount, "accountNumberMasked" | "verifiedAt" | "ifscValid">;
  address?: AddressDetails;
  gst?: GstDetails;
  msme?: MsmeDetails;
  termsAccepted?: boolean;
}
```

**FinancePaymentDetails** (required for FM approval):
```ts
{
  supplierType: string;    // e.g. "Influencer Marketing"
  modeOfPayment: string;   // e.g. "RTGS"
  paymentTerms: string;    // e.g. "30_days", "immediate", "7_days", "15_days", "45_days", "60_days"
  vendorTdsType: string;   // e.g. "individual_ind", "company_ind", "huf_ind", "other_ind"
}
```

**Validation rule**: `approveOnboardingAsFinance()` must reject with a VALIDATION error if any of the 4 `FinancePaymentDetails` fields are empty/missing. Error message should list which fields are missing. This is enforced at the service layer (not just UI).

**State machine**:
```
submit() → pending_bm_review
  ├─ approveOnboardingAsBM() → pending_finance_review
  │    ├─ approveOnboardingAsFinance(financePaymentDetails) → approved  [SIF ID generated]
  │    └─ rejectOnboardingAsFinance(comment) → rejected
  └─ rejectOnboardingAsBM(comment) → rejected
```

### KycService (`contracts/kyc.ts`)

| Method | Params | Returns | Notes |
|--------|--------|---------|-------|
| `getByInfluencerId(influencerId)` | `string` | `KycRecord` | Role-aware redaction (see below) |
| `requestEdit(input)` | `{influencerId, fieldGroup, reason}` | `ProfileEditRequest` | Influencer requests a KYC field edit |
| `listEditRequests(influencerId)` | `string` | `ProfileEditRequest[]` | List pending/resolved edit requests |
| `listActiveInfluencers()` | — | `Influencer[]` | BM/FM/Admin only — all onboarded influencers |

**Role-aware redaction in `getByInfluencerId()`:**

| Role | PAN | Bank Account |
|------|-----|-------------|
| Influencer (self) | Full (unmasked) | Full (unmasked) |
| Business Manager | Full (unmasked) | Full (unmasked) |
| Finance Manager | Full (unmasked) | Full (unmasked) |
| Admin | Full (unmasked) | Full (unmasked) |
| Influencer (other) | Blocked (FORBIDDEN) | Blocked (FORBIDDEN) |

> Note: In the current implementation, BM, FM, admin, and self all see full
> unmasked data. Only influencers trying to view OTHER influencers are
> blocked entirely (FORBIDDEN). The `redactForRole()` function in the mock
> returns the full clone for these authorized roles.

### CampaignService (`contracts/campaign.ts`)

| Method | Params | Returns | Notes |
|--------|--------|---------|-------|
| `listForCurrentUser()` | — | `Campaign[]` | Role-filtered list |
| `getById(campaignId)` | `string` | `Campaign` | Single campaign |
| `create(input)` | `{name, code, owningBmUserId}` | `Campaign` | BM: `owningBmUserId` forced to self |
| `editCampaign(campaignId, input)` | `string, {name?, code?, status?}` | `Campaign` | BM edits own campaigns, Admin edits any |
| `mapOwner(campaignId, owningBmUserId)` | `string, string` | `Campaign` | **Admin-only**: reassign owning BM |

### InvoiceService (`contracts/invoice.ts`)

| Method | Params | Returns | Notes |
|--------|--------|---------|-------|
| `listForCurrentUser()` | — | `InvoiceRequest[]` | Role-filtered (see below) |
| `getById(requestId)` | `string` | `InvoiceRequest` | Single invoice request |
| `submit(input)` | `SubmitInvoiceInput` | `InvoiceRequest` | Influencer submits invoice |
| `approve(requestId)` | `string` | `InvoiceRequest` | BM or FM approves (role-dependent) |
| `reject(requestId, comment)` | `string, string` | `InvoiceRequest` | BM or FM rejects, comment required |
| `markPaid(requestId, paymentReference)` | `string, string` | `InvoiceRequest` | FM/Admin only, UTR/ERP reference required |

**SubmitInvoiceInput:**
```ts
{
  campaignId: string;
  invoiceNumber: string;
  invoiceDate: string;       // YYYY-MM-DD
  amountInr: number;
  fileName: string;
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
}
```

**Role-based filtering in `listForCurrentUser()`:**
- **Influencer**: only their own invoices
- **BM**: only invoices for campaigns they own (`campaign.owningBmUserId === user.id`)
- **FM**: invoices in `pending_finance_approval`, `approved_payment_pending`, `paid`, `rejected`
- **Admin**: all invoices

**Invoice state machine:**
```
submit() → pending_bm_approval
  ├─ BM approve() → pending_finance_approval
  │    ├─ FM approve() → approved_payment_pending
  │    │    └─ markPaid(reference) → paid
  │    └─ FM reject(comment) → rejected
  └─ BM reject(comment) → rejected
```

### NotificationService (`contracts/notification.ts`)

| Method | Params | Returns |
|--------|--------|---------|
| `listForCurrentUser()` | — | `Notification[]` |
| `markRead(notificationId)` | `string` | `void` |

### AuditService (`contracts/audit.ts`)

| Method | Params | Returns |
|--------|--------|---------|
| `list(filters?)` | `{entityType?, entityId?, actorUserId?}` | `AuditLogEntry[]` |

**Admin-only access.** All audit actions:
```ts
type AuditAction =
  | "login" | "logout"
  | "otp_requested" | "otp_verified" | "otp_failed"
  | "onboarding_submitted"
  | "onboarding_bm_approved" | "onboarding_bm_rejected"
  | "onboarding_finance_approved" | "onboarding_finance_rejected"
  | "invoice_submitted" | "invoice_approved" | "invoice_rejected" | "invoice_marked_paid"
  | "profile_edit_requested" | "campaign_mapped"
  | "user_created" | "user_updated";
```

### AdminService (`contracts/admin.ts`)

| Method | Params | Returns |
|--------|--------|---------|
| `listUsers()` | — | `User[]` |
| `createUser(input)` | `{role, displayName, email, mobile}` | `User` |
| `updateUserStatus(userId, status)` | `string, UserStatus` | `User` |

---

## Type Shapes (Request/Response)

All types are in `src/lib/types/`. Key shapes below.

### Core Entities

**User:**
```ts
{ id, role: UserRole, displayName, email, mobile, status: "active"|"locked"|"invited", createdAt, lastLoginAt }
```

**Session:**
```ts
{ user: User, expiresAt: string }
```

**Influencer:**
```ts
{
  influencerId: string;        // "SIF1000001" — generated on FM approval
  userId: string;
  displayName: string;
  mobile: string;
  mobileMasked: string;
  email: string;
  emailMasked: string;
  mobileVerified: boolean;
  emailVerified: boolean;
  onboardingStatus: "mobile_verified"|"email_verified"|"submitted"|"active";
  termsAcceptedAt: string | null;
  kyc: KycRecord;
  createdAt: string;
}
```

### KYC Types

**PanDetails:**
```ts
{
  panNumber: string;
  panNumberMasked: string;
  nameOnPan: string;
  document: UploadedDocument | null;
  verificationStatus: "pending"|"valid"|"invalid"|"inoperative";
  nameMatches: boolean | null;
  verifiedAt: string | null;
}
```

**BankAccount:**
```ts
{
  accountNumber: string;
  accountNumberMasked: string;
  alternativeName: string | null;    // NEW — optional, if bank name differs from holder name
  ifsc: string;
  bankName: string;
  cancelledCheque: UploadedDocument | null;
  ifscValid: boolean | null;
  verificationStatus: "pending"|"valid"|"invalid"|"inoperative";
  verifiedAt: string | null;
}
```

**AddressDetails:**
```ts
{
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;      // NEW — editable, default "India"
}
```

**GstDetails:** `{ applicable: boolean, gstin: string | null, certificate: UploadedDocument | null }`

**MsmeDetails:** `{ applicable: boolean, registrationNumber: string | null, certificate: UploadedDocument | null }`

**KycRecord:** `{ influencerId, pan, bank, address, gst, msme, overallStatus, updatedAt }`

### Onboarding Types

**OnboardingRequestDraftData:**
```ts
{
  displayName: string;
  mobile: string;
  email: string;
  pan: Omit<PanDetails, "panNumberMasked"|"verifiedAt"|"nameMatches"> | null;
  bank: Omit<BankAccount, "accountNumberMasked"|"verifiedAt"|"ifscValid"> | null;
  address: AddressDetails | null;
  gst: GstDetails | null;
  msme: MsmeDetails | null;
  // Influencer-owned payment fields only
  eInvoiceApplicable: boolean | null;
  currency: string;              // always "INR"
}
```

> Note: `draftData` does NOT contain Supplier Type, Mode of Payment,
> Payment Terms, or Vendor TDS Type. Those are Finance-owned and stored
> separately in `financePaymentDetails`.

**FinancePaymentDetails:**
```ts
{
  supplierType: string;
  modeOfPayment: string;
  paymentTerms: string;
  vendorTdsType: string;
}
```

**OnboardingRequest:**
```ts
{
  id: string;
  userId: string;
  draftData: OnboardingRequestDraftData;
  status: "pending_bm_review"|"pending_finance_review"|"approved"|"rejected";

  bmReviewerUserId: string | null;
  bmComment: string | null;
  bmReviewedAt: string | null;

  financeReviewerUserId: string | null;
  financeComment: string | null;
  financeReviewedAt: string | null;

  rejectedByStage: "bm"|"finance" | null;
  generatedInfluencerId: string | null;     // set only on FM approval
  financePaymentDetails: FinancePaymentDetails | null;  // set only on FM approval

  submittedAt: string;
}
```

### Invoice Types

**InvoiceRequest:**
```ts
{
  requestId: string;
  influencerId: string;
  campaignId: string;
  invoiceNumber: string;
  invoiceDate: string;
  amountInr: number;
  document: UploadedDocument;
  status: "pending_bm_approval"|"pending_finance_approval"|"approved_payment_pending"|"paid"|"rejected";
  rejectionComment: string | null;
  rejectedByRole: string | null;
  rejectedAt: string | null;
  paymentReference: string | null;
  paidAt: string | null;
  submittedAt: string;
  approvalSteps: ApprovalStep[];
}
```

**ApprovalStep:**
```ts
{
  id: string;
  requestId: string;
  actorRole: string;
  actorUserId: string;
  action: "approve"|"reject"|"mark_paid";
  comment: string | null;
  paymentReference: string | null;
  createdAt: string;
}
```

### Campaign Type

```ts
{
  id: string;
  name: string;
  code: string;
  owningBmUserId: string;
  createdByUserId: string;
  status: "active"|"archived";
  createdAt: string;
}
```

### Notification Type

```ts
{
  id: string;
  userId: string;
  channel: "email"|"sms"|"in_app";
  type: "otp"|"welcome"|"invoice_submitted"|"invoice_approved"|"invoice_rejected"|"invoice_paid"|"profile_edit_update";
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}
```

### Audit Type

```ts
{
  id: string;
  actorUserId: string | null;
  actorRole: string | null;
  action: AuditAction;
  entityType: "user"|"influencer"|"kyc"|"campaign"|"invoice_request"|"profile_edit_request"|"onboarding_request"|"session";
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
```

---

## Auth & Session Handling

### Where to Wire In

| Layer | File | What to change |
|-------|------|----------------|
| **Middleware** | `src/proxy.ts` | Replace `decodeSessionCookie()` with JWT validation |
| **Session Provider** | `src/components/providers/session-provider.tsx` | Already calls `auth.getSession()` — just implement the real version |
| **Cookie format** | `src/lib/auth/rbac.ts` | Replace JSON cookie encode/decode with your token format |
| **Login flow** | No changes | Pages call `auth.requestMobileOtp()` / `auth.verifyMobileOtp()` via the service layer |

### Current Mock Session Flow

1. User enters mobile → `auth.checkMobileExists(mobile)` → determines intent (Log In vs Sign Up)
2. User submits → `auth.requestMobileOtp(mobile)` → OTP challenge
3. User enters code → `auth.verifyMobileOtp(challengeId, code)` → Session
4. Session stored as URL-encoded JSON in `sih_session` cookie
5. Proxy reads cookie → decodes → checks RBAC

### What Your Auth Should Provide

- JWT or session token in an HttpOnly cookie (name: `sih_session` or your choice)
- Proxy must decode it and extract `{userId, role}` to enforce RBAC
- `getSession()` should validate the token and return the `Session` object or `null`
- **Enforce `expiresAt`** — the mock currently sets it but never validates it

---

## Simulated Behaviors to Replace

### OTP (SMS/Email)

| Mock behavior | Real replacement |
|---------------|-----------------|
| Always accepts code `123456` | Integrate SMS gateway (MSG91, Twilio) + email provider |
| OTP expires after 5 minutes | Server-side expiry logic backed by Redis/DB |
| Locks after 3 failed attempts | Rate limiting + account lock logic |
| Challenge stored in memory | Redis/DB-backed OTP store |

### PAN Verification

| Mock behavior | Real replacement |
|---------------|-----------------|
| PAN ending in "K" → inoperative | NSDL/Protean PAN verification API |
| Wrong length → invalid | Actual PAN number validation |
| Name match always returns true | Real name-matching against NSDL records |

### IFSC Validation

| Mock behavior | Real replacement |
|---------------|-----------------|
| 3 hardcoded IFSCs + fallback "Mock Bank" | RBI IFSC lookup API or RazorpayX IFSC API |
| Any 11-char code → valid | Real IFSC validation |

### Payment (Mark as Paid)

| Mock behavior | Real replacement |
|---------------|-----------------|
| Stores UTR reference in memory | ERP/payment gateway integration |
| No actual fund transfer | NEFT/RTGS/UPI payment initiation |
| Immediate status change | Webhook-based confirmation from bank |

### File Upload

| Mock behavior | Real replacement |
|---------------|-----------------|
| Simulated progress bar (client-side) | Real multipart upload to S3/cloud storage |
| Static `/mock-docs/` URLs | Encrypted blob storage with signed URLs |

### Influencer ID Generation

| Mock behavior | Real replacement |
|---------------|-----------------|
| Sequential `SIF` + 7-digit number from in-memory array | Server-generated unique ID with DB unique constraint |

---

## Known Prototype Shortcuts

These are acceptable for the prototype but should be addressed in production:

1. **Hardcoded name maps** — Pages have `INFLUENCER_NAMES` / `ACTOR_NAMES`
   / `BM_NAMES` constants. Replace with a user resolution service or
   include `displayName` in API responses alongside IDs.

2. **No real file upload** — The `FileUpload` component simulates progress
   client-side. Wire to a real upload endpoint returning an
   `UploadedDocument`.

3. **Session in URL-encoded cookie** — Replace with HttpOnly JWT. The
   proxy structure stays the same.

4. **No pagination** — Lists return all records. Add `page`/`limit` params
   to service interfaces when data volume requires it.

5. **No real-time updates** — Notifications are fetched on mount. Add
   WebSocket/SSE for live notifications in production.

6. **No CSRF protection** — Add CSRF tokens for state-changing operations.

7. **Role switcher** — Must be disabled/removed in production
   (`NEXT_PUBLIC_ENABLE_ROLE_SWITCHER=false`).

8. **Client-side list filtering** — BM/FM onboarding queues filter
   client-side. Move to server-side filtering with role-based access.

9. **Admin edit request approve/deny** — Currently local React state only.
   Add a service method to persist resolutions.

---

## Backend Build Order

Recommended order of implementation for the backend team. Each step builds
on the previous one and can be tested against the existing UI.

### Phase 1: Foundation

1. **Database schema** — Tables for `users`, `influencers`, `kyc_records`,
   `onboarding_requests`, `campaigns`, `invoice_requests`,
   `approval_steps`, `notifications`, `audit_logs`, `otp_challenges`,
   `profile_edit_requests`. Use the TypeScript types as your spec.

2. **Auth (AuthService)** — JWT issuance, cookie management, session
   validation. The login flow must work before anything else.

3. **OTP delivery** — Real SMS/email sending. Can stub with console
   logging initially.

### Phase 2: Core Flows

4. **OnboardingService** — All 9 methods. Pay attention to:
   - `submit()` → atomic request creation
   - `approveOnboardingAsFinance()` → validate all 4 `FinancePaymentDetails`
     fields, generate unique SIF ID, activate influencer, fire notifications
   - State machine enforcement (can't approve if not in correct status)

5. **KycService** — `getByInfluencerId()` with role-based data access.
   `listActiveInfluencers()` for the Influencer Details pages.

6. **File upload endpoint** — S3 integration for PAN docs, cheques,
   certificates, invoices. Return `UploadedDocument` shape.

### Phase 3: Invoice & Campaign

7. **CampaignService** — 5 methods with ownership enforcement.

8. **InvoiceService** — 6 methods with role-based list filtering and
   status transition guards.

### Phase 4: Supporting Services

9. **NotificationService** — DB-backed in-app + real SMS/email delivery.

10. **AuditService** — Append-only audit log with `beforeStatus`/`afterStatus`.

11. **AdminService** — User management (create, status toggle).

### Phase 5: Hardening

12. Session expiry enforcement
13. CSRF protection
14. Server-side list filtering for onboarding queues
15. Pagination for large datasets
16. Admin edit request persistence

---

## File Structure Reference

```
src/lib/services/
├── contracts/          ← Interfaces (DO NOT MODIFY)
│   ├── index.ts        ← AppServices bundle type
│   ├── auth.ts
│   ├── onboarding.ts
│   ├── kyc.ts
│   ├── campaign.ts
│   ├── invoice.ts
│   ├── notification.ts
│   ├── audit.ts
│   └── admin.ts
├── api/                ← YOUR IMPLEMENTATIONS GO HERE
│   └── index.ts        ← Currently stubs; implement real HTTP calls
├── mock/               ← Mock implementations (reference only)
│   └── index.ts
└── index.ts            ← Factory that reads DATA_SOURCE env var

src/lib/types/          ← Type definitions (your database schema spec)
├── index.ts            ← Re-exports all types
├── audit.ts            ← AuditLogEntry, AuditAction, AuditEntityType
├── kyc.ts              ← PanDetails, BankAccount, AddressDetails, etc.
├── onboarding-request.ts  ← OnboardingRequest, FinancePaymentDetails, etc.
├── user.ts             ← User, Session, UserRole
├── campaign.ts         ← Campaign
├── invoice.ts          ← InvoiceRequest, ApprovalStep
└── notification.ts     ← Notification
```

---

## Quick Start for Backend Team

```bash
# 1. Clone and install
npm install

# 2. Run in mock mode (current)
NEXT_PUBLIC_DATA_SOURCE=mock npm run dev

# 3. Implement your services in src/lib/services/api/
#    (see contracts/ for exact method signatures)
#    (see mock/ for reference implementations)

# 4. Run in api mode
NEXT_PUBLIC_DATA_SOURCE=api npm run dev

# 5. Errors will tell you exactly which methods need implementing
```
