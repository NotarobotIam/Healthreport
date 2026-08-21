import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { RequireAuth, PublicOnlyRoute } from './auth/RequireAuth';
import { LoadingScreen } from './components/dashboardUi';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReportDetailPage } from './pages/ReportDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { DataPage } from './pages/DataPage';
import { OverviewPage, PhysiologyPage, PathologyPage, SimulationPage, ReportsPage } from './pages/OtherPages';
import { useRemoteImagingData } from './hooks/useRemoteImagingData';

// Only Three.js/React Three Fiber/Drei (~1MB+) are ever reachable through
// AnatomyPage — nothing else in the app imports scene/**, so splitting this
// one entry point is sufficient for Rollup to chunk the whole subtree
// separately. See the mount-once-visited mechanism below: the dynamic
// import only actually fires the first time the Anatomy route is visited.
const AnatomyPage = lazy(() => import('./pages/AnatomyPage').then((m) => ({ default: m.AnatomyPage })));

/**
 * Everything behind login. Renders its own nested <Routes> (matched against
 * the same absolute paths, valid under a `/*` parent route) rather than one
 * flat tree, specifically to carve out the Anatomy page as a special case:
 * it needs to stay mounted (not unmounted/remounted by react-router on
 * every navigation) so the WebGL context and the physiology playback clock
 * survive switching to other tabs and back — a hard requirement carried
 * over from before this app had routing at all, not a new one.
 */
function ProtectedShell() {
  const location = useLocation();
  const isAnatomyRoute = location.pathname === '/anatomy';
  const [anatomyVisited, setAnatomyVisited] = useState(isAnatomyRoute);

  useEffect(() => {
    if (isAnatomyRoute) setAnatomyVisited(true);
  }, [isAnatomyRoute]);

  // Only fetches once actually authenticated (ProtectedShell only renders
  // once RequireAuth confirms that) — no separate bootstrap step needed
  // now that both apps are the same app/same origin.
  useRemoteImagingData();

  return (
    <AppShell>
      {anatomyVisited && (
        <div className={isAnatomyRoute ? 'h-full' : 'hidden'}>
          <Suspense fallback={<LoadingScreen message="Loading 3D anatomy explorer..." />}>
            <AnatomyPage />
          </Suspense>
        </div>
      )}
      <div className={isAnatomyRoute ? 'hidden' : 'h-full'}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/report/:id" element={<ReportDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/physiology" element={<PhysiologyPage />} />
          <Route path="/pathology" element={<PathologyPage />} />
          <Route path="/simulation" element={<SimulationPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          {/* Content comes from the sibling tree above; this route entry only stops <Routes> from warning about an unmatched path. */}
          <Route path="/anatomy" element={null} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </AppShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <ProtectedShell />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
