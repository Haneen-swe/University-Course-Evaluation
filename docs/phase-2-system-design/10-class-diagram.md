# 10 — Class Diagram

**Project:** University Course Evaluation System (UCES)  
**Phase:** 2 — System Design  
**Document Version:** 1.0

> Diagrams use [Mermaid](https://mermaid.js.org/) `classDiagram` syntax.

---

## 1. Domain Model Class Diagram

The class diagram represents the server-side domain model as implemented in TypeScript service and repository layers, aligned with the Prisma schema.

```mermaid
classDiagram

    %% ─── Enumerations ────────────────────────────────────────────

    class Role {
        <<enumeration>>
        STUDENT
        INSTRUCTOR
        DEPT_HEAD
        ADMIN
    }

    class QuestionType {
        <<enumeration>>
        LIKERT
        SINGLE_CHOICE
        MULTI_CHOICE
        OPEN_TEXT
    }

    class NotificationType {
        <<enumeration>>
        EVAL_OPEN
        EVAL_REMINDER
        SUBMISSION_CONFIRM
        RESULT_RELEASED
    }

    class NotificationStatus {
        <<enumeration>>
        PENDING
        SENT
        FAILED
    }

    %% ─── Domain Entities ─────────────────────────────────────────

    class User {
        +UUID id
        +string email
        +string passwordHash
        +string firstName
        +string lastName
        +Role role
        +UUID departmentId
        +boolean isActive
        +Date createdAt
        +Date updatedAt
        +Date deletedAt
        +getFullName() string
        +isAdmin() boolean
        +isInstructor() boolean
        +isStudent() boolean
    }

    class Department {
        +UUID id
        +string name
        +string code
        +UUID headId
        +Date createdAt
        +Date updatedAt
    }

    class Term {
        +UUID id
        +string name
        +Date startDate
        +Date endDate
        +boolean isActive
        +Date createdAt
        +isCurrentTerm() boolean
    }

    class Course {
        +UUID id
        +string code
        +string title
        +number credits
        +UUID departmentId
        +boolean isArchived
        +Date createdAt
        +Date updatedAt
    }

    class CourseOffering {
        +UUID id
        +UUID courseId
        +UUID termId
        +UUID instructorId
        +string section
        +UUID evalFormId
        +Date evalWindowOpen
        +Date evalWindowClose
        +number minResponsesThreshold
        +boolean resultsReleased
        +Date createdAt
        +Date updatedAt
        +isWindowOpen() boolean
        +canReleaseResults(count: number) boolean
    }

    class Enrollment {
        +UUID id
        +UUID studentId
        +UUID offeringId
        +Date enrolledAt
    }

    class EvalFormTemplate {
        +UUID id
        +string title
        +string description
        +number version
        +boolean isPublished
        +UUID createdBy
        +Date createdAt
        +Date updatedAt
        +publish() void
        +clone() EvalFormTemplate
    }

    class EvalQuestion {
        +UUID id
        +UUID templateId
        +number orderIndex
        +QuestionType type
        +string text
        +boolean isRequired
        +QuestionOption[] options
        +number scaleMin
        +number scaleMax
        +Date createdAt
        +Date updatedAt
        +validate(value: string) boolean
    }

    class QuestionOption {
        +string value
        +string label
    }

    class ParticipationToken {
        +UUID id
        +UUID studentId
        +UUID offeringId
        +boolean submitted
        +Date submittedAt
        +Date draftSavedAt
    }

    class Response {
        +UUID id
        +UUID offeringId
        +UUID questionId
        +string value
        +Date submittedAt
    }

    class AuditLog {
        +UUID id
        +UUID actorId
        +string action
        +string targetType
        +UUID targetId
        +object metadata
        +string ipAddress
        +Date createdAt
    }

    class Notification {
        +UUID id
        +UUID userId
        +NotificationType type
        +string channel
        +NotificationStatus status
        +Date sentAt
        +object payload
        +Date createdAt
    }

    %% ─── Relationships ────────────────────────────────────────────

    User "1" -- "0..1" Department : "belongs to"
    Department "1" -- "0..1" User : "headed by"
    Department "1" -- "0..*" Course : "owns"

    Course "1" -- "0..*" CourseOffering : "offered as"
    Term "1" -- "0..*" CourseOffering : "contains"
    User "1" -- "0..*" CourseOffering : "teaches (instructor)"
    EvalFormTemplate "1" -- "0..*" CourseOffering : "used by"

    User "1" -- "0..*" Enrollment : "has (student)"
    CourseOffering "1" -- "0..*" Enrollment : "has"

    EvalFormTemplate "1" -- "1..*" EvalQuestion : "contains"
    EvalQuestion "1" -- "0..*" QuestionOption : "has options"

    User "1" -- "0..*" ParticipationToken : "tracked by"
    CourseOffering "1" -- "0..*" ParticipationToken : "tracks"

    CourseOffering "1" -- "0..*" Response : "receives"
    EvalQuestion "1" -- "0..*" Response : "answered by"

    User "1" -- "0..*" AuditLog : "performs"
    User "1" -- "0..*" Notification : "receives"

    User ..> Role : "uses"
    EvalQuestion ..> QuestionType : "uses"
    Notification ..> NotificationType : "uses"
    Notification ..> NotificationStatus : "uses"
```

---

## 2. Service Layer Class Diagram

```mermaid
classDiagram

    %% ─── Auth Module ─────────────────────────────────────────────

    class AuthService {
        -UserRepository userRepo
        -RedisService redis
        -AuditService audit
        +login(email, password) TokenPair
        +logout(userId, jti) void
        +refreshToken(token) TokenPair
        +forgotPassword(email) void
        +resetPassword(token, newPassword) void
        -generateTokenPair(user) TokenPair
        -verifyRefreshToken(token) JWTPayload
    }

    %% ─── User Module ─────────────────────────────────────────────

    class UserService {
        -UserRepository userRepo
        -AuditService audit
        +list(filters, pagination) PagedResult~User~
        +findById(id) User
        +create(dto) User
        +update(id, dto) User
        +softDelete(id) void
        +bulkImport(csv) ImportResult
    }

    %% ─── Evaluation Module ───────────────────────────────────────

    class EvaluationService {
        -EnrollmentRepository enrollRepo
        -OfferingRepository offeringRepo
        -ParticipationRepository participRepo
        -ResponseRepository responseRepo
        -RedisService redis
        -AuditService audit
        +getPendingEvaluations(studentId) Offering[]
        +getForm(offeringId) EvalForm
        +saveDraft(studentId, offeringId, answers) void
        +submit(studentId, offeringId, answers) void
        +getStatus(studentId, offeringId) SubmissionStatus
        -validateWindow(offering) void
        -validateEnrollment(studentId, offeringId) void
        -validateNotSubmitted(studentId, offeringId) void
    }

    %% ─── Reports Module ──────────────────────────────────────────

    class ReportService {
        -ResponseRepository responseRepo
        -OfferingRepository offeringRepo
        -RedisService redis
        -ExportService exportService
        +getOfferingReport(offeringId, requesterId) OfferingReport
        +getInstructorReport(instructorId, termId) InstructorReport
        +getDepartmentReport(deptId, termId) DepartmentReport
        +getInstitutionDashboard() InstitutionDashboard
        +exportReport(offeringId, format) Buffer
        -checkResultsAccess(offering, requesterId) void
        -computeStats(values) Stats
    }

    %% ─── Notification Module ─────────────────────────────────────

    class NotificationService {
        -NotificationRepository notifRepo
        -EmailTransport email
        -BullQueue queue
        +scheduleEvalOpen(offeringId, openAt, studentIds) void
        +scheduleReminder(offeringId, reminderAt, studentIds) void
        +sendResultReleased(instructorId, offeringId) void
        +processQueue() void
        -sendEmail(to, subject, body) void
    }

    %% ─── Audit Module ────────────────────────────────────────────

    class AuditService {
        -AuditRepository auditRepo
        +log(entry: AuditEntry) void
        +query(filters, pagination) PagedResult~AuditLog~
        +export() Buffer
    }

    %% ─── Shared Infrastructure ───────────────────────────────────

    class RedisService {
        -IORedis client
        +get(key) string
        +set(key, value, ttl) void
        +del(key) void
        +addToDenyList(jti, ttl) void
        +isInDenyList(jti) boolean
    }

    class ExportService {
        +toPDF(report) Buffer
        +toCSV(report) Buffer
    }

    %% ─── Relationships ────────────────────────────────────────────

    AuthService --> RedisService : uses
    AuthService --> AuditService : uses
    EvaluationService --> RedisService : uses
    EvaluationService --> AuditService : uses
    ReportService --> RedisService : uses
    ReportService --> ExportService : uses
    NotificationService --> AuditService : uses
    UserService --> AuditService : uses
```

---

## 3. Repository Layer Class Diagram

```mermaid
classDiagram

    class BaseRepository~T~ {
        <<abstract>>
        #PrismaClient prisma
        +findById(id) T
        +findAll(filters) T[]
        +create(data) T
        +update(id, data) T
        +delete(id) void
    }

    class UserRepository {
        +findByEmail(email) User
        +findByResetToken(hash) User
        +softDelete(id) void
        +bulkCreate(users) User[]
    }

    class OfferingRepository {
        +findWithForm(id) OfferingWithForm
        +findByTerm(termId) Offering[]
        +findByInstructor(instructorId) Offering[]
        +updateWindow(id, open, close) Offering
        +releaseResults(id) Offering
    }

    class EnrollmentRepository {
        +findByStudentAndOffering(studentId, offeringId) Enrollment
        +findStudentsByOffering(offeringId) Student[]
        +bulkCreate(enrollments) Enrollment[]
    }

    class ParticipationRepository {
        +findByStudentAndOffering(studentId, offeringId) ParticipationToken
        +upsertSubmitted(studentId, offeringId) ParticipationToken
        +countSubmitted(offeringId) number
    }

    class ResponseRepository {
        +createMany(responses: Omit~Response,"studentId"~[]) void
        +aggregateByOffering(offeringId) AggregatedRow[]
        +countByOffering(offeringId) number
    }

    class AuditRepository {
        +insert(entry) AuditLog
        +query(filters) AuditLog[]
    }

    BaseRepository <|-- UserRepository
    BaseRepository <|-- OfferingRepository
    BaseRepository <|-- EnrollmentRepository
    BaseRepository <|-- ParticipationRepository
    BaseRepository <|-- ResponseRepository
    BaseRepository <|-- AuditRepository
```

> **Note on `ResponseRepository.createMany`:** The TypeScript signature uses `Omit<Response, 'studentId'>` — since `Response` never has a `studentId` field in the domain model, this constraint is enforced at the type level. The repository method physically cannot accept a `studentId` argument.
