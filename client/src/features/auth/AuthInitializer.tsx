import { useEffect } from 'react';
import { useAuthStore } from './store';
import { authApi } from './api';
import { api } from '@/shared/lib/api';

/**
 * Runs once on app mount.  Attempts a silent token refresh using the httpOnly
 * refresh-token cookie.  If successful, fetches the user profile and hydrates
 * the Zustand auth store.  On failure (no cookie / expired) it simply clears
 * auth and lets PrivateRoute redirect to /login.
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { setAuth, clearAuth, setInitialized } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        // Attempt silent refresh — uses the httpOnly cookie automatically
        const refreshRes = await authApi.refresh();
        const newToken = refreshRes.data.data.accessToken;

        // Fetch the user profile with the new access token
        const meRes = await api.get('/users/me', {
          headers: { Authorization: `Bearer ${newToken}` },
        });

        if (!cancelled) {
          setAuth(meRes.data.data, newToken);
        }
      } catch {
        // No valid session — clear any stale state
        if (!cancelled) {
          clearAuth();
        }
      } finally {
        if (!cancelled) {
          setInitialized();
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
