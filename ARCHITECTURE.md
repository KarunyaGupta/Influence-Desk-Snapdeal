# Architecture — Snapdeal Influencer Hub

> Frontend-only prototype. A separate backend team will later add real auth,
> encryption, PAN/bank verification APIs, payment gateways, and ERP integration.
> Everything is architected so that dropping in a real backend requires **zero UI
> rewrites** — only swapping implementations behind the service layer.

---

## 1. Folder Structure & Route Groups

```
src/
├── app/
│   ├── (public)/              # No auth required
│   │   ├── login/             # OTP-based mobile login
│   │   └── onboarding/       # Multi-step influencer onboarding
│   │       ├── mobile/
│   │       ├── email/
│   │       ├── pan/
│   │       ├── bank/
│   │       ├── address/
│   │       ├── gst/
│   │       ├── msme/
│   │       ├── terms/
│   │       └── complete/
│   ├── (authenticated)/       # Requires session — guarded by middleware + layout
│   │   ├── influencer/        # Role: influencer
│   │   │   ├── invoices/
│   │   │   │   └── [requestId]/
│   │   │   └── profile/
│   │   │       └── request-edit/
│   │   ├── business/          # Role: business_manager
│   │   │   └── requests/
│   │   │       └── [requestId]/
│   │   ├── finance/           # Role: finance_manager
│   │   │   └── requests/
│   │   │       └── [requestId]/
│   │   └── admin/             # Role: admin
│   │       ├── users/
│   │       ├── campaigns/
│   │       └── audit/
│   ├── layout.tsx             # Root: fonts, providers, role-switcher
│   ├── page.tsx               # Redirect hub (→ role home or /login)
│   └── globals.css            # Design tokens + Tailwind v4 theme
├── components/
│   ├── ui/                    # shadcn/ui primitives (button, badge, avatar…)
│   ├── layout/                # AppShell (sidebar + topbar)
│   ├── auth/                  # Auth-related UI (login form, OTP input)
│   ├── dev/                   # Dev-only tools (RoleSwitcher)
│   └── providers/             # React context providers
├── lib/
│   ├── auth/rbac.ts           # Path-based RBAC, cookie encode/decode
│   ├── config/env.ts          # Env vars, feature flags
│   ├── types/                 # Domain type system (see §3)
│   ├── services/
│   │   ├── contracts/         # Interface-only files (see §2)
│   │   ├── mock/              # Full mock implementations
│   │   ├── api/               # Stub — throws "not implemented"
│   │   └── index.ts           # getServices() resolver
│   ├── mock/                  # Mock infrastructure
│   │   ├── store.ts           # Singleton in-memory state
│   │   ├── seed.ts            # 6 users, 2 influencers, 3 campaigns, 5 invoices
│   │   ├── latency.ts         # delay(), withLatency(), ServiceError
│   │   ├── masking.ts         # PAN/account/mobile/email masking
│   │   └── types.ts           # MockState, OtpRecord, uid(), nowIso()
│   └── utils.ts               # cn() helper (clsx + tailwind-merge)
└── middleware.ts              # Edge auth guard (cookie → RBAC → redirect)
```

Each role maps to a URL prefix (`/influencer`, `/business`, `/finance`, `/admin`).
Middleware enforces that a session's role matches the route prefix. Mismatches
redirect to the user's role home.

---

## 2. Service Abstraction Layer

All UI components interact with the data layer through typed service interfaces,
never importing mock data directly.

```
┌─────────────────────┐
│     UI Components   │  ← useServices() hook
├─────────────────────┤
│   ServicesProvider   │  ← React context
├─────────────────────┤
│   getServices()     │  ← reads NEXT_PUBLIC_DATA_SOURCE
├────────┬────────────┤
│ mock/  │    api/    │  ← only one is active at runtime
└────────┴────────────┘
```

**Contracts** (in `src/lib/services/contracts/`):

| Interface              | Responsibility                                    |
|------------------------|---------------------------------------------------|
| `AuthService`          | OTP login (mobile/email), session, demo switching |
| `OnboardingService`    | Draft CRUD, PAN verify, IFSC validate, submit     |
| `KycService`           | Role-aware KYC fetch, edit requests               |
| `CampaignService`     | List/create/map campaigns                         |
| `InvoiceService`       | Submit/approve/reject/markPaid workflow            |
| `NotificationService`  | List, mark read                                   |
| `AuditService`         | Filtered audit log                                |
| `AdminService`         | User CRUD, status management                      |

All methods return `Promise<T>` — async by design, so swapping `mock/` for
real HTTP calls is seamless.

**Backend integration path:**
1. Set `NEXT_PUBLIC_DATA_SOURCE=api`
2. Replace stub methods in `src/lib/services/api/` with real `fetch()` calls
3. Zero UI changes required

---

## 3. Domain Types

All types live in `src/lib/types/` and are re-exported from `index.ts`.

| Type                   | Key fields                                              |
|------------------------|---------------------------------------------------------|
| `User`                 | id, role, displayName, email, mobile, status            |
| `Session`              | user, expiresAt                                         |
| `Influencer`           | influencerId (SIF…), userId, KYC, onboardingStatus      |
| `KycRecord`            | pan, bank, address, gst, msme, overallStatus            |
| `PanDetails`           | panNumber + masked, nameOnPan, verificationStatus       |
| `BankAccount`          | accountNumber + masked, IFSC, bankName, verification    |
| `GstDetails`           | applicable, gstin, certificate                          |
| `MsmeDetails`          | applicable, registrationNumber, certificate             |
| `AddressDetails`       | line1, line2, city, state, pincode                      |
| `Campaign`             | id, name, code, owningBmUserId, status                  |
| `InvoiceRequest`       | requestId, status (5 states), approvalSteps[], document |
| `ApprovalStep`         | actorRole, action (approve/reject/mark_paid), comment   |
| `Notification`         | channel, type, readAt, relatedEntity                    |
| `AuditLogEntry`        | actorUserId, action, entityType, metadata               |
| `ProfileEditRequest`   | fieldGroup, reason, status                              |

Statuses model the exact workflow:
```
pending_bm_approval → pending_finance_approval → approved_payment_pending → paid
                   ↘ rejected (at any approval stage)
```

---

## 4. Mock Data Layer

| Concern          | Solution                                                         |
|------------------|------------------------------------------------------------------|
| **State**        | Singleton `MockStore` class attached to `globalThis`             |
| **Persistence**  | In-memory for the session; `reset()` restores seed data          |
| **Latency**      | `withLatency()` adds configurable delay (default 350ms)          |
| **Errors**       | `ServiceError` class with `code` and `status` fields             |
| **Session**      | Cookie-based (`sih_session`) with JSON payload; hydrated on load |
| **Mutations**    | Directly mutate `state` arrays (invoices, notifications, etc.)   |
| **Audit trail**  | `appendAudit()` auto-captures actor from current session         |
| **Seed data**    | 6 users (1 admin, 2 BMs, 1 FM, 2 influencers), rich KYC records |

The mock layer uses the same async interface as the API layer. UI code cannot
distinguish between the two — ensuring that switching to real APIs requires no
component changes.

---

## 5. Role Switching & Permissions

### RBAC enforcement (production-ready pattern)

1. **Middleware** (`src/middleware.ts`): reads session cookie at the edge,
   verifies role has access to the requested path, redirects otherwise.
2. **Authenticated layout**: client-side guard redirects to `/login` if no
   session is found (covers client navigation).
3. **Service layer**: mock services check `store.requireUser()` role before
   allowing mutations (e.g., only FM can `markPaid`).

### Dev-only role switcher

- Floating FAB (bottom-right) controlled by `NEXT_PUBLIC_ENABLE_ROLE_SWITCHER`
- Lists all seeded demo users with role badges
- Calls `auth.switchDemoUser()` → updates cookie → navigates to new role home
- **Must be disabled in production** (env var set to `false`)

---

## 6. Design Tokens

Visual direction: professional, warm, Snapdeal-aligned.

| Token                    | Value                  | Usage                      |
|--------------------------|------------------------|----------------------------|
| `--color-primary`        | `#E54040` (warm red)   | Buttons, links, focus ring |
| `--background`           | `#FAFAF9` (off-white)  | Page background            |
| `--foreground`           | `#1C1917` (charcoal)   | Body text                  |
| `--muted`                | `#F5F5F4` (stone-100)  | Secondary surfaces         |
| `--muted-foreground`     | `#78716C` (stone-500)  | Secondary text             |
| `--accent`               | `#FEF2F2` (red-50)     | Hover/active highlights    |
| `--border`               | `#E7E5E4` (stone-200)  | All borders                |
| `--radius`               | `0.5rem`               | Default border radius      |
| `--destructive`          | `#DC2626`              | Error/destructive actions  |
| Font                     | Geist Sans / Mono      | System-like, clean         |

Tailwind v4 CSS-based theming via `@theme inline` in `globals.css`. No
`tailwind.config.ts` needed — all tokens are CSS custom properties.

---

## 7. Technology Stack

| Layer            | Choice                    | Notes                           |
|------------------|---------------------------|---------------------------------|
| Framework        | Next.js 16 (App Router)   | Turbopack, RSC-capable          |
| Language         | TypeScript 5 (strict)     | Path alias `@/*` → `./src/*`   |
| Styling          | Tailwind CSS v4           | CSS-first config                |
| Components       | shadcn/ui (new-york-v4)   | Radix primitives + CVA          |
| Icons            | Lucide React              | Tree-shakeable                  |
| Linting          | ESLint 9 flat config      | next/core-web-vitals + prettier |
| Formatting       | Prettier 3                | tailwindcss plugin              |
| State            | React Context + hooks     | No external state library       |

---

## 8. Conventions

- **No direct mock imports in UI** — always go through `useServices()`
- **Async everywhere** — even mock calls return Promises (simulated latency)
- **Masking in service layer** — UI never applies ad-hoc masking of PII
- **Barrel exports** — `src/lib/types/index.ts`, `src/lib/services/contracts/index.ts`
- **Feature flags via env** — `NEXT_PUBLIC_*` for client, validated in `config/env.ts`
- **Placeholder pages** — every route has a minimal page.tsx so navigation works during incremental development

---

## 9. Backend Integration Checklist

When the backend team is ready:

1. [ ] Implement JWT/session validation in middleware (replace cookie decode)
2. [ ] Fill in `src/lib/services/api/*.ts` with real HTTP calls
3. [ ] Set `NEXT_PUBLIC_DATA_SOURCE=api` in production env
4. [ ] Set `NEXT_PUBLIC_ENABLE_ROLE_SWITCHER=false` in production
5. [ ] Remove or tree-shake `src/lib/mock/` and `src/lib/services/mock/` from production bundle
6. [ ] Wire real file upload (currently mock uses static URLs)
7. [ ] Connect real PAN verification, IFSC lookup, ERP payment gateway
8. [ ] Replace mock OTP with actual SMS/email gateway

No UI component changes are required for any of the above.
