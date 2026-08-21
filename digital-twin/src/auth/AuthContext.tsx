import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchCurrentUser } from '../data/remote/authApi';
import { getStoredToken, setStoredToken, clearStoredToken } from './tokenStore';
import type { AuthUser } from '../types';

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** Called after a successful login/register response. */
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  /** Called after a successful profile update, to keep the in-memory user fresh without a full re-check. */
  setUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Single source of truth for "is anyone logged in" across the whole merged
 * app. Mirrors the previous App.js's on-mount `getCurrentUser()` check, now
 * exposed via context/hook instead of lifted state + prop drilling, since
 * there are far more routes/pages consuming it now.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [user, setUserState] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setStatus('unauthenticated');
      return;
    }
    fetchCurrentUser()
      .then((res) => {
        setUserState(res.user);
        setStatus('authenticated');
      })
      .catch(() => {
        clearStoredToken();
        setStatus('unauthenticated');
      });
  }, []);

  const login = (token: string, loggedInUser: AuthUser) => {
    setStoredToken(token);
    setUserState(loggedInUser);
    setStatus('authenticated');
  };

  const logout = () => {
    clearStoredToken();
    setUserState(null);
    setStatus('unauthenticated');
  };

  const setUser = (updatedUser: AuthUser) => {
    setUserState(updatedUser);
  };

  return <AuthContext.Provider value={{ status, user, login, logout, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
