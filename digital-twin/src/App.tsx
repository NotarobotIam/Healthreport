import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { FriendlyBackground } from './components/layout/FriendlyBackground';
import { RequireAuth, PublicOnlyRoute } from './auth/RequireAuth';
import { LoadingScreen } from './components/dashboardUi';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReportDetailPage } from './pages/ReportDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { DataPage } from './pages/DataPage';
import { CommunityPage } from './pages/CommunityPage';
import { NewThreadPage } from './pages/NewThreadPage';
import { ThreadPage } from './pages/ThreadPage';
import { MatchesPage } from './pages/MatchesPage';
import { MemberPage } from './pages/MemberPage';
import { GroupsPage } from './pages/GroupsPage';
import { GroupPage } from './pages/GroupPage';
import { FriendsPage } from './pages/FriendsPage';
import { AccountPage } from './pages/AccountPage';
import { ModerationPage } from './pages/ModerationPage';
import { GuidelinesPage, PrivacyPage, TermsPage } from './pages/LegalPages';
import { useAuth } from './auth/AuthContext';
import { OverviewPage, SimulationPage } from './pages/OtherPages';
import { PathologyPage } from './pages/PathologyPage';
import { PhysiologyPage } from './pages/PhysiologyPage';
import { InsightsPage } from './pages/InsightsPage';
import { ReportsPage } from './pages/ReportsPage';
import { useRemoteImagingData } from './hooks/useRemoteImagingData';
import { PainProvider } from './hooks/usePainEntries';

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
  // The two "social" areas of the app — where a plain grey page reads as bare — get a warmer backdrop.
  const isFriendlyRoute = location.pathname === '/dashboard' || location.pathname.startsWith('/community');

  useEffect(() => {
    if (isAnatomyRoute) setAnatomyVisited(true);
  }, [isAnatomyRoute]);

  // Only fetches once actually authenticated (ProtectedShell only renders
  // once RequireAuth confirms that) — no separate bootstrap step needed
  // now that both apps are the same app/same origin.
  useRemoteImagingData();

  return (
    <PainProvider>
    <AppShell>
      {anatomyVisited && (
        <div className={isAnatomyRoute ? 'h-full' : 'hidden'}>
          <Suspense fallback={<LoadingScreen message="Loading 3D anatomy explorer..." />}>
            <AnatomyPage />
          </Suspense>
        </div>
      )}
      {/* Every page except the 3D one scrolls inside this box. (AppShell is a fixed-height, overflow-hidden frame, so without this anything taller than the window was cut off.) */}
      {/* `isolate` on the friendly routes gives FriendlyBackground's negative z-index its own stacking context to sink
          into — without it, AppShell's own opaque background (an unrelated ancestor, painted in the same outer
          stacking context) swallows anything behind a plain z-index:auto positioned descendant. */}
      <div className={isAnatomyRoute ? 'hidden' : `relative h-full overflow-y-auto ${isFriendlyRoute ? 'isolate bg-hud-bgWarm' : ''}`}>
        {isFriendlyRoute && <FriendlyBackground />}
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/report/:id" element={<ReportDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/community/new" element={<NewThreadPage />} />
          <Route path="/community/matches" element={<MatchesPage />} />
          <Route path="/community/groups" element={<GroupsPage />} />
          <Route path="/community/g/:slug" element={<GroupPage />} />
          <Route path="/community/friends" element={<FriendsPage />} />
          <Route path="/community/thread/:id" element={<ThreadPage />} />
          <Route path="/community/u/:handle" element={<MemberPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/moderation" element={<ModerationRoute />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/physiology" element={<PhysiologyPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/pathology" element={<PathologyPage />} />
          <Route path="/simulation" element={<SimulationPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          {/* Content comes from the sibling tree above; this route entry only stops <Routes> from warning about an unmatched path. */}
          <Route path="/anatomy" element={null} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </AppShell>
    </PainProvider>
  );
}

/** The server enforces roles on every call; this just avoids showing members a page that can only fail. */
function ModerationRoute() {
  const { user } = useAuth();
  if (user?.role !== 'moderator' && user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <ModerationPage />;
}

export default function App() {
  return (
    <Routes>
      {/* Public: sign-up links here, so these can't sit behind login. */}
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/guidelines" element={<GuidelinesPage />} />
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
