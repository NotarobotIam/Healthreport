import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchMatches } from '../data/remote/communityApi';
import { fetchFriends } from '../data/remote/friendsApi';
import { CommunityNav } from '../components/community/CommunityNav';
import { FriendButton } from '../components/community/FriendButton';
import { usePainEntries } from '../hooks/usePainEntries';
import { ThreadCard } from '../components/community/ThreadCard';
import { PageContainer } from '../components/dashboardUi';
import { formatSide, formatTypes } from '../components/atlas/painFormat';
import { PAIN_PATTERNS, type FriendStatus, type MatchDTO, type MatchesResponse } from '../types';

const BAND_LABEL: Record<MatchDTO['band'], { label: string; tone: string }> = {
  'very-similar': { label: 'Very similar', tone: 'bg-hud-green/15 text-hud-green' },
  similar: { label: 'Similar', tone: 'bg-hud-cyan/15 text-hud-cyan' },
  'somewhat-similar': { label: 'Somewhat similar', tone: 'bg-hud-panel2 text-hud-muted ring-1 ring-hud-border' },
};

function MatchCard({ match, friendStatus }: { match: MatchDTO; friendStatus: FriendStatus }) {
  const band = BAND_LABEL[match.band];
  const pattern = PAIN_PATTERNS.find((p) => p.value === match.entry.pattern)?.label;
  const side = formatSide(match.entry.region.side);
  return (
    <li className="rounded-lg border border-hud-border bg-hud-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to={`/community/u/${match.handle}`} className="font-semibold text-hud-text hover:underline">
          {match.handle}
        </Link>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${band.tone}`}>{band.label}</span>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-hud-text">
        <span>
          {match.entry.region.partName}
          {side && <span className="text-hud-muted"> · {side}</span>}
        </span>
        {match.sameStructure && <span className="whitespace-nowrap rounded-full bg-hud-green/10 px-2 py-0.5 text-xs text-hud-green">same structure</span>}
      </p>
      <p className="mt-1 text-sm text-hud-text">
        {formatTypes(match.entry.painTypes)}
        {match.commonTypes.length > 0 && <span className="text-hud-muted"> · you both have: {match.commonTypes.join(', ')}</span>}
      </p>
      <p className="mt-1 text-xs text-hud-muted">
        Severity {match.entry.severity}/10 · {pattern?.toLowerCase()} · for {match.entry.duration}
      </p>
      <div className="mt-3 border-t border-hud-border pt-3">
        <FriendButton handle={match.handle} status={friendStatus} />
      </div>
    </li>
  );
}

export function MatchesPage() {
  const [params, setParams] = useSearchParams();
  const { entries, loading: entriesLoading, update } = usePainEntries();
  const active = entries.filter((e) => e.status === 'active');
  const requested = params.get('entry');
  const entry = entries.find((e) => e._id === requested) ?? active[0] ?? entries[0];

  const [result, setResult] = useState<MatchesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [friendStatuses, setFriendStatuses] = useState<Map<string, FriendStatus>>(new Map());

  useEffect(() => {
    fetchFriends()
      .then((f) => {
        const m = new Map<string, FriendStatus>();
        f.friends.forEach((x) => m.set(x.handle, 'friends'));
        f.outgoing.forEach((x) => m.set(x.handle, 'requested'));
        f.incoming.forEach((x) => m.set(x.handle, 'incoming'));
        setFriendStatuses(m);
      })
      .catch(() => undefined);
  }, []);

  const entryId = entry?._id;
  const visibility = entry?.visibility;
  useEffect(() => {
    if (!entryId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMatches(entryId)
      .then((res) => !cancelled && setResult(res))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : 'Could not look for matches.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [entryId, visibility]);

  const share = async () => {
    if (!entry) return;
    setSharing(true);
    try {
      await update(entry._id, { visibility: 'community' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update sharing.');
    } finally {
      setSharing(false);
    }
  };

  if (entriesLoading) return <PageContainer><p className="py-10 text-center text-sm text-hud-muted">Loading…</p></PageContainer>;

  if (!entry) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-lg rounded-lg border border-dashed border-hud-borderLight p-8 text-center">
          <h1 className="text-lg font-semibold text-hud-text">People like me</h1>
          <p className="mt-2 text-sm text-hud-muted">
            To find people with similar pain, first log where it hurts on the 3D body. It only takes a minute.
          </p>
          <Link to="/anatomy" className="mt-4 inline-block rounded-md bg-[#007bff] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0056b3]">
            Go to the body map
          </Link>
        </div>
      </PageContainer>
    );
  }

  const shared = entry.visibility === 'community';

  return (
    <PageContainer>
      <CommunityNav />
      <div className="mx-auto mt-3 max-w-3xl">
        <h1 className="text-2xl font-semibold text-hud-text">People like me</h1>
        <p className="mt-1 text-sm text-hud-muted">
          Members who chose to share a similar pain entry — matched by where it is, what it feels like, and how it behaves.
        </p>

        <div className="mt-4 rounded-lg bg-hud-panel p-4 shadow-sm">
          <label htmlFor="entry" className="mb-1 block text-sm font-semibold text-hud-text">Match on this pain entry</label>
          <select
            id="entry"
            value={entry._id}
            onChange={(e) => setParams({ entry: e.target.value }, { replace: true })}
            className="w-full rounded-md border border-hud-borderLight bg-hud-panel px-3 py-2 text-sm"
          >
            {entries.map((e) => (
              <option key={e._id} value={e._id}>
                {e.location.partName} · {formatTypes(e.painTypes)} · {e.severity}/10{e.status === 'resolved' ? ' (resolved)' : ''}
              </option>
            ))}
          </select>

          {shared ? (
            <p className="mt-3 text-xs text-hud-muted">
              ✓ This entry is <strong>shared anonymously</strong>, so others with similar pain can find you too. Members see your username, the area, type of pain,
              severity and roughly how long — never your notes, exact date, name or email. You can stop sharing any time from the entry on the body map.
            </p>
          ) : (
            <div className="mt-3 rounded-md border border-hud-amber/50 bg-hud-amber/10 p-3">
              <p className="text-sm text-hud-text">
                This entry is <strong>private</strong>. You can see who matches, but they can't see you.
              </p>
              <p className="mt-1 text-xs text-hud-muted">
                If you share it, other members with similar pain can find you by your username. They'll see the area, type of pain, severity and roughly how
                long — never your notes, exact date, name or email.
              </p>
              <button type="button" onClick={share} disabled={sharing} className="mt-2 rounded-md bg-[#007bff] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#0056b3] disabled:opacity-60">
                {sharing ? 'Sharing…' : 'Share this entry anonymously'}
              </button>
            </div>
          )}
        </div>

        {error && <p role="alert" className="mt-4 rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">{error}</p>}

        <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wider text-hud-muted">Members with similar pain</h2>
        {loading || !result ? (
          <p className="py-6 text-center text-sm text-hud-muted">Looking for matches…</p>
        ) : result.matches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-hud-borderLight p-6 text-center">
            <p className="font-semibold text-hud-text">No matches yet</p>
            <p className="mt-1 text-sm text-hud-muted">
              Nobody has shared a similar entry so far. As more members join and share, matches will appear here. In the meantime, you can start a discussion.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {result.matches.map((m) => (
              <MatchCard key={m.handle} match={m} friendStatus={friendStatuses.get(m.handle) ?? 'none'} />
            ))}
          </ul>
        )}

        <div className="mb-2 mt-8 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-hud-muted">Related discussions</h2>
          <Link
            to={`/community/new?${new URLSearchParams({ partId: entry.location.partId, partName: entry.location.partName, system: entry.location.system, side: entry.location.side })}`}
            className="text-sm font-medium text-hud-cyan hover:underline"
          >
            Start one about this
          </Link>
        </div>
        {result && result.relatedThreads.length === 0 ? (
          <p className="text-sm text-hud-muted">No discussions about this area yet.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {result?.relatedThreads.map((t) => (
              <ThreadCard key={t.id} thread={t} />
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
