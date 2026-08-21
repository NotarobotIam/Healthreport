import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { LoadingScreen } from '../components/dashboardUi';

/** Wraps every protected route. Redirects to /login (preserving where the user was headed) once we know for sure there's no session. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <LoadingScreen message="Checking your session..." />;
  if (status === 'unauthenticated') return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

/** Wraps /login and /register — bounces an already-logged-in user straight to the dashboard instead of showing them a login form. */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === 'checking') return <LoadingScreen />;
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
