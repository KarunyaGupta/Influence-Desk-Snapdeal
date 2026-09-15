# Snapdeal Influencer Hub — Frontend Prototype

## 1. Overview

Frontend-only prototype of a B2B influencer onboarding and invoice management portal. Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, and shadcn/ui-style components. All data is mocked behind a typed service-layer abstraction (`src/lib/services/contracts/`) — switching to real APIs requires implementing those interfaces and setting one env var. Zero UI component changes needed.

---

## 2. Getting Started

```bash
# Install dependencies
npm install

# Start dev server (mock data, role switcher enabled)
npm run dev

# Production build
npm run build && npm start
```

**Environment:** Copy `.env.example` to `.env.local`. The default config runs in mock mode with the role switcher enabled.

**Role Switcher:** A small pill labeled "DEV" appears in the bottom-left corner. Click it to switch between seeded demo users:

| Role | User | Mobile |
|------|------|--------|
| Influencer | Aisha Khan | 9876543210 |
| Business Manager | Priya Sharma | 9810000002 |
| Finance Manager | Ananya Gupta | 9810000004 |
| Admin | Ops Admin | 9810000001 |

The OTP code for login is always `123456` in mock mode.

---

## 3. What's Built

### Influencer Role (`/influencer/*`)

- **Login** (`/login`) — Mobile number entry with +91 prefix, 10-digit validation, trust message
- **OTP Verification** (`/login/verify`) — 6-digit input with paste support, auto-focus between boxes, auto-submit on completion. States: invalid OTP with attempt countdown, last-attempt warning, locked state (after 3 failures), expired state (after 5 min), resend with 30s cooldown, change number link
- **Onboarding** (`/onboarding`) — 7-step flow with desktop stepper sidebar + mobile progress bar:
  1. Contact verification (mobile read-only + email OTP)
  2. PAN details (input + verify button, states: verifying/valid/name mismatch/inoperative/invalid, file upload)
  3. Bank details (account number with confirm, IFSC validation with auto-fill bank name, cancelled cheque upload, security helper text)
  4. Address (line1, line2, city, state, PIN with 6-digit validation)
  5. GST (yes/no toggle with progressive disclosure)
  6. MSME (yes/no toggle with progressive disclosure)
  7. Review & Terms (masked summary of all fields, terms checkbox, submit)
  - Success screen with generated SIF ID, copy button, dashboard CTA
  - State persists across steps (back/forward doesn't lose data)
- **Dashboard** (`/influencer`) — Time-based greeting, 4 summary stat cards (onboarding status, awaiting approval, payment pending, paid — live from mock data), "Submit Invoice" CTA, recent requests list with status badges
- **Invoice History** (`/influencer/invoices`) — DataTable (desktop table / mobile stacked cards), 6 status filter pills + search, 6 columns (request ID, campaign, invoice #, amount, submitted date, status), empty state
- **Invoice Detail** (`/influencer/invoices/[requestId]`) — Request header with status badge, vertical ApprovalTimeline built from approvalSteps (shows actor names, dates, comments), invoice details card, document link. Rejection state: "This request needs changes" banner with reason + "Submit a New Request" CTA (pre-fills campaign)
- **Invoice Creation** (`/influencer/invoices/new`) — 3-step client-side flow: form (searchable campaign combobox, ₹ amount, invoice number, date picker, file upload with drag/drop, sample template link, duplicate invoice number validation) → review (all details + doc) → success (request ID, status badge, actions)
- **Profile & KYC** (`/influencer/profile`) — Read-only masked view of all KYC sections (Personal, PAN, Bank, Address, GST, MSME), verification badges, "Request Update" button per section → modal with textarea + security helper text, submits edit request
- **Notifications** (`/influencer/notifications`) — Shared NotificationCenter with category badges, unread indicator, mark-read

**Placeholder pages** (route exists, heading only): Account, Help

### Business Manager Role (`/business/*`)

- **Approval Queue** (`/business/requests`) — "Requests needing your review" heading with live count, status filter pills, search, DataTable (influencer name/ID, campaign, amount, submitted date, request ID, status), empty state "You're all caught up"
- **Request Detail** (`/business/requests/[requestId]`) — Influencer info, campaign, invoice details, document link, Approve/Reject buttons (shown only for pending_bm_approval status)
  - Approve: calls `invoices.approve()` on shared mock store → status becomes `pending_finance_approval` → toast "Request approved and sent to Finance" → visible in FM queue immediately
  - Reject: modal with "Reject this request?" heading, required reason textarea with validation, destructive CTA → status becomes `rejected` → toast confirms
- **Notifications** (`/business/notifications`) — Shared NotificationCenter

**Placeholder pages:** Account

### Finance Manager Role (`/finance/*`)

- **Approval Queue** (`/finance/requests`) — 3 tabs (Needs Review / Payment Pending / Paid) with live count badges, search, DataTable (request ID, influencer, campaign, amount, BM approval date, status)
- **Request Detail** (`/finance/requests/[requestId]`) — Prominent "Identity & Payout Verification" card showing: PAN (unmasked — FM has full KYC access), verification badge, bank account (masked), IFSC, GST status, MSME status. Invoice details, document link.
  - Approve (when `pending_finance_approval`): → status becomes `approved_payment_pending`, payment closure section appears
  - Reject: same modal pattern as BM (required reason)
  - Mark as Paid (when `approved_payment_pending`): modal with warning copy ("Only mark after payment completed externally"), required UTR/ERP reference field → status becomes `paid` → toast "Payment recorded successfully"
- **Notifications** (`/finance/notifications`) — Shared NotificationCenter

**Placeholder pages:** Account, Payments (separate page — the tab in the queue covers this use case)

### Admin Role (`/admin/*`)

- **Overview** (`/admin`) — 5 stat cards: total influencers, onboarding completion %, pending BM approvals, pending finance approvals, payment pending
- **User Management** (`/admin/users`) — Searchable/filterable list with role badges and status badges, pending profile edit requests section (approve/deny inline), "Add User" dialog (name, email, mobile, role)
- **Campaign Management** (`/admin/campaigns`) — DataTable (name, code, status, owning BM, active request count), "Create Campaign" dialog, edit/reassign BM dialog per campaign
- **Audit Log** (`/admin/audit`) — 10 seeded entries (onboarding, invoices, approvals, rejections, payments, campaign mappings, profile edits, logins), filterable by entity type, searchable by action/actor/entity. New actions taken during the session are appended live.
- **Notifications** (`/admin/notifications`) — Shared NotificationCenter

**Placeholder pages:** Settings

### Cross-Cutting

- **Route protection** — Edge middleware reads session cookie, enforces role-based path access. Wrong role → redirected to their home. No session → `/login`.
- **Shared mock store** — All roles mutate the same in-memory state. Approving as BM immediately surfaces in FM queue. Marking paid as FM immediately updates influencer's history.
- **Dev role switcher** — Discreet bottom-left pill, switches session + navigates to role home.
- **Dev component QA** (`/dev/components`) — Renders every UI component in every state.

---

## 4. Design System

### Component Library (`src/components/ui/`)

22 components: Alert, ApprovalTimeline, Avatar, Badge, Button, Card, Combobox, ConfirmationDialog, DataTable, DatePicker, Dialog, EmptyState, FileUpload, Input, Progress (linear + stepper), Select, Separator, Skeleton (card/table-row/detail-panel variants), StatusBadge, Tabs, Textarea, Toast.

### Design Tokens (`src/app/globals.css`)

Defined as CSS custom properties via Tailwind v4 `@theme inline`:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#E54040` (warm red) | CTAs, focus rings, active nav |
| `--background` | `#FAFAF9` (off-white) | Page background |
| `--foreground` | `#1C1917` (charcoal) | Body text |
| `--muted` | `#F5F5F4` (stone-100) | Secondary surfaces |
| `--border` | `#E7E5E4` (stone-200) | All borders |
| `--radius` | `0.5rem` | Default corner radius |
| Font | Geist Sans / Mono | Via next/font |

### Patterns

- 16px min body text; form inputs use `text-base` on mobile (prevents iOS zoom)
- 44px minimum touch targets on all interactive elements
- Status conveyed with label + icon, never color alone
- Form errors linked via `aria-describedby`
- Skeleton loaders (not spinners) for all loading states

---

## 5. What's Mocked (Needs Real Integration)

All simulated in `src/lib/services/mock/`. See `INTEGRATION.md` for the full swap-in contract.

| Capability | Mock behavior | Real integration needed |
|------------|--------------|------------------------|
| OTP (SMS/Email) | Always accepts `123456`, locks after 3 failures | SMS gateway (MSG91/Twilio) + email provider |
| PAN Verification | PAN ending in "K" → inoperative; wrong length → invalid | NSDL/Protean API |
| IFSC Validation | 3 hardcoded IFSCs + "Mock Bank" fallback | RBI IFSC lookup / RazorpayX |
| Bank Verification | Always valid | Penny-drop or bank verification API |
| GST/MSME Verification | Not verified, just stored | GST API / Udyam portal |
| File Upload | Client-side simulated progress, static URLs | S3/cloud storage with signed URLs |
| Payment Processing | Status flip in memory, stores UTR string | ERP/banking API with webhook confirmation |
| Notifications Delivery | Stored in-memory array | Push notifications, SMS, email via queue |
| Influencer ID Generation | Sequential in-memory counter | Server-generated unique ID |
| Session/Auth | JSON cookie, no encryption | HttpOnly JWT + proper token validation |

---

## 6. Known Gaps / Not Yet Built

Verified against the codebase — these routes/features are genuinely missing or incomplete:

### Placeholder Pages (heading only, no functionality)

- `/influencer/account` — Account/settings page
- `/influencer/help` — Help center
- `/influencer/profile/request-edit` — Standalone page (the modal works from the profile page; this route is unused)
- `/business/account` — BM account settings
- `/finance/account` — FM account settings
- `/finance/payments` — Standalone payments page (covered by the "Payment Pending" tab in `/finance/requests`)
- `/admin/settings` — Admin settings

### Features Not Implemented

- **Password/PIN management** — No account security settings screen
- **Logout confirmation** — Logs out immediately with no confirm dialog
- **Multi-language support** — English only
- **Dark mode** — Token structure supports it but no toggle implemented
- **Pagination** — All lists load full dataset (fine for prototype, needs limits at scale)
- **Real-time updates** — Notifications/status fetched on mount only (no WebSocket/SSE)
- **CSRF protection** — Not implemented
- **File download/preview** — Document links point to static `/mock-docs/` paths
- **Bulk actions** — No multi-select approve/reject in BM/FM queues
- **Export/download** — No CSV/PDF export of invoice data or audit logs
- **User display name resolution** — Hardcoded name maps in 5 pages (fallback to IDs); needs a user lookup service

### Accessibility Items Not Fully Verified

- Screen reader testing with VoiceOver/NVDA not performed
- Color contrast ratios not audited with tooling (tokens are designed for WCAG AA but not measured)
- Skip-to-content link not implemented

### Responsive Breakpoints

- Tested structurally at 375/390/768/1280px via code review
- No device-lab or real-device testing performed
- Safe-area-inset support added for notch devices but not tested on physical hardware

---

## 7. Architecture Notes

- **`ARCHITECTURE.md`** — Full design decisions: folder structure, service layer pattern, type system, mock data layer, RBAC, design tokens
- **`INTEGRATION.md`** — Backend handoff: every service method signature, request/response shapes, auth wiring points, simulated behaviors table, known shortcuts, quick-start for backend team

**Key pattern:** Every UI component calls `useServices()` (React hook) which returns the `AppServices` bundle. The factory in `src/lib/services/index.ts` reads `NEXT_PUBLIC_DATA_SOURCE` and returns either `mockServices` or `apiServices`. To plug in real APIs: implement the interfaces in `src/lib/services/api/`, set the env var to `api`, deploy.
