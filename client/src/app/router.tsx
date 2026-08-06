import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PrivateRoute } from '@/shared/components/PrivateRoute';
import { AppLayout } from '@/shared/components/AppLayout';

// Auth pages
import { LoginPage } from '@/pages/shared/LoginPage';
import { ForgotPasswordPage } from '@/pages/shared/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/shared/ResetPasswordPage';
import { NotFoundPage } from '@/pages/shared/NotFoundPage';

// Student pages
import { StudentDashboardPage } from '@/pages/student/StudentDashboardPage';
import { EvaluationListPage } from '@/pages/student/EvaluationListPage';
import { EvaluationPage } from '@/pages/student/EvaluationPage';

// Instructor pages
import { InstructorDashboardPage } from '@/pages/instructor/InstructorDashboardPage';
import { InstructorReportPage } from '@/pages/instructor/InstructorReportPage';

// Admin pages
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { CoursesPage } from '@/pages/admin/CoursesPage';
import { FormsBuilderPage } from '@/pages/admin/FormsBuilderPage';
import { EvaluationWindowsPage } from '@/pages/admin/EvaluationWindowsPage';
import { AuditLogPage } from '@/pages/admin/AuditLogPage';

export const router = createBrowserRouter([
  // Public routes
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },

  // Student routes
  {
    path: '/student',
    element: <PrivateRoute allowedRoles={['student']} />,
    children: [
      { element: <AppLayout />, children: [
        { index: true, element: <Navigate to="/student/dashboard" replace /> },
        { path: 'dashboard', element: <StudentDashboardPage /> },
        { path: 'evaluations', element: <EvaluationListPage /> },
        { path: 'evaluations/:offeringId', element: <EvaluationPage /> },
      ]},
    ],
  },

  // Instructor routes
  {
    path: '/instructor',
    element: <PrivateRoute allowedRoles={['instructor']} />,
    children: [
      { element: <AppLayout />, children: [
        { index: true, element: <Navigate to="/instructor/dashboard" replace /> },
        { path: 'dashboard', element: <InstructorDashboardPage /> },
        { path: 'reports/:offeringId', element: <InstructorReportPage /> },
      ]},
    ],
  },

  // Admin + Dept Head routes
  {
    path: '/admin',
    element: <PrivateRoute allowedRoles={['admin', 'dept_head']} />,
    children: [
      { element: <AppLayout />, children: [
        { index: true, element: <Navigate to="/admin/dashboard" replace /> },
        { path: 'dashboard', element: <AdminDashboardPage /> },
        { path: 'users', element: <UsersPage /> },
        { path: 'courses', element: <CoursesPage /> },
        { path: 'forms', element: <FormsBuilderPage /> },
        { path: 'windows', element: <EvaluationWindowsPage /> },
        { path: 'audit', element: <AuditLogPage /> },
      ]},
    ],
  },

  // Root redirect
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <NotFoundPage /> },
]);
