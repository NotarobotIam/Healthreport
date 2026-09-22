import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchGroup, joinGroup, leaveGroup } from '../data/remote/groupsApi';
import { fetchThreads } from '../data/remote/communityApi';
import { fetchResearch } from '../data/remote/researchApi';
import { ThreadCard } from '../components/community/ThreadCard';
import { ResearchList } from '../components/community/ResearchList';
import { CommunityNav } from '../components/community/CommunityNav';
import { PageContainer } from '../components/dashboardUi';
import type { GroupDTO, ResearchResponse, ThreadDTO } from '../types';

export function GroupPage() {
  const { slug = '' } = useParams();
  const [group, setGroup] = useState<GroupDTO | null>(null);
  const [threads, setThreads] = useState<ThreadDTO[]>([]);
  const [research, setResearch] = useState<ResearchResponse | null>(null);
  const [tests, setTests] = useState<ResearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedsLoading, setFeedsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setGroup(null);
    setError(null);
    setFeedsLoading(true);
    fetchGroup(slug)
      .then((res) => !cancelled && setGroup(res.group))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : 'Could not load this community.'));
    fetchThreads({ group: slug, sort: 'active' })
      .then((res) => !cancelled && setThreads(res.threads))
      .catch(() => !cancelled && setThreads([]));
    Promise.all([fetchResearch('research', { group: slug, limit: 4 }), fetchResearch('tests', { group: slug, limit: 4 })])
      .then(([r, t]) => {
        if (cancelled) return;
        setResearch(r);
        setTests(t);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setFeedsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const toggle = async () => {
    if (!group) return;
    setBusy(true);
    setError(null);
    try {
      if (group.joined) await leaveGroup(group.slug);
      else await joinGroup(group.slug);
      setGroup({ ...group, joined: !group.joined });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update.');
    } finally {
      setBusy(false);
    }
  };

  if (error && !group) {
    return (
      <PageContainer>
        <p role="alert" className="rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">{error}</p>
        <Link to="/community/groups" className="mt-3 inline-block text-sm text-hud-cyan hover:underline">← All communities</Link>
      </PageContainer>
    );
  }
  if (!group) return <PageContainer><p className="py-10 text-center text-sm text-hud-muted">Loading…</p></PageContainer>;

  return (
    <PageContainer>
      <CommunityNav />
      <Link to="/community/groups" className="text-sm text-hud-cyan hover:underline">← All communities</Link>

      <header className="mb-6 mt-3 rounded-2xl bg-gradient-to-br from-[#eaf4fe] to-[#f1ecfb] p-6 dark:from-[#16233a] dark:to-[#241f38]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-xl">
            <h1 className="text-2xl font-semibold text-hud-text">{group.name}</h1>
            <p className="mt-1 text-sm text-hud-text/80">{group.blurb}</p>
            <p className="mt-2 text-xs text-hud-muted">
              {group.members !== null ? `${group.members} members` : 'A growing community'} · {group.threadCount} {group.threadCount === 1 ? 'discussion' : 'discussions'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={toggle}
              disabled={busy}
              aria-pressed={group.joined}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                group.joined ? 'bg-hud-panel text-hud-green ring-1 ring-hud-green/40 hover:bg-hud-green/5' : 'bg-[#007bff] text-white hover:bg-[#0056b3]'
              }`}
            >
              {group.joined ? '✓ Joined' : 'Join this community'}
            </button>
            {group.joined && <span className="text-xs text-hud-muted">Only you can see that you've joined.</span>}
          </div>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-hud-red">{error}</p>}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-label="Discussions">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-hud-text">Discussions</h2>
            {group.joined ? (
              <Link to={`/community/new?group=${group.slug}`} className="rounded-md bg-[#007bff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0056b3]">
                ＋ Start a discussion
              </Link>
            ) : (
              <span className="text-xs text-hud-muted">Join to start a discussion</span>
            )}
          </div>
          {threads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-hud-borderLight p-8 text-center">
              <p className="font-semibold text-hud-text">It's quiet here — for now</p>
              <p className="mt-1 text-sm text-hud-muted">Be the first to say hello. Someone else is probably wondering the same thing.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {threads.map((t) => (
                <ThreadCard key={t.id} thread={t} />
              ))}
            </ul>
          )}
        </section>

        <aside className="flex flex-col gap-5" aria-label="Research">
          <section className="rounded-xl bg-hud-panel p-4 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-hud-text">🔬 New research</h2>
            <ResearchList kind="research" data={research} loading={feedsLoading} showCommunity={false} />
          </section>
          <section className="rounded-xl bg-hud-panel p-4 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-hud-text">🧪 New tests & screening</h2>
            <ResearchList kind="tests" data={tests} loading={feedsLoading} showCommunity={false} />
          </section>
        </aside>
      </div>
    </PageContainer>
  );
}
