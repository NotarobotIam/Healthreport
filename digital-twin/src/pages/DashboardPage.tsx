import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { fetchReports } from '../data/remote/reportsApi';
import { fetchThreads } from '../data/remote/communityApi';
import { fetchGroups } from '../data/remote/groupsApi';
import { fetchFriendActivity, fetchFriends } from '../data/remote/friendsApi';
import { fetchResearch } from '../data/remote/researchApi';
import { usePainEntries } from '../hooks/usePainEntries';
import { useAuth } from '../auth/AuthContext';
import { PageContainer } from '../components/dashboardUi';
import { ActivityFeed } from '../components/community/ActivityFeed';
import { ResearchList } from '../components/community/ResearchList';
import { InsightsTeaser } from '../components/physiology/InsightsTeaser';
import { HospitalFinder } from '../components/places/HospitalFinder';
import { severityBand } from '../components/atlas/painFormat';
import { timeAgo } from '../components/community/format';
import type { ActivityResponse, FriendsResponse, GroupDTO, ReportDTO, ResearchKind, ResearchResponse, ThreadDTO } from '../types';

function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Hello';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function Card({ title, icon, action, children }: { title: string; icon: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-hud-panel p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-hud-text">
          <span aria-hidden="true" className="text-lg">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const ActionLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="text-sm font-medium text-hud-cyan hover:underline">
    {children}
  </Link>
);

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold text-hud-text">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-hud-muted">{label}</p>
      {sub && <p className="text-xs text-hud-muted">{sub}</p>}
    </div>
  );
}

interface Step {
  done: boolean;
  label: string;
  hint: string;
  to: string;
}

/**
 * The member's home page. Warm rather than clinical: a greeting, what's new from friends and
 * communities, and recent research — with everything about the member's own health summarised
 * briefly. The full report list lives on the Reports tab.
 */
export function DashboardPage() {
  const { user } = useAuth();
  const pain = usePainEntries();

  const [reports, setReports] = useState<ReportDTO[] | null>(null);
  const [groups, setGroups] = useState<GroupDTO[] | null>(null);
  const [friends, setFriends] = useState<FriendsResponse | null>(null);
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [threads, setThreads] = useState<ThreadDTO[] | null>(null);
  const [kind, setKind] = useState<ResearchKind>('research');
  const [research, setResearch] = useState<Partial<Record<ResearchKind, ResearchResponse>>>({});
  const [researchLoading, setResearchLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const guard = <T,>(fn: (v: T) => void) => (v: T) => {
      if (!cancelled) fn(v);
    };
    fetchReports().then(guard((r) => setReports(r.reports))).catch(guard(() => setReports([])));
    fetchGroups().then(guard((r) => setGroups(r.categories.flatMap((c) => c.groups)))).catch(guard(() => setGroups([])));
    fetchFriends().then(guard(setFriends)).catch(guard(() => setFriends(null)));
    fetchFriendActivity().then(guard(setActivity)).catch(guard(() => setActivity(null)));
    fetchThreads({ mine: '1', sort: 'active' })
      .then(guard((r) => (r.threads.length ? setThreads(r.threads.slice(0, 3)) : fetchThreads({ sort: 'active' }).then(guard((g) => setThreads(g.threads.slice(0, 3)))))))
      .catch(guard(() => setThreads([])));
    return () => {
      cancelled = true;
    };
  }, []);

  // Research is fetched per tab, only when that tab is first opened.
  useEffect(() => {
    if (research[kind]) {
      setResearchLoading(false);
      return;
    }
    let cancelled = false;
    setResearchLoading(true);
    fetchResearch(kind, { limit: 4 })
      .then((r) => !cancelled && setResearch((prev) => ({ ...prev, [kind]: r })))
      .catch(() => undefined)
      .finally(() => !cancelled && setResearchLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const joined = useMemo(() => (groups ?? []).filter((g) => g.joined), [groups]);
  const activePain = pain.entries.filter((e) => e.status === 'active');
  const worst = activePain.reduce<number | null>((m, e) => (m === null || e.severity > m ? e.severity : m), null);
  const latestBlood = useMemo(
    () => (reports ?? []).filter((r) => r.testType === 'Blood').sort((a, b) => +new Date(b.testDate) - +new Date(a.testDate))[0],
    [reports],
  );
  const flagged = (reports ?? []).filter((r) => r.normal === false).length;

  const firstName = (user?.name ?? '').trim().split(/\s+/)[0] || user?.handle || 'there';
  const requests = friends?.incoming.length ?? 0;

  const steps: Step[] = [
    { done: joined.length > 0, label: 'Join a community', hint: 'Find people who understand', to: '/community/groups' },
    { done: pain.entries.length > 0, label: 'Log where it hurts', hint: 'Tap the 3D body', to: '/anatomy' },
    { done: (reports ?? []).length > 0, label: 'Add a test report', hint: 'Blood tests, scans and more', to: '/reports' },
    { done: (friends?.friends.length ?? 0) + (friends?.outgoing.length ?? 0) > 0, label: 'Make a friend', hint: 'Say hello to someone like you', to: '/community/matches' },
  ];
  const loadedBasics = reports !== null && groups !== null && !pain.loading && friends !== null;
  const doneCount = steps.filter((s) => s.done).length;
  const showSteps = loadedBasics && doneCount < steps.length;

  return (
    <PageContainer>
      <header className="mb-6 rounded-3xl bg-gradient-to-br from-[#e3f1ff] via-[#eaeeff] to-[#f4e9fc] px-6 py-8 sm:px-10">
        <p className="text-sm font-medium text-hud-text/70">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1 className="mt-1 text-3xl font-semibold text-hud-text">
          {greeting()}, {firstName}
        </h1>
        <p className="mt-2 max-w-xl text-base text-hud-text/80">
          {joined.length > 0 || (friends?.friends.length ?? 0) > 0
            ? "Here's what's new with your communities, your friends and the latest research."
            : "You're not alone in this. Here's a gentle place to start."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link to="/anatomy" className="rounded-full bg-[#007bff] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0056b3]">Log how you feel</Link>
          <Link to="/community/matches" className="rounded-full bg-white/80 px-5 py-2 text-sm font-semibold text-hud-text ring-1 ring-black/5 hover:bg-white">Find people like me</Link>
          <Link to="/reports" className="rounded-full bg-white/80 px-5 py-2 text-sm font-semibold text-hud-text ring-1 ring-black/5 hover:bg-white">My reports</Link>
        </div>
      </header>

      {requests > 0 && (
        <Link
          to="/community/friends"
          className="mb-5 flex items-center gap-3 rounded-2xl bg-hud-green/10 px-5 py-3 text-sm text-hud-text ring-1 ring-hud-green/30 hover:bg-hud-green/15"
        >
          <span aria-hidden="true" className="text-xl">🤝</span>
          <span>
            <strong>{requests === 1 ? 'Someone wants' : `${requests} people want`} to be your friend.</strong> Take a look →
          </span>
        </Link>
      )}

      {showSteps && (
        <section aria-label="Getting started" className="mb-5 rounded-2xl bg-hud-panel p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-hud-text"><span aria-hidden="true">🌱</span> Getting started</h2>
            <span className="text-xs font-medium text-hud-muted">{doneCount} of {steps.length} done</span>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-hud-border" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={steps.length}>
            <div className="h-full rounded-full bg-hud-green transition-[width]" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <li key={s.label}>
                <Link
                  to={s.to}
                  className={`flex h-full items-start gap-2.5 rounded-xl border p-3 transition-colors ${
                    s.done ? 'border-hud-green/30 bg-hud-green/5' : 'border-hud-border hover:border-hud-cyan/60 hover:bg-hud-panel2'
                  }`}
                >
                  <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.done ? 'bg-hud-green text-white' : 'border border-hud-borderLight text-transparent'}`}>✓</span>
                  <span>
                    <span className={`block text-sm font-semibold ${s.done ? 'text-hud-muted line-through' : 'text-hud-text'}`}>{s.label}</span>
                    <span className="block text-xs text-hud-muted">{s.hint}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-5">
          <Card title="What your friends are up to" icon="🤝" action={<ActionLink to="/community/friends">All friends</ActionLink>}>
            <ActivityFeed data={activity} limit={4} />
          </Card>

          <Card title="New research & tests" icon="🔬">
            <div className="mb-3 flex gap-1.5" role="tablist" aria-label="Research type">
              {(
                [
                  ['research', 'Research'],
                  ['tests', 'New tests & screening'],
                ] as [ResearchKind, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={kind === k}
                  onClick={() => setKind(k)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    kind === k ? 'bg-hud-cyan/15 text-hud-cyan' : 'text-hud-muted hover:bg-hud-panel2'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <ResearchList kind={kind} data={research[kind] ?? null} loading={researchLoading && !research[kind]} />
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <InsightsTeaser kind="pain" />
          <Card title="Your communities" icon="💬" action={<ActionLink to="/community/groups">Browse</ActionLink>}>
            {groups === null ? (
              <p className="text-sm text-hud-muted">Loading…</p>
            ) : joined.length === 0 ? (
              <p className="text-sm leading-relaxed text-hud-muted">
                Communities are groups for people with the same condition — like Breast Cancer, IBS or Type 2 Diabetes. Nobody can see which ones you join.{' '}
                <Link to="/community/groups" className="font-medium text-hud-cyan hover:underline">Find yours →</Link>
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {joined.map((g) => (
                  <li key={g.slug}>
                    <Link to={`/community/g/${g.slug}`} className="inline-block rounded-full bg-hud-green/10 px-3.5 py-1.5 text-sm font-medium text-hud-green hover:bg-hud-green/20">
                      {g.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {threads && threads.length > 0 && (
              <div className="mt-4 border-t border-hud-border pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-hud-muted">{joined.length > 0 ? 'Latest in your communities' : 'Happening now'}</p>
                <ul className="flex flex-col gap-2.5">
                  {threads.map((t) => (
                    <li key={t.id}>
                      <Link to={`/community/thread/${t.id}`} className="block text-sm font-medium text-hud-text hover:text-hud-cyan">{t.title}</Link>
                      <span className="text-xs text-hud-muted">
                        {t.replyCount} {t.replyCount === 1 ? 'reply' : 'replies'} · {timeAgo(t.lastActivityAt)}
                        {t.group && ` · ${t.group.name}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card title="Your health at a glance" icon="💙">
            <div className="flex flex-wrap gap-x-8 gap-y-4">
              <Stat label="Reports" value={reports === null ? '–' : reports.length} sub={flagged > 0 ? `${flagged} flagged` : undefined} />
              <Stat label="Pain logged" value={pain.loading ? '–' : activePain.length} sub={worst !== null ? `worst ${worst}/10 · ${severityBand(worst).label}` : undefined} />
              <Stat label="Shared" value={pain.entries.filter((e) => e.visibility === 'community').length} sub="anonymously" />
            </div>
            {latestBlood && (
              <p className="mt-4 text-sm text-hud-text">
                Latest blood test: <strong>{latestBlood.testName}</strong>, {new Date(latestBlood.testDate).toLocaleDateString()}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
              <ActionLink to="/reports">Reports →</ActionLink>
              <ActionLink to="/data">Trends →</ActionLink>
              <ActionLink to="/anatomy">Body map →</ActionLink>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-5">
        <Card title="Find a hospital near you" icon="🏥">
          <HospitalFinder />
        </Card>
      </div>

      <p className="mt-8 text-center text-xs text-hud-muted">
        This site shares experiences and public research — it isn't medical advice. Please talk to your care team about your health.
      </p>
    </PageContainer>
  );
}
