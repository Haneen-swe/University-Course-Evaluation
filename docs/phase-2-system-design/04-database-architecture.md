# 04 — Database Architecture

**Project:** University Course Evaluation System (UCES)  
**Phase:** 2 — System Design  
**Document Version:** 1.0

---

## 1. Database Management System

**PostgreSQL 16** is selected as the primary RDBMS.

| Requirement | PostgreSQL Capability |
|---|---|
| ACID transactions | Full support; critical for anonymous submission atomicity |
| Foreign key integrity | Enforced at DB level as a second safety layer |
| JSON columns | `jsonb` for storing question option arrays flexibly |
| Full-text search | Built-in `tsvector`/`tsquery` for audit log search |
| Row-level security | Available for multi-tenant extension in v2 |
| Horizontal read scaling | Read replicas via streaming replication |
| Audit append-only | Enforced via DB role privileges |

---

## 2. Schema Design Principles

1. **Normalisation to 3NF** — no repeating groups, no transitive dependencies.
2. **UUID primary keys** — prevents enumeration attacks; globally unique across imports.
3. **`created_at` / `updated_at` on every table** — using `DEFAULT now()` and update triggers.
4. **Soft deletes** — `deleted_at TIMESTAMPTZ NULL`; hard deletes only for GDPR erasure requests.
5. **Anonymity constraint** — `responses` table has no `student_id` column; enforced by schema.
6. **Audit table** — application DB role lacks `UPDATE`/`DELETE` privilege on `audit_logs`.

---

## 3. Entity Descriptions

### 3.1 `users`
Stores all system users regardless of role. Role determines data access, not separate tables.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Institutional email |
| `password_hash` | VARCHAR(60) | NULL | NULL when SSO-only |
| `first_name` | VARCHAR(100) | NOT NULL | |
| `last_name` | VARCHAR(100) | NOT NULL | |
| `role` | ENUM | NOT NULL | student, instructor, dept_head, admin |
| `department_id` | UUID | FK → departments | NULL for students |
| `is_active` | BOOLEAN | DEFAULT true | |
| `password_reset_token` | VARCHAR(64) | NULL | Hashed token |
| `password_reset_expires` | TIMESTAMPTZ | NULL | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | |
| `deleted_at` | TIMESTAMPTZ | NULL | Soft delete |

### 3.2 `departments`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | VARCHAR(200) | UNIQUE, NOT NULL |
| `code` | VARCHAR(20) | UNIQUE, NOT NULL |
| `head_id` | UUID | FK → users (nullable) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### 3.3 `terms`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | VARCHAR(100) | e.g. "Fall 2024" |
| `start_date` | DATE | NOT NULL |
| `end_date` | DATE | NOT NULL |
| `is_active` | BOOLEAN | DEFAULT false |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### 3.4 `courses`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `code` | VARCHAR(20) | UNIQUE per department, NOT NULL |
| `title` | VARCHAR(255) | NOT NULL |
| `credits` | SMALLINT | NOT NULL |
| `department_id` | UUID | FK → departments, NOT NULL |
| `is_archived` | BOOLEAN | DEFAULT false |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### 3.5 `course_offerings`
A specific delivery of a course in a term, assigned to instructor(s).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `course_id` | UUID | FK → courses |
| `term_id` | UUID | FK → terms |
| `instructor_id` | UUID | FK → users |
| `section` | VARCHAR(20) | e.g. "A", "B" |
| `eval_form_id` | UUID | FK → eval_form_templates |
| `eval_window_open` | TIMESTAMPTZ | NULL = not yet scheduled |
| `eval_window_close` | TIMESTAMPTZ | NULL |
| `min_responses_threshold` | SMALLINT | DEFAULT 5 |
| `results_released` | BOOLEAN | DEFAULT false |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| UNIQUE | | `(course_id, term_id, section)` |

### 3.6 `enrollments`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `student_id` | UUID | FK → users |
| `offering_id` | UUID | FK → course_offerings |
| `enrolled_at` | TIMESTAMPTZ | DEFAULT now() |
| UNIQUE | | `(student_id, offering_id)` |

### 3.7 `eval_form_templates`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `title` | VARCHAR(255) | NOT NULL |
| `description` | TEXT | |
| `version` | SMALLINT | DEFAULT 1 |
| `is_published` | BOOLEAN | DEFAULT false |
| `created_by` | UUID | FK → users |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### 3.8 `eval_questions`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `template_id` | UUID | FK → eval_form_templates |
| `order_index` | SMALLINT | NOT NULL, sort order |
| `type` | ENUM | likert, single_choice, multi_choice, open_text |
| `text` | TEXT | NOT NULL, question wording |
| `is_required` | BOOLEAN | DEFAULT true |
| `options` | JSONB | NULL for open_text/likert; array of {value, label} for choice |
| `scale_min` | SMALLINT | NULL; for likert |
| `scale_max` | SMALLINT | NULL; for likert |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### 3.9 `participation_tokens`
Records **whether** a student submitted — nothing about **what** they submitted.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `student_id` | UUID | FK → users |
| `offering_id` | UUID | FK → course_offerings |
| `submitted` | BOOLEAN | DEFAULT false |
| `submitted_at` | TIMESTAMPTZ | NULL |
| `draft_saved_at` | TIMESTAMPTZ | NULL |
| UNIQUE | | `(student_id, offering_id)` |

> **Privacy guarantee:** No column in this table links to a specific response row.

### 3.10 `responses`
Stores the anonymised answers. **No `student_id` column exists.**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `offering_id` | UUID | FK → course_offerings, NOT NULL |
| `question_id` | UUID | FK → eval_questions, NOT NULL |
| `value` | TEXT | NOT NULL; numeric string for likert, option key for choice, free text for open |
| `submitted_at` | TIMESTAMPTZ | DEFAULT now() |

> **Index:** `(offering_id, question_id)` for aggregation queries.

### 3.11 `audit_logs`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `actor_id` | UUID | NOT NULL (FK → users, ON DELETE SET NULL) |
| `action` | VARCHAR(100) | NOT NULL e.g. "USER_CREATED" |
| `target_type` | VARCHAR(50) | e.g. "User", "CourseOffering" |
| `target_id` | UUID | NULL if not applicable |
| `metadata` | JSONB | Additional context snapshot |
| `ip_address` | INET | Anonymised (last octet zeroed) |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

> **No UPDATE/DELETE privilege** granted to application DB role on this table.

### 3.12 `notifications`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users |
| `type` | ENUM | eval_open, eval_reminder, submission_confirm, result_released |
| `channel` | ENUM | email, in_app |
| `status` | ENUM | pending, sent, failed |
| `sent_at` | TIMESTAMPTZ | NULL |
| `payload` | JSONB | Template variables |
| `created_at` | TIMESTAMPTZ | |

---

## 4. Indexes

```sql
-- Authentication
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;

-- Enrollment lookups
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_offering ON enrollments(offering_id);

-- Response aggregation (most frequent query)
CREATE INDEX idx_responses_offering_question ON responses(offering_id, question_id);

-- Participation check
CREATE UNIQUE INDEX idx_participation_student_offering
  ON participation_tokens(student_id, offering_id);

-- Audit log queries
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- Course offerings by term
CREATE INDEX idx_offerings_term ON course_offerings(term_id);
CREATE INDEX idx_offerings_instructor ON course_offerings(instructor_id);
```

---

## 5. Database Roles & Privileges

| DB Role | Privileges | Used By |
|---|---|---|
| `uces_app` | SELECT, INSERT, UPDATE, DELETE on most tables; INSERT-only on `audit_logs` | Application server |
| `uces_readonly` | SELECT on all tables | Reporting / analytics tools |
| `uces_admin` | Full privileges | DBA migrations only |

---

## 6. Backup & Recovery Strategy

| Aspect | Strategy |
|---|---|
| Backup frequency | Continuous WAL archiving + daily `pg_dump` |
| Retention | 30 days for daily dumps; 7 days WAL |
| RPO | ≤ 5 minutes (WAL-based point-in-time recovery) |
| RTO | ≤ 2 hours |
| Test restoration | Monthly DR drill |
