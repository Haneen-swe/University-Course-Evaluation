import { create } from 'zustand';

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
  /** True while the app is attempting to restore a session on initial load */
  isInitializing: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  setToken: (token: string) => void;
  setInitialized: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true, // start true — assume we may have a valid session until checked
  setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
  clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
  setToken: (accessToken) => set({ accessToken }),
  setInitialized: () => set({ isInitializing: false }),
}));

// Convenience selectors
export const useCurrentUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
export const useUserRole = () => useAuthStore((s) => s.user?.role);
