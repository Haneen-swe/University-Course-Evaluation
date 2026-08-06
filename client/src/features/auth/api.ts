import { api } from '@/shared/lib/api';
import type { AuthUser } from './store';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<{ success: true; data: LoginResponse }>('/auth/login', payload),

  logout: () =>
    api.post('/auth/logout'),

  refresh: () =>
    api.post<{ success: true; data: { accessToken: string } }>('/auth/refresh'),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),

  getMe: () =>
    api.get<{ success: true; data: AuthUser }>('/users/me'),
};
