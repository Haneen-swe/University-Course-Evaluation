# Software Requirements Specification (SRS)

## University Course Evaluation System (UCES)

---

| Field              | Value                                                             |
|--------------------|-------------------------------------------------------------------|
| **Document ID**    | UCES-SRS-001                                                      |
| **Version**        | 1.0                                                               |
| **Status**         | Approved                                                          |
| **SDLC Phase**     | Phase 3 — Implementation                                          |
| **Prepared By**    | UCES Development Team                                             |
| **Review Date**    | 2025                                                              |
| **Standard**       | IEEE Std 830-1998 (IEEE Recommended Practice for SRS)             |

---

## Table of Contents

1. [Introduction](#1-introduction)
   - 1.1 Purpose
   - 1.2 Scope
   - 1.3 Definitions, Acronyms, and Abbreviations
   - 1.4 References
   - 1.5 Overview
2. [Overall Description](#2-overall-description)
   - 2.1 Product Perspective
   - 2.2 Product Functions Summary
   - 2.3 User Classes and Characteristics
   - 2.4 Operating Environment
   - 2.5 Design and Implementation Constraints
   - 2.6 Assumptions and Dependencies
3. [System Architecture](#3-system-architecture)
   - 3.1 High-Level Architecture
   - 3.2 Frontend Architecture
   - 3.3 Backend Architecture
   - 3.4 Data Layer
   - 3.5 Infrastructure and Deployment
4. [Technology Stack](#4-technology-stack)
5. [Actors and Use Cases](#5-actors-and-use-cases)
   - 5.1 Actors
   - 5.2 Use Case Summary
   - 5.3 Use Case Descriptions (Critical Paths)
6. [Functional Requirements](#6-functional-requirements)
   - 6.1 Authentication & Authorization (FR-AUTH)
   - 6.2 User Management (FR-USER)
   - 6.3 Department Management (FR-DEPT)
   - 6.4 Term Management (FR-TERM)
   - 6.5 Course Management (FR-COURSE)
   - 6.6 Course Offering Management (FR-OFFER)
   - 6.7 Enrollment Management (FR-ENROLL)
   - 6.8 Evaluation Form Builder (FR-FORM)
   - 6.9 Evaluation Submission (FR-EVAL)
   - 6.10 Reports & Analytics (FR-REPORT)
   - 6.11 Notifications (FR-NOTIFY)
   - 6.12 Audit Logging (FR-AUDIT)
7. [Non-Functional Requirements](#7-non-functional-requirements)
   - 7.1 Privacy & Anonymity (NFR-PRIV)
   - 7.2 Security (NFR-SEC)
   - 7.3 Performance (NFR-PERF)
   - 7.4 Reliability & Availability (NFR-REL)
   - 7.5 Maintainability (NFR-MAINT)
   - 7.6 Usability (NFR-USE)
   - 7.7 Scalability (NFR-SCALE)
   - 7.8 Compliance (NFR-COMP)
8. [Data Model](#8-data-model)
9. [API Design Overview](#9-api-design-overview)
10. [External Interface Requirements](#10-external-interface-requirements)
11. [Constraints and Limitations](#11-constraints-and-limitations)
12. [Appendix A — Seeded Test Data](#appendix-a--seeded-test-data)
13. [Appendix B — Environment Variables](#appendix-b--environment-variables)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the complete functional and non-functional requirements for the **University Course Evaluation System (UCES)** — a full-stack, privacy-first web application for collecting anonymous course evaluations at the university level.

This document is intended for:
- Software developers implementing or extending the system.
- QA engineers writing and executing test cases.
- System architects reviewing design decisions.
- Academic administrators and stakeholders reviewing what the system delivers.

### 1.2 Scope

UCES enables universities to digitally collect, store, and report on anonymous student feedback for course offerings. The system covers the entire lifecycle of a course evaluation: academic structure setup (departments, terms, courses), enrollment, evaluation form design, time-windowed evaluation collection, aggregate reporting with enforced minimum-threshold anonymity, and administrative audit logging.

**In-scope:**
- Role-based access for Admin, Department Head, Instructor, and Student.
- JWT-based authentication with access/refresh token rotation and Redis-backed token revocation.
- Dynamic evaluation form builder (Likert, single-choice, multi-choice, open-text questions).
- Privacy-preserving anonymous response submission via a two-table participation model.
- Statistical reporting (mean, median, standard deviation, distribution charts).
- Configurable evaluation time windows per course offering.
- Minimum-response threshold enforcement before results are released.
- Notification infrastructure (email and in-app).
- Comprehensive audit log accessible to admins.
- Docker-based deployment with Nginx reverse proxy and Let's Encrypt TLS.

**Out-of-scope:**
- Grade management or Learning Management System (LMS) integration.
- Video/audio-based evaluations.
- OAuth 2.0 / SAML SSO (architecture reserves a password-less path but it is not fully implemented).
- Mobile-native applications (iOS/Android).

### 1.3 Definitions, Acronyms, and Abbreviations

| Term / Acronym | Definition                                                                              |
|----------------|-----------------------------------------------------------------------------------------|
| UCES           | University Course Evaluation System                                                     |
| SRS            | Software Requirements Specification                                                     |
| SPA            | Single-Page Application                                                                 |
| REST           | Representational State Transfer                                                         |
| JWT            | JSON Web Token — used for stateless authentication                                      |
| JTI            | JWT ID — unique token identifier used for deny-listing                                  |
| RBAC           | Role-Based Access Control                                                               |
| ORM            | Object-Relational Mapping                                                               |
| UUID           | Universally Unique Identifier (v4)                                                      |
| Offering       | A specific instance of a course delivered by an instructor in a particular term/section |
| Participation Token | A record that tracks whether a student has submitted an evaluation (no response data) |
| Response       | An anonymous record of a student's answer to a single question (no student identifier) |
| Eval Window    | The date-time range during which students may submit evaluations for an offering        |
| Threshold      | Minimum number of responses required before results may be released                     |
| Dept Head      | Department Head — a senior faculty role with read access to departmental reports        |
| Admin          | System Administrator — full CRUD access to all entities                                 |

### 1.4 References

| Reference | Location |
|-----------|----------|
| README.md | Repository root |
| Prisma schema | `server/prisma/schema.prisma` |
| REST API design | `docs/phase-2-system-design/05-rest-api-design.md` |
| Phase 2 system design | `docs/phase-2-system-design/` (13 documents) |
| Swagger / OpenAPI | `http://localhost:3001/api/docs` (runtime) |
| IEEE Std 830-1998 | IEEE Recommended Practice for Software Requirements Specifications |

### 1.5 Overview

The remainder of this document is organized as follows:
- **Section 2** provides the overall product description, user classes, and operating environment.
- **Section 3** describes the system architecture in detail.
- **Section 4** lists all technologies used.
- **Section 5** defines actors and use cases.
- **Sections 6–7** specify functional and non-functional requirements in itemized form.
- **Sections 8–10** detail the data model, API surface, and external interfaces.
- **Sections 11–12** list constraints and supporting appendices.

---

## 2. Overall Description

### 2.1 Product Perspective

UCES is a standalone web application developed as an academic project. It replaces paper-based or generic survey-tool-based course evaluation workflows. The system interacts with:

- A **PostgreSQL 16** relational database as the primary store.
- A **Redis 7** instance for JWT deny-listing and refresh-token storage.
- An external **SMTP server** for transactional email delivery.
- A web browser (client) over HTTPS.

UCES does not integrate with any external LMS, SIS (Student Information System), or identity provider at this time.

### 2.2 Product Functions Summary

| Category | Key Functions |
|----------|---------------|
| Authentication | Login, logout, token refresh, forgot/reset password |
| User Management | CRUD users with roles; soft-delete; profile self-service |
| Academic Structure | Departments, terms, courses, course offerings (CRUD) |
| Enrollment | Enroll/unenroll students in offerings |
| Form Builder | Create/publish/clone evaluation form templates with typed questions |
| Evaluation | Time-windowed anonymous submission; duplicate prevention |
| Reporting | Per-offering statistical reports; instructor summary; institution-wide dashboard |
| Notifications | Email + in-app notifications for evaluation events |
| Audit | Immutable audit log of all privileged actions |

### 2.3 User Classes and Characteristics

| Role | Description | Privileges Summary |
|------|-------------|-------------------|
| **Student** | Enrolled university students | View own dashboard; submit anonymous evaluations for enrolled open-window courses |
| **Instructor** | Faculty delivering courses | View own dashboard; access own released evaluation reports |
| **Department Head** (`dept_head`) | Senior faculty overseeing a department | View departmental course offerings; read reports for own department |
| **Admin** (System Administrator) | IT/administration staff | Full CRUD on all entities; manage eval windows; release results; view audit logs |

### 2.4 Operating Environment

| Component | Environment |
|-----------|-------------|
| Client (browser) | Modern evergreen browsers (Chrome ≥ 120, Firefox ≥ 121, Safari ≥ 17, Edge ≥ 120) |
| Frontend host | Nginx 1.25 (static file serving) or Vite dev server (development) |
| API server | Node.js 20 LTS running Express 5 on port 3001 |
| Database | PostgreSQL 16 |
| Cache / queue | Redis 7 |
| Container orchestration | Docker Compose (development and production) |
| TLS termination | Nginx with Let's Encrypt certificates |
| Operating system | Linux (Docker containers); macOS/Windows (development) |

### 2.5 Design and Implementation Constraints

- **Privacy invariant**: The `responses` table **must not** contain a `student_id` column. Anonymity is enforced at the database schema level, not by application policy alone.
- **Language**: TypeScript (strict mode) is mandatory for both frontend and backend codebases.
- **API versioning**: All REST endpoints are prefixed with `/api/v1/`.
- **Authentication**: Stateless JWT access tokens (15-minute TTL) combined with httpOnly-cookie refresh tokens (7-day TTL). Redis is required for token deny-listing.
- **ORM**: Prisma is the only database interaction layer; raw SQL is not permitted except in migrations.
- **Code style**: ESLint enforced on all TypeScript source files.

### 2.6 Assumptions and Dependencies

1. A configured SMTP server is available for transactional email delivery.
2. PostgreSQL 16 and Redis 7 are provisioned before application startup.
3. All users are pre-created by an administrator; self-registration is not supported.
4. Student–course enrollment must be completed before an evaluation window opens.
5. A valid evaluation form template must be assigned to a course offering before students can submit evaluations.
6. The system clock on the server is accurate; evaluation window boundaries are evaluated server-side.
7. Docker Engine 24+ and Docker Compose v2 are available for containerised deployment.
8. The browser's cookie policy allows `SameSite=None; Secure` cookies for the refresh token.

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────┐
│                       Browser                        │
│          React 18 SPA (Vite build)                   │
└─────────────────────┬────────────────────────────────┘
                      │ HTTPS (TLS 1.2/1.3)
┌─────────────────────▼────────────────────────────────┐
│                    Nginx 1.25                         │
│   Reverse proxy + static file server + TLS termination│
└────────┬───────────────────────────────┬─────────────┘
         │ /api/*                        │ /* (SPA)
┌────────▼──────────┐           (static dist/)
│   Node.js 20      │
│   Express 5 API   │
│   (port 3001)     │
└──┬─────────┬──────┘
   │         │
┌──▼───┐ ┌───▼──────┐
│ PG 16│ │  Redis 7  │
│  DB  │ │  Cache    │
└──────┘ └───────────┘
         (JWT deny-list
          refresh tokens)
```

### 3.2 Frontend Architecture

The frontend is a **React 18 Single-Page Application** built with Vite and TypeScript. It follows a feature-sliced structure:

```
client/src/
├── app/              # Router and top-level App component
│   ├── App.tsx       # QueryClient provider, AuthInitialiser, RouterProvider
│   └── router.tsx    # React Router v6 route tree (role-gated PrivateRoute)
├── features/
│   └── auth/
│       ├── api.ts    # Auth API calls (login, logout, refresh)
│       └── store.ts  # Zustand auth state store (user, accessToken, isAuthenticated)
├── pages/
│   ├── shared/       # LoginPage, ForgotPasswordPage, ResetPasswordPage, NotFoundPage
│   ├── student/      # StudentDashboardPage, EvaluationListPage, EvaluationPage
│   ├── instructor/   # InstructorDashboardPage, InstructorReportPage
│   └── admin/        # AdminDashboardPage, UsersPage, CoursesPage,
│                     # FormsBuilderPage, EvaluationWindowsPage, AuditLogPage
└── shared/
    ├── components/   # AppLayout (navigation shell), PrivateRoute (RBAC guard)
    └── lib/
        └── api.ts    # Axios instance with JWT interceptors and auto-refresh logic
```

**State Management:**
- **Zustand** for global authentication state (user identity, access token).
- **TanStack Query (React Query)** for all server state, caching, and data synchronisation.

**Routing:**
- React Router v6 with nested routes; `PrivateRoute` checks `allowedRoles` against the Zustand store before rendering protected content.
- Role-based root redirects send users to the appropriate dashboard (`/student/dashboard`, `/instructor/dashboard`, `/admin/dashboard`) after login.

**UI Layer:**
- Tailwind CSS v3 for utility-first styling.
- Radix UI primitives (unstyled, accessible) for complex interactive components (dialogs, dropdowns, tabs, toasts, radio groups, checkboxes, etc.).
- Recharts for data visualisation in report pages.
- Lucide React for iconography.

**Form Handling:**
- `react-hook-form` with `@hookform/resolvers` + Zod schemas for client-side validation.

**Token Lifecycle:**
- On each HTTP request, the Axios request interceptor attaches `Authorization: Bearer <accessToken>`.
- On a 401 response, the response interceptor silently calls `POST /api/v1/auth/refresh` (which uses the httpOnly refresh token cookie), rotates the access token in the Zustand store, and retries the original request.
- Concurrent 401 responses are queued and replayed after a single refresh cycle.

### 3.3 Backend Architecture

The backend is a **Node.js 20 + Express 5 REST API** written in TypeScript, organized by feature module:

```
server/src/
├── config/           # env (Zod-validated), database (Prisma), redis (ioredis),
│                     # email (Nodemailer), logger (Winston), swagger
├── middleware/
│   ├── authenticate  # JWT verification + Redis deny-list check
│   ├── authorize     # RBAC middleware factory
│   ├── validate      # Zod schema request validation
│   ├── rateLimiter   # express-rate-limit (auth, password-reset, general)
│   ├── errorHandler  # Centralised error → JSON response mapping
│   ├── notFoundHandler
│   └── requestLogger # Morgan HTTP request logging
└── modules/
    ├── auth/         # login, logout, refresh, forgot/reset password
    ├── users/        # CRUD users + self-service /me
    ├── departments/  # CRUD departments
    ├── terms/        # CRUD terms
    ├── courses/      # CRUD courses (search + archive support)
    ├── offerings/    # CRUD offerings + eval window + results release
    ├── enrollments/  # Student ↔ offering enrollment management
    ├── forms/        # Form templates + question CRUD, publish, clone
    ├── evaluations/  # Pending list, form fetch, status check, anonymous submit
    ├── reports/      # Per-offering report, instructor summary, institution stats
    ├── notifications/# Get/mark-read notifications; admin send
    └── audit/        # Paginated audit log (admin only)
```

**Request Lifecycle:**
1. Nginx terminates TLS and proxies `/api/*` to `api:3001`.
2. Express middleware stack: Helmet → CORS → compression → JSON body-parser → cookieParser → requestLogger.
3. Route handler: `authenticate` (JWT) → `authorize` (RBAC) → `validate` (Zod) → controller logic.
4. Errors propagate via `next(err)` to the global `errorHandler` which serializes to `{ success: false, error: { code, message, details } }`.

**Authentication Flow:**
- `POST /auth/login` returns `{ accessToken }` in the response body and sets a `refreshToken` httpOnly cookie (7-day TTL, SameSite=None, Secure).
- Access tokens carry `{ sub, email, role, departmentId, jti }` claims.
- On logout, the JTI is stored in Redis with a 15-minute TTL (matching access token lifetime) and the refresh token key is deleted.
- The `authenticate` middleware checks `jwt:deny:<jti>` in Redis on every request.

### 3.4 Data Layer

**ORM:** Prisma 5 with `@prisma/client` generated types.

**Database:** PostgreSQL 16 with UUID primary keys (generated via `gen_random_uuid()`), timestamptz timestamps, soft-delete on users (`deletedAt`), and schema-level anonymity enforcement on responses.

**Privacy Design (Two-Table Approach):**
```
ParticipationToken            Response
─────────────────────         ────────────────────────
id          UUID              id          UUID
studentId   UUID (FK User)    offeringId  UUID (FK CourseOffering)
offeringId  UUID (FK Offering) questionId  UUID (FK EvalQuestion)
submitted   Boolean           value       Text
submittedAt Timestamptz       submittedAt Timestamptz
```
- `ParticipationToken` records **that** a student submitted (tracks identity).
- `Response` records **what** was submitted (no identity link).
- There is intentionally **no join key** between these two tables.

**Caching / Session Store:** Redis 7 (ioredis client) stores:
- `refresh:<userId>` → refresh token string (7-day TTL).
- `jwt:deny:<jti>` → `'1'` (15-minute TTL) for deny-listed access tokens.

### 3.5 Infrastructure and Deployment

**Production (Docker Compose):**

| Service | Image | Role |
|---------|-------|------|
| `nginx` | nginx:1.25-alpine | TLS termination, static SPA serving, API reverse-proxy |
| `api` | Custom Node.js 20 build | Express REST API |
| `worker` | Same image as `api` | Background job worker (BullMQ) |
| `postgres` | postgres:16-alpine | Primary relational database |
| `redis` | redis:7-alpine | JWT store + task queue broker |
| `certbot` | certbot/certbot | Automated Let's Encrypt certificate renewal |

**Networking:** All services communicate over a private `uces_net` Docker bridge network. Only Nginx exposes ports 80 and 443 externally.

**Volumes:** `postgres_data`, `redis_data`, `exports_data`, `logs_data` are Docker-managed named volumes for data persistence.

**CI/CD:** GitHub Actions workflows are present in `.github/` for automated testing and build validation.

---

## 4. Technology Stack

### Frontend

| Category | Technology | Version |
|----------|-----------|---------|
| Language | TypeScript | 5.4 |
| Runtime / Bundler | Vite | 5.2 |
| UI Framework | React | 18.2 |
| Routing | React Router DOM | 6.22 |
| Server State | TanStack Query (React Query) | 5.28 |
| Global State | Zustand | 4.5 |
| HTTP Client | Axios | 1.6 |
| Styling | Tailwind CSS | 3.4 |
| Component Primitives | Radix UI (14 packages) | Various 1.x |
| Data Visualisation | Recharts | 2.12 |
| Form Handling | React Hook Form | 7.51 |
| Validation | Zod | 3.22 |
| Internationalisation | i18next + react-i18next | 23.x |
| Icons | Lucide React | 0.363 |
| Date Utilities | date-fns | 3.4 |
| Testing | Vitest + Testing Library | 1.4 |
| E2E Testing | Playwright | 1.43 |
| Mock Service Worker | MSW | 2.2 |

### Backend

| Category | Technology | Version |
|----------|-----------|---------|
| Language | TypeScript | 5.4 |
| Runtime | Node.js | 20 LTS |
| Web Framework | Express | 5.0 (beta) |
| ORM | Prisma | 5.10 |
| Database Driver | `@prisma/client` | 5.10 |
| Redis Client | ioredis | 5.3 |
| Task Queue | BullMQ | 5.4 |
| Authentication | jsonwebtoken + bcrypt | 9.0 / 5.1 |
| Validation | Zod | 3.22 |
| Email | Nodemailer | 6.9 |
| Security Headers | Helmet | 7.1 |
| Rate Limiting | express-rate-limit | 7.2 |
| Logging | Winston + Morgan | 3.12 / 1.10 |
| PDF Generation | PDFKit | 0.14 |
| CSV Generation | csv-stringify | 6.4 |
| API Documentation | swagger-jsdoc + swagger-ui-express | 6.2 / 5.0 |
| Testing | Jest + Supertest | 29.7 / 6.3 |

### Infrastructure

| Technology | Version | Role |
|-----------|---------|------|
| PostgreSQL | 16-alpine | Primary relational database |
| Redis | 7-alpine | Token store + queue broker |
| Nginx | 1.25-alpine | Reverse proxy + static server |
| Docker Engine | 24+ | Container runtime |
| Docker Compose | v2 | Multi-service orchestration |
| Let's Encrypt (Certbot) | Latest | TLS certificate provisioning |

---

## 5. Actors and Use Cases

### 5.1 Actors

| Actor | Description |
|-------|-------------|
| **Student** | Registered university student enrolled in one or more course offerings |
| **Instructor** | Faculty member assigned to one or more course offerings |
| **Department Head** | Faculty member who heads a department; elevated read access |
| **Admin** | System administrator with full management privileges |
| **System (Scheduled)** | Automated background worker (BullMQ) that handles notification dispatch |

### 5.2 Use Case Summary

| ID | Use Case | Actors |
|----|----------|--------|
| UC-01 | Login to system | All |
| UC-02 | Logout | All |
| UC-03 | Refresh access token | All (via interceptor) |
| UC-04 | Request password reset | All |
| UC-05 | Reset password | All |
| UC-06 | View own profile (`/me`) | All |
| UC-07 | Manage users (CRUD) | Admin |
| UC-08 | Manage departments | Admin |
| UC-09 | Manage academic terms | Admin |
| UC-10 | Manage courses | Admin |
| UC-11 | Manage course offerings | Admin |
| UC-12 | Manage student enrollments | Admin |
| UC-13 | Build evaluation form templates | Admin |
| UC-14 | Publish / clone form templates | Admin |
| UC-15 | Configure evaluation window | Admin |
| UC-16 | Release evaluation results | Admin |
| UC-17 | View institution-wide report | Admin |
| UC-18 | View / filter audit log | Admin |
| UC-19 | Send manual notification | Admin |
| UC-20 | View pending evaluations | Student |
| UC-21 | Submit anonymous evaluation | Student |
| UC-22 | Check own submission status | Student |
| UC-23 | View student dashboard | Student |
| UC-24 | View released evaluation report | Instructor, Dept Head, Admin |
| UC-25 | View instructor summary report | Instructor, Dept Head, Admin |
| UC-26 | View notifications | All |
| UC-27 | Mark notification as read | All |

### 5.3 Use Case Descriptions (Critical Paths)

---

#### UC-21: Submit Anonymous Evaluation

**Actor:** Student  
**Preconditions:**
1. Student is authenticated.
2. Student is enrolled in the course offering.
3. The current datetime falls within the offering's `evalWindowOpen`–`evalWindowClose`.
4. An evaluation form template is assigned to the offering.
5. Student has not previously submitted for this offering.

**Main Flow:**
1. Student navigates to `/student/evaluations`.
2. System returns list of open offerings where the student has not yet submitted.
3. Student selects an offering.
4. System fetches the assigned evaluation form (`GET /evaluations/:offeringId/form`).
5. Student fills in all required questions (Likert, single-choice, multi-choice, open-text).
6. Student clicks "Submit Evaluation".
7. Client-side validation ensures all required questions are answered.
8. System sends `POST /evaluations/:offeringId/submit` with the answer payload.
9. Server executes an **atomic database transaction**:
   - Creates `Response` records (no `student_id` column — only `offeringId` + `questionId` + `value`).
   - Upserts a `ParticipationToken` row (sets `submitted = true`, records `submittedAt`).
10. System returns success; client displays a confirmation screen.

**Alternate Flow — Already Submitted:**  
At step 9, if `ParticipationToken.submitted = true` already exists, server returns HTTP 409. Client displays "You have already submitted an evaluation for this course."

**Postconditions:**  
- Responses are stored anonymously; no row in the database links the student's identity to their answers.
- Student cannot re-submit.

---

#### UC-16: Release Evaluation Results

**Actor:** Admin  
**Preconditions:**
1. Evaluation window has closed (or admin elects to release early).
2. Response count meets `minResponsesThreshold`.

**Main Flow:**
1. Admin navigates to Evaluation Windows management page.
2. Admin selects an offering and clicks "Release Results".
3. System calls `PUT /offerings/:id/release` with `{ resultsReleased: true }`.
4. Server counts submitted `Response` records; if count < `minResponsesThreshold`, returns HTTP 422 with reason.
5. If threshold met, server updates `offering.resultsReleased = true` and writes an audit log entry.
6. Instructor is now able to access the report for this offering.

---

## 6. Functional Requirements

> **Format:** Each requirement has a unique ID, a priority (`HIGH` / `MED` / `LOW`), and a description.

---

### 6.1 Authentication & Authorization (FR-AUTH)

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-AUTH-01 | HIGH | The system shall allow any user with an active account to authenticate using email and password via `POST /api/v1/auth/login`. |
| FR-AUTH-02 | HIGH | On successful login, the system shall return a short-lived JWT access token (default 15 minutes) in the response body and set an httpOnly `refreshToken` cookie (default 7 days). |
| FR-AUTH-03 | HIGH | The system shall reject login attempts for inactive (`isActive = false`) or non-existent accounts with HTTP 401. |
| FR-AUTH-04 | HIGH | The system shall provide a `POST /auth/refresh` endpoint that accepts the httpOnly refresh cookie, validates it against Redis, and returns a new access token and rotated refresh token. |
| FR-AUTH-05 | HIGH | On logout (`POST /auth/logout`), the system shall add the access token's JTI to a Redis deny-list and delete the refresh token from Redis. |
| FR-AUTH-06 | HIGH | The `authenticate` middleware shall verify the JWT signature and check the Redis deny-list on every protected request. |
| FR-AUTH-07 | HIGH | The `authorize` middleware shall enforce RBAC by comparing `req.user.role` against a list of permitted roles per endpoint. |
| FR-AUTH-08 | MED | The system shall provide a `POST /auth/forgot-password` endpoint that generates a time-limited (1 hour) reset token, hashes it, stores it in the database, and sends a reset email via SMTP. |
| FR-AUTH-09 | MED | The system shall provide a `POST /auth/reset-password` endpoint that validates the reset token, updates the password hash, and records the action in the audit log. |
| FR-AUTH-10 | HIGH | The system shall rate-limit login attempts to 10 requests per 15-minute window per IP. |
| FR-AUTH-11 | MED | The system shall rate-limit password reset requests to 5 per hour per IP. |

---

### 6.2 User Management (FR-USER)

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-USER-01 | HIGH | An authenticated user shall be able to retrieve their own profile via `GET /users/me`. |
| FR-USER-02 | HIGH | Admins shall be able to list users (with optional filtering) via `GET /users/`. |
| FR-USER-03 | HIGH | Admins shall be able to create a new user (with role, department, and credentials) via `POST /users/`. |
| FR-USER-04 | HIGH | Admins shall be able to retrieve a specific user by ID via `GET /users/:id`. |
| FR-USER-05 | HIGH | Admins shall be able to update user attributes (name, role, status, department) via `PUT /users/:id`. |
| FR-USER-06 | HIGH | Admins shall be able to soft-delete a user (set `deletedAt`) via `DELETE /users/:id`. Soft-deleted users cannot log in. |
| FR-USER-07 | MED | Department Heads shall be permitted to list users (read-only) scoped to their department. |

---

### 6.3 Department Management (FR-DEPT)

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-DEPT-01 | HIGH | All authenticated users shall be able to list departments via `GET /departments/`. |
| FR-DEPT-02 | HIGH | Admins shall be able to create a department (`name`, `code`, optional `headId`) via `POST /departments/`. |
| FR-DEPT-03 | HIGH | Admins shall be able to update a department via `PUT /departments/:id`. |
| FR-DEPT-04 | MED | Each department may have at most one designated Department Head. |

---

### 6.4 Term Management (FR-TERM)

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-TERM-01 | HIGH | All authenticated users shall be able to list terms via `GET /terms/`. |
| FR-TERM-02 | HIGH | Admins shall be able to create a term with a name, start date, end date, and active status via `POST /terms/`. |
| FR-TERM-03 | HIGH | Admins shall be able to update a term via `PUT /terms/:id`. |
| FR-TERM-04 | HIGH | Admins shall be able to delete a term via `DELETE /terms/:id` (only if no active offerings reference it). |

---

### 6.5 Course Management (FR-COURSE)

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-COURSE-01 | HIGH | All authenticated users shall be able to list non-archived courses, with optional filtering by `departmentId` and full-text search on `code`/`title`. |
| FR-COURSE-02 | HIGH | Admins shall be able to create a course (`code`, `title`, `credits`, `departmentId`) via `POST /courses/`. Course codes must be unique within a department. |
| FR-COURSE-03 | HIGH | Admins shall be able to update course attributes, including setting `isArchived = true` to hide a course from listings. |

---

### 6.6 Course Offering Management (FR-OFFER)

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-OFFER-01 | HIGH | All authenticated users shall be able to list course offerings, with optional filtering by `termId`, `instructorId`, and `departmentId`. |
| FR-OFFER-02 | HIGH | Admins shall be able to create an offering linking a course, term, instructor, and section via `POST /offerings/`. |
| FR-OFFER-03 | HIGH | Admins shall be able to update offering attributes via `PUT /offerings/:id`. |
| FR-OFFER-04 | HIGH | Admins shall be able to set the evaluation window (`evalWindowOpen`, `evalWindowClose`) for an offering via `PUT /offerings/:id/window`. Open date must precede close date. |
| FR-OFFER-05 | HIGH | Admins shall be able to release (or restrict) evaluation results via `PUT /offerings/:id/release`. Releasing requires the response count to meet the `minResponsesThreshold`. |
| FR-OFFER-06 | MED | Each offering shall carry a configurable `minResponsesThreshold` (default 5) below which results cannot be released, protecting respondent anonymity. |

---

### 6.7 Enrollment Management (FR-ENROLL)

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-ENROLL-01 | HIGH | Admins shall be able to enroll a student in a course offering via `POST /enrollments/offerings/:id/students`. |
| FR-ENROLL-02 | HIGH | Admins shall be able to remove a student's enrollment via `DELETE /enrollments/offerings/:id/students/:studentId`. |
| FR-ENROLL-03 | MED | Admins, Department Heads, and Instructors shall be able to view the student roster for an offering via `GET /enrollments/offerings/:id/students`. |
| FR-ENROLL-04 | HIGH | A student–offering pair shall be unique; duplicate enrollment attempts shall be rejected. |

---

### 6.8 Evaluation Form Builder (FR-FORM)

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-FORM-01 | HIGH | Admins shall be able to create an evaluation form template with a title and optional description via `POST /forms/`. |
| FR-FORM-02 | HIGH | The system shall support four question types: `likert` (numeric scale), `single_choice`, `multi_choice`, and `open_text`. |
| FR-FORM-03 | HIGH | Admins shall be able to add questions to an unpublished form via `POST /forms/:id/questions`. |
| FR-FORM-04 | HIGH | Admins shall be able to update or delete individual questions on an unpublished form. |
| FR-FORM-05 | HIGH | Admins shall be able to reorder questions in a form via `PUT /forms/:id/questions/reorder` using an atomic database transaction. |
| FR-FORM-06 | HIGH | Admins shall be able to publish a form via `POST /forms/:id/publish`. A form must have at least one question to be published. |
| FR-FORM-07 | HIGH | Published forms shall be immutable; editing or deleting questions on a published form shall return HTTP 400. |
| FR-FORM-08 | MED | Admins shall be able to clone a published form (creating a new draft copy at `version + 1`) via `POST /forms/:id/clone`. |
| FR-FORM-09 | MED | Admins, Instructors, and Department Heads shall be able to list all form templates via `GET /forms/`. |

---

### 6.9 Evaluation Submission (FR-EVAL)

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-EVAL-01 | HIGH | Students shall be able to retrieve a list of pending (open-window, not yet submitted) evaluations via `GET /evaluations/pending`. |
| FR-EVAL-02 | HIGH | Students shall be able to fetch the evaluation form for an open offering they are enrolled in via `GET /evaluations/:offeringId/form`. |
| FR-EVAL-03 | HIGH | Students shall be able to check their own submission status for an offering via `GET /evaluations/:offeringId/status`. |
| FR-EVAL-04 | HIGH | Students shall be able to submit an evaluation via `POST /evaluations/:offeringId/submit`. |
| FR-EVAL-05 | HIGH | The submission endpoint shall enforce: (a) student enrollment, (b) open evaluation window, (c) no prior submission, (d) all required questions answered. |
| FR-EVAL-06 | HIGH | Response data shall be written in an **atomic database transaction**: `Response` rows (no `student_id`) and a `ParticipationToken` upsert occur together, or neither does. |
| FR-EVAL-07 | HIGH | The `responses` table shall not contain any column that could link a response back to a specific student. |
| FR-EVAL-08 | HIGH | Students shall not be able to submit more than once per offering (HTTP 409 on duplicate). |
| FR-EVAL-09 | MED | The submission endpoint shall be rate-limited to 3 attempts per 5-minute window per IP to prevent automated submissions. |
| FR-EVAL-10 | MED | Once submitted, evaluations shall not be modifiable or retractable by the student. |

---

### 6.10 Reports & Analytics (FR-REPORT)

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-REPORT-01 | HIGH | Any authenticated user with appropriate role and access shall be able to retrieve a per-offering report via `GET /reports/offerings/:id`. |
| FR-REPORT-02 | HIGH | The per-offering report shall include: total enrolled, total submitted, response rate, and per-question aggregated results. |
| FR-REPORT-03 | HIGH | For `likert` questions, the report shall compute and return mean, median, standard deviation, and value distribution. |
| FR-REPORT-04 | HIGH | For `single_choice`/`multi_choice` questions, the report shall return option frequency distribution. |
| FR-REPORT-05 | HIGH | For `open_text` questions, the report shall return the raw response strings (anonymously — no student identifier). |
| FR-REPORT-06 | HIGH | Instructors shall only be able to view reports for their own offerings, and only after `resultsReleased = true`. |
| FR-REPORT-07 | HIGH | Instructors shall be blocked from viewing reports if submitted responses are below `minResponsesThreshold`. |
| FR-REPORT-08 | MED | Department Heads shall be able to view reports for all offerings within their department. |
| FR-REPORT-09 | MED | Admins shall be able to retrieve institution-wide aggregate statistics (total users, courses, offerings, responses, submissions, recent terms) via `GET /reports/institution`. |
| FR-REPORT-10 | MED | Admins, Department Heads, and Instructors shall be able to retrieve an instructor-level report summarising all released offerings for a given instructor via `GET /reports/instructors/:id`. |
| FR-REPORT-11 | LOW | The frontend report page shall render Likert distributions as bar charts (Recharts) with mean/median/std dev display. |

---

### 6.11 Notifications (FR-NOTIFY)

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-NOTIFY-01 | MED | The system shall support four notification types: `eval_open`, `eval_reminder`, `submission_confirm`, and `result_released`. |
| FR-NOTIFY-02 | MED | The system shall support two notification channels: `email` and `in_app`. |
| FR-NOTIFY-03 | MED | Authenticated users shall be able to retrieve their last 50 notifications (sorted by newest) via `GET /notifications/`. |
| FR-NOTIFY-04 | MED | Authenticated users shall be able to mark a notification as read via `PUT /notifications/:id/read`. |
| FR-NOTIFY-05 | LOW | Admins shall be able to send a manual notification to a specific user via `POST /notifications/send`. |
| FR-NOTIFY-06 | LOW | A background worker (BullMQ) is provisioned for asynchronous notification delivery. |

---

### 6.12 Audit Logging (FR-AUDIT)

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-AUDIT-01 | HIGH | The system shall record an audit log entry for all privileged write operations (user created, login, logout, password reset, course created/updated, department created/updated, term created/updated/deleted, offering created/updated/window set/results released/restricted, form created/published, enrollment changes). |
| FR-AUDIT-02 | HIGH | Each audit log entry shall include: actor (user ID), action string, target type, target ID, metadata (JSON), IP address, and creation timestamp. |
| FR-AUDIT-03 | HIGH | Admins shall be able to query the audit log with filters (`actorId`, `action`, `targetType`, date range) and pagination via `GET /audit/`. |
| FR-AUDIT-04 | HIGH | Audit log entries shall be immutable; the API provides no update or delete endpoint for audit records. |

---

## 7. Non-Functional Requirements

### 7.1 Privacy & Anonymity (NFR-PRIV)

| ID | Priority | Requirement |
|----|----------|-------------|
| NFR-PRIV-01 | CRITICAL | The `responses` table shall have **no** `student_id` column. This is enforced at the database schema level via the Prisma schema, not application policy. |
| NFR-PRIV-02 | CRITICAL | There shall be no join key, foreign key, or any other database mechanism that allows linking a `Response` row to a specific student. |
| NFR-PRIV-03 | HIGH | The `ParticipationToken` table shall track **only** whether a student submitted — it shall contain no response data. |
| NFR-PRIV-04 | HIGH | The submission transaction (FR-EVAL-06) shall be atomic so that response data and participation tracking are always consistent. |
| NFR-PRIV-05 | HIGH | The minimum-response threshold (FR-OFFER-06) provides k-anonymity protection; individual responses cannot be isolated. |
| NFR-PRIV-06 | MED | Open-text responses in reports shall be presented as plain strings with no metadata that could identify the respondent. |

### 7.2 Security (NFR-SEC)

| ID | Priority | Requirement |
|----|----------|-------------|
| NFR-SEC-01 | HIGH | All HTTP communication in production shall be over TLS 1.2 or 1.3 enforced by Nginx. |
| NFR-SEC-02 | HIGH | The API shall set the following security headers via Helmet: `Strict-Transport-Security` (HSTS, 2 years), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`. |
| NFR-SEC-03 | HIGH | Nginx shall additionally set `Referrer-Policy` and `X-XSS-Protection` headers. |
| NFR-SEC-04 | HIGH | Refresh tokens shall be stored in httpOnly, Secure, SameSite cookies to prevent JavaScript access. |
| NFR-SEC-05 | HIGH | Passwords shall be hashed with bcrypt at a minimum cost factor of 10 (registration); 12 for password resets. |
| NFR-SEC-06 | HIGH | Password reset tokens shall be hashed with bcrypt before database storage; the raw token is only transmitted in the email link. |
| NFR-SEC-07 | HIGH | JWT secrets shall be at least 32 characters, validated at application startup via Zod schema. |
| NFR-SEC-08 | HIGH | The forgot-password endpoint shall not disclose whether an email address is registered (silent no-op if not found). |
| NFR-SEC-09 | HIGH | All request bodies shall be validated via Zod schemas before processing. |
| NFR-SEC-10 | MED | Rate limiting shall be applied to authentication (10 req/15 min), password reset (5 req/hr), and evaluation submission (3 req/5 min) endpoints. |
| NFR-SEC-11 | MED | CORS shall be restricted to the configured `CLIENT_URL` only. |
| NFR-SEC-12 | MED | The general API rate limiter shall allow no more than 200 requests per minute per IP. |

### 7.3 Performance (NFR-PERF)

| ID | Priority | Requirement |
|----|----------|-------------|
| NFR-PERF-01 | HIGH | API responses for list endpoints shall be returned within 500 ms under normal load (< 100 concurrent users). |
| NFR-PERF-02 | MED | Gzip compression shall be enabled on both the Nginx layer (for static assets and HTML) and the Express layer (via `compression` middleware). |
| NFR-PERF-03 | MED | Static assets (JS, CSS, fonts, images) served by Nginx shall carry a 1-year `Cache-Control: public, immutable` header. |
| NFR-PERF-04 | MED | Database queries shall be supported by appropriate indexes defined in the Prisma schema (email, student/offering IDs, audit log timestamps). |
| NFR-PERF-05 | LOW | The Axios client shall have a 15-second request timeout; requests exceeding this shall fail with a clear error. |

### 7.4 Reliability & Availability (NFR-REL)

| ID | Priority | Requirement |
|----|----------|-------------|
| NFR-REL-01 | HIGH | All Docker services shall use `restart: unless-stopped` to recover from crashes automatically. |
| NFR-REL-02 | HIGH | PostgreSQL health-check must pass before the API container starts (Docker Compose `depends_on` with `condition: service_healthy`). |
| NFR-REL-03 | HIGH | Database writes during evaluation submission shall use a Prisma `$transaction` to ensure atomicity and prevent partial state. |
| NFR-REL-04 | MED | Let's Encrypt certificates shall be renewed automatically by the `certbot` container every 12 hours. |
| NFR-REL-05 | LOW | The system targets ≥ 99% uptime in production, excluding scheduled maintenance. |

### 7.5 Maintainability (NFR-MAINT)

| ID | Priority | Requirement |
|----|----------|-------------|
| NFR-MAINT-01 | HIGH | The codebase shall be fully TypeScript with strict mode; implicit `any` types are not permitted. |
| NFR-MAINT-02 | HIGH | Environment configuration shall be declared and validated via a Zod schema at startup; misconfiguration shall cause immediate process exit. |
| NFR-MAINT-03 | MED | API documentation shall be auto-generated from JSDoc `@openapi` annotations and served at `/api/docs` (Swagger UI). |
| NFR-MAINT-04 | MED | Database schema changes shall be managed exclusively via Prisma migrations. |
| NFR-MAINT-05 | MED | The backend shall include unit tests (Jest) for critical service logic and utility functions. |
| NFR-MAINT-06 | MED | The frontend shall include unit/component tests (Vitest + Testing Library) and end-to-end tests (Playwright). |
| NFR-MAINT-07 | LOW | HTTP request/response logs shall be written via Morgan (request logger) and Winston (application logger) with configurable log level. |

### 7.6 Usability (NFR-USE)

| ID | Priority | Requirement |
|----|----------|-------------|
| NFR-USE-01 | HIGH | The evaluation submission form shall display clear inline validation errors for each unanswered required question before allowing submission. |
| NFR-USE-02 | HIGH | After successful submission, students shall see a confirmation screen reinforcing anonymity. |
| NFR-USE-03 | MED | Each role shall be redirected to its own dashboard immediately after login. |
| NFR-USE-04 | MED | All interactive UI components (dialogs, dropdowns, radio groups, checkboxes, toasts) shall use Radix UI primitives with WAI-ARIA compliance. |
| NFR-USE-05 | MED | Required form fields shall be marked with an asterisk (`*`) and a screen-reader `aria-label`. |
| NFR-USE-06 | LOW | The interface shall be internationalisation-ready (i18next framework configured). |

### 7.7 Scalability (NFR-SCALE)

| ID | Priority | Requirement |
|----|----------|-------------|
| NFR-SCALE-01 | MED | The stateless JWT architecture shall allow horizontal scaling of the API tier behind a load balancer without session affinity. |
| NFR-SCALE-02 | MED | The BullMQ worker is separated into its own Docker service (`worker`) to allow independent scaling of background job processing. |
| NFR-SCALE-03 | LOW | The database layer supports connection pooling via Prisma's built-in connection manager. |

### 7.8 Compliance (NFR-COMP)

| ID | Priority | Requirement |
|----|----------|-------------|
| NFR-COMP-01 | HIGH | The system's two-table anonymity model (FR-EVAL-06, NFR-PRIV-01/02) is designed to support FERPA / GDPR-equivalent principles for educational data privacy. |
| NFR-COMP-02 | MED | All sensitive configuration (JWT secrets, database credentials, SMTP passwords) shall be provided via environment variables and never hard-coded in source files. |
| NFR-COMP-03 | MED | The `.env.example` file shall document all required environment variables without exposing production secrets. |

---

## 8. Data Model

### Entity Relationship Overview

```
Department ──< User >──< Enrollment >──< CourseOffering >──< Course
                │                               │
                │                               ├── Term
                │                               ├── EvalFormTemplate ──< EvalQuestion
                │                               ├── ParticipationToken
                │                               └── Response (no student_id)
                │
                ├── AuditLog
                └── Notification
```

### Entity Descriptions

| Entity | Key Fields | Notes |
|--------|-----------|-------|
| `User` | `id`, `email`, `passwordHash`, `firstName`, `lastName`, `role`, `departmentId`, `isActive`, `deletedAt` | Soft-delete via `deletedAt`; password nullable for future SSO accounts |
| `Department` | `id`, `name`, `code`, `headId` | Unique name and code; `headId` FK to `users` |
| `Term` | `id`, `name`, `startDate`, `endDate`, `isActive` | Multiple terms can coexist; `isActive` is informational |
| `Course` | `id`, `code`, `title`, `credits`, `departmentId`, `isArchived` | Code unique per department; archived courses excluded from default listings |
| `CourseOffering` | `id`, `courseId`, `termId`, `instructorId`, `section`, `evalFormId`, `evalWindowOpen`, `evalWindowClose`, `minResponsesThreshold`, `resultsReleased` | Unique per `(courseId, termId, section)` |
| `Enrollment` | `id`, `studentId`, `offeringId`, `enrolledAt` | Unique per `(studentId, offeringId)` |
| `EvalFormTemplate` | `id`, `title`, `description`, `version`, `isPublished`, `createdBy` | Published forms are immutable |
| `EvalQuestion` | `id`, `templateId`, `orderIndex`, `type`, `text`, `isRequired`, `options` (JSON), `scaleMin`, `scaleMax` | Cascades delete with template |
| `ParticipationToken` | `id`, `studentId`, `offeringId`, `submitted`, `submittedAt` | Tracks participation only — no response data |
| `Response` | `id`, `offeringId`, `questionId`, `value` | **No `student_id` column** — anonymity by design |
| `AuditLog` | `id`, `actorId`, `action`, `targetType`, `targetId`, `metadata`, `ipAddress`, `createdAt` | Append-only; no update/delete API |
| `Notification` | `id`, `userId`, `type`, `channel`, `status`, `sentAt`, `payload` | Status: `pending` → `sent` / `failed` |

### Enumerations

| Enum | Values |
|------|--------|
| `Role` | `student`, `instructor`, `dept_head`, `admin` |
| `QuestionType` | `likert`, `single_choice`, `multi_choice`, `open_text` |
| `NotificationType` | `eval_open`, `eval_reminder`, `submission_confirm`, `result_released` |
| `NotificationChannel` | `email`, `in_app` |
| `NotificationStatus` | `pending`, `sent`, `failed` |

---

## 9. API Design Overview

All endpoints are prefixed with `/api/v1/`. Every response follows the envelope:
- **Success:** `{ "success": true, "data": <payload> }`
- **Error:** `{ "success": false, "error": { "code": "...", "message": "...", "details": <nullable> } }`
- **Paginated:** adds `"pagination": { "page", "limit", "total", "totalPages" }`

### Endpoint Summary

| Module | Method | Path | Auth | Min Role |
|--------|--------|------|------|----------|
| Health | GET | `/health` | ✗ | — |
| Auth | POST | `/auth/login` | ✗ | — |
| Auth | POST | `/auth/logout` | ✓ | any |
| Auth | POST | `/auth/refresh` | ✗ | — |
| Auth | POST | `/auth/forgot-password` | ✗ | — |
| Auth | POST | `/auth/reset-password` | ✗ | — |
| Users | GET | `/users/me` | ✓ | any |
| Users | GET | `/users/` | ✓ | admin, dept_head |
| Users | POST | `/users/` | ✓ | admin |
| Users | GET | `/users/:id` | ✓ | admin |
| Users | PUT | `/users/:id` | ✓ | admin |
| Users | DELETE | `/users/:id` | ✓ | admin |
| Departments | GET | `/departments/` | ✓ | any |
| Departments | POST | `/departments/` | ✓ | admin |
| Departments | GET | `/departments/:id` | ✓ | any |
| Departments | PUT | `/departments/:id` | ✓ | admin |
| Terms | GET | `/terms/` | ✓ | any |
| Terms | POST | `/terms/` | ✓ | admin |
| Terms | GET | `/terms/:id` | ✓ | any |
| Terms | PUT | `/terms/:id` | ✓ | admin |
| Terms | DELETE | `/terms/:id` | ✓ | admin |
| Courses | GET | `/courses/` | ✓ | any |
| Courses | POST | `/courses/` | ✓ | admin |
| Courses | GET | `/courses/:id` | ✓ | any |
| Courses | PUT | `/courses/:id` | ✓ | admin |
| Offerings | GET | `/offerings/` | ✓ | any |
| Offerings | POST | `/offerings/` | ✓ | admin |
| Offerings | GET | `/offerings/:id` | ✓ | any |
| Offerings | PUT | `/offerings/:id` | ✓ | admin |
| Offerings | PUT | `/offerings/:id/window` | ✓ | admin |
| Offerings | PUT | `/offerings/:id/release` | ✓ | admin |
| Enrollments | GET | `/enrollments/offerings/:id/students` | ✓ | admin, dept_head, instructor |
| Enrollments | POST | `/enrollments/offerings/:id/students` | ✓ | admin |
| Enrollments | DELETE | `/enrollments/offerings/:id/students/:studentId` | ✓ | admin |
| Forms | GET | `/forms/` | ✓ | admin, instructor, dept_head |
| Forms | POST | `/forms/` | ✓ | admin |
| Forms | GET | `/forms/:id` | ✓ | any |
| Forms | PUT | `/forms/:id` | ✓ | admin |
| Forms | POST | `/forms/:id/publish` | ✓ | admin |
| Forms | POST | `/forms/:id/clone` | ✓ | admin |
| Forms | POST | `/forms/:id/questions` | ✓ | admin |
| Forms | PUT | `/forms/:id/questions/reorder` | ✓ | admin |
| Forms | PUT | `/forms/:id/questions/:qId` | ✓ | admin |
| Forms | DELETE | `/forms/:id/questions/:qId` | ✓ | admin |
| Evaluations | GET | `/evaluations/pending` | ✓ | student |
| Evaluations | GET | `/evaluations/:offeringId/form` | ✓ | student |
| Evaluations | GET | `/evaluations/:offeringId/status` | ✓ | student |
| Evaluations | POST | `/evaluations/:offeringId/submit` | ✓ | student |
| Reports | GET | `/reports/offerings/:id` | ✓ | admin, dept_head, instructor |
| Reports | GET | `/reports/institution` | ✓ | admin |
| Reports | GET | `/reports/instructors/:id` | ✓ | admin, dept_head, instructor |
| Notifications | GET | `/notifications/` | ✓ | any |
| Notifications | PUT | `/notifications/:id/read` | ✓ | any |
| Notifications | POST | `/notifications/send` | ✓ | admin |
| Audit | GET | `/audit/` | ✓ | admin |
| Docs | GET | `/api/docs` | ✗ | — |

---

## 10. External Interface Requirements

### 10.1 User Interface

The frontend is a React 18 SPA served by Nginx at the root (`/`). Pages are accessed via client-side routing with HTML5 History API.

| Page / Route | Role | Description |
|-------------|------|-------------|
| `/login` | Public | Email/password login form |
| `/forgot-password` | Public | Email entry for password reset |
| `/reset-password?token=` | Public | New password entry |
| `/student/dashboard` | Student | Welcome card and quick-access links |
| `/student/evaluations` | Student | List of open/pending evaluations |
| `/student/evaluations/:offeringId` | Student | Evaluation form with multi-type questions |
| `/instructor/dashboard` | Instructor | List of own course offerings and report links |
| `/instructor/reports/:offeringId` | Instructor | Statistical report with bar charts |
| `/admin/dashboard` | Admin | Institution stats (users, courses, offerings, submissions) |
| `/admin/users` | Admin | User management table (CRUD) |
| `/admin/courses` | Admin | Course/department/term management |
| `/admin/forms` | Admin | Evaluation form builder |
| `/admin/windows` | Admin | Evaluation window configuration and result release |
| `/admin/audit` | Admin | Paginated, filterable audit log |

### 10.2 Hardware Interfaces

No special hardware interfaces are required. UCES is a web application accessed via standard HTTP(S).

### 10.3 Software Interfaces

| Interface | Protocol | Direction | Purpose |
|-----------|---------|-----------|---------|
| PostgreSQL | TCP/5432 (prisma-client) | API → DB | All persistent data reads and writes |
| Redis | TCP/6379 (ioredis) | API → Cache | JWT management, BullMQ queues |
| SMTP Server | TCP/587 STARTTLS (Nodemailer) | API → Email | Password reset and notification emails |
| Nginx | HTTP/1.1 + HTTP/2 (reverse-proxy) | Browser → Nginx → API | TLS termination and request routing |

### 10.4 Communication Interfaces

- **Client ↔ Nginx:** HTTPS (TLS 1.2/1.3) on port 443; HTTP on 80 (redirects to HTTPS).
- **Nginx ↔ API:** HTTP/1.1 with keepalive on the internal Docker network (port 3001).
- **API ↔ PostgreSQL / Redis:** Internal Docker bridge network only; not exposed externally.
- **API ↔ SMTP:** Outbound STARTTLS on port 587 to external mail server.

---

## 11. Constraints and Limitations

| # | Constraint |
|---|-----------|
| 1 | Self-registration is not supported. All user accounts must be created by an administrator. |
| 2 | The system does not support bulk enrollment; students must be enrolled individually via the API. |
| 3 | A course offering can be linked to only one evaluation form template. Changing the form after responses have been collected would invalidate existing data. |
| 4 | Open-text responses are stored and transmitted in plain text; PII entered by students is not scrubbed. |
| 5 | Password hashing uses bcrypt with a synchronous API; under extreme concurrency this may become a bottleneck. |
| 6 | The BullMQ worker (`worker` service) shares the same Docker image as the API; a dedicated `dist/worker.js` entry point must be compiled for it to function. |
| 7 | Swagger UI is disabled in production by default (`ENABLE_SWAGGER=false`); it must be explicitly enabled for API exploration. |
| 8 | The system has no built-in export (PDF/CSV) API endpoint exposed via the REST surface, though `pdfkit` and `csv-stringify` are installed as dependencies. |
| 9 | Token refresh uses an httpOnly cookie; clients must set `withCredentials: true` (Axios) or `credentials: 'include'` (fetch) to include the cookie. |
| 10 | Department Head users share the admin frontend routes (`/admin/*`); granular UI differences are handled by role checks within page components. |

---

## Appendix A — Seeded Test Data

After running `npx prisma db seed` (from `server/`), the following entities are available:

**Departments:** Computer Science (CS), Engineering (ENG)

**Users:**

| Email | Role | Password |
|-------|------|---------|
| `admin@uni.edu` | admin | `Admin1234!` |
| `depthead@uni.edu` | dept_head | `Admin1234!` |
| `instructor@uni.edu` | instructor | `Admin1234!` |
| `student@uni.edu` | student | `Admin1234!` |

**Term:** Fall 2024 (2024-09-01 → 2025-01-15, isActive = true)

**Courses:** CS401 Software Engineering (3 credits), CS301 Database Systems (3 credits)

**Course Offering:** CS401 Section A, Fall 2024, taught by `instructor@uni.edu`, evaluation window open (2024-12-01 → 2025-12-31), `minResponsesThreshold = 3`

**Evaluation Form Template:** "Standard Course Evaluation Form v1" — 8 questions (4 Likert, 1 single-choice, 1 multi-choice, 2 open-text), published

**Enrollment:** `student@uni.edu` is enrolled in the CS401 offering.

---

## Appendix B — Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Runtime environment |
| `PORT` | No | `3001` | API server port |
| `APP_URL` | No | `http://localhost:3001` | Base URL of the API (used in email links) |
| `CLIENT_URL` | No | `http://localhost:5173` | Frontend URL (CORS allowed origin) |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection string |
| `REDIS_PASSWORD` | No | — | Redis auth password |
| `JWT_SECRET` | **Yes** | — | HMAC secret for access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | **Yes** | — | HMAC secret for refresh tokens (min 32 chars) |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token TTL |
| `SMTP_HOST` | No | `localhost` | SMTP server hostname |
| `SMTP_PORT` | No | `587` | SMTP server port |
| `SMTP_SECURE` | No | `false` | Use TLS for SMTP (`true`/`false`) |
| `SMTP_USER` | No | — | SMTP authentication username |
| `SMTP_PASS` | No | — | SMTP authentication password |
| `EMAIL_FROM` | No | `UCES <noreply@uni.edu>` | "From" header for outbound emails |
| `LOG_LEVEL` | No | `info` | Winston log level (`error`\|`warn`\|`info`\|`debug`) |
| `ENABLE_SWAGGER` | No | `true` | Serve Swagger UI at `/api/docs` |
| `VITE_API_URL` | No | (empty — uses `/api/v1`) | Frontend API base URL override |

---

*End of Software Requirements Specification — UCES-SRS-001 v1.0*
