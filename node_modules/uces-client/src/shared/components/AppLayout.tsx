import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { authApi } from '@/features/auth/api';
import {
  LayoutDashboard, BookOpen, ClipboardList,
  Users, LogOut, Menu, X, FileText, Bell, Shield
} from 'lucide-react';

type NavItem = { label: string; href: string; icon: React.ReactNode };

function getNavItems(role: string): NavItem[] {
  if (role === 'student') return [
    { label: 'Dashboard', href: '/student/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'My Evaluations', href: '/student/evaluations', icon: <ClipboardList size={18} /> },
  ];
  if (role === 'instructor') return [
    { label: 'Dashboard', href: '/instructor/dashboard', icon: <LayoutDashboard size={18} /> },
  ];
  // admin / dept_head
  return [
    { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'Users', href: '/admin/users', icon: <Users size={18} /> },
    { label: 'Courses', href: '/admin/courses', icon: <BookOpen size={18} /> },
    { label: 'Forms Builder', href: '/admin/forms', icon: <FileText size={18} /> },
    { label: 'Eval Windows', href: '/admin/windows', icon: <Bell size={18} /> },
    { label: 'Audit Log', href: '/admin/audit', icon: <Shield size={18} /> },
  ];
}

export function AppLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = getNavItems(user?.role ?? 'student');

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:relative md:flex`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-border flex-shrink-0">
          <span className="font-bold text-primary text-sm">UCES</span>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-1 transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <div className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</div>
          <div className="text-xs text-muted-foreground capitalize mb-3">{user?.role?.replace('_', ' ')}</div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors w-full"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card md:hidden">
          <button onClick={() => setSidebarOpen(true)}><Menu size={22} /></button>
          <span className="font-bold text-sm">UCES</span>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
