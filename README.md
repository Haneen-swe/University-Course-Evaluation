# University Course Evaluation System (UCES)

> A full-stack, privacy-first web application for collecting anonymous course evaluations at university level.

## Project Overview

| Attribute | Value |
|---|---|
| **SDLC Phase** | Phase 3 — Implementation |
| **Architecture** | React 18 SPA + Node.js / Express 5 REST API + PostgreSQL 16 + Redis 7 |
| **Auth** | JWT (access token 15 min + refresh token 7 days, httpOnly cookie) |
| **Privacy** | Anonymity enforced at database schema level |
| **Deployment** | Docker Compose + Nginx + Let's Encrypt |

---

## Repository Structure

```
University-Course-Evaluation/
├── client/          # React 18 + TypeScript SPA (Vite)
├── server/          # Node.js 20 + Express 5 + TypeScript API
├── nginx/           # Nginx reverse-proxy configuration
├── docs/            # SDLC documentation (Phases 1–3)
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
| `npm run test:e2e` | Playwright end-to-end tests |

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

## Documentation

Full SDLC documentation is in [`docs/`](./docs/):

- [`docs/phase-2-system-design/`](./docs/phase-2-system-design/) — All 13 architecture & design documents
- [`docs/phase-2-system-design/05-rest-api-design.md`](./docs/phase-2-system-design/05-rest-api-design.md) — REST API reference
- API Explorer (live): `http://localhost:3001/api/docs` (Swagger UI)

---

## License

Academic project. All rights reserved.
