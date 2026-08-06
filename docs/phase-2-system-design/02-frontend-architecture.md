# 02 — Frontend Architecture

**Project:** University Course Evaluation System (UCES)  
**Phase:** 2 — System Design  
**Document Version:** 1.0

---

## 1. Technology Choices

| Tool | Version | Purpose |
|---|---|---|
| React | 18.x | UI component library |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool & dev server |
| React Router v6 | 6.x | Client-side routing |
| React Query (TanStack) | 5.x | Server-state fetching, caching, mutation |
| Zustand | 4.x | Lightweight global UI state |
| React Hook Form + Zod | latest | Form state and client-side validation |
| Tailwind CSS | 3.x | Utility-first responsive styling |
| shadcn/ui | latest | Accessible, unstyled component primitives |
| Recharts | 2.x | Data visualisation (charts, trend lines) |
| Axios | 1.x | HTTP client with interceptors |
| i18next | 23.x | Internationalisation |
| Vitest + React Testing Library | latest | Unit & integration tests |

---

## 2. Project Structure

```
client/
├── public/                        # Static assets
├── src/
│   ├── app/                       # App entry, router, providers
│   │   ├── App.tsx
│   │   ├── router.tsx             # React Router route definitions
│   │   └── providers.tsx          # QueryClient, i18n, AuthProvider
│   │
│   ├── features/                  # Feature-sliced design (FSD)
│   │   ├── auth/
│   │   │   ├── components/        # LoginForm, ForgotPassword
│   │   │   ├── hooks/             # useLogin, useLogout
│   │   │   ├── api.ts             # auth API calls
│   │   │   └── store.ts           # Zustand auth slice
│   │   ├── evaluations/
│   │   │   ├── components/        # EvaluationForm, QuestionRenderer
│   │   │   ├── hooks/             # usePendingEvaluations, useSubmit
│   │   │   └── api.ts
│   │   ├── courses/
│   │   ├── forms-builder/
│   │   ├── reports/
│   │   ├── users/
│   │   └── admin/
│   │
│   ├── shared/                    # Cross-feature shared code
│   │   ├── components/            # Button, Modal, Table, Badge, Spinner
│   │   ├── hooks/                 # useDebounce, usePagination
│   │   ├── lib/                   # axios instance, date utils, formatters
│   │   ├── types/                 # Global TypeScript interfaces
│   │   └── constants/             # Route paths, API endpoints
│   │
│   ├── pages/                     # Route-level page components
│   │   ├── student/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── EvaluationListPage.tsx
│   │   │   └── EvaluationPage.tsx
│   │   ├── instructor/
│   │   │   ├── DashboardPage.tsx
│   │   │   └── ReportPage.tsx
│   │   ├── admin/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── UsersPage.tsx
│   │   │   ├── CoursesPage.tsx
│   │   │   ├── FormsBuilderPage.tsx
│   │   │   ├── EvaluationWindowsPage.tsx
│   │   │   └── AuditLogPage.tsx
│   │   └── shared/
│   │       ├── LoginPage.tsx
│   │       └── NotFoundPage.tsx
│   │
│   └── styles/                    # Global CSS, Tailwind config
│       └── globals.css
│
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── package.json
```

---

## 3. Routing Architecture

All routes are protected by a `<PrivateRoute>` wrapper that checks JWT validity and role.

```
/login                         → LoginPage (public)
/forgot-password               → ForgotPasswordPage (public)
/reset-password/:token         → ResetPasswordPage (public)

/student/
  dashboard                    → StudentDashboardPage
  evaluations                  → EvaluationListPage
  evaluations/:id              → EvaluationPage

/instructor/
  dashboard                    → InstructorDashboardPage
  reports/:offeringId          → CourseReportPage

/dept-head/
  dashboard                    → DeptHeadDashboardPage
  reports                      → ReportsListPage

/admin/
  dashboard                    → AdminDashboardPage
  users                        → UsersPage
  courses                      → CoursesPage
  terms                        → TermsPage
  forms                        → FormsBuilderPage
  evaluations/windows          → EvaluationWindowsPage
  audit                        → AuditLogPage
  settings                     → SettingsPage
```

### Route Guard Logic

```typescript
// shared/components/PrivateRoute.tsx
const PrivateRoute = ({ allowedRoles }: { allowedRoles: Role[] }) => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/403" replace />;
  return <Outlet />;
};
```

---

## 4. State Management Strategy

| State Category | Tool | Rationale |
|---|---|---|
| Server data (courses, evaluations, reports) | React Query | Auto-caching, background refetch, optimistic updates |
| Authentication (user, token) | Zustand | Persisted in memory; refresh token in httpOnly cookie |
| Form state | React Hook Form | Performant, uncontrolled inputs, Zod resolver |
| UI state (modals, sidebar) | Zustand | Simple; no boilerplate |

### Authentication Store (Zustand)

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}
```

---

## 5. HTTP Client (Axios Instance)

```typescript
// shared/lib/api.ts
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      await useAuthStore.getState().refreshToken();
      return api(error.config);
    }
    return Promise.reject(error);
  }
);
```

---

## 6. Evaluation Form Renderer

The evaluation form is driven by a JSON schema returned from the API. The renderer maps question types to React components:

```typescript
type QuestionType = 'likert' | 'single_choice' | 'multi_choice' | 'open_text';

interface Question {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options?: { value: string; label: string }[];  // for choice types
  scale?: { min: number; max: number };           // for likert
}
```

```
QuestionRenderer
  ├── LikertQuestion       (radio group 1–5 or 1–10)
  ├── SingleChoiceQuestion (radio group)
  ├── MultiChoiceQuestion  (checkbox group)
  └── OpenTextQuestion     (textarea, max 2000 chars)
```

---

## 7. Accessibility (WCAG 2.1 AA)

- All interactive elements have `aria-label` or visible label.
- Colour contrast ratio ≥ 4.5:1 for normal text.
- Keyboard navigation fully supported (Tab, Space, Enter, Escape).
- Focus management on modal open/close.
- Screen-reader announcements via `aria-live` regions on form validation errors.

---

## 8. Internationalisation (i18n)

- `i18next` with `react-i18next` bindings.
- Translations stored in `public/locales/{lang}/translation.json`.
- Language detection from browser settings or explicit user preference stored in profile.
- RTL layout supported via Tailwind `dir="rtl"` attribute + `rtl:` prefix classes.

---

## 9. Testing Strategy

| Layer | Tool | Coverage Target |
|---|---|---|
| Component tests | React Testing Library + Vitest | All shared components |
| Feature hooks | Vitest + MSW (mock service worker) | All API-touching hooks |
| E2E flows | Playwright | Critical paths: login, submit evaluation, view report |
| Accessibility | axe-core (vitest-axe) | All page-level components |
