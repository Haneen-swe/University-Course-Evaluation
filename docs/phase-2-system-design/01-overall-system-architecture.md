# 01 — Overall System Architecture

**Project:** University Course Evaluation System (UCES)  
**Phase:** 2 — System Design  
**Document Version:** 1.0  
**Status:** Approved for Implementation

---

## 1. Architectural Style

UCES adopts a **Layered Monolith with Service-Oriented Boundaries** architectural style for v1.0. This choice balances:

| Concern | Decision | Rationale |
|---|---|---|
| Complexity | Monolith | University deployment; small-to-medium ops team; simpler CI/CD |
| Modularity | Domain-separated modules | Easy extraction to microservices in v2 if needed |
| Scalability | Horizontal scaling of the stateless API tier | Handles evaluation-window traffic spikes |
| Security | API Gateway + RBAC middleware | Central enforcement point |

The architecture can be visualised as three tiers separated by well-defined contracts:

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                          │
│         React SPA  (served from CDN / Nginx)                │
└────────────────────────┬────────────────────────────────────┘
                         │  HTTPS / REST + JWT
┌────────────────────────▼────────────────────────────────────┐
│                    APPLICATION TIER                         │
│   Node.js + Express  (stateless, horizontally scalable)     │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│   │  Auth    │ │  Users   │ │  Courses │ │  Evaluations │  │
│   │  Module  │ │  Module  │ │  Module  │ │  Module      │  │
│   └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│   ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐   │
│   │  Forms   │ │ Reports  │ │  Notifications Module    │   │
│   │  Module  │ │  Module  │ └──────────────────────────┘   │
│   └──────────┘ └──────────┘                                 │
└────────────────────────┬────────────────────────────────────┘
                         │  TCP / ORM
┌────────────────────────▼────────────────────────────────────┐
│                       DATA TIER                             │
│   PostgreSQL (primary)      Redis (session / cache)         │
│   File Store (PDF exports)  SMTP relay (notifications)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Component Overview

### 2.1 Client Tier

- **React 18 SPA** — single-page application bundled with Vite.
- Communicates exclusively through the REST API over HTTPS.
- Served as static assets from **Nginx** (also acts as reverse proxy to the API).
- State management via **React Query** (server state) + **Zustand** (UI state).
- No sensitive data is stored in the browser beyond the JWT access token (memory) and a refresh token (httpOnly cookie).

### 2.2 Application Tier

- **Node.js 20 LTS + Express 5** — RESTful API server.
- Divided into **domain modules**: Auth, Users, Courses, Evaluations, Forms, Reports, Notifications, Audit.
- Each module owns its router, controllers, service layer, and data-access layer (repository pattern).
- **Stateless** — all session context is carried in JWT or looked up in Redis; no sticky sessions required.
- Input validation via **Zod** schemas at the controller boundary.
- Business logic lives exclusively in the service layer (never in controllers or repositories).

### 2.3 Data Tier

| Store | Technology | Purpose |
|---|---|---|
| Primary DB | PostgreSQL 16 | All persistent domain data |
| Cache / Queue | Redis 7 | Rate limiting, JWT deny-list, draft responses, notification jobs |
| File Store | Local filesystem / S3-compatible | Generated PDF/CSV exports |
| Email relay | SMTP (configurable) | Notifications and password-reset emails |

---

## 3. Cross-Cutting Concerns

| Concern | Implementation |
|---|---|
| Authentication | JWT (access + refresh token pair) |
| Authorisation | RBAC middleware per route |
| Logging | Structured JSON logs via Winston; forwarded to log aggregator |
| Error handling | Centralised Express error middleware; standard error envelope |
| Validation | Zod schemas — fail-fast at API boundary |
| Anonymity | Anonymous token written to `participation` table; response written to `responses` table with no FK to student |
| Rate limiting | Redis-backed express-rate-limit on all public endpoints |
| CORS | Explicit allow-list of trusted origins |
| Security headers | Helmet.js |
| API docs | OpenAPI 3.0 spec auto-generated from route definitions |

---

## 4. Data Flow for Evaluation Submission (Summary)

```
Student Browser
  │
  │  1. GET /api/v1/evaluations/pending  → list of open course evaluations
  │  2. GET /api/v1/evaluations/{id}/form → evaluation form structure
  │  3. POST /api/v1/evaluations/{id}/draft (optional, saved to Redis)
  │  4. POST /api/v1/evaluations/{id}/submit
  │       ├─ Verify JWT (student identity confirmed)
  │       ├─ Check enrollment (student enrolled in course)
  │       ├─ Check participation token (not already submitted)
  │       ├─ Validate answers (Zod)
  │       ├─ BEGIN TRANSACTION
  │       │    ├─ INSERT into responses (no student_id column)
  │       │    ├─ INSERT into participation_tokens (student_id, offering_id, submitted=true)
  │       │    └─ COMMIT
  │       └─ Return 201 confirmation (no response data echoed back)
```

> **Privacy guarantee:** `responses` and `participation_tokens` are in separate tables with no join key between them. The application service layer enforces this separation — it is not merely a policy but a structural constraint.

---

## 5. Deployment Topology (High Level)

```
Internet ──► Nginx (TLS termination + static files + reverse proxy)
                  │
                  ├──► Node.js API (port 3001) ──► PostgreSQL (port 5432)
                  │                           ──► Redis (port 6379)
                  │
                  └──► Static React build (served directly by Nginx)
```

Full deployment details are in `11-deployment-architecture.md`.

---

## 6. Architectural Decisions Record (ADR)

| ADR | Decision | Alternatives Considered | Reason Chosen |
|---|---|---|---|
| ADR-01 | Node.js + Express for API | Django, Spring Boot, Laravel | Team familiarity; JS full-stack; large ecosystem |
| ADR-02 | PostgreSQL for primary DB | MySQL, MongoDB | Strong ACID, foreign keys, JSON columns, full-text search |
| ADR-03 | React for frontend | Vue, Angular | Widest hiring pool; mature ecosystem; flexible |
| ADR-04 | JWT auth (stateless) | Server sessions | Horizontal scalability; no session affinity needed |
| ADR-05 | Monolith for v1.0 | Microservices | Simpler ops; faster delivery; easy module extraction later |
| ADR-06 | Redis for caching | Memcached | Supports sorted sets (leaderboards), pub/sub, TTL keys |
| ADR-07 | Zod for validation | Joi, Yup | TypeScript-native; composable schemas; good error messages |
