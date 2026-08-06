import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import type { Role } from '@/features/auth/store';

interface Props {
  allowedRoles: Role[];
}

export function PrivateRoute({ allowedRoles }: Props) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to their own dashboard
    const dashboards: Record<Role, string> = {
      student: '/student/dashboard',
      instructor: '/instructor/dashboard',
      dept_head: '/admin/dashboard',
      admin: '/admin/dashboard',
    };
    return <Navigate to={dashboards[user.role]} replace />;
  }

  return <Outlet />;
}
