import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/features/auth/store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api/v1`
    : '/api/v1',
  withCredentials: true, // send httpOnly refresh token cookie
  timeout: 15000,
});

// Request interceptor — attach access token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['X-Requested-With'] = 'XMLHttpRequest';
  return config;
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

// Response interceptor — auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const res = await api.post<{ success: true; data: { accessToken: string } }>('/auth/refresh');
        const newToken = res.data.data.accessToken;
        useAuthStore.getState().setToken(newToken);
        onRefreshed(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
