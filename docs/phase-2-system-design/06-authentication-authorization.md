# 06 — Authentication & Authorization

**Project:** University Course Evaluation System (UCES)  
**Phase:** 2 — System Design  
**Document Version:** 1.0

---

## 1. Overview

UCES uses a **stateless JWT-based authentication** scheme with:

- **Access Token** — short-lived (15 minutes), carried in `Authorization: Bearer` header.
- **Refresh Token** — long-lived (7 days), stored in an `httpOnly; Secure; SameSite=Strict` cookie.
- **RBAC (Role-Based Access Control)** — enforced at the route level via middleware.

This design allows horizontal scaling of the API tier without session affinity while maintaining security through short-lived access tokens and revocable refresh tokens.

---

## 2. Authentication Flow

### 2.1 Login

```
Client                           API Server                    Database
  │                                   │                             │
  │── POST /auth/login ──────────────►│                             │
  │   { email, password }             │── SELECT user WHERE email ─►│
  │                                   │◄─ user row ─────────────────│
  │                                   │                             │
  │                                   │ bcrypt.compare(password, hash)
  │                                   │                             │
  │                                   │── INSERT audit_log ────────►│
  │◄─ 200 { accessToken, user } ──────│                             │
  │   Set-Cookie: refreshToken=...    │                             │
```

### 2.2 Authenticated Request

```
Client                           API Server
  │                                   │
  │── GET /api/v1/... ───────────────►│
  │   Authorization: Bearer {JWT}     │
  │                                   │ 1. Verify JWT signature (HS256/RS256)
  │                                   │ 2. Check exp claim
  │                                   │ 3. Check jti not in Redis deny-list
  │                                   │ 4. Attach req.user = decoded payload
  │◄─ 200 { data: ... } ─────────────│
```

### 2.3 Token Refresh

```
Client                           API Server                    Database
  │                                   │                             │
  │── POST /auth/refresh ────────────►│                             │
  │   Cookie: refreshToken=...        │ 1. Verify refresh token sig  │
  │                                   │ 2. Check not revoked in Redis│
  │                                   │ 3. Load user from DB        │
  │◄─ 200 { accessToken } ───────────│                             │
  │   (new httpOnly cookie)           │                             │
```

### 2.4 Logout

```
API Server:
  1. Add access token jti to Redis deny-list (TTL = remaining token lifetime)
  2. Delete refresh token from Redis
  3. Clear httpOnly cookie (Set-Cookie: refreshToken=; Max-Age=0)
```

---

## 3. JWT Payload Structure

```typescript
interface JWTPayload {
  sub: string;          // user UUID
  email: string;
  role: 'student' | 'instructor' | 'dept_head' | 'admin';
  departmentId?: string;
  jti: string;          // unique token ID (for deny-list)
  iat: number;          // issued at
  exp: number;          // expiry
}
```

---

## 4. Token Security Parameters

| Parameter | Value | Rationale |
|---|---|---|
| Algorithm | HS256 (HMAC SHA-256) | Simple, secure for single-server; upgrade to RS256 for multi-service |
| Access token TTL | 15 minutes | Short window limits exposure if stolen |
| Refresh token TTL | 7 days | Reasonable session length for university users |
| Secret rotation | ENV variable; rotated each semester | Invalidates all tokens on rotation |
| Refresh token storage | Redis hash keyed by `userId` | Supports single-device revocation |
| Deny-list storage | Redis SET `jwt:deny:{jti}` | O(1) lookup; TTL auto-expires entries |

---

## 5. Password Security

| Aspect | Implementation |
|---|---|
| Hashing algorithm | bcrypt |
| Cost factor | 12 (≈ 250ms on modern hardware) |
| Minimum length | 8 characters |
| Complexity | At least 1 uppercase, 1 lowercase, 1 digit |
| Reset token | 32-byte cryptographically random hex string |
| Reset token storage | bcrypt-hashed in DB, raw sent in email |
| Reset token TTL | 60 minutes |
| Brute-force protection | 10 attempts per 15 min per IP (Redis rate limit) |

---

## 6. Role-Based Access Control (RBAC)

### 6.1 Role Hierarchy

```
admin
  ├── dept_head        (inherits nothing — role grants are explicit, not inherited)
  ├── instructor
  └── student
```

Roles are **flat and explicit** — no inheritance. Each route declares which roles are permitted.

### 6.2 Role Capabilities Matrix

| Resource / Action | student | instructor | dept_head | admin |
|---|---|---|---|---|
| Login / logout | ✓ | ✓ | ✓ | ✓ |
| View own profile | ✓ | ✓ | ✓ | ✓ |
| View pending evaluations | ✓ | — | — | — |
| Submit evaluation | ✓ | — | — | — |
| View own course reports | — | ✓* | — | — |
| Export own reports | — | ✓* | — | — |
| View dept reports | — | — | ✓ | ✓ |
| View institution dashboard | — | — | — | ✓ |
| Manage users (CRUD) | — | — | — | ✓ |
| Manage courses / terms | — | — | — | ✓ |
| Manage form templates | — | — | — | ✓ |
| Configure evaluation windows | — | — | — | ✓ |
| Release results | — | — | — | ✓ |
| View audit logs | — | — | — | ✓ |
| Trigger notifications | — | — | — | ✓ |

> *Instructor access to reports is conditional: `results_released = true` AND response count ≥ `min_responses_threshold`.

### 6.3 RBAC Middleware Implementation

```typescript
// middleware/authorize.ts
export const authorize = (...allowedRoles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'UNAUTHENTICATED', '...'));
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions.'));
    }
    next();
  };

// Usage in router:
router.get('/users', authenticate, authorize('admin'), usersController.list);
router.get('/users/me', authenticate, usersController.getMe);
```

---

## 7. SSO Integration (Optional)

For institutions with LDAP / Active Directory or an OAuth 2.0 provider (e.g., Azure AD, Google Workspace):

```
Client ──► Redirect to IdP login page
IdP    ──► POST /auth/sso/callback?code=...
Server:
  1. Exchange code for IdP token
  2. Fetch user profile from IdP (email, name)
  3. Find or create user in UCES DB (email as key)
  4. Issue UCES JWT pair (same flow as standard login)
```

The SSO callback route is guarded to only accept redirects from whitelisted IdP domains.

---

## 8. CSRF Protection

- Stateless JWT in `Authorization` header: inherently CSRF-safe (browser won't auto-send this header cross-origin).
- Refresh token in `httpOnly` cookie: protected by `SameSite=Strict`, preventing cross-site request forgery on the `/auth/refresh` endpoint.
- Additional `X-Requested-With: XMLHttpRequest` header check on all mutating endpoints as a defence-in-depth measure.

---

## 9. Security Headers (Helmet.js)

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=63072000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 10. Anonymity — Authentication Layer Role

The authentication layer is the **only** layer that knows the student's identity. Once the service layer calls `evaluationService.submit()`, the identity is used only to:

1. Verify enrollment.
2. Write the participation token.

The `studentId` is **never passed** to `responseRepository.create()`. This is enforced as a code review policy and a TypeScript type constraint — the response creation function signature does not accept a `studentId` parameter.
