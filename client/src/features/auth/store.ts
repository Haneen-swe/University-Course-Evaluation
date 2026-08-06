import { create } from 'zustand';
import { api } from '@/shared/lib/api';

export type Role = 'student' | 'instructor' | 'dept_head' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  departmentId?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
  clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
  setToken: (accessToken) => set({ accessToken }),
}));

// Convenience selectors
export const useCurrentUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
export const useUserRole = () => useAuthStore((s) => s.user?.role);
