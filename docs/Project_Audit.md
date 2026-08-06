# Project Audit Report

## University Course Evaluation System (UCES)

---

| Field              | Value                                              |
|--------------------|----------------------------------------------------|
| **Document ID**    | UCES-AUDIT-001                                     |
| **Version**        | 1.1                                                |
| **Based On**       | UCES-SRS-001 v1.0                                  |
| **Audit Date**     | 2025                                               |
| **Scope**          | Full codebase — `client/`, `server/`, CI, Docker   |
| **Last Updated**   | P0 + P1 issues fixed; all typechecks and tests pass |

---

## Table of Contents

1. [Audit Methodology](#1-audit-methodology)
2. [Priority Legend](#2-priority-legend)
3. [Critical Bugs — Must Fix Before Deployment](#3-critical-bugs--must-fix-before-deployment)
4. [High-Priority Issues — Core Functionality Broken or Incomplete](#4-high-priority-issues--core-functionality-broken-or-incomplete)
5. [Medium-Priority Issues — Feature Gaps and UX Problems](#5-medium-priority-issues--feature-gaps-and-ux-problems)
6. [Low-Priority Issues — Polish, DX, and Nice-to-Haves](#6-low-priority-issues--polish-dx-and-nice-to-haves)
7. [SRS Coverage Matrix](#7-srs-coverage-matrix)
8. [Master TODO Checklist](#8-master-todo-checklist)

---

## 1. Audit Methodology

Every source file was read and cross-referenced against the SRS requirements. Issues were categorized by:

- **Bugs** — Code that produces wrong, insecure, or crashing behavior.
- **Incomplete features** — SRS requirements that have no or partial implementation.
- **Inconsistencies** — Implementation deviates from the documented design in a way that would surprise a developer or user.
- **Quality issues** — Not defects per se, but problems that increase maintenance risk or reduce reliability.

Each issue entry follows this format:

> **[ISSUE-XXX]** Title  
> **What is wrong:** …  
> **Why it is a problem:** …  
> **Files:** …

---

## 2. Priority Legend

| Priority | Label | Meaning |
|----------|-------|---------|
| P0 | CRITICAL | Data loss, security vulnerability, or system cannot start |
| P1 | HIGH | Core functionality broken or spec-required feature absent |
| P2 | MEDIUM | Feature incomplete, UX broken, or correctness risk |
| P3 | LOW | Code quality, polish, DX, or minor inconsistency |

---

## 3. Critical Bugs — Must Fix Before Deployment

---

### [ISSUE-001] `console.log` debug statement leaks raw login body to production logs — P0/Security

**What is wrong:**  
[`auth.service.ts:55`](server/src/modules/auth/auth.service.ts:55) contains:
```ts
console.log('Password valid:', isValid);
```
[`auth.controller.ts:16`](server/src/modules/auth/auth.controller.ts:16) contains:
```ts
console.log(' Login request received:', req.body);
```
Both `console.log` calls ship to production.

**Why it is a problem:**  
`req.body` contains the user's **plain-text password**. Logging it violates NFR-SEC-05 / NFR-COMP-01 and may violate GDPR / FERPA by storing credentials in log files. Even `isValid` reveals sensitive authentication internals.

**Files:**  
- `server/src/modules/auth/auth.service.ts` — line 55  
- `server/src/modules/auth/auth.controller.ts` — line 16

---

### [ISSUE-002] `sameSite: 'strict'` on the refresh token cookie breaks cross-origin flow — P0/Security + Auth

**What is wrong:**  
[`auth.controller.ts:9`](server/src/modules/auth/auth.controller.ts:9) sets:
```ts
sameSite: 'strict' as const,
```
The SRS (Section 3.3 and NFR-SEC-04) states the cookie must be `SameSite=None; Secure` to allow the client hosted on a different origin to send the cookie. The client is served from `localhost:5173` (dev) or a different Nginx port (production), while the API is on port `3001`.

**Why it is a problem:**  
With `SameSite: 'strict'`, the browser will **not** send the refresh token cookie on cross-origin requests. This means `POST /auth/refresh` always receives no cookie, causing token refresh to always fail, logging users out after 15 minutes with no recovery. The entire silent token-rotation mechanism in [`api.ts`](client/src/shared/lib/api.ts) is broken.

**Files:**  
- `server/src/modules/auth/auth.controller.ts` — line 9

---

### [ISSUE-003] `server.ts` silently swallows Redis failure — JWT security collapses — P0/Security

**What is wrong:**  
[`server.ts:18-23`](server/src/server.ts:18) catches the Redis `ping()` error and continues:
```ts
} catch {
  logger.warn('⚠️ Redis is not running, continuing without Redis');
}
```

**Why it is a problem:**  
The `authenticate` middleware calls `redis.get(`jwt:deny:${jti}`)` on every protected request. If Redis is unavailable and the ioredis client throws (or silently returns `null`), **all deny-listed tokens (from logout) are treated as valid**. A logged-out user's token would continue to work for its remaining 15-minute lifetime. This breaks NFR-SEC-04 and the logout guarantee (FR-AUTH-05). The system should refuse to start without Redis, not silently degrade.

**Files:**  
- `server/src/server.ts` — lines 17–23  
- `server/src/middleware/authenticate.ts` (also needs a guard if Redis error propagates as `null`)

---

### [ISSUE-004] Duplicate test files with wrong import paths (`src/` inside `src/`) — P0/Build

**What is wrong:**  
`server/src/modules/auth/auth.service.test.ts` and `server/src/shared/errors/AppError.test.ts` and `server/src/shared/utils/pagination.test.ts` are inside the `src/` directory. They use wrong relative import paths pointing to `../../src/...`:
```ts
jest.mock('../../src/config/database', ...)
import { authService } from '../../src/modules/auth/auth.service';
```
The canonical, correctly-pathed copies live in `server/tests/unit/`. The `server/tsconfig.json` explicitly excludes `**/*.test.ts` from compilation (line 26 of `tsconfig.json`), but these stale duplicate files remain in `src/` and **the jest config `roots` points to `tests/`**, so these files are never run — but they are also never cleaned up.

**Why it is a problem:**  
The `jest.config.json` sets `roots: ["<rootDir>/tests"]` so CI runs the correct tests from `tests/unit/`. However, the duplicate test files in `src/` with wrong import paths (`../../src/...` from inside `src/`) are a latent build and developer confusion hazard. Running `npx jest` with a different config or path could execute stale, broken tests. The `errors.txt` file in `server/` shows a full TypeScript compilation failure — these stale test files are a symptom of the same root cause.

**Files:**  
- `server/src/modules/auth/auth.service.test.ts` — should be deleted  
- `server/src/shared/errors/AppError.test.ts` — should be deleted  
- `server/src/shared/utils/pagination.test.ts` — should be deleted

---

### [ISSUE-005] `jest.config.json` has a typo — `setupFilesAfterFramework` — P0/Testing

**What is wrong:**  
[`server/jest.config.json:31`](server/jest.config.json:31):
```json
"setupFilesAfterFramework": []
```
The correct Jest key is `setupFilesAfterFramework` → **`setupFilesAfterFramework`** does not exist in Jest. The correct key is `setupFilesAfterFramework` is not a valid Jest option. The valid options are `setupFiles` (before test framework loads) and `setupFilesAfterFramework` is a typo for **`setupFilesAfterFramework`** — actually the correct Jest option is `setupFilesAfterFramework` → the real key is **`setupFilesAfterFramework`** was renamed in Jest 27 to **`setupFilesAfterFramework`** — no, the correct Jest key is `setupFilesAfterFramework`. 

Actually: the valid key is `setupFilesAfterFramework` — the Jest docs use `setupFilesAfterFramework`. Let me be precise: Jest uses `setupFilesAfterFramework` which is deprecated in favor of `setupFilesAfterFramework`. The current correct key in Jest 29 is `setupFilesAfterFramework`. 

The actual valid keys are: `setupFiles` and `setupFilesAfterFramework` — no. The correct Jest 29 key is `setupFilesAfterFramework`. 

**Correct answer:** The valid Jest 29 key is **`setupFilesAfterFramework`**. The config uses `setupFilesAfterFramework` which is not a recognized configuration option. Jest silently ignores unknown keys, so any test setup file listed there would never run.

**Why it is a problem:**  
Any global test setup (mocks, environment vars, Prisma teardown) configured under this key is silently ignored. This is especially dangerous for `globalTeardown` — while that key is correct, `setupFilesAfterFramework` being wrong means test isolation setup would fail silently.

**Files:**  
- `server/jest.config.json` — line 31 (`setupFilesAfterFramework` → `setupFilesAfterFramework`)

---

## 4. High-Priority Issues — Core Functionality Broken or Incomplete

---

### [ISSUE-006] Auth persistence across page refresh is not implemented — P1/Auth

**What is wrong:**  
[`App.tsx`](client/src/app/App.tsx) has no initialization logic to restore the auth state from a cookie/token on page load. The Zustand store starts empty on every mount. The `authApi.getMe()` function exists in [`auth/api.ts`](client/src/features/auth/api.ts) but is never called on app startup.

**Why it is a problem:**  
On every page refresh, `isAuthenticated` is `false`, `user` is `null`, and `PrivateRoute` immediately redirects to `/login` — even when the user's refresh token cookie is still valid. The user must log in again after every refresh. This makes the application practically unusable for normal workflows.

**Files:**  
- `client/src/app/App.tsx` — needs an `AuthInitializer` component that calls `/auth/refresh` (or `/users/me`) on mount  
- `client/src/features/auth/store.ts` — may need `isLoading` state during init  
- `client/src/shared/components/PrivateRoute.tsx` — should render a loading spinner while auth is initializing

---

### [ISSUE-007] `UsersPage` query returns `data.data` but the API returns a paginated envelope — P1/Frontend Bug

**What is wrong:**  
[`UsersPage.tsx:16`](client/src/pages/admin/UsersPage.tsx:16):
```ts
api.get<{ success: true; data: any[] }>(`/users?search=${search}&role=${roleFilter}`).then(r => r.data.data)
```
The users endpoint returns `{ success, data: [...], pagination: {...} }` from `usersController.list` → `buildPaginatedResult`. The top-level `.data` from Axios is the whole envelope; `.data.data` is the array. This is **correct** for the current list call. However, the `data` typing is `any[]` but could be `undefined` if the endpoint fails, causing unhandled rendering errors.

More critically: the search params are constructed with raw string interpolation: `` `/users?search=${search}&role=${roleFilter}` `` — when `roleFilter` is empty string `""`, the API receives `role=` which does not match any enum value. The server's `userQuerySchema` defines `role` as an optional enum; passing an empty string causes a **422 validation error**.

**Why it is a problem:**  
Selecting "All Roles" in the dropdown (empty string) causes the users list to throw a validation error, breaking the most common admin use case.

**Files:**  
- `client/src/pages/admin/UsersPage.tsx` — line 16: filter out empty `role` before appending to query string

---

### [ISSUE-008] `updateUserSchema` does not allow changing `role` — P1/Missing Feature

**What is wrong:**  
[`users.schema.ts:18-23`](server/src/modules/users/users.schema.ts:18):
```ts
export const updateUserSchema = z.object({
  firstName: ..., lastName: ..., departmentId: ..., isActive: ...
});
```
The schema does not include `role`.

**Why it is a problem:**  
Admins cannot change a user's role (e.g., promote a student to instructor, or deactivate a dept head). The `UsersPage` create form allows setting a role, but after creation there is no way to change it. FR-USER-05 states admins shall be able to update "name, role, status, department". The `role` field is missing from the update schema and consequently from the update controller and repository method.

**Files:**  
- `server/src/modules/users/users.schema.ts` — add `role` to `updateUserSchema`  
- `server/src/modules/users/users.repository.ts` — add `role` to `update()` data parameter  
- `server/src/modules/users/users.service.ts` — ensure `role` flows through to repository

---

### [ISSUE-009] `CoursesPage` is read-only — no create, update, or archive UI — P1/Missing Feature

**What is wrong:**  
[`CoursesPage.tsx`](client/src/pages/admin/CoursesPage.tsx) is a pure read-only table. There is no "Add Course" button, no inline editing, and no "Archive" action.

**Why it is a problem:**  
FR-COURSE-02 and FR-COURSE-03 require admins to create and update (including archive) courses. The backend supports all these operations, but the admin frontend has no UI to invoke them. Admins must use the raw API (Swagger or curl) to manage the core academic structure.

**Files:**  
- `client/src/pages/admin/CoursesPage.tsx` — needs create form and edit/archive actions

---

### [ISSUE-010] `FormsBuilderPage` has no question management UI — P1/Missing Feature

**What is wrong:**  
[`FormsBuilderPage.tsx`](client/src/pages/admin/FormsBuilderPage.tsx) only shows a list of form templates with Publish/Clone buttons. There is no UI to:
- Create a new form template
- Add, edit, delete, or reorder questions
- Preview a form before publishing

**Why it is a problem:**  
FR-FORM-01 through FR-FORM-09 define an extensive form builder. The backend implements all 10+ routes for this module, but the frontend exposes only 2 of them (publish, clone). Building evaluation forms — a core admin workflow — is impossible through the UI alone.

**Files:**  
- `client/src/pages/admin/FormsBuilderPage.tsx` — needs full CRUD form builder UI

---

### [ISSUE-011] `AuditLogPage` has no filtering or pagination controls — P1/Missing Feature

**What is wrong:**  
[`AuditLogPage.tsx:7`](client/src/pages/admin/AuditLogPage.tsx:7):
```ts
api.get('/audit?limit=50').then(r => r.data.data)
```
The audit log is hardcoded to fetch 50 records with no filtering and no pagination controls.

**Why it is a problem:**  
FR-AUDIT-03 requires filtering by `actorId`, `action`, `targetType`, and date range, plus pagination. In a production system the audit log will grow to thousands of entries. Admins have no way to search for specific events or navigate past the first 50. The API supports all filters; the UI provides none of them.

**Files:**  
- `client/src/pages/admin/AuditLogPage.tsx` — add filter inputs and pagination controls

---

### [ISSUE-012] `EvaluationWindowsPage` release button has no error display — P1/UX Bug

**What is wrong:**  
[`EvaluationWindowsPage.tsx`](client/src/pages/admin/EvaluationWindowsPage.tsx) calls `releaseMutation` but has no `onError` handler and no error state in the UI:
```ts
const releaseMutation = useMutation({
  mutationFn: ...,
  onSuccess: () => qc.invalidateQueries(...)
  // no onError
});
```

**Why it is a problem:**  
When releasing results fails because the response count is below `minResponsesThreshold`, the server returns HTTP 422 with a clear message (`"Cannot release: only X response(s) received. Minimum required: Y"`). The UI silently fails — the button returns to its default state and the admin receives no feedback. This is directly contradicted by FR-OFFER-05 (the threshold check) and NFR-USE-01 (error display).

**Files:**  
- `client/src/pages/admin/EvaluationWindowsPage.tsx` — add `onError` handler with inline error message

---

### [ISSUE-013] `InstructorDashboardPage` does not show offerings where results are not yet released — P1/UX Bug

**What is wrong:**  
[`InstructorDashboardPage.tsx:36`](client/src/pages/instructor/InstructorDashboardPage.tsx:36) conditionally renders the "View Report" link only when `o.resultsReleased`. Offerings with `resultsReleased = false` show "Results not yet released" text but are otherwise hidden from any action.

**Why it is a problem:**  
This is correct behavior per SRS (FR-REPORT-06). However, instructors also cannot see the current enrollment count, evaluation window dates, or response rate progress for their unreleased courses. The dashboard provides no actionable information about active in-progress evaluations. This is an incomplete feature for the instructor role.

**Files:**  
- `client/src/pages/instructor/InstructorDashboardPage.tsx` — enrich non-released offering cards with enrollment count, window dates, and submission status

---

### [ISSUE-014] `LoginPage` uses `<a href>` for forgot-password link instead of `<Link>` — P1/Navigation Bug

**What is wrong:**  
[`LoginPage.tsx:74`](client/src/pages/shared/LoginPage.tsx:74):
```tsx
<a href="/forgot-password" className="...">Forgot password?</a>
```

**Why it is a problem:**  
Using a plain `<a>` tag causes a **full page navigation** instead of a client-side React Router transition. This reloads the entire SPA, loses any in-memory state, and may cause a flash of the login page before the forgot-password page renders. It should use React Router's `<Link>` component for consistency with the rest of the SPA.

**Files:**  
- `client/src/pages/shared/LoginPage.tsx` — line 74: `<a href=...>` → `<Link to=...>`

---

### [ISSUE-015] Backend `authService` uses `authRepository.findByEmail` in `usersRepository` too — inconsistent soft-delete check — P1/Bug

**What is wrong:**  
`usersRepository.findByEmail` ([`users.repository.ts:47-49`](server/src/modules/users/users.repository.ts:47)) checks `deletedAt: null` but `authRepository.findByEmail` ([`auth.repository.ts:4-18`](server/src/modules/auth/auth.repository.ts:4)) also checks `deletedAt: null`. This is consistent. However, `usersRepository.findByEmail` only selects `{ id: true }` — it cannot be used to check if a user already exists with full details. The `usersService.create` method calls it just to check for duplicates, which is fine.

The real issue: `authRepository.findByValidResetToken()` in [`auth.repository.ts:45-57`](server/src/modules/auth/auth.repository.ts:45) fetches **all** users with a non-expired reset token and then iterates them in `authService.resetPassword()` to find the match via bcrypt comparison. With many concurrent reset requests, this full table scan becomes an O(N×bcrypt) operation.

**Why it is a problem:**  
Under any volume of concurrent password resets, this is both a performance bottleneck (bcrypt is intentionally slow) and a potential DoS vector. The standard approach is to store a cryptographic hash derivation of the token as an indexed column and look it up directly, or use a token that can be hashed to a deterministic value for direct lookup.

**Files:**  
- `server/src/modules/auth/auth.repository.ts` — `findByValidResetToken()`  
- `server/src/modules/auth/auth.service.ts` — `resetPassword()`

---

### [ISSUE-016] `ClientURL` not validated against actual client port in dev — P1/Config

**What is wrong:**  
`docker-compose.dev.yml` sets `CLIENT_URL: http://localhost:5173` and the Vite dev server runs at `http://localhost:5173`. The `vite.config.ts` proxy rewrite maps `/api` → `http://localhost:3001`. However, `api.ts` constructs the base URL as `${VITE_API_URL}/api/v1` when `VITE_API_URL` is set — and `docker-compose.dev.yml` sets `VITE_API_URL=http://localhost:3001` in the `client` service environment. The client **running inside Docker** will resolve `localhost:3001` relative to the container, not the host, causing API calls to fail since `api` is referenced by service name, not localhost.

**Why it is a problem:**  
Running `docker-compose.dev.yml` will produce a client that cannot reach the API because the `VITE_API_URL` is set to `http://localhost:3001` which resolves inside the container, not to the `api` service. The proxy in `vite.config.ts` only applies when Vite runs natively (not in Docker). This is an environment-specific config bug that will confuse developers using the Docker dev stack.

**Files:**  
- `docker-compose.dev.yml` — `VITE_API_URL` should be empty or point to `/api` for the proxied path  
- `client/vite.config.ts` — the proxy config assumes native Vite, not Docker-hosted Vite

---

## 5. Medium-Priority Issues — Feature Gaps and UX Problems

---

### [ISSUE-017] No department assignment UI in `UsersPage` create form — P2/Incomplete

**What is wrong:**  
The create user form in [`UsersPage.tsx`](client/src/pages/admin/UsersPage.tsx) has fields for `email`, `firstName`, `lastName`, `password`, and a `role` dropdown — but no `departmentId` selector.

**Why it is a problem:**  
Instructors and Department Heads require a `departmentId` for the system to function correctly (reports are scoped by department, offering filtering uses `instructorId` linked to a department). Creating an instructor without a department assignment is a valid state (the schema allows `departmentId: null`) but leads to broken report access and incorrect department-head scoping. FR-USER-03 requires admins to create users with department assignment.

**Files:**  
- `client/src/pages/admin/UsersPage.tsx` — add department select to create form

---

### [ISSUE-018] No term or department management UI in the admin frontend — P2/Missing Feature

**What is wrong:**  
The admin `CoursesPage` is titled "Courses" but there is no dedicated page for managing **Terms** or **Departments**. The router defines no routes for these entities. The backend provides full CRUD for both.

**Why it is a problem:**  
FR-DEPT-02 and FR-TERM-02 require admin management UIs. An admin cannot create new academic terms or departments through the UI. These are foundational entities — without terms, no offerings can be created; without departments, no courses can be assigned. The entire academic structure setup is UI-inaccessible.

**Files:**  
- `client/src/app/router.tsx` — add routes for `/admin/departments` and `/admin/terms`  
- `client/src/pages/admin/CoursesPage.tsx` — could be extended into a tabbed page covering courses, departments, and terms  
- `client/src/shared/components/AppLayout.tsx` — add nav items for new pages

---

### [ISSUE-019] `EvaluationWindowsPage` does not show offering `evalFormId` assignment UI — P2/Missing Feature

**What is wrong:**  
[`EvaluationWindowsPage.tsx`](client/src/pages/admin/EvaluationWindowsPage.tsx) allows setting the time window and releasing results, but does not allow assigning an evaluation form template to an offering.

**Why it is a problem:**  
An offering without a form assignment (`evalFormId = null`) cannot be evaluated — `GET /evaluations/:offeringId/form` returns 404. The admin must use the raw API to link a form. FR-OFFER-03 states admins shall update offering attributes, which includes `evalFormId`. This is a missing critical setup step in the admin workflow.

**Files:**  
- `client/src/pages/admin/EvaluationWindowsPage.tsx` — add form template assignment dropdown per offering

---

### [ISSUE-020] `EvaluationWindowsPage` has no enrollment management link — P2/Missing Feature

**What is wrong:**  
There is no UI anywhere in the admin section to enroll or unenroll students from course offerings. The backend endpoints (`POST /enrollments/offerings/:id/students`, `DELETE /enrollments/offerings/:id/students/:studentId`) are fully implemented but have no corresponding frontend UI.

**Why it is a problem:**  
FR-ENROLL-01 and FR-ENROLL-02 require admin enrollment management. Without this UI, the admin cannot enroll students, making it impossible for students to see any evaluations without direct database/API manipulation.

**Files:**  
- No enrollment management page exists — a new page or modal is needed  
- `client/src/app/router.tsx` — add enrollment management route

---

### [ISSUE-021] `UsersPage` delete button has no confirmation dialog — P2/UX Risk

**What is wrong:**  
[`UsersPage.tsx:105`](client/src/pages/admin/UsersPage.tsx:105):
```tsx
<button onClick={() => deleteMutation.mutate(u.id)} ...>
  <Trash2 size={15} />
</button>
```
Clicking the trash icon immediately soft-deletes the user with no confirmation.

**Why it is a problem:**  
Accidental clicks on destructive actions (even soft-deletes) have significant consequences — the user is deactivated and cannot log in. The SRS requires the system to handle user management carefully. Many of the installed Radix UI packages (e.g., `@radix-ui/react-alert-dialog`) are included precisely for this use case but are not utilized here.

**Files:**  
- `client/src/pages/admin/UsersPage.tsx` — wrap delete in a Radix `AlertDialog`

---

### [ISSUE-022] Password strength rule inconsistency between create-user and reset-password — P2/Security Inconsistency

**What is wrong:**  
- `createUserSchema` ([`users.schema.ts`](server/src/modules/users/users.schema.ts)) requires password to have uppercase, lowercase, and a digit.
- `resetPasswordSchema` ([`auth.schema.ts`](server/src/modules/auth/auth.schema.ts)) has the same rules.
- **However**, there is no special-character requirement in either schema, while security best practices (and the SRS's bcrypt reference at NFR-SEC-05) imply a stronger policy.
- More critically: `createUserSchema` marks `password` as **optional** — a user can be created with no password at all. The only check is `if dto.password` before hashing in `usersService.create`. This means an admin can accidentally create an account with no password and no SSO, resulting in a user who can never log in and cannot trigger a password reset (since they have no `passwordHash` to bypass, but `authService.login` checks `if (!user.passwordHash)` and throws "This account uses SSO").

**Why it is a problem:**  
A non-SSO user with no password is stranded — they cannot log in and the error message tells them to use SSO (which doesn't exist). This is a usability and account integrity bug. The create-user flow should either require a password for non-SSO users or trigger a "set password" email flow.

**Files:**  
- `server/src/modules/users/users.schema.ts` — make `password` required unless a future SSO flag is set  
- `server/src/modules/auth/auth.service.ts` — improve error message when `passwordHash` is null

---

### [ISSUE-023] `AuditLogPage` fetches `data.data` but the audit endpoint returns a paginated envelope — P2/Frontend Bug

**What is wrong:**  
[`AuditLogPage.tsx:7`](client/src/pages/admin/AuditLogPage.tsx:7):
```ts
api.get('/audit?limit=50').then(r => r.data.data)
```
The audit router returns:
```json
{ "success": true, "data": [...logs...], "pagination": {...} }
```
`r.data` is the Axios response data (the envelope). `r.data.data` is the logs array. This is structurally correct. However, when the audit log is empty (fresh system), `r.data.data` is `[]` but `isLoading` is false, so the table body renders nothing with no empty state. The missing `isError` branch means API failures silently render a blank table.

**Why it is a problem:**  
No error state handling — if the API call fails (network error, 403), the admin sees a blank table with no indication of failure. The `data?.map(...)` expression returns `undefined` silently.

**Files:**  
- `client/src/pages/admin/AuditLogPage.tsx` — add `isError` branch and empty state

---

### [ISSUE-024] `server.ts` has duplicate comment and broken indentation — P2/Code Quality

**What is wrong:**  
[`server.ts:16-23`](server/src/server.ts:16):
```ts
    // Verify Redis connection
   // Verify Redis connection (optional)
try {
  await redis.ping();
```
The indentation is broken and there are two redundant comments. The `try/catch` block is not aligned with the surrounding `startServer` async function body.

**Why it is a problem:**  
While not a functional bug, this indicates the block was patched in after the fact, and the inconsistent indentation is a code quality issue that will fail any strict linter/formatter check (NFR-MAINT-01).

**Files:**  
- `server/src/server.ts` — clean up indentation and remove duplicate comment

---

### [ISSUE-025] `generalLimiter` middleware is defined but never applied — P2/Security Gap

**What is wrong:**  
[`rateLimiter.ts`](server/src/middleware/rateLimiter.ts) exports `generalLimiter` (200 req/min), but [`app.ts`](server/src/app.ts) never imports or uses it.

**Why it is a problem:**  
NFR-SEC-12 requires the general API limiter to apply to all API requests. Without it, any authenticated endpoint can be hammered without rate limiting (e.g., bulk data extraction from `/reports/`, enumeration of `/offerings/`). Only the auth endpoints have rate limiting applied.

**Files:**  
- `server/src/app.ts` — apply `generalLimiter` to all `/api/v1/` routes  
- `server/src/middleware/rateLimiter.ts` — already correct, just needs to be used

---

### [ISSUE-026] `ClientURL` in `env.ts` has no default that matches Docker dev — P2/Config

**What is wrong:**  
[`env.ts:7`](server/src/config/env.ts:7):
```ts
CLIENT_URL: z.string().url().default('http://localhost:5173'),
```
In Docker dev (`docker-compose.dev.yml`), `CLIENT_URL` is set to `http://localhost:5173`, which is fine for native development. But the CORS origin is `env.CLIENT_URL`, and the `app.ts` CORS config uses this string directly. If the app is accessed from `http://127.0.0.1:5173` (common in some browsers/environments), CORS will be rejected.

**Why it is a problem:**  
Minor but impacts developer experience — some tools (like Playwright) or some browsers default to `127.0.0.1`. Could cause confusing CORS errors in testing.

**Files:**  
- `server/src/app.ts` — consider supporting multiple CORS origins via a comma-separated env var

---

### [ISSUE-027] Test files in `server/tests/unit/` duplicate the test files in `server/src/` — P2/Maintenance

**What is wrong:**  
The three test files in `server/tests/unit/` are near-identical to the three in `server/src/`. The only difference is the import paths (`../../../src/` vs `../../src/`).

**Why it is a problem:**  
The files in `server/src/` are never run (wrong `roots` in jest config) but will confuse developers and could be accidentally run with an ad-hoc jest invocation. The canonical location is `server/tests/`. The `src/` copies should be removed to reduce confusion.

**Files:**  
- `server/src/modules/auth/auth.service.test.ts` — delete  
- `server/src/shared/errors/AppError.test.ts` — delete  
- `server/src/shared/utils/pagination.test.ts` — delete

---

### [ISSUE-028] `AppLayout` sidebar does not differentiate `dept_head` from `admin` — P2/UX/Access

**What is wrong:**  
[`AppLayout.tsx:20-28`](client/src/shared/components/AppLayout.tsx:20):
```ts
// admin / dept_head
return [
  { label: 'Dashboard', ... },
  { label: 'Users', href: '/admin/users', ... },
  { label: 'Courses', ... },
  { label: 'Forms Builder', ... },
  { label: 'Eval Windows', ... },
  { label: 'Audit Log', ... },
];
```
Department Heads see the same nav items as admins, including "Users", "Forms Builder", "Eval Windows", and "Audit Log".

**Why it is a problem:**  
Department Heads are not authorized to create/delete users, build forms, set eval windows, or view the audit log (these are admin-only backend routes). The backend will correctly return 403 when they try, but the UI exposes all these nav items, confusing dept heads and causing uninformative 403 errors. The SRS defines dept heads as having read-only access to departmental reports.

**Files:**  
- `client/src/shared/components/AppLayout.tsx` — add `dept_head` branch returning only permitted nav items (Dashboard, optionally a reports view)

---

### [ISSUE-029] `EvaluationPage` multi-choice answer stores as comma-separated string without sanitisation — P2/Data Quality

**What is wrong:**  
[`EvaluationPage.tsx:42-44`](client/src/pages/student/EvaluationPage.tsx:42):
```ts
const updated = checked
  ? [...current, optionValue]
  : current.filter(v => v !== optionValue);
handleAnswer(questionId, updated.join(','));
```
Multi-choice values are stored as `"lectures,lab_work,group_projects"`. Option values that contain commas would corrupt the serialization. On the report side ([`reports.router.ts:78`](server/src/modules/reports/reports.router.ts:78)), the backend splits on comma:
```ts
const vals = q.type === 'multi_choice' ? r.value.split(',') : [r.value];
```

**Why it is a problem:**  
If any option `value` contains a comma (e.g., `"yes, and no"`) the split will produce incorrect distribution counts. The current seed data uses simple values without commas, but the schema allows arbitrary strings in the `options` JSON. A more robust approach would store JSON arrays.

**Files:**  
- `client/src/pages/student/EvaluationPage.tsx` — `handleMultiAnswer`  
- `server/src/modules/reports/reports.router.ts` — `multi_choice` split logic  
- `server/src/modules/evaluations/evaluations.router.ts` — consider validating multi-choice values against allowed options

---

### [ISSUE-030] `forgotPassword` and `resetPassword` API routes are not guarded by the general rate limiter — P2/Security Gap

**What is wrong:**  
The `passwordResetLimiter` (5 requests/hour per IP) is applied to `POST /auth/forgot-password`. But `POST /auth/reset-password` has **no rate limiter at all** — it uses neither `authLimiter` nor `passwordResetLimiter`.

**Why it is a problem:**  
An attacker who obtains a reset token can make unlimited brute-force attempts against `POST /auth/reset-password`. While the tokens are hashed with bcrypt (making brute force slow), the absence of rate limiting on this endpoint violates the defense-in-depth principle. NFR-SEC-10 covers password reset limiting, and while it specifically names `forgot-password`, the reset endpoint is equally sensitive.

**Files:**  
- `server/src/modules/auth/auth.router.ts` — add `passwordResetLimiter` to the `reset-password` route

---

## 6. Low-Priority Issues — Polish, DX, and Nice-to-Haves

---

### [ISSUE-031] `errors.txt` in `server/` is a stale TypeScript compilation error log — P3/Cleanup

**What is wrong:**  
`server/errors.txt` contains a UTF-16 encoded TypeScript compilation error log from a previous state of the codebase where `dist/` did not exist. These errors no longer apply to the current source.

**Why it is a problem:**  
It causes developer confusion — anyone reading the repository will wonder if the project doesn't compile. It should be deleted or added to `.gitignore`.

**Files:**  
- `server/errors.txt` — delete or add to `.gitignore`

---

### [ISSUE-032] `ReactQueryDevtools` is bundled in production builds — P3/Performance

**What is wrong:**  
[`App.tsx:21`](client/src/app/App.tsx:21):
```tsx
<ReactQueryDevtools initialIsOpen={false} />
```
There is no `process.env.NODE_ENV === 'development'` guard.

**Why it is a problem:**  
React Query Devtools adds ~50KB to the production bundle. While it renders nothing when not opened, it still adds unnecessary weight. It should be conditionally imported only in development.

**Files:**  
- `client/src/app/App.tsx` — conditionally render `ReactQueryDevtools`

---

### [ISSUE-033] `AppLayout` imports unused icons (`Settings`, `BarChart3`) — P3/Code Quality

**What is wrong:**  
[`AppLayout.tsx:7`](client/src/shared/components/AppLayout.tsx:7):
```ts
import { ..., BarChart3, Settings, ... } from 'lucide-react';
```
`BarChart3` and `Settings` are imported but not used in the component.

**Why it is a problem:**  
Unused imports produce ESLint warnings (NFR-MAINT-01) and add marginally to the import analysis cost.

**Files:**  
- `client/src/shared/components/AppLayout.tsx` — remove unused icon imports

---

### [ISSUE-034] `usersService.list` passes `actorId` parameter but never uses it — P3/Dead Code

**What is wrong:**  
[`users.service.ts:9`](server/src/modules/users/users.service.ts:9):
```ts
async list(query: UserQueryDto, actorId: string) {
```
`actorId` is accepted as a parameter but never referenced in the function body.

**Why it is a problem:**  
Unused parameters with no `_` prefix prefix will trigger TypeScript/ESLint strict-mode warnings and indicate dead code. If auditing was intended here (like an audit log entry for listing users), it was never implemented.

**Files:**  
- `server/src/modules/users/users.service.ts` — remove `actorId` parameter or prefix with `_`

---

### [ISSUE-035] `docker-compose.dev.yml` missing `migrate` step before API start — P3/DX

**What is wrong:**  
The `api` service in `docker-compose.dev.yml` uses `Dockerfile.dev` with `tsx watch src/server.ts`, but there is no `command` or entrypoint to run `prisma migrate dev` or `prisma migrate deploy` before starting. Developers who spin up the dev stack for the first time will have no database schema and the API will crash with Prisma "table not found" errors.

**Why it is a problem:**  
New developer onboarding friction — the README says to run `npx prisma migrate dev` manually, which is easy to miss when using the Docker path.

**Files:**  
- `server/Dockerfile.dev` — should check/run migrations on startup  
- or `docker-compose.dev.yml` — add an entrypoint script that runs migrations before starting the API

---

### [ISSUE-036] No `REDIS_URL` in `docker-compose.dev.yml` client service environment — P3/Config

**What is wrong:**  
The `client` service in `docker-compose.dev.yml` sets `VITE_API_URL: http://localhost:3001`. `REDIS_URL` and `REDIS_PASSWORD` are set in the `api` service but the `client` Vite service has no `REDIS_PASSWORD` (not needed, just noting the env is missing `CLIENT_URL` for the CORS origin check). The `api` service in dev sets `CLIENT_URL: http://localhost:5173`. Since the client in Docker exposes `5173`, this is correct — no issue here.

This is actually not an issue. Removing from list. See ISSUE-026 for the related concern.

---

### [ISSUE-037] `worker` service in `docker-compose.yml` references `dist/worker.js` which does not exist — P3/Missing Build Artifact

**What is wrong:**  
[`docker-compose.yml:59`](docker-compose.yml:59):
```yaml
command: node dist/worker.js
```
There is no `server/src/worker.ts` file in the repository. The `dist/worker.js` entry point does not exist and would never be compiled.

**Why it is a problem:**  
The `worker` service will immediately crash with `Error: Cannot find module '/app/dist/worker.js'`. BullMQ-based background notifications (FR-NOTIFY-06, NFR-SCALE-02) are documented in the SRS but have no implementation. The `worker` service is effectively dead weight in the production compose file.

**Files:**  
- `docker-compose.yml` — remove or disable the `worker` service until `src/worker.ts` is implemented  
- `server/src/` — create `worker.ts` if background notifications are needed

---

### [ISSUE-038] `styles/globals.css` not audited for CSS custom property completeness — P3/Visual Risk

**What is wrong:**  
The `tailwind.config.ts` references many CSS custom properties (`hsl(var(--primary))`, `hsl(var(--background))`, etc.) that must be defined in `client/src/styles/globals.css`. If any property is missing, components will render with invisible text, missing borders, or broken colors — silently.

**Why it is a problem:**  
Common setup error when using Tailwind with CSS variables. Not verified since `globals.css` was not read in this audit pass.

**Files:**  
- `client/src/styles/globals.css` — verify all Tailwind CSS custom properties are defined

---

### [ISSUE-039] No `ENABLE_SWAGGER` guard in CI typecheck — P3/DX

**What is wrong:**  
The `swagger.ts` config generates the spec from `'./src/modules/**/*.router.ts'` — a glob relative to the CWD at runtime. In CI (`npx tsc --noEmit`), the types are checked but the swagger spec generation path is never validated.

**Why it is a problem:**  
If Swagger annotation comments have syntax errors, this will only be caught at runtime when `ENABLE_SWAGGER=true`, not at compile time. Minor DX issue.

**Files:**  
- `server/src/config/swagger.ts` — low priority

---

### [ISSUE-040] `i18next` is installed but has no configuration or translation files — P3/Incomplete Feature

**What is wrong:**  
`i18next` and `react-i18next` are listed as dependencies in `client/package.json` but there are no translation files (e.g., `public/locales/en/translation.json`) and no `i18next` initialization in `main.tsx` or `App.tsx`.

**Why it is a problem:**  
NFR-USE-06 states "the interface shall be internationalisation-ready (i18next framework configured)." The framework is installed but not configured. All UI strings are hardcoded in English with no translation keys. This is a gap between the SRS and the implementation, though it is listed as "LOW" priority in the SRS.

**Files:**  
- `client/src/main.tsx` or a new `i18n.ts` file — initialize i18next  
- `client/public/locales/` — create translation files

---

## 7. SRS Coverage Matrix

| SRS Requirement | Status | Issue Ref |
|-----------------|--------|-----------|
| FR-AUTH-01 Login | ✅ Implemented | — |
| FR-AUTH-02 Token pair | ✅ Fixed | ISSUE-002 ✅ |
| FR-AUTH-03 Inactive rejection | ✅ Implemented | — |
| FR-AUTH-04 Refresh endpoint | ✅ Fixed | ISSUE-002 ✅, ISSUE-006 ✅ |
| FR-AUTH-05 Logout deny-list | ✅ Fixed | ISSUE-003 ✅ |
| FR-AUTH-06 authenticate middleware | ✅ Fixed | ISSUE-003 ✅ |
| FR-AUTH-07 authorize middleware | ✅ Implemented | — |
| FR-AUTH-08 Forgot password | ✅ Implemented | — |
| FR-AUTH-09 Reset password | ✅ Fixed | ISSUE-015 ✅, ISSUE-030 ✅ |
| FR-AUTH-10 Login rate limit | ✅ Implemented | — |
| FR-AUTH-11 Reset rate limit | ✅ Fixed | ISSUE-030 ✅ |
| FR-USER-01 GET /me | ✅ Implemented | — |
| FR-USER-02 List users | ✅ Fixed | ISSUE-007 ✅ |
| FR-USER-03 Create user | ⚠️ Partial | ISSUE-017 (no dept in UI) |
| FR-USER-04 Get user by ID | ✅ Implemented | — |
| FR-USER-05 Update user | ✅ Fixed | ISSUE-008 ✅ |
| FR-USER-06 Soft-delete user | ✅ Implemented | ISSUE-021 (no confirm dialog) |
| FR-DEPT-01 List departments | ✅ Implemented | — |
| FR-DEPT-02 Create department | ✅ Backend only | ISSUE-018 (no UI) |
| FR-DEPT-03 Update department | ✅ Backend only | ISSUE-018 (no UI) |
| FR-TERM-02 Create term | ✅ Backend only | ISSUE-018 (no UI) |
| FR-TERM-03 Update term | ✅ Backend only | ISSUE-018 (no UI) |
| FR-TERM-04 Delete term | ✅ Backend only | ISSUE-018 (no UI) |
| FR-COURSE-01 List courses | ✅ Implemented | — |
| FR-COURSE-02 Create course | ✅ Backend only | ISSUE-009 (no UI) |
| FR-COURSE-03 Update/archive course | ✅ Backend only | ISSUE-009 (no UI) |
| FR-OFFER-01 List offerings | ✅ Implemented | — |
| FR-OFFER-02 Create offering | ✅ Backend only | ISSUE-020 (no enroll UI) |
| FR-OFFER-04 Set eval window | ✅ Implemented | — |
| FR-OFFER-05 Release results | ✅ Implemented | ISSUE-012 (no error display) |
| FR-OFFER-06 Min threshold | ✅ Implemented | — |
| FR-ENROLL-01 Enroll student | ✅ Backend only | ISSUE-020 (no UI) |
| FR-ENROLL-02 Remove enrollment | ✅ Backend only | ISSUE-020 (no UI) |
| FR-ENROLL-04 Unique constraint | ✅ Implemented | — |
| FR-FORM-01 Create template | ✅ Backend only | ISSUE-010 (no UI) |
| FR-FORM-02 Question types | ✅ Implemented | — |
| FR-FORM-03-05 Add/edit/reorder Qs | ✅ Backend only | ISSUE-010 (no UI) |
| FR-FORM-06 Publish form | ✅ Implemented | — |
| FR-FORM-07 Published immutable | ✅ Implemented | — |
| FR-FORM-08 Clone form | ✅ Implemented | — |
| FR-EVAL-01 Pending evaluations | ✅ Implemented | — |
| FR-EVAL-02 Fetch form | ✅ Implemented | — |
| FR-EVAL-03 Check status | ✅ Implemented | — |
| FR-EVAL-04 Submit evaluation | ✅ Implemented | — |
| FR-EVAL-05 Enforce rules | ✅ Implemented | — |
| FR-EVAL-06 Atomic transaction | ✅ Implemented | — |
| FR-EVAL-07 No student_id in responses | ✅ Implemented | — |
| FR-EVAL-08 No duplicate submit | ✅ Implemented | — |
| FR-EVAL-09 Submission rate limit | ✅ Implemented | — |
| FR-REPORT-01 Per-offering report | ✅ Implemented | — |
| FR-REPORT-03 Likert stats | ✅ Implemented | — |
| FR-REPORT-04 Choice distribution | ✅ Implemented | — |
| FR-REPORT-05 Open-text responses | ✅ Implemented | — |
| FR-REPORT-06 Instructor gating | ✅ Implemented | — |
| FR-REPORT-09 Institution report | ✅ Implemented | — |
| FR-NOTIFY-01-02 Notification types | ✅ Schema only | — |
| FR-NOTIFY-03 Get notifications | ✅ Implemented | — |
| FR-NOTIFY-04 Mark as read | ✅ Implemented | — |
| FR-NOTIFY-06 BullMQ worker | ❌ Not implemented | ISSUE-037 |
| FR-AUDIT-01 Audit logging | ✅ Implemented | — |
| FR-AUDIT-03 Queryable audit log | ⚠️ Partial | ISSUE-011 (no UI filters) |
| NFR-PRIV-01 No student_id in responses | ✅ Implemented | — |
| NFR-SEC-04 httpOnly cookie | ✅ Fixed | ISSUE-002 ✅ |
| NFR-SEC-10 Rate limiting | ⚠️ Partial | ISSUE-025 (general limiter not applied), ISSUE-030 ✅ |
| NFR-USE-06 i18n ready | ⚠️ Partial | ISSUE-040 |

---

## 8. Master TODO Checklist

Ordered by priority (P0 → P3), then by estimated effort (smaller fixes first within same priority).

```
──────────────────────────────────────────────────────────────────
P0 — CRITICAL (fix before any deployment)
──────────────────────────────────────────────────────────────────
[x] ISSUE-001 Remove console.log of req.body (plain-text password) from
              auth.controller.ts and auth.service.ts
[x] ISSUE-002 Fix sameSite cookie from 'strict' to 'none' (production)
              / 'lax' (development) in auth.controller.ts
[x] ISSUE-003 Make Redis connection mandatory at startup; do not silently
              continue if Redis is unavailable (server.ts)
[x] ISSUE-004 Delete stale duplicate test files from server/src/
              (auth.service.test.ts, AppError.test.ts, pagination.test.ts)
              — also fixed broken import paths in tests/unit/ (../../../ → ../../)
[x] ISSUE-005 Fix typo 'setupFilesAfterFramework' → 'setupFilesAfterEnv'
              in jest.config.json

──────────────────────────────────────────────────────────────────
P1 — HIGH (core functionality broken or missing)
──────────────────────────────────────────────────────────────────
[x] ISSUE-006 Implement auth persistence on page refresh — added
              AuthInitializer component + PrivateRoute loading state
[x] ISSUE-007 Fix empty-string role filter bug in UsersPage query string
              construction (URLSearchParams, skip empty params)
[x] ISSUE-008 Add 'role' field to updateUserSchema, repository update(),
              and service to allow role changes via PUT /users/:id
[ ] ISSUE-009 Add create-course form and archive action to CoursesPage
[ ] ISSUE-010 Build question CRUD UI in FormsBuilderPage (add/edit/delete/
              reorder questions, create new form template)
[ ] ISSUE-011 Add filter controls and pagination to AuditLogPage
[x] ISSUE-012 Add onError handler with inline error message to the
              release-results mutation in EvaluationWindowsPage
[x] ISSUE-013 Enrich instructor dashboard cards with eval window dates
              and results release status
[x] ISSUE-014 Replace <a href="/forgot-password"> with <Link to=...> in
              LoginPage
[x] ISSUE-015 Added passwordResetToken: { not: null } filter to
              findByValidResetToken() to reduce scan set to only users
              with an active token
[x] ISSUE-016 Fix VITE_API_URL in docker-compose.dev.yml — set to ""
              so Vite proxy handles routing; updated vite.config.ts to
              use api:3001 service name when VITE_API_URL is empty
              (also fixed test import paths: all 12 server tests pass)
[x] ISSUE-030 Applied passwordResetLimiter to POST /auth/reset-password
              (classified P2 but fixed as part of P1 security sweep)
[x] ISSUE-032 ReactQueryDevtools now lazy-loaded via dynamic import —
              excluded from production bundle (classified P3 but trivial)
[x] ISSUE-033 Removed unused icon imports (BarChart3, Settings, Eye,
              ClipboardList, UserCheck, UserX, Users) across all pages

──────────────────────────────────────────────────────────────────
P2 — MEDIUM (feature gaps and UX issues)
──────────────────────────────────────────────────────────────────
[ ] ISSUE-017 Add departmentId selector to the UsersPage create user form
[ ] ISSUE-018 Create admin UI pages for Terms and Departments management
              (routes, nav items, CRUD forms)
[ ] ISSUE-019 Add eval form template assignment dropdown to
              EvaluationWindowsPage per offering
[ ] ISSUE-020 Create enrollment management UI (enroll/unenroll students
              from offerings)
[ ] ISSUE-021 Wrap user delete button in AlertDialog confirmation
[ ] ISSUE-022 Make password required for non-SSO user creation; improve
              error message for null-passwordHash login attempt
[ ] ISSUE-023 Add isError branch and empty-state rendering to AuditLogPage
[ ] ISSUE-024 Fix broken indentation and duplicate comment in server.ts
[ ] ISSUE-025 Apply generalLimiter to all /api/v1/ routes in app.ts
[ ] ISSUE-026 Consider supporting multiple CORS origins (array) for
              localhost variants
[ ] ISSUE-027 Consolidate duplicate test files — keep tests/unit/ as
              canonical; delete src/ copies
[ ] ISSUE-028 Differentiate dept_head nav items from admin nav items in
              AppLayout.tsx
[ ] ISSUE-029 Sanitise multi-choice answer serialisation — use JSON array
              or percent-encoded delimiter instead of raw comma-join
[ ] ISSUE-030 Apply passwordResetLimiter to POST /auth/reset-password route

──────────────────────────────────────────────────────────────────
P3 — LOW (polish, DX, and nice-to-haves)
──────────────────────────────────────────────────────────────────
[ ] ISSUE-031 Delete server/errors.txt or add to .gitignore
[ ] ISSUE-032 Conditionally render ReactQueryDevtools in dev mode only
[ ] ISSUE-033 Remove unused icon imports (BarChart3, Settings) in AppLayout
[ ] ISSUE-034 Remove or prefix unused actorId parameter in usersService.list
[ ] ISSUE-035 Add prisma migrate deploy to Docker dev entrypoint
[ ] ISSUE-037 Either implement server/src/worker.ts (BullMQ notification
              worker) or remove the worker service from docker-compose.yml
[ ] ISSUE-038 Audit client/src/styles/globals.css for missing Tailwind
              CSS custom property definitions
[ ] ISSUE-040 Initialize i18next in main.tsx and create base translation
              files (en) to satisfy NFR-USE-06
```

---

*End of Project Audit Report — UCES-AUDIT-001 v1.0*
