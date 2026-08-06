# 05 — REST API Design

**Project:** University Course Evaluation System (UCES)  
**Phase:** 2 — System Design  
**Document Version:** 1.0

---

## 1. API Design Principles

- **RESTful** — resources identified by nouns; HTTP verbs carry semantics.
- **Versioned** — all routes prefixed `/api/v1/`; breaking changes increment version.
- **JSON** — `Content-Type: application/json` on all requests and responses.
- **Envelope** — all responses use a consistent success/error envelope.
- **Pagination** — list endpoints use cursor-based or offset pagination.
- **HTTPS only** — HTTP requests are redirected to HTTPS at Nginx layer.
- **OpenAPI 3.0** — full spec generated from route annotations (swagger-jsdoc).

---

## 2. Standard Response Envelopes

### Success (single resource)
```json
{
  "success": true,
  "data": { ... }
}
```

### Success (collection)
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 143,
    "totalPages": 8
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

---

## 3. HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | OK — read, update |
| 201 | Created |
| 204 | No Content — delete |
| 400 | Bad Request |
| 401 | Unauthenticated |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found |
| 409 | Conflict (duplicate submission, duplicate email) |
| 422 | Unprocessable Entity (Zod validation failure) |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## 4. Endpoint Reference

### 4.1 Authentication  `POST /api/v1/auth/...`

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/auth/login` | None | `{email, password}` | Issue access + refresh tokens |
| POST | `/auth/logout` | Bearer | — | Revoke tokens |
| POST | `/auth/refresh` | Cookie (httpOnly) | — | Issue new access token |
| POST | `/auth/forgot-password` | None | `{email}` | Send reset link |
| POST | `/auth/reset-password` | None | `{token, newPassword}` | Reset password |

**POST /auth/login — Request**
```json
{ "email": "student@uni.edu", "password": "s3cur3!" }
```
**POST /auth/login — Response 200**
```json
{
  "success": true,
  "data": {
    "accessToken": "<JWT>",
    "user": { "id": "...", "email": "...", "role": "student", "fullName": "..." }
  }
}
```
> Refresh token is set as `httpOnly; SameSite=Strict; Secure` cookie. Never returned in JSON body.

---

### 4.2 Users  `Authorization: Bearer {admin}`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/users` | admin | List all users (paginated, filterable) |
| POST | `/users` | admin | Create user |
| GET | `/users/:id` | admin, self | Get user profile |
| PUT | `/users/:id` | admin, self | Update user |
| DELETE | `/users/:id` | admin | Soft-delete user |
| POST | `/users/import` | admin | Bulk CSV import |
| GET | `/users/me` | any | Get own profile |

**POST /users — Request**
```json
{
  "email": "j.smith@uni.edu",
  "firstName": "John",
  "lastName": "Smith",
  "role": "instructor",
  "departmentId": "uuid-..."
}
```

---

### 4.3 Departments

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/departments` | any | List all departments |
| POST | `/departments` | admin | Create department |
| GET | `/departments/:id` | any | Get department |
| PUT | `/departments/:id` | admin | Update department |

---

### 4.4 Terms

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/terms` | any | List all terms |
| POST | `/terms` | admin | Create term |
| GET | `/terms/:id` | any | Get term |
| PUT | `/terms/:id` | admin | Update term |
| DELETE | `/terms/:id` | admin | Delete term |

---

### 4.5 Courses

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/courses` | any | List courses |
| POST | `/courses` | admin | Create course |
| GET | `/courses/:id` | any | Get course |
| PUT | `/courses/:id` | admin | Update course |
| DELETE | `/courses/:id` | admin | Archive course |

---

### 4.6 Course Offerings

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/offerings` | any | List offerings (filterable by term, instructor) |
| POST | `/offerings` | admin | Create offering |
| GET | `/offerings/:id` | any | Get offering detail |
| PUT | `/offerings/:id` | admin | Update offering |
| PUT | `/offerings/:id/window` | admin | Set evaluation window open/close |
| PUT | `/offerings/:id/release` | admin | Toggle results released flag |

---

### 4.7 Enrollments

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/offerings/:id/enrollments` | admin, dept_head | List enrolled students |
| POST | `/offerings/:id/enrollments` | admin | Enroll a student |
| DELETE | `/offerings/:id/enrollments/:studentId` | admin | Remove enrollment |
| POST | `/offerings/:id/enrollments/import` | admin | Bulk CSV import |

---

### 4.8 Evaluation Form Templates

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/forms` | admin | List form templates |
| POST | `/forms` | admin | Create form template |
| GET | `/forms/:id` | admin, instructor | Get form (with questions) |
| PUT | `/forms/:id` | admin | Update form (draft only) |
| POST | `/forms/:id/publish` | admin | Publish form (locks editing) |
| POST | `/forms/:id/clone` | admin | Clone form to new version |
| GET | `/forms/:id/questions` | admin | List questions |
| POST | `/forms/:id/questions` | admin | Add question |
| PUT | `/forms/:id/questions/:qId` | admin | Update question |
| DELETE | `/forms/:id/questions/:qId` | admin | Remove question |
| PUT | `/forms/:id/questions/reorder` | admin | Reorder questions |

---

### 4.9 Evaluations (Student-facing)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/evaluations/pending` | student | List open evaluations for enrolled courses |
| GET | `/evaluations/:offeringId/form` | student | Get evaluation form for an offering |
| PUT | `/evaluations/:offeringId/draft` | student | Save draft answers to Redis |
| POST | `/evaluations/:offeringId/submit` | student | Final anonymous submission |
| GET | `/evaluations/:offeringId/status` | student | Check own submission status |

**POST /evaluations/:offeringId/submit — Request**
```json
{
  "answers": [
    { "questionId": "uuid-q1", "value": "4" },
    { "questionId": "uuid-q2", "value": "option_b" },
    { "questionId": "uuid-q3", "value": "The course materials were very well organised." }
  ]
}
```
**Response 201**
```json
{
  "success": true,
  "data": { "message": "Evaluation submitted successfully. Thank you." }
}
```

---

### 4.10 Reports

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/reports/offerings/:id` | admin, dept_head, instructor* | Aggregated offering report |
| GET | `/reports/instructors/:id` | admin, dept_head, self* | Instructor summary across terms |
| GET | `/reports/departments/:id` | admin, dept_head | Department comparison report |
| GET | `/reports/institution` | admin | Institution-wide dashboard data |
| POST | `/reports/offerings/:id/export` | admin, dept_head, instructor* | Generate PDF or CSV |

> *Instructor access subject to `results_released = true` and `min_responses_threshold` being met.

**GET /reports/offerings/:id — Response**
```json
{
  "success": true,
  "data": {
    "offeringId": "...",
    "courseName": "Software Engineering",
    "term": "Fall 2024",
    "instructor": "Dr. Jane Smith",
    "responseCount": 32,
    "enrollmentCount": 40,
    "responseRate": 0.80,
    "questions": [
      {
        "questionId": "uuid-q1",
        "text": "The instructor explained concepts clearly.",
        "type": "likert",
        "stats": { "mean": 4.2, "median": 4.0, "stdDev": 0.8 },
        "distribution": { "1": 1, "2": 2, "3": 4, "4": 12, "5": 13 }
      },
      {
        "questionId": "uuid-q3",
        "text": "Additional comments",
        "type": "open_text",
        "responses": [
          "Very engaging lecturer.",
          "More examples would help."
        ]
      }
    ]
  }
}
```

---

### 4.11 Notifications

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/notifications` | any | List own in-app notifications |
| PUT | `/notifications/:id/read` | any | Mark notification as read |
| POST | `/notifications/send` | admin | Trigger manual notification |

---

### 4.12 Audit Logs

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/audit` | admin | Query audit logs (filterable, paginated) |
| POST | `/audit/export` | admin | Export audit log as CSV |

---

## 5. Pagination Query Parameters

All list endpoints accept:

| Parameter | Default | Description |
|---|---|---|
| `page` | 1 | Page number |
| `limit` | 20 | Items per page (max 100) |
| `sortBy` | `created_at` | Sort field |
| `order` | `desc` | `asc` or `desc` |

Plus endpoint-specific filters, e.g. `?termId=...&instructorId=...&departmentId=...`

---

## 6. Rate Limits

| Endpoint Group | Limit | Window |
|---|---|---|
| POST `/auth/login` | 10 requests | 15 min per IP |
| POST `/auth/forgot-password` | 5 requests | 60 min per IP |
| POST `/evaluations/*/submit` | 3 requests | 5 min per user |
| All other endpoints | 200 requests | 1 min per user |
