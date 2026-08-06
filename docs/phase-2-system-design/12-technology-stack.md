# 12 — Technology Stack with Justification

**Project:** University Course Evaluation System (UCES)  
**Phase:** 2 — System Design  
**Document Version:** 1.0

---

## 1. Frontend

| Technology | Version | Justification |
|---|---|---|
| **React** | 18.x | Industry-leading UI library; massive ecosystem; component reuse; concurrent features (Suspense, Transitions) reduce loading jitter under evaluation-window spikes |
| **TypeScript** | 5.x | Type safety across the full stack; shared type definitions between client and server reduce integration bugs; mandatory for university-submission code quality |
| **Vite** | 5.x | Sub-second HMR; ESM-native; faster than CRA/Webpack for development; production builds are well-optimised |
| **React Router v6** | 6.x | Declarative routing; nested layouts; lazy loading per route reduces initial bundle size |
| **TanStack Query** | 5.x | Declarative server-state management; built-in caching, background refetch, and optimistic updates; eliminates boilerplate `useEffect` data-fetching |
| **Zustand** | 4.x | Minimal API (vs Redux); no boilerplate; suitable for small cross-cutting UI state (auth, theme); tree-shakeable |
| **React Hook Form + Zod** | latest | Controlled uncontrolled forms are fast (no re-render per keystroke); Zod resolver shares validation schemas with the backend — DRY |
| **Tailwind CSS** | 3.x | Utility-first; eliminates CSS naming conflicts; responsive and RTL support built-in; excellent with shadcn/ui |
| **shadcn/ui** | latest | Accessible, unstyled Radix UI components; full ownership of markup; WCAG 2.1 AA out of the box |
| **Recharts** | 2.x | React-native charting; adequate for Likert distribution and trend-line charts; small bundle |
| **i18next** | 23.x | Industry-standard i18n; lazy-loaded namespaces; RTL support needed for future Arabic localisation |
| **Axios** | 1.x | Interceptor support for auth token injection and refresh; consistent API vs native fetch |
| **Vitest** | 1.x | Vite-native test runner; Jest-compatible API; much faster than Jest for Vite projects |
| **Playwright** | 1.x | Cross-browser E2E; strong async handling; CI-friendly |

---

## 2. Backend

| Technology | Version | Justification |
|---|---|---|
| **Node.js** | 20 LTS | Non-blocking I/O suits evaluation-window bursts; unified JS/TS full stack; Long-Term Support until 2026 |
| **Express** | 5.x | Minimal, battle-tested framework; large middleware ecosystem; easy to reason about; suitable for a university-scale system (not high-frequency trading) |
| **TypeScript** | 5.x | Shared types with frontend; compile-time safety; reduces runtime errors in service-layer business logic |
| **Prisma ORM** | 5.x | Type-safe DB client generated from schema; migration tooling; excellent DX; prevents raw SQL injection vectors; schema serves as living documentation |
| **Zod** | 3.x | Runtime validation at API boundaries; schema doubles as TypeScript types; composable; superior error messages for API consumers |
| **jsonwebtoken** | 9.x | Widely audited JWT library; supports HS256 and RS256; used for access and refresh token generation |
| **bcrypt** | 5.x | Industry-standard password hashing; configurable cost factor; time-constant comparison prevents timing attacks |
| **ioredis** | 5.x | Full-featured Redis client; supports Cluster mode for future scaling; used for JWT deny-list, draft caching, rate limiting |
| **BullMQ** | 4.x | Redis-backed job queue; reliable delivery; retries; used for asynchronous notification processing |
| **Nodemailer** | 6.x | Mature SMTP email library; institution-configurable transport; supports TLS |
| **Winston** | 3.x | Structured JSON logging; multiple transports (console, file, log aggregator); log levels configurable per environment |
| **Helmet.js** | 7.x | Security headers in one line; protects against XSS, clickjacking, MIME sniffing |
| **express-rate-limit** | 7.x | Per-IP rate limiting; Redis store for multi-instance consistency |
| **pdfkit** | 0.x | Pure-JS PDF generation; no native dependencies; suitable for report exports |
| **csv-stringify** | 6.x | Streaming CSV generation; handles large result sets without memory overflow |
| **swagger-jsdoc + swagger-ui** | latest | Auto-generated OpenAPI 3.0 documentation from JSDoc annotations; serves interactive API explorer |
| **Jest + Supertest** | 29.x | De-facto Node.js testing standard; Supertest enables full HTTP integration tests without a live server |

---

## 3. Database & Storage

| Technology | Version | Justification |
|---|---|---|
| **PostgreSQL** | 16 | ACID compliance critical for anonymous submission transaction; strong FK enforcement; JSONB for flexible question options; full-text search for audit log queries; row-level security available for future multi-tenancy; most mature open-source RDBMS |
| **Redis** | 7.x | In-memory store for JWT deny-list (O(1) lookup), draft responses (TTL-managed), rate limiting counters, and BullMQ job queues; persistence via AOF for durability |
| **Local FS / S3-compatible** | — | PDF/CSV export file storage; S3 protocol (MinIO on-premise or AWS S3) allows institution to choose hosting; no vendor lock-in |

---

## 4. Infrastructure & DevOps

| Technology | Version | Justification |
|---|---|---|
| **Nginx** | 1.25 | TLS termination; static file serving (React build); reverse proxy to Node.js; WebSocket support if needed; battle-tested; zero-cost |
| **Docker** | 24.x | Reproducible builds; environment parity (dev/staging/prod); simplifies deployment on university servers |
| **Docker Compose** | 2.x | Single-file orchestration for development; suitable for single-server university deployment |
| **GitHub Actions** | — | CI/CD pipeline: lint → test → build → Docker image push; free for public repos; integrates with GitHub |
| **Let's Encrypt / Certbot** | — | Free TLS certificates; auto-renewal; no certificate cost for university |

---

## 5. Development & Quality Tools

| Technology | Purpose |
|---|---|
| **ESLint + Prettier** | Code style enforcement; auto-formatting on save |
| **Husky + lint-staged** | Pre-commit hooks; block commits that fail lint or tests |
| **Commitlint** | Conventional commit messages for clean changelog generation |
| **dotenv / dotenv-safe** | Environment variable management; `.env.example` documents required vars |
| **Prisma Studio** | Visual DB browser for development/debugging |
| **MSW (Mock Service Worker)** | API mocking in frontend tests; decouples frontend tests from backend |

---

## 6. Technology Decision Summary

```
┌─────────────────────────────────────────────────────────┐
│  UCES Technology Stack at a Glance                      │
├──────────────┬──────────────────────────────────────────┤
│  Frontend    │  React 18 + TypeScript + Vite            │
│              │  Tailwind CSS + shadcn/ui                │
│              │  React Query + Zustand                   │
│              │  React Hook Form + Zod                   │
├──────────────┼──────────────────────────────────────────┤
│  Backend     │  Node.js 20 + Express 5 + TypeScript     │
│              │  Prisma ORM + Zod                        │
│              │  JWT Auth + bcrypt                       │
│              │  BullMQ (jobs) + Nodemailer              │
├──────────────┼──────────────────────────────────────────┤
│  Database    │  PostgreSQL 16 (primary)                 │
│              │  Redis 7 (cache + queue)                 │
│              │  S3-compatible (exports)                 │
├──────────────┼──────────────────────────────────────────┤
│  Infra       │  Nginx + Docker + Docker Compose         │
│              │  GitHub Actions CI/CD                    │
│              │  Let's Encrypt TLS                       │
└──────────────┴──────────────────────────────────────────┘
```

---

## 7. Alternatives Considered and Rejected

| Alternative | Rejected Reason |
|---|---|
| **Django (Python)** | Requires Python expertise; less natural for React/TS full-stack; heavier than needed |
| **Spring Boot (Java)** | Enterprise-grade but over-engineered for a university system; slower iteration |
| **MongoDB** | Lack of ACID transactions for anonymous submission atomicity; no FK constraints |
| **MySQL** | Weaker JSON support; less advanced query planner than PostgreSQL |
| **GraphQL** | Adds complexity; REST is sufficient and simpler for this use-case |
| **Angular** | Heavier; steeper learning curve; smaller hiring pool than React |
| **Vue 3** | Good alternative but React ecosystem is broader for this use case |
| **Redux Toolkit** | Too verbose for modest global state needs; Zustand is sufficient |
| **Passport.js** | Adds abstraction over JWT that isn't needed; manual JWT is clearer and auditable |
