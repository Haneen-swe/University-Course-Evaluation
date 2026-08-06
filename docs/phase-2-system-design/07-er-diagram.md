# 07 — Database Entity-Relationship Diagram

**Project:** University Course Evaluation System (UCES)  
**Phase:** 2 — System Design  
**Document Version:** 1.0

> Diagrams are written in [Mermaid](https://mermaid.js.org/) syntax. Render them in any Mermaid-compatible viewer (GitHub, VS Code Mermaid extension, mermaid.live).

---

## ER Diagram

```mermaid
erDiagram

    %% ─── Core Identity ───────────────────────────────────────

    USERS {
        UUID        id              PK
        VARCHAR     email
        VARCHAR     password_hash
        VARCHAR     first_name
        VARCHAR     last_name
        ENUM        role            "student|instructor|dept_head|admin"
        UUID        department_id   FK
        BOOLEAN     is_active
        VARCHAR     reset_token
        TIMESTAMPTZ reset_expires
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
        TIMESTAMPTZ deleted_at
    }

    DEPARTMENTS {
        UUID        id          PK
        VARCHAR     name
        VARCHAR     code
        UUID        head_id     FK
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    %% ─── Academic Structure ──────────────────────────────────

    TERMS {
        UUID        id          PK
        VARCHAR     name
        DATE        start_date
        DATE        end_date
        BOOLEAN     is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    COURSES {
        UUID        id              PK
        VARCHAR     code
        VARCHAR     title
        SMALLINT    credits
        UUID        department_id   FK
        BOOLEAN     is_archived
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    COURSE_OFFERINGS {
        UUID        id                      PK
        UUID        course_id               FK
        UUID        term_id                 FK
        UUID        instructor_id           FK
        VARCHAR     section
        UUID        eval_form_id            FK
        TIMESTAMPTZ eval_window_open
        TIMESTAMPTZ eval_window_close
        SMALLINT    min_responses_threshold
        BOOLEAN     results_released
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    ENROLLMENTS {
        UUID        id          PK
        UUID        student_id  FK
        UUID        offering_id FK
        TIMESTAMPTZ enrolled_at
    }

    %% ─── Evaluation Forms ────────────────────────────────────

    EVAL_FORM_TEMPLATES {
        UUID        id          PK
        VARCHAR     title
        TEXT        description
        SMALLINT    version
        BOOLEAN     is_published
        UUID        created_by  FK
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    EVAL_QUESTIONS {
        UUID        id          PK
        UUID        template_id FK
        SMALLINT    order_index
        ENUM        type        "likert|single_choice|multi_choice|open_text"
        TEXT        text
        BOOLEAN     is_required
        JSONB       options
        SMALLINT    scale_min
        SMALLINT    scale_max
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    %% ─── Anonymous Responses ─────────────────────────────────

    PARTICIPATION_TOKENS {
        UUID        id           PK
        UUID        student_id   FK
        UUID        offering_id  FK
        BOOLEAN     submitted
        TIMESTAMPTZ submitted_at
        TIMESTAMPTZ draft_saved_at
    }

    RESPONSES {
        UUID        id           PK
        UUID        offering_id  FK
        UUID        question_id  FK
        TEXT        value
        TIMESTAMPTZ submitted_at
    }

    %% ─── System ──────────────────────────────────────────────

    AUDIT_LOGS {
        UUID        id          PK
        UUID        actor_id    FK
        VARCHAR     action
        VARCHAR     target_type
        UUID        target_id
        JSONB       metadata
        INET        ip_address
        TIMESTAMPTZ created_at
    }

    NOTIFICATIONS {
        UUID        id         PK
        UUID        user_id    FK
        ENUM        type
        ENUM        channel
        ENUM        status
        TIMESTAMPTZ sent_at
        JSONB       payload
        TIMESTAMPTZ created_at
    }

    %% ─── Relationships ───────────────────────────────────────

    DEPARTMENTS           ||--o{ USERS              : "employs / enrolls"
    DEPARTMENTS           ||--o{ COURSES            : "owns"
    USERS                 ||--o| DEPARTMENTS        : "heads (nullable)"

    COURSES               ||--o{ COURSE_OFFERINGS   : "offered as"
    TERMS                 ||--o{ COURSE_OFFERINGS   : "occurs in"
    USERS                 ||--o{ COURSE_OFFERINGS   : "taught by (instructor)"
    EVAL_FORM_TEMPLATES   ||--o{ COURSE_OFFERINGS   : "used by"

    USERS                 ||--o{ ENROLLMENTS        : "enrolled (student)"
    COURSE_OFFERINGS      ||--o{ ENROLLMENTS        : "has enrollments"

    EVAL_FORM_TEMPLATES   ||--|{ EVAL_QUESTIONS     : "contains"
    USERS                 ||--o{ EVAL_FORM_TEMPLATES: "created by (admin)"

    USERS                 ||--o{ PARTICIPATION_TOKENS : "tracks participation"
    COURSE_OFFERINGS      ||--o{ PARTICIPATION_TOKENS : "tracks participation"

    COURSE_OFFERINGS      ||--o{ RESPONSES          : "receives"
    EVAL_QUESTIONS        ||--o{ RESPONSES          : "answered by"

    USERS                 ||--o{ AUDIT_LOGS         : "performed by"
    USERS                 ||--o{ NOTIFICATIONS      : "sent to"
```

---

## Privacy Separation Diagram

The following diagram highlights the **anonymity boundary** — the intentional absence of a relationship between `PARTICIPATION_TOKENS` and `RESPONSES`:

```mermaid
graph TD
    subgraph "Identity-Bearing Data"
        S[USERS<br/>student_id]
        P[PARTICIPATION_TOKENS<br/>student_id + offering_id<br/>submitted = true/false]
    end

    subgraph "Anonymous Data"
        R[RESPONSES<br/>offering_id + question_id + value<br/>NO student_id]
    end

    S -->|"Has submitted? (boolean only)"| P
    S -. "NO LINK" .-> R

    style R fill:#fff3cd,stroke:#856404
    style P fill:#d1ecf1,stroke:#0c5460
    style S fill:#d4edda,stroke:#155724
```

> **Key design invariant:** There is no foreign key, no shared UUID, and no derived field that connects a row in `RESPONSES` to a row in `PARTICIPATION_TOKENS` or to a `USERS` record. This is enforced at the database schema level, not merely by application policy.

---

## Indexes Summary

```mermaid
graph LR
    subgraph "Critical Indexes"
        I1["idx_users_email<br/>(email) WHERE deleted_at IS NULL"]
        I2["idx_enrollments_student<br/>(student_id)"]
        I3["idx_enrollments_offering<br/>(offering_id)"]
        I4["idx_responses_offering_question<br/>(offering_id, question_id)"]
        I5["idx_participation_unique<br/>UNIQUE (student_id, offering_id)"]
        I6["idx_audit_created<br/>(created_at DESC)"]
        I7["idx_offerings_term<br/>(term_id)"]
    end
```
