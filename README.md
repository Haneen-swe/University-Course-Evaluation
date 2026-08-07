# University Course Evaluation System (UCES)

> A full-stack, privacy-first web application for collecting anonymous course evaluations at university level.

## Project Overview

| Attribute | Value |
|---|---|
| **SDLC Phase** | Phase 3 — Implementation (Complete) |
| **Architecture** | React 18 SPA + Node.js / Express 5 REST API + PostgreSQL 16 + Redis 7 |
| **Auth** | JWT (access token 15 min + refresh token 7 days, httpOnly cookie) |
| **Privacy** | Anonymity enforced at database schema level — `Response` table has no `student_id` |
| **Deployment** | Docker Compose + Nginx + Let's Encrypt |
| **AI Tooling** | IBM Bob (see [`docs/IBM_BOB_USAGE.md`](./docs/IBM_BOB_USAGE.md)) |

---

## Repository Structure

```
University-Course-Evaluation/
├── client/          # React 18 + TypeScript SPA (Vite)
├── server/          # Node.js 20 + Express 5 + TypeScript API
├── nginx/           # Nginx reverse-proxy configuration
├── docs/            # SDLC documentation (Phases 1–3)
│   ├── SRS.md                  # Software Requirements Specification
│   ├── Project_Audit.md        # 40-issue audit report
│   ├── IBM_BOB_USAGE.md        # How IBM Bob was used
│   ├── RESPONSIBLE_AI.md       # Responsible AI principles
│   └── phase-2-system-design/  # 13 architecture & design docs
├── .github/         # GitHub Actions CI/CD workflows
├── docker-compose.yml
├── docker-compose.dev.yml
└── .env.example
```

---

## Quick Start (Docker — Recommended)

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd University-Course-Evaluation

# 2. Copy environment file
cp .env.example .env
# Edit .env and fill in secrets (see .env.example for guidance)

# 3. Start all services
docker compose -f docker-compose.dev.yml up --build

# API:    http://localhost:3001
# Client: http://localhost:5173
# Docs:   http://localhost:3001/api/docs
# Mail:   http://localhost:8025 (MailHog — captures all dev emails)
# Prisma Studio: npx prisma studio (from server/)
```

---

## Quick Start (Native — No Docker)

### Prerequisites
- Node.js 20 LTS
- PostgreSQL 16 running locally
- Redis 7 running locally

```bash
# 1. Install root dependencies
npm install

# 2. Set up environment
cp .env.example .env   # fill in DATABASE_URL, REDIS_URL, JWT_SECRET, etc.

# 3. Set up database
cd server
npm install
npx prisma migrate dev --name init
npx prisma db seed

# 4. Start API (from server/)
npm run dev

# 5. Start client (from client/)
cd ../client
npm install
npm run dev
```

---

## Available Scripts

### Root
| Command | Description |
|---|---|
| `npm run dev` | Start both client and server in dev mode (concurrently) |
| `npm run build` | Build both client and server |
| `npm run lint` | Lint both workspaces |
| `npm run test` | Run all tests |

### Server (`cd server`)
| Command | Description |
|---|---|
| `npm run dev` | Start API with hot-reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run test` | Jest unit + integration tests |
| `npm run test:coverage` | Jest with coverage report |
| `npx prisma studio` | Open Prisma Studio (visual DB browser) |
| `npx prisma migrate dev` | Apply pending migrations in development |

### Client (`cd client`)
| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run test` | Vitest unit + component tests |

---

## Default Seeded Users

After running `npx prisma db seed` the following accounts are available:

| Email | Password | Role |
|---|---|---|
| `admin@uni.edu` | `Admin1234!` | Admin |
| `depthead@uni.edu` | `Admin1234!` | Department Head |
| `instructor@uni.edu` | `Admin1234!` | Instructor |
| `student@uni.edu` | `Admin1234!` | Student |

---

## Admin Features

| Feature | Route | Description |
|---|---|---|
| Dashboard | `/admin/dashboard` | System overview — users, courses, offerings, submissions |
| Users | `/admin/users` | Create, search, filter, delete users |
| Courses | `/admin/courses` | Create and archive courses |
| Departments | `/admin/departments` | Create and edit departments |
| Terms | `/admin/terms` | Create, edit, delete academic terms |
| Forms Builder | `/admin/forms` | Create form templates, add/delete questions, publish, clone |
| Eval Windows | `/admin/windows` | Set evaluation open/close dates, assign form templates, release results |
| Enrollments | `/admin/enrollments` | Enroll/unenroll students per course offering |
| Audit Log | `/admin/audit` | Filterable, paginated audit trail of all system actions |

---

## API Endpoints Summary

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/login` | — | Login |
| POST | `/api/v1/auth/logout` | Bearer | Logout + revoke tokens |
| POST | `/api/v1/auth/refresh` | Cookie | Refresh access token |
| POST | `/api/v1/auth/forgot-password` | — | Request password reset |
| POST | `/api/v1/auth/reset-password` | — | Reset password with token |
| GET | `/api/v1/users` | admin/dept\_head | List users (paginated) |
| POST | `/api/v1/users` | admin | Create user |
| GET | `/api/v1/users/me` | any | Own profile |
| PUT | `/api/v1/users/:id` | admin | Update user |
| DELETE | `/api/v1/users/:id` | admin | Soft-delete user |
| GET | `/api/v1/departments` | any | List departments |
| POST | `/api/v1/departments` | admin | Create department |
| PUT | `/api/v1/departments/:id` | admin | Update department |
| GET | `/api/v1/terms` | any | List terms |
| POST | `/api/v1/terms` | admin | Create term |
| PUT | `/api/v1/terms/:id` | admin | Update term |
| DELETE | `/api/v1/terms/:id` | admin | Delete term |
| GET | `/api/v1/courses` | any | List active courses |
| POST | `/api/v1/courses` | admin | Create course |
| PUT | `/api/v1/courses/:id` | admin | Update/archive course |
| GET | `/api/v1/offerings` | any | List offerings |
| POST | `/api/v1/offerings` | admin | Create offering |
| PUT | `/api/v1/offerings/:id` | admin | Update offering |
| PUT | `/api/v1/offerings/:id/window` | admin | Set eval window dates |
| PUT | `/api/v1/offerings/:id/release` | admin | Release/restrict results |
| GET | `/api/v1/forms` | admin/instructor | List form templates |
| POST | `/api/v1/forms` | admin | Create template |
| POST | `/api/v1/forms/:id/publish` | admin | Publish template |
| POST | `/api/v1/forms/:id/clone` | admin | Clone template |
| POST | `/api/v1/forms/:id/questions` | admin | Add question |
| DELETE | `/api/v1/forms/:id/questions/:qId` | admin | Delete question |
| GET | `/api/v1/evaluations/pending` | student | List open evaluations |
| GET | `/api/v1/evaluations/:id/form` | student | Get evaluation form |
| POST | `/api/v1/evaluations/:id/submit` | student | Submit evaluation (anonymous) |
| GET | `/api/v1/reports/institution` | admin | System-wide stats |
| GET | `/api/v1/reports/offerings/:id` | admin/instructor | Offering evaluation report |
| GET | `/api/v1/reports/instructors/:id` | admin/dept\_head/instructor | Instructor summary |
| GET | `/api/v1/enrollments/offerings/:id/students` | admin/dept\_head | List enrolled students |
| POST | `/api/v1/enrollments/offerings/:id/students` | admin | Enroll student |
| DELETE | `/api/v1/enrollments/offerings/:id/students/:sid` | admin | Remove enrollment |
| GET | `/api/v1/audit` | admin | Audit log (filtered, paginated) |
| GET | `/api/v1/notifications` | any | Own notifications |

Full interactive API documentation: `http://localhost:3001/api/docs` (Swagger UI, dev only)

---

## Security Features

- **JWT deny-listing** — Logged-out access tokens are stored in Redis until they expire
- **httpOnly refresh cookies** — Refresh tokens are never accessible to JavaScript
- **bcrypt** — Passwords and reset tokens hashed with cost 12
- **Helmet.js** — Security HTTP headers (HSTS, CSP, X-Frame-Options, etc.)
- **CORS** — Restricted to configured `CLIENT_URL`
- **Rate limiting** — 200 req/min general, 10/15 min auth, 5/hour password reset
- **Input validation** — Zod schemas on all request bodies
- **RBAC** — Role-based authorization on every protected endpoint

---

## Privacy Architecture

The evaluation submission is a **two-table privacy design**:

```
ParticipationToken
  student_id ───────▶ User   (tracks WHO submitted)
  offering_id ──────▶ CourseOffering

Response
  offering_id ──────▶ CourseOffering   (tracks WHAT was submitted)
  question_id ──────▶ EvalQuestion
  value        (no student_id — by design)
```

There is **no join key** between `ParticipationToken` and `Response`. A student's identity can never be linked to their answers.

---

## Documentation

| Document | Description |
|---|---|
| [`docs/SRS.md`](./docs/SRS.md) | Full Software Requirements Specification |
| [`docs/Project_Audit.md`](./docs/Project_Audit.md) | 40-issue security and quality audit |
| [`docs/IBM_BOB_USAGE.md`](./docs/IBM_BOB_USAGE.md) | How IBM Bob was used during development |
| [`docs/RESPONSIBLE_AI.md`](./docs/RESPONSIBLE_AI.md) | Responsible AI principles applied |
| [`docs/phase-2-system-design/`](./docs/phase-2-system-design/) | 13 architecture & design documents |
| `http://localhost:3001/api/docs` | Live Swagger UI (dev mode) |

---

## License

Academic project. All rights reserved.
