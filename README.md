<div align="center">

# 🛡️ Kovax

### Privacy-First, Compliance-Grade Multi-Tenant SaaS Platform

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Zod](https://img.shields.io/badge/Zod-3.25-3068b7?logo=zod)](https://zod.dev/)

Enterprise-grade SaaS application for managing organizations, interns, projects, and tasks — built with security-first principles, true multi-tenancy via Row Level Security, and strict data compliance controls.

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Compliance & Data Lifecycle (Phase 7)](#-compliance--data-lifecycle)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Authentication & Security](#-authentication--security)
- [Multi-Tenancy](#-multi-tenancy)
- [RBAC & Permissions](#-rbac--permissions)
- [Service Layer](#-service-layer)
- [Database Schema](#-database-schema)
- [API Routes](#-api-routes)
- [Client-Side Contexts](#-client-side-contexts)
- [Feature Toggles & Configuration](#-feature-toggles--configuration)
- [Design System](#-design-system)

---

## 🔭 Overview

Kovax is not a prototype — it's a **real-world, enterprise-ready SaaS platform** designed to demonstrate production-grade patterns:

- **True multi-tenancy** via PostgreSQL Row Level Security (RLS) — no manual `WHERE organization_id = ?` anywhere in application code.
- **Six-layer security model** spanning authentication, authorization, validation, sanitization, rate limiting, and HTTP hardening.
- **Compliance-Grade Data Controls** (Phase 7) — Mandatory consent gate, dynamic form builder, field-level privacy masking, and automated retention policies.
- **Database-driven everything** — configuration, theming, permissions, feature toggles are all stored in PostgreSQL and loaded at runtime.
- **Immutable audit trail** — every mutation is logged with full user/org/entity context.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| **Multi-Tenant Isolation** | Complete data isolation between organizations enforced at the database level via RLS |
| **Blocking Consent Gate** | Users must accept Terms of Service, Privacy Policy, and DPA before accessing the dashboard |
| **Dynamic Form Builder** | UI forms (e.g., Intern Profile) are rendered entirely from DB schema, requiring 0 code changes to add fields |
| **Field-Level Privacy** | Data masking (e.g., `j***e@domain.com`) based on data classification and viewer role hierarchies |
| **Data Lifecycle Mgmt** | Soft-delete architecture with an Admin-only restoration dashboard for Interns, Projects, and Tasks |
| **Retention Policies** | Configurable archival rules per organization to handle expired data automatically |
| **RBAC & Matrix Editor** | Dynamic permission matrix (`module × action`) editable via the Admin dashboard |
| **Activity Logging** | Complete audit trail of all actions with detailed metadata and filtering |
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

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) | App Router, Server Components, Server Actions |
| **Language** | [TypeScript 5.7](https://www.typescriptlang.org/) | Strict mode, full type coverage |
| **Backend/DB** | [Supabase](https://supabase.com/) | PostgreSQL, Auth, RLS, Realtime |
| **Validation** | [Zod 3.25](https://zod.dev/) | Runtime schema validation (frontend + backend) |
| **Styling** | [Tailwind CSS 3.4](https://tailwindcss.com/) | Utility-first CSS with custom design system |

---

## 🚀 Getting Started

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/kovax.git
cd kovax

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

### Database Setup

Run the **10 Foundation SQL scripts** from `SQL_Scripts/` in order in your Supabase SQL Editor:
*(Phase 7 changes are already integrated into these scripts)*

1. `01_extensions.sql` → PostgreSQL extensions (uuid-ossp, pgcrypto)
2. `02_core_tables.sql` → organizations, users, roles, permissions
3. `03_domain_tables.sql` → intern_profiles, projects, tasks, work_logs
4. `04_feature_tables.sql` → All 25+ supporting tables (attendance → activity_logs)
5. `05_functions.sql` → All helper functions, triggers, auth sync
6. `06_rls_enable.sql` → Enable RLS on every table
7. `07_rls_policies.sql` → All RLS policies (multi-tenant isolation)
8. `08_default_data.sql` → System defaults (roles, permissions, config)
9. `09_seed_data.sql` → (OPTIONAL) TechCorp demo data with dynamic fields
10. `10_verification.sql` → Health-check queries

---

## 📂 Project Structure

```
Kovax/
│
├── app/                              # Next.js App Router
│   ├── (public)/                     # Login, Register, Contact
│   ├── (dashboard)/                  # Auth gates, Consent gate, Dashboard
│   │   ├── dashboard/                # Main application routes
│   │   └── admin/                    # Configuration & Data Lifecycle
│   └── api/                          # Sanitized API routes
│
├── components/                       # Dashboard, Sidebar, Shared UI
│   └── dashboard/
│       ├── DynamicProfileForm.tsx    # DB-driven form renderer
│       └── ...
│
├── lib/
│   ├── security/                     # Sanitizer, Rate Limiter
│   ├── phase6/                       # Guards, RBAC helpers
│   └── supabase/                     # Clients (SSR, Service Role)
│
├── services/                         # Core Business Logic (15+ services)
│   ├── context/                      # User, Org, Config contexts
│   ├── dynamic-form.service.ts       # DB Schema loader
│   ├── privacy.service.ts            # Data masking
│   ├── consent.service.ts            # Legal consent tracker
│   └── ...
│
└── SQL_Scripts/                      # 10 consolidated SQL scripts
```

---

## 🔒 Security Architecture

Kovax implements **multi-layered defense**:

1. **Authentication**: Cookie-based JWT sessions with Supabase Auth.
2. **Middleware**: Validates user status (`active`/`draft`), role, and **Consent status**.
3. **Database RLS**: Inescapable isolation enforced at the Postgres level.
4. **Service Validation**: Every service call validates input via Zod and checks RBAC permissions.
5. **PII Masking**: Sensitive fields are automatically masked at the service level before reaching the UI.
6. **Audit Trail**: Immutable `activity_logs` capture every create, update, and delete action.

---

## 📜 License

This project is private and proprietary. Built with 🛡️ security-first principles.

**Kovax** — Protecting your organization's data by design.
