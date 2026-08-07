# Responsible AI Statement

## University Course Evaluation System (UCES)

---

## 1. Purpose

This document describes how Responsible AI (RAI) principles were applied during the development of the UCES system and how those principles are reflected in the system's design and operation.

---

## 2. AI Tools Used

| Tool | Purpose |
|---|---|
| **IBM Bob** | Software engineering assistant — requirements, design, code generation, audit, documentation |

IBM Bob was used as a development accelerator, not as a decision-maker. All AI-generated artefacts were reviewed by the development team before being accepted.

---

## 3. Principles Applied

### 3.1 Transparency
- This document and [`docs/IBM_BOB_USAGE.md`](./IBM_BOB_USAGE.md) disclose all AI tool use.
- Students are shown a notice on the login page and evaluation submission screen that the system was built with AI assistance and that their responses are anonymous.
- Administrators can view a full, append-only audit log of all system actions (`/admin/audit`).

### 3.2 Privacy and Data Minimisation
- The `Response` table has **no `student_id` column** — anonymity is enforced at the database schema level, not just policy.
- The `ParticipationToken` table tracks *whether* a student submitted, but there is no join key that links it to the actual responses.
- A **minimum response threshold** prevents instructors from viewing results for offerings with fewer than 5 responses (configurable), reducing the risk of demographic re-identification.
- Password reset tokens are hashed with bcrypt before storage; raw tokens are never stored.
- JWT access tokens expire in 15 minutes. Refresh tokens are stored server-side in Redis and can be revoked instantly.

### 3.3 Fairness
- The evaluation system applies equally to all course offerings regardless of department, instructor seniority, or course size.
- Results are only released by an admin after the evaluation window closes, preventing mid-period score leakage that could influence student responses.
- The minimum response threshold applies uniformly; no exceptions are made per course or instructor.

### 3.4 Accountability
- All administrative actions (user creation, result release, audit log access, etc.) are recorded in the `AuditLog` table with actor ID, IP address, and timestamp.
- The audit log is append-only (no DELETE endpoint is exposed) and visible only to users with the `admin` role.
- Role-based access control (RBAC) is enforced at the API layer via the `authorize` middleware; roles are: `student`, `instructor`, `dept_head`, `admin`.

### 3.5 Reliability and Safety
- The server will not start if Redis is unavailable — JWT deny-listing requires Redis, and silently continuing would create a security hole.
- Rate limiting is applied to all API routes (200 req/min general), with stricter limits on authentication (10/15 min) and password reset (5/hour).
- Helmet.js sets security HTTP headers (HSTS, CSP, X-Frame-Options) on all responses.
- Input validation is performed via Zod schemas on all incoming request bodies.

### 3.6 Human Oversight
- No AI model output is used in processing or scoring student evaluations.
- All statistical analysis (mean, median, std dev, distribution) is performed by deterministic server-side code.
- Administrators retain full control over: evaluation windows, result release, form templates, user accounts, and course offerings.
- AI-generated code was reviewed against the SRS and Project Audit Report before deployment.

### 3.7 Inclusion and Accessibility
- The frontend uses semantic HTML (`label`, `aria-label`, `role="alert"`) for screen reader compatibility.
- Error messages are displayed inline with `role="alert"` for assistive technology.
- The application is responsive (mobile sidebar with overlay) to support various device types.

---

## 4. Data Retention and Student Rights

- Student identities are never linked to evaluation responses in the database.
- Soft-deletion (`deletedAt` timestamp) is used for user accounts, preserving audit trail integrity while making accounts inactive.
- Institutions deploying UCES are responsible for complying with applicable data protection regulations (FERPA, GDPR, PDPA, etc.) in their jurisdiction.

---

## 5. Contact

For questions about the responsible AI practices in UCES, contact the institution's data protection officer or the UCES development team.

---

*Document version: 1.0 — UCES-RAI-001*
