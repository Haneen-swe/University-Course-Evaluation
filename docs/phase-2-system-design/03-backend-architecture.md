# 03 — Backend Architecture

**Project:** University Course Evaluation System (UCES)  
**Phase:** 2 — System Design  
**Document Version:** 1.0

---

## 1. Technology Stack

| Component | Choice | Version |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| Framework | Express | 5.x |
| Language | TypeScript | 5.x |
| ORM | Prisma | 5.x |
| Validation | Zod | 3.x |
| Authentication | jsonwebtoken + bcrypt | latest |
| Caching | ioredis | 5.x |
| Email | Nodemailer | 6.x |
| Logging | Winston | 3.x |
| PDF Generation | pdfkit | 0.x |
| Testing | Jest + Supertest | latest |
| API Docs | swagger-jsdoc + swagger-ui-express | latest |

---

## 2. Project Structure

```
server/
├── src/
│   ├── app.ts                     # Express app factory
│   ├── server.ts                  # HTTP server entry point
│   │
│   ├── modules/                   # Domain modules (feature folders)
│   │   ├── auth/
│   │   │   ├── auth.router.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts
│   │   │   └── auth.schema.ts     # Zod request schemas
│   │   ├── users/
│   │   │   ├── users.router.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts
│   │   │   └── users.schema.ts
│   │   ├── courses/
│   │   ├── terms/
│   │   ├── enrollments/
│   │   ├── forms/
│   │   ├── evaluations/
│   │   ├── responses/
│   │   ├── reports/
│   │   ├── notifications/
│   │   └── audit/
│   │
│   ├── middleware/
│   │   ├── authenticate.ts        # JWT verification middleware
│   │   ├── authorize.ts           # RBAC role guard factory
│   │   ├── validate.ts            # Zod schema validator factory
│   │   ├── rateLimiter.ts         # Redis-backed rate limiting
│   │   ├── errorHandler.ts        # Global error handler
│   │   └── requestLogger.ts       # Per-request Winston logger
│   │
│   ├── config/
│   │   ├── env.ts                 # Validated env vars (Zod)
│   │   ├── database.ts            # Prisma client singleton
│   │   ├── redis.ts               # ioredis client singleton
│   │   └── email.ts               # Nodemailer transporter
│   │
│   ├── shared/
│   │   ├── types/                 # Shared TypeScript types
│   │   ├── errors/                # AppError, HttpError classes
│   │   ├── utils/                 # pagination, hashing, token utils
│   │   └── constants/             # Role enums, status codes
│   │
│   └── prisma/
│       ├── schema.prisma          # Database schema
│       ├── migrations/            # Migration history
│       └── seed.ts                # Development seed data
│
├── tests/
│   ├── unit/
│   └── integration/
├── jest.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. Module Architecture (Layered Pattern)

Every domain module follows the same four-layer pattern:

```
HTTP Request
     │
     ▼
┌──────────────────────┐
│     Router           │  Declares route paths and HTTP methods
│  (auth.router.ts)    │  Chains: rateLimiter → validate → authenticate → authorize → controller
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│    Controller        │  Parses validated request; calls service; formats response
│ (auth.controller.ts) │  No business logic — only orchestration
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│     Service          │  All business logic; transaction management; event emission
│  (auth.service.ts)   │  Throws AppError on rule violations
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│    Repository        │  Prisma ORM calls only; no logic
│ (auth.repository.ts) │  Single source of DB access for the module
└──────────────────────┘
```

---

## 4. Middleware Pipeline

Every incoming request passes through:

```
Nginx (TLS termination)
  → Express
      → helmet()              # Security headers
      → cors()                # Origin allow-list
      → express.json()        # Body parsing
      → requestLogger()       # Log method, path, IP (anonymised)
      → rateLimiter()         # Redis sliding window
      → [route handler]
          → validate(schema)  # Zod — returns 422 on failure
          → authenticate()    # JWT — returns 401 on failure
          → authorize(roles)  # RBAC — returns 403 on failure
          → controller()
      → errorHandler()        # Catches all thrown errors; formats response
```

---

## 5. Error Handling

All errors are instances of `AppError`:

```typescript
class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,       // e.g. "EVALUATION_WINDOW_CLOSED"
    message: string,
    public readonly details?: unknown   // validation details
  ) { super(message); }
}
```

Global error handler serialises to:

```json
{
  "success": false,
  "error": {
    "code": "EVALUATION_WINDOW_CLOSED",
    "message": "The evaluation window for this offering has closed.",
    "details": null
  }
}
```

---

## 6. Anonymity Service (Critical)

The anonymity contract is enforced in `responses.service.ts`:

```typescript
async submitEvaluation(studentId: string, offeringId: string, answers: Answer[]) {
  // 1. Verify not already submitted (using participation table)
  const participated = await this.participationRepo.find(studentId, offeringId);
  if (participated?.submitted) throw new AppError(409, 'ALREADY_SUBMITTED', '...');

  // 2. Verify evaluation window is open
  const offering = await this.offeringRepo.findById(offeringId);
  if (!this.isWindowOpen(offering)) throw new AppError(403, 'WINDOW_CLOSED', '...');

  // 3. Transactional write: responses table has NO student_id column
  await this.prisma.$transaction([
    this.prisma.response.createMany({
      data: answers.map(a => ({
        offeringId,   // links to course, NOT to student
        questionId: a.questionId,
        value: a.value,
      }))
    }),
    this.prisma.participationToken.upsert({
      where: { studentId_offeringId: { studentId, offeringId } },
      update: { submitted: true, submittedAt: new Date() },
      create: { studentId, offeringId, submitted: true, submittedAt: new Date() },
    }),
  ]);
}
```

> **Key invariant:** `response` rows contain `offeringId` only. `participation_tokens` rows contain `studentId` + `offeringId` but no `responseId`. There is no join key between the two tables.

---

## 7. Caching Strategy (Redis)

| Key Pattern | TTL | Purpose |
|---|---|---|
| `jwt:deny:{jti}` | Until token expiry | Invalidated/logged-out tokens |
| `draft:{studentId}:{offeringId}` | 24 h | Evaluation drafts |
| `report:{offeringId}` | 15 min | Cached aggregated reports |
| `ratelimit:{ip}:{route}` | 1 min | Sliding window counter |
| `user:{userId}` | 5 min | User profile cache |

---

## 8. Notification System

Notifications are processed asynchronously via a Redis-backed job queue (Bull/BullMQ):

```
Admin sets window open date
  → Scheduler job fires at window open time
      → Queries all enrolled students for that offering
      → Queues one email job per student into Redis
      → Worker processes jobs (max 50 concurrent)
          → Nodemailer sends email via SMTP relay
          → Job marked complete; retry on failure (max 3)
```

---

## 9. Report Generation

```
GET /api/v1/reports/offerings/:id
  → Check cache (Redis) → return if fresh
  → Query DB:
      SELECT question_id, value, COUNT(*), AVG(CAST(value AS numeric))
      FROM responses
      WHERE offering_id = :id
      GROUP BY question_id, value
  → Aggregate in service (mean, median, std dev, frequency table)
  → Cache result (15 min TTL)
  → Return JSON

POST /api/v1/reports/offerings/:id/export?format=pdf|csv
  → Generate file (pdfkit / csv-stringify)
  → Stream to client with correct Content-Type header
```

---

## 10. Audit Logging

Every write operation in the admin modules emits an audit event:

```typescript
await auditService.log({
  actorId: req.user.id,
  action:  'USER_CREATED',
  targetType: 'User',
  targetId: newUser.id,
  metadata: { email: newUser.email, role: newUser.role },
});
```

The `audit_logs` table is insert-only; the Prisma client's DB role has no `UPDATE` or `DELETE` privilege on it.
