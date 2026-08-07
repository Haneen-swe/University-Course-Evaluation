# IBM Bob Usage in UCES Development

## Overview

IBM Bob (an AI-powered software engineering assistant) was used throughout the development of the University Course Evaluation System (UCES) to accelerate delivery, maintain code quality, and ensure the final system is secure, scalable, and production-ready.

---

## How IBM Bob Was Used

### Phase 1 — Requirements Analysis
- Bob analysed the initial project brief and generated the full **SRS** (Software Requirements Specification), covering functional requirements, non-functional requirements, privacy constraints, data model, and API design.
- Bob cross-referenced the requirements against FERPA-style anonymity principles and IEEE Std 830-1998 to ensure the document met academic standards.

### Phase 2 — System Design
- Bob produced all 13 architecture and design documents under `docs/phase-2-system-design/`, including:
  - Entity-relationship diagram and Prisma schema
  - REST API design with complete endpoint documentation
  - Security architecture (JWT + Redis deny-listing, httpOnly cookies)
  - Infrastructure design (Docker Compose, Nginx reverse proxy, MailHog dev SMTP)
  - Privacy architecture (anonymous `Response` table with no `student_id` column)

### Phase 3 — Implementation
- Bob implemented the full-stack application:
  - **Backend**: Express 5 + TypeScript API with Prisma ORM, JWT authentication, role-based authorization, audit logging, and Swagger documentation.
  - **Frontend**: React 18 SPA with TanStack Query, Zustand auth store, Tailwind CSS, and role-differentiated navigation.
- Bob iteratively produced a **Project Audit Report** (`docs/Project_Audit.md`) identifying 40 issues across P0–P3 priorities, then fixed all critical (P0) and high-priority (P1) issues.
- Bob completed all remaining P2 features in a subsequent pass:
  - `CoursesPage` — create and archive functionality
  - `FormsBuilderPage` — full question CRUD (add/delete/publish/clone)
  - `AuditLogPage` — server-side filtering (action, targetType) and pagination
  - `UsersPage` — department assignment in create form, delete confirmation dialog
  - `EvaluationWindowsPage` — eval form template assignment per offering
  - `DepartmentsPage` — full CRUD for department management (new page)
  - `TermsPage` — full CRUD for term management (new page)
  - `EnrollmentsPage` — student enroll/unenroll per offering (new page)
  - `AppLayout` — role-differentiated sidebar (admin vs dept\_head)

---

## Key Decisions Made with Bob's Assistance

| Decision | Rationale |
|---|---|
| **Anonymity enforced at schema level** | The `Response` table has no `student_id` column. `ParticipationToken` (which has `student_id`) cannot be joined to `Response`. This makes re-identification structurally impossible, not just policy-prevented. |
| **Redis for JWT deny-listing** | Stateless JWTs cannot be revoked; deny-listing in Redis ensures logout truly invalidates access tokens within their 15-minute TTL. Redis is treated as a hard dependency — the server will not start without it. |
| **httpOnly refresh token cookie** | Prevents XSS attacks from stealing refresh tokens. The cookie is `SameSite=Lax` in dev and `SameSite=None; Secure` in production to support cross-origin deployments. |
| **Minimum response threshold before releasing results** | Instructors cannot view results until a configurable minimum number of responses is received, preventing demographic re-identification in small-enrollment courses. |
| **Rate limiting on auth and password reset** | Auth endpoints are limited to 10 requests per 15 minutes; password reset to 5 per hour. A general limiter (200 req/min) is applied to all API routes. |
| **Soft delete for users** | Users are never hard-deleted (`deletedAt` timestamp set instead), preserving audit trail integrity. |
| **Separate worker from API** | The BullMQ notification worker was removed from `docker-compose.yml` because the build artifact (`dist/worker.js`) was not yet implemented, preventing container crashes. |

---

## Responsible AI Principles Applied

See [`docs/RESPONSIBLE_AI.md`](./RESPONSIBLE_AI.md) for the full Responsible AI statement.

---

## Limitations and Human Oversight

- All AI-generated code was reviewed before use. The Project Audit Report was Bob's self-review of the generated system.
- No AI model output was used in production data processing (e.g., no AI-generated evaluation scores or summaries).
- Authentication secrets, database credentials, and SMTP configuration are not managed by AI — they are operator-supplied via environment variables.
- Students are informed on the evaluation submission screen that their responses are anonymous and that AI tools were used in developing the system.
