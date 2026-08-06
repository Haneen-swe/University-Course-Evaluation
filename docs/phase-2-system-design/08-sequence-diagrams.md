# 08 — Sequence Diagrams

**Project:** University Course Evaluation System (UCES)  
**Phase:** 2 — System Design  
**Document Version:** 1.0

> All diagrams use [Mermaid](https://mermaid.js.org/) `sequenceDiagram` syntax.

---

## SD-01: User Login

```mermaid
sequenceDiagram
    actor Student
    participant Browser
    participant API as API Server
    participant DB as PostgreSQL
    participant Redis

    Student->>Browser: Enter email + password, click Login
    Browser->>API: POST /api/v1/auth/login<br/>{email, password}
    API->>API: Validate input (Zod)
    API->>DB: SELECT * FROM users WHERE email = ?
    DB-->>API: user row (or null)
    alt User not found or inactive
        API-->>Browser: 401 INVALID_CREDENTIALS
        Browser-->>Student: Show error message
    else User found
        API->>API: bcrypt.compare(password, hash)
        alt Password mismatch
            API-->>Browser: 401 INVALID_CREDENTIALS
        else Password correct
            API->>API: Generate accessToken (JWT, 15 min)
            API->>API: Generate refreshToken (JWT, 7 days)
            API->>Redis: SET refresh:{userId} = refreshToken (TTL 7d)
            API->>DB: INSERT audit_logs (USER_LOGIN)
            API-->>Browser: 200 { accessToken, user }<br/>Set-Cookie: refreshToken (httpOnly)
            Browser-->>Student: Redirect to role dashboard
        end
    end
```

---

## SD-02: Anonymous Evaluation Submission

This is the **most security-critical** flow in the system.

```mermaid
sequenceDiagram
    actor Student
    participant Browser
    participant API as API Server
    participant DB as PostgreSQL
    participant Redis

    Student->>Browser: Open evaluation form, fill answers, click Submit
    Browser->>API: POST /api/v1/evaluations/{offeringId}/submit<br/>Authorization: Bearer {JWT}<br/>{answers: [...]}

    Note over API: Middleware pipeline
    API->>API: authenticate() — verify JWT, extract studentId
    API->>Redis: GET jwt:deny:{jti} — check not revoked
    Redis-->>API: null (token is valid)
    API->>API: Validate request body (Zod)

    Note over API: Service layer
    API->>DB: SELECT * FROM enrollments<br/>WHERE student_id=? AND offering_id=?
    DB-->>API: enrollment record
    alt Not enrolled
        API-->>Browser: 403 NOT_ENROLLED
    else Enrolled
        API->>DB: SELECT * FROM course_offerings WHERE id=?
        DB-->>API: offering (eval_window_open, eval_window_close)
        alt Window not open
            API-->>Browser: 403 WINDOW_CLOSED
        else Window open
            API->>DB: SELECT * FROM participation_tokens<br/>WHERE student_id=? AND offering_id=?
            DB-->>API: participation record
            alt Already submitted
                API-->>Browser: 409 ALREADY_SUBMITTED
            else Not yet submitted
                Note over API,DB: BEGIN TRANSACTION
                API->>DB: INSERT INTO responses (offering_id, question_id, value)<br/>⚠ NO student_id written
                API->>DB: UPSERT participation_tokens<br/>SET submitted=true, submitted_at=now()<br/>⚠ NO response_id written
                Note over API,DB: COMMIT TRANSACTION
                API->>Redis: DEL draft:{studentId}:{offeringId}
                API-->>Browser: 201 { message: "Submitted successfully" }
                Browser-->>Student: Show confirmation screen
            end
        end
    end
```

---

## SD-03: Admin Sets Evaluation Window

```mermaid
sequenceDiagram
    actor Admin
    participant Browser
    participant API as API Server
    participant DB as PostgreSQL
    participant Queue as BullMQ / Redis

    Admin->>Browser: Set open/close dates for offering, click Save
    Browser->>API: PUT /api/v1/offerings/{id}/window<br/>{ evalWindowOpen, evalWindowClose }
    API->>API: authenticate() + authorize('admin')
    API->>API: Validate dates (Zod — open < close, open in future)
    API->>DB: UPDATE course_offerings SET eval_window_open=?, eval_window_close=?
    DB-->>API: updated offering

    API->>DB: SELECT student_id FROM enrollments WHERE offering_id=?
    DB-->>API: list of student IDs

    API->>Queue: Schedule job: NOTIFY_EVAL_OPEN at evalWindowOpen<br/>(payload: offeringId, studentIds)
    API->>Queue: Schedule job: NOTIFY_REMINDER at (evalWindowClose - reminderDays)<br/>(payload: offeringId)
    Queue-->>API: jobs enqueued

    API->>DB: INSERT audit_logs (EVAL_WINDOW_SET, admin, offeringId)
    API-->>Browser: 200 { updated offering }
    Browser-->>Admin: Show success toast
```

---

## SD-04: Admin Releases Results to Instructor

```mermaid
sequenceDiagram
    actor Admin
    participant Browser
    participant API as API Server
    participant DB as PostgreSQL
    participant Queue as BullMQ

    Admin->>Browser: Click "Release Results" for an offering
    Browser->>API: PUT /api/v1/offerings/{id}/release<br/>{ resultsReleased: true }
    API->>API: authenticate() + authorize('admin')

    API->>DB: SELECT COUNT(*) FROM responses WHERE offering_id=?
    DB-->>API: responseCount
    API->>DB: SELECT min_responses_threshold FROM course_offerings WHERE id=?
    DB-->>API: threshold

    alt Response count below threshold
        API-->>Browser: 422 BELOW_THRESHOLD { responseCount, threshold }
        Browser-->>Admin: Show warning "Not enough responses to release"
    else Threshold met
        API->>DB: UPDATE course_offerings SET results_released=true
        API->>DB: INSERT audit_logs (RESULTS_RELEASED, admin, offeringId)
        API->>DB: SELECT instructor_id FROM course_offerings WHERE id=?
        DB-->>API: instructorId
        API->>Queue: Queue job: NOTIFY_RESULT_RELEASED → instructor email
        API-->>Browser: 200 { resultsReleased: true }
        Browser-->>Admin: Show confirmation
    end
```

---

## SD-05: Instructor Views Aggregated Report

```mermaid
sequenceDiagram
    actor Instructor
    participant Browser
    participant API as API Server
    participant Redis
    participant DB as PostgreSQL

    Instructor->>Browser: Navigate to course report page
    Browser->>API: GET /api/v1/reports/offerings/{id}<br/>Authorization: Bearer {JWT}

    API->>API: authenticate() — extract instructorId
    API->>DB: SELECT results_released, instructor_id, min_responses_threshold<br/>FROM course_offerings WHERE id=?
    DB-->>API: offering metadata

    alt results_released = false
        API-->>Browser: 403 RESULTS_NOT_RELEASED
        Browser-->>Instructor: Show "Results not yet available"
    else results_released = true AND instructor_id matches
        API->>Redis: GET report:{offeringId}
        alt Cache hit
            Redis-->>API: cached report JSON
        else Cache miss
            API->>DB: SELECT q.id, q.text, q.type,<br/>r.value, COUNT(*), AVG(CAST(r.value AS numeric))<br/>FROM responses r JOIN eval_questions q ON q.id = r.question_id<br/>WHERE r.offering_id=?<br/>GROUP BY q.id, q.text, q.type, r.value
            DB-->>API: aggregated rows
            API->>API: Build report object (mean, median, stdDev, distribution)
            API->>Redis: SET report:{offeringId} = JSON (TTL 15 min)
        end
        API-->>Browser: 200 { report data }
        Browser-->>Instructor: Render charts and statistics
    end
```

---

## SD-06: Token Refresh Flow

```mermaid
sequenceDiagram
    participant Browser
    participant API as API Server
    participant Redis

    Note over Browser: Access token has expired (401 received)
    Browser->>API: POST /api/v1/auth/refresh<br/>Cookie: refreshToken=...

    API->>API: Verify refresh token signature
    alt Invalid signature
        API-->>Browser: 401 INVALID_TOKEN
        Browser->>Browser: Redirect to /login
    else Valid signature
        API->>Redis: GET refresh:{userId}
        alt Token not in Redis (logged out / rotated)
            API-->>Browser: 401 TOKEN_REVOKED
            Browser->>Browser: Redirect to /login
        else Token matches
            API->>API: Generate new accessToken (15 min)
            API->>API: Generate new refreshToken (7 days, rotation)
            API->>Redis: SET refresh:{userId} = newRefreshToken (TTL 7d)
            API-->>Browser: 200 { accessToken }<br/>Set-Cookie: refreshToken=newToken (httpOnly)
            Browser->>Browser: Retry original request with new accessToken
        end
    end
```

---

## SD-07: Password Reset Flow

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant API as API Server
    participant DB as PostgreSQL
    participant Email as SMTP Relay

    User->>Browser: Enter email, click "Forgot Password"
    Browser->>API: POST /api/v1/auth/forgot-password { email }

    API->>DB: SELECT id FROM users WHERE email=? AND deleted_at IS NULL
    Note over API: Always return 200 to prevent email enumeration

    alt User exists
        API->>API: Generate 32-byte random token (hex)
        API->>API: bcrypt.hash(token)
        API->>DB: UPDATE users SET reset_token=hash, reset_expires=now()+1h
        API->>Email: Send email with link:<br/>https://uces.uni.edu/reset-password?token=rawToken
    end

    API-->>Browser: 200 { message: "If that email exists, a link was sent." }

    User->>Browser: Click link in email
    Browser->>API: POST /api/v1/auth/reset-password<br/>{ token, newPassword }

    API->>DB: SELECT * FROM users WHERE reset_expires > now()
    API->>API: bcrypt.compare(token, stored_hash)

    alt Token invalid or expired
        API-->>Browser: 400 INVALID_OR_EXPIRED_TOKEN
    else Valid token
        API->>API: bcrypt.hash(newPassword, cost=12)
        API->>DB: UPDATE users SET password_hash=?, reset_token=NULL, reset_expires=NULL
        API->>DB: INSERT audit_logs (PASSWORD_RESET, userId)
        API-->>Browser: 200 { message: "Password updated successfully." }
        Browser-->>User: Redirect to /login
    end
```
