# Phase 2 — System Design

**Project:** University Course Evaluation System (UCES)  
**SDLC Phase:** 2 of 6 — System Design  
**Version:** 1.0  
**Status:** Complete — Awaiting Phase Gate Approval  
**Follows:** Phase 1 — Requirements Analysis

---

## Document Index

| # | Document | Description |
|---|---|---|
| 01 | [Overall System Architecture](./01-overall-system-architecture.md) | 3-tier architecture, component overview, cross-cutting concerns, ADR log |
| 02 | [Frontend Architecture](./02-frontend-architecture.md) | React SPA structure, routing, state management, HTTP client, i18n, testing |
| 03 | [Backend Architecture](./03-backend-architecture.md) | Node.js/Express layered modules, middleware pipeline, anonymity service, caching |
| 04 | [Database Architecture](./04-database-architecture.md) | PostgreSQL schema, all 12 tables, indexes, DB roles, backup strategy |
| 05 | [REST API Design](./05-rest-api-design.md) | All endpoints, request/response shapes, pagination, rate limits |
| 06 | [Authentication & Authorization](./06-authentication-authorization.md) | JWT flow, RBAC matrix, SSO integration, CSRF protection, security headers |
| 07 | [ER Diagram](./07-er-diagram.md) | Mermaid ER diagram, privacy separation diagram, index summary |
| 08 | [Sequence Diagrams](./08-sequence-diagrams.md) | 7 sequence diagrams: login, submission, window config, release, reporting, refresh, password reset |
| 09 | [Use Case Diagram](./09-use-case-diagram.md) | Mermaid flowchart UCD (32 use cases), full UC table, UC-08 full specification |
| 10 | [Class Diagram](./10-class-diagram.md) | Domain model, service layer, repository layer class diagrams |
| 11 | [Deployment Architecture](./11-deployment-architecture.md) | Docker Compose, Nginx, CI/CD pipeline, environment matrix, backup, monitoring |
| 12 | [Technology Stack](./12-technology-stack.md) | Full stack justification; alternatives considered and rejected |

---

## Architecture Summary

```
┌──────────────────────────────────────────────────────────────┐
│                      CLIENT TIER                             │
│   React 18 + TypeScript + Vite · Tailwind CSS + shadcn/ui   │
│   React Query (server state) · Zustand (UI state)            │
│   React Hook Form + Zod · Recharts · i18next                 │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS / REST / JWT
┌───────────────────────────▼──────────────────────────────────┐
│                    APPLICATION TIER                          │
│      Node.js 20 LTS · Express 5 · TypeScript · Prisma       │
│   ┌──────┐ ┌──────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐  │
│   │ Auth │ │Users │ │ Courses  │ │  Forms  │ │ Reports  │  │
│   └──────┘ └──────┘ └──────────┘ └─────────┘ └──────────┘  │
│   ┌──────────────┐  ┌───────────────┐  ┌───────────────┐    │
│   │ Evaluations  │  │ Notifications │  │    Audit      │    │
│   └──────────────┘  └───────────────┘  └───────────────┘    │
└───────────────────────────┬──────────────────────────────────┘
                            │ TCP / ORM
┌───────────────────────────▼──────────────────────────────────┐
│                       DATA TIER                              │
│      PostgreSQL 16 · Redis 7 · S3 (exports) · SMTP          │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

| # | Decision | Impact |
|---|---|---|
| **D-01** | Anonymity-by-schema | `responses` table has no `student_id` column — enforced at DB level |
| **D-02** | RBAC middleware | 4 roles; enforced per-route; no role inheritance |
| **D-03** | JWT stateless auth | Enables horizontal scaling; short-lived (15 min) access tokens |
| **D-04** | Prisma ORM | Type-safe queries; migration tooling; schema-as-documentation |
| **D-05** | BullMQ async notifications | Decouples evaluation window setup from email delivery |
| **D-06** | Append-only audit log | Application DB role has INSERT-only privilege on `audit_logs` |
| **D-07** | Minimum response threshold | Protects small-cohort anonymity; admin-configurable per offering |
| **D-08** | Docker Compose deployment | Reproducible; university-server friendly; zero vendor lock-in |
| **D-09** | Feature-sliced frontend | Each feature owns its components, hooks, and API calls — no cross-feature coupling |
| **D-10** | Redis draft caching | Evaluation drafts stored with TTL; never written to `responses` until final submit |

---

## Privacy & Responsible AI Architecture

```
Student Identity  ◄────────────────────────────────────┐
(in USERS table)                                        │
        │                                               │
        ▼                                               │
PARTICIPATION_TOKENS                              NO LINK EXISTS
(student_id, offering_id, submitted=T/F)                │
                                                        │
RESPONSES ──────────────────────────────────────────────┘
(offering_id, question_id, value)
 ⚠  NO student_id column
 ⚠  NO foreign key to participation_tokens
 ⚠  NO response_id in participation_tokens
```

This structural separation is the core privacy guarantee of UCES. It cannot be circumvented by application queries because the join key does not exist.

---

## Phase Gate Checklist

| Item | Status |
|---|---|
| Overall system architecture documented | ✅ |
| Frontend architecture documented | ✅ |
| Backend architecture documented | ✅ |
| Database schema fully specified | ✅ |
| REST API endpoints defined | ✅ |
| Authentication & authorisation designed | ✅ |
| ER diagram produced | ✅ |
| Sequence diagrams produced (7 flows) | ✅ |
| Use case diagram produced (32 UCs) | ✅ |
| Class diagram produced (domain + service + repo) | ✅ |
| Deployment architecture documented | ✅ |
| Technology stack justified | ✅ |
| Responsible AI constraints preserved from Phase 1 | ✅ |

---

## Next Phase

**Phase 3 — Implementation** will produce:

1. Initialised monorepo (`client/` + `server/`)
2. Prisma schema + migrations
3. All backend modules with unit tests
4. React SPA with all pages and components
5. Docker Compose development environment
6. Seeded development data

> **Awaiting approval to proceed to Phase 3.**
