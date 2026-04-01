<div align="center">
  <img src="./Image/Kovax.png" alt="Kovax Banner" width="100%" />
</div>

<div align="center">

# 🛡️ Kovax

### Privacy-First, Intelligence-Driven Multi-Tenant SaaS Platform

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Zod](https://img.shields.io/badge/Zod-3.25-3068b7?logo=zod)](https://zod.dev/)

Enterprise-grade SaaS application for managing organizations, interns, projects, and tasks — built with security-first principles, true multi-tenancy via Row Level Security, an event-driven intelligence layer, and strict data compliance controls.

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Compliance & Data Lifecycle (Phase 7)](#-compliance--data-lifecycle-phase-7)
- [Intelligence Layer (Phase 8)](#-intelligence-layer-phase-8)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Authentication & Security](#-authentication--security)
- [Service Layer](#-service-layer)
- [API Routes](#-api-routes)
- [Design System](#-design-system)

---

## 🔭 Overview

Kovax is not a prototype — it's a **real-world, enterprise-ready SaaS platform** designed to demonstrate production-grade patterns:

- **True multi-tenancy** via PostgreSQL Row Level Security (RLS) — no manual `WHERE organization_id = ?` anywhere in application code.
- **Seven-layer security model** spanning authentication, authorization, validation, sanitization, rate limiting, HTTP hardening, and workflow enforcement.
- **Compliance-Grade Data Controls** (Phase 7) — Mandatory consent gate, dynamic form builder, field-level privacy masking, and automated retention policies.
- **Event-Driven Intelligence Layer** (Phase 8) — Dynamic workflow engine, smart notifications, secure data exports, and rule-based recommendations.
- **Database-driven everything** — configuration, theming, permissions, feature toggles, and workflow rules are all stored in PostgreSQL and loaded at runtime.
- **Immutable audit trail** — every mutation and workflow side-effect is logged with full user/org/entity context.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| **Multi-Tenant Isolation** | Complete data isolation between organizations enforced at the database level via RLS |
| **Dynamic Workflow Engine** | DB-driven event rules — trigger notifications, log events, update fields, or block actions on any system event |
| **Smart Notifications** | Event-driven, role-targeted in-app notifications with unread tracking and a live bell dropdown |
| **Secure Data Exports** | Privacy-masked CSV/JSON export for interns, projects, and tasks with full RBAC enforcement |
| **Rule-Based Recommendations** | Proactive insights for interns (overdue tasks, profile gaps) and admins (pending approvals, inactive users) |
| **Blocking Consent Gate** | Users must accept Terms of Service, Privacy Policy, and DPA before accessing the dashboard |
| **Dynamic Form Builder** | UI forms (e.g., Intern Profile) are rendered entirely from DB schema, requiring 0 code changes to add fields |
| **Field-Level Privacy** | Data masking (e.g., `j***e@domain.com`) based on data classification and viewer role hierarchies |
| **Data Lifecycle Mgmt** | Soft-delete architecture with an Admin-only restoration dashboard for Interns, Projects, and Tasks |
| **Retention Policies** | Configurable archival rules per organization to handle expired data automatically |
| **RBAC & Matrix Editor** | Dynamic permission matrix (`module × action`) editable via the Admin dashboard |
| **Activity Logging** | Complete audit trail of all actions — including workflow evaluations and export events |
| **DB-Driven Theming** | Colors, branding, and UI configuration loaded from database per organization |
| **Input Sanitization** | Global XSS/SQL injection protection and sliding-window rate limiting |

---

## 🛡️ Compliance & Data Lifecycle (Phase 7)

Kovax is built for high-trust environments where data privacy is paramount.

### 1. Blocking Consent System
The system implements a mandatory redirect to `/dashboard/consent` for any user without active, recorded consents. This ensures 100% legal compliance for Terms of Service and Data Processing Agreements.

### 2. Privacy Masking Hierarchy
Our `PrivacyService` implements a tiered masking system:
- **Owner View**: Full visibility of own data.
- **Admin View**: Strategic visibility of organizational data.
- **Intern/Mentor View**: Masked visibility (e.g., `****1234` for phones) based on configurable classification rules.

### 3. Data Lifecycle & Recovery
We follow a **Soft-Delete Only** policy for business entities.
- **Soft-Delete**: `is_deleted = true` flags records as invisible to normal users.
- **Data Lifecycle Dashboard**: Admins can view "Deleted" records and restore them with a single click, preventing catastrophic accidental data loss.

---

## ⚡ Intelligence Layer (Phase 8)

Phase 8 transforms Kovax from a CRUD platform into an **event-driven, proactive SaaS system**.

### 1. Dynamic Workflow Engine
Every service-layer mutation (create, update, delete, approve, reject, login) fires a typed event. The engine queries the `workflows` table for matching rules:

- **Conditions**: JSON-based rules — e.g., `{"field": "status", "operator": "equals", "value": "blocked"}`.
- **Actions**: `send_notification`, `log_event`, `update_field`, or `block_action`.
- **Template interpolation**: `{{title}}` placeholders in notification messages are resolved from event context.
- **100% DB-driven**: Add, modify, or disable workflows at runtime via SQL — zero code deploys.

### 2. Smart Notification System
- In-app notification bell in the Navbar with real-time unread badge.
- Role-based delivery — `createRoleNotification()` targets all users with a given role.
- System event alerts — overdue tasks, pending approvals — with 24h deduplication.
- Mark-as-read (single or bulk) via API.

### 3. Secure Data Exports
- CSV and JSON formats for interns, projects, and tasks.
- **Privacy masking applied before export** — emails are masked, internal IDs stripped.
- RBAC enforced — interns cannot export; only admins with module view permission.
- Each export is recorded in the `exports` table and logged in `activity_logs`.

### 4. Recommendation Engine
- **Intern view**: Incomplete profile, overdue tasks, no recent activity, missing consent.
- **Admin view**: Pending approvals, inactive users, org-wide overdue tasks, blocked tasks, empty projects.
- No AI models — pure rule-based logic against existing data.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) | App Router, Server Components, Server Actions |
| **Language** | [TypeScript 5.7](https://www.typescriptlang.org/) | Strict mode, full type coverage |
| **Backend/DB** | [Supabase](https://supabase.com/) | PostgreSQL, Auth, RLS, Realtime |
| **Validation** | [Zod 3.25](https://zod.dev/) | Runtime schema validation (frontend + backend) |
| **Styling** | [Tailwind CSS 3.4](https://tailwindcss.com/) | Utility-first CSS with custom design system |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       Client Layer                           │
│  Navbar (NotificationBell) │ Sidebar │ DynamicProfileForm    │
├──────────────────────────────────────────────────────────────┤
│                       API Routes                             │
│  /api/notifications │ /api/exports │ /api/recommendations    │
│  /api/interns       │ /api/users   │ /api/activity           │
├──────────────────────────────────────────────────────────────┤
│                     Service Layer                            │
│  intern.service     │ project.service  │ task.service         │
│  workflow.service   │ consent.service  │ privacy.service      │
│  user.service       │ config.service   │ log.service          │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│  Phase 8 Intelligence:                                       │
│  workflow-engine.service  │ notification.service              │
│  export.service           │ recommendation.service            │
├──────────────────────────────────────────────────────────────┤
│                     Security Guards                          │
│  Phase6 Guards │ RBAC Checks │ Feature Toggles │ Consent     │
├──────────────────────────────────────────────────────────────┤
│                     Database (Supabase)                      │
│  PostgreSQL + RLS │ 30+ Tables │ Workflow Rules │ Audit Logs │
└──────────────────────────────────────────────────────────────┘
```

Every service-layer mutation flows through this pipeline:

1. **Validate** → Zod schema validation
2. **Authenticate** → `getServerAuthContext()`
3. **Authorize** → `assertModuleAndPermission()` (RBAC + feature toggle)
4. **Execute** → DB operation via Supabase (RLS enforced)
5. **Privacy** → Field-level masking before returning data
6. **Log** → `logActivity()` writes to immutable audit trail
7. **Workflow** → `evaluateWorkflows()` fires matching rules

---

## 🚀 Getting Started

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Vantaguard/Kovax.git
cd kovax

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

### Database Setup

Run the SQL scripts from `SQL_Scripts/` in order in your Supabase SQL Editor:

1. `01_extensions.sql` → PostgreSQL extensions (uuid-ossp, pgcrypto)
2. `02_core_tables.sql` → organizations, users, roles, permissions
3. `03_domain_tables.sql` → intern_profiles, projects, tasks, work_logs
4. `04_feature_tables.sql` → All 30+ supporting tables (attendance → analytics_cache)
5. `05_functions.sql` → All helper functions, triggers, auth sync
6. `06_rls_enable.sql` → Enable RLS on every table
7. `07_rls_policies.sql` → All RLS policies (multi-tenant isolation)
8. `08_default_data.sql` → System defaults (roles, permissions, config)
9. `09_seed_data.sql` → *(OPTIONAL)* TechCorp demo data with dynamic fields
10. `10_verification.sql` → Health-check queries
11. `11_intelligence.sql` → Notification/Export/Workflow RLS policies + example workflow rules

### Run

```bash
npm run dev
```

---

## 📂 Project Structure

```
Kovax/
│
├── app/                                # Next.js App Router
│   ├── (public)/                       # Login, Register, Contact
│   ├── (dashboard)/                    # Auth gates, Consent gate, Dashboard
│   │   └── dashboard/                  # Main application routes
│   │       ├── interns/                # Intern CRUD pages
│   │       ├── projects/              # Project CRUD pages
│   │       ├── tasks/                 # Task CRUD pages
│   │       ├── activity/              # Activity log viewer (admin)
│   │       ├── admin/                 # Config, RBAC, Data Lifecycle
│   │       ├── consent/               # Consent gate page
│   │       └── profile/               # User profile + dynamic fields
│   └── api/                            # API Routes
│       ├── interns/                    # Intern search/filter
│       ├── users/                     # User management
│       ├── activity/                  # Activity logs
│       ├── notifications/             # [Phase 8] Notification CRUD
│       ├── exports/                   # [Phase 8] Secure data export
│       └── recommendations/           # [Phase 8] Smart recommendations
│
├── components/
│   ├── dashboard/
│   │   ├── DynamicProfileForm.tsx     # DB-driven form renderer
│   │   ├── Navbar.tsx                 # Top bar with NotificationBell
│   │   ├── NotificationBell.tsx       # [Phase 8] Bell dropdown + unread badge
│   │   └── Sidebar.tsx               # Navigation sidebar
│   └── ui/                            # Shared UI components
│
├── contexts/                           # React Context providers
│   ├── UserContext.tsx                # Authenticated user state
│   ├── OrganizationContext.tsx        # Org data
│   └── AppConfigContext.tsx           # DB-driven config + feature toggles
│
├── lib/
│   ├── auth/                          # requireAuth middleware
│   ├── errors/                        # AppError hierarchy + sanitizeError
│   ├── security/                      # Sanitizer, Rate Limiter
│   ├── phase6/                        # Guards, RBAC helpers, auth context
│   ├── supabase/                      # Clients (SSR + browser)
│   ├── utils/                         # Shared utilities
│   └── validations/                   # Zod schemas
│
├── services/                           # Core Business Logic (19 services)
│   ├── user.service.ts                # User profiles, permissions
│   ├── organization.service.ts        # Org data, departments, roles
│   ├── intern.service.v2.ts           # Intern CRUD + search + pagination
│   ├── project.service.v2.ts          # Project CRUD + search + pagination
│   ├── task.service.v2.ts             # Task CRUD + search + pagination
│   ├── workflow.service.ts            # Role-based workflow enforcement (approve/reject)
│   ├── log.service.ts                 # Immutable activity logging
│   ├── privacy.service.ts             # Field-level data masking
│   ├── consent.service.ts             # Legal consent enforcement
│   ├── dynamic-form.service.ts        # DB schema → form fields
│   ├── config.service.ts              # DB-driven configuration
│   ├── feature-toggle.service.ts      # Module on/off switches
│   ├── permission.service.ts          # RBAC permission checks
│   ├── retention.service.ts           # Data retention policies
│   ├── workflow-engine.service.ts     # [Phase 8] Dynamic rule engine
│   ├── notification.service.ts        # [Phase 8] Smart notifications
│   ├── export.service.ts              # [Phase 8] Secure data export
│   └── recommendation.service.ts      # [Phase 8] Rule-based insights
│
├── types/                              # TypeScript types
│   ├── auth.ts
│   └── database.ts
│
└── SQL_Scripts/                        # 11 SQL scripts (10 foundation + 1 Phase 8)
```

---

## 🔒 Security Architecture

Kovax implements **multi-layered defense**:

1. **Authentication**: Cookie-based JWT sessions with Supabase Auth.
2. **Middleware**: Validates user status (`active`/`draft`), role, and **Consent status**.
3. **Database RLS**: Inescapable isolation enforced at the Postgres level for every table.
4. **Service Validation**: Every service call validates input via Zod and checks RBAC permissions.
5. **PII Masking**: Sensitive fields are automatically masked at the service level before reaching the UI or any export.
6. **Audit Trail**: Immutable `activity_logs` capture every create, update, delete, workflow evaluation, and export event.
7. **Workflow Enforcement**: DB-driven rules can block operations, flag anomalies, or trigger alerts on any event.

---

## ⚙️ Service Layer

All 19 services follow the same validated pipeline: **Input → Auth → RBAC → DB → Privacy → Log → Workflow**.

### Core Services

| Service | File | Key Functions |
|---|---|---|
| **User** | `user.service.ts` | `getCurrentUserProfile()`, `updateCurrentUserProfile()`, `hasPermission()`, `isAdmin()` |
| **Organization** | `organization.service.ts` | `getCurrentOrganization()`, `getOrganizationStats()`, `getDepartments()`, `getRoles()` |
| **Intern** | `intern.service.v2.ts` | `getInternsPaginated()`, `getInternById()`, `createIntern()`, `updateIntern()`, `deleteIntern()`, `restoreIntern()`, `getInternStats()` |
| **Project** | `project.service.v2.ts` | `getProjectsPaginated()`, `getProjectById()`, `createProject()`, `updateProject()`, `deleteProject()`, `restoreProject()`, `getProjectStats()` |
| **Task** | `task.service.v2.ts` | `getTasksPaginated()`, `getTaskById()`, `createTask()`, `updateTask()`, `deleteTask()`, `restoreTask()`, `getTaskStats()`, `getTasksByUser()` |
| **Workflow** | `workflow.service.ts` | `approveIntern()`, `rejectIntern()`, `updateInternStatus()`, `isSuperAdmin()`, `isOrgAdmin()`, `canManageTasks()` |

### Compliance Services

| Service | File | Key Functions |
|---|---|---|
| **Consent** | `consent.service.ts` | `hasUserConsented()`, `recordConsent()`, `withdrawConsent()`, `requireConsent()` |
| **Privacy** | `privacy.service.ts` | `applyFieldLevelPrivacy()`, `applyPrivacyToInternList()`, `maskEmail()`, `maskPhone()` |
| **Retention** | `retention.service.ts` | Automated data archival policy enforcement |
| **Dynamic Forms** | `dynamic-form.service.ts` | DB-schema-driven form field loading |

### Phase 8 Intelligence Services

| Service | File | Key Functions |
|---|---|---|
| **Workflow Engine** | `workflow-engine.service.ts` | `evaluateWorkflows()`, `matchConditions()`, `wouldBlock()`, `getWorkflows()` |
| **Notifications** | `notification.service.ts` | `createNotification()`, `createRoleNotification()`, `getUserNotifications()`, `markAsRead()`, `markAllAsRead()`, `notifyOverdueTasks()`, `notifyPendingApprovals()` |
| **Export** | `export.service.ts` | `exportData()`, `generateCSV()`, `generateJSON()` |
| **Recommendations** | `recommendation.service.ts` | `getUserRecommendations()`, `getAdminInsights()` |

### Infrastructure Services

| Service | File | Key Functions |
|---|---|---|
| **Config** | `config.service.ts` | DB-driven configuration loading |
| **Feature Toggles** | `feature-toggle.service.ts` | `isModuleEnabled()` |
| **Permissions** | `permission.service.ts` | `hasPermission()` matrix checks |
| **Activity Log** | `log.service.ts` | `logActivity()`, `getActivityLogs()`, `getRecentActivity()` |

### Usage Examples

**Server Components (recommended):**
```typescript
import { getInternsPaginated } from '@/services/intern.service.v2';

export default async function InternsPage() {
  const result = await getInternsPaginated({ page: 1, limit: 10 });
  return (
    <div>
      {result.data.map(intern => (
        <div key={intern.id}>{intern.user?.email}</div>
      ))}
      <p>Total: {result.pagination.total}</p>
    </div>
  );
}
```

**Client-Side via API routes:**
```typescript
// Fetch notifications
const res = await fetch('/api/notifications');
const { notifications, stats } = await res.json();

// Export tasks as CSV
const csvRes = await fetch('/api/exports', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ entityType: 'tasks', format: 'csv' }),
});
const csvText = await csvRes.text();
```

### Service Layer Rules

| ✅ DO | ❌ DON'T |
|---|---|
| Use service functions in server components | Bypass RLS with the service-role key |
| Let RLS handle organization filtering | Filter data manually by `organization_id` |
| Trust the service layer for all data access | Make direct Supabase calls from components |
| Use proper TypeScript types | Hardcode user IDs or organization IDs |
| Let the workflow engine handle side-effects | Create parallel logic outside the service layer |

---

## 🌐 API Routes

| Route | Methods | Purpose |
|---|---|---|
| `/api/interns` | `GET` | Intern search and filter |
| `/api/users` | `GET` | User management |
| `/api/activity` | `GET` | Activity log viewer |
| `/api/app-shell` | `GET` | App config + feature toggles |
| `/api/profile-fields` | `GET`, `POST` | Dynamic form field management |
| `/api/data-lifecycle` | `GET`, `POST` | Soft-delete restoration |
| `/api/notifications` | `GET`, `POST` | Fetch notifications, mark as read |
| `/api/exports` | `POST` | Trigger privacy-masked data export (CSV/JSON) |
| `/api/recommendations` | `GET` | User recommendations + admin insights |

---

## 🎨 Design System

Kovax uses a dark-mode-first design system with Tailwind CSS:

- **Primary palette**: Amber/Gold accent with Slate dark backgrounds
- **Component patterns**: Gradient cards, glassmorphic overlays, micro-animations
- **Role badges**: Color-coded per role (`super_admin` = red, `org_admin` = purple, `mentor` = blue, `intern` = green)
- **Notification bell**: Live unread badge with animated pulse, type-colored borders

---

## 📜 License

This project is private and proprietary. Built with 🛡️ security-first principles.

**Kovax** — Protecting your organization's data by design.
