import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchFriendActivity, fetchFriends } from '../data/remote/friendsApi';
import { CommunityNav } from '../components/community/CommunityNav';
import { FriendButton } from '../components/community/FriendButton';
import { ActivityFeed } from '../components/community/ActivityFeed';
import { PageContainer } from '../components/dashboardUi';
import { timeAgo } from '../components/community/format';
import type { ActivityResponse, FriendEntry, FriendsResponse, FriendStatus } from '../types';

function Row({ entry, status }: { entry: FriendEntry; status: FriendStatus }) {
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-hud-panel px-4 py-3 shadow-sm">
      <div>
        <Link to={`/community/u/${entry.handle}`} className="text-sm font-semibold text-hud-text hover:underline">
          {entry.handle}
        </Link>
        <span className="ml-2 text-xs text-hud-muted">{status === 'friends' ? `friends since ${timeAgo(entry.at)}` : timeAgo(entry.at)}</span>
      </div>
      <FriendButton handle={entry.handle} status={status} onChange={(s) => s === 'none' && setGone(true)} />
    </li>
  );
}

export function FriendsPage() {
  const [data, setData] = useState<FriendsResponse | null>(null);
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchFriends().then(setData).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load your friends.'));
    fetchFriendActivity().then(setActivity).catch(() => setActivity(null));
  }, []);
  useEffect(load, [load]);

  return (
    <PageContainer>
      <div className="mb-1">
        <h1 className="text-2xl font-semibold text-hud-text">Friends</h1>
        <p className="text-sm text-hud-muted">
          People you've connected with. Friends see only what you post publicly — never your pain log, reports, or which communities you've joined.
        </p>
      </div>
      <CommunityNav />
      {error && <p role="alert" className="mb-4 rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">{error}</p>}
      {!data ? (
        <p className="py-10 text-center text-sm text-hud-muted">Loading…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            {data.incoming.length > 0 && (
              <section aria-label="Friend requests">
                <h2 className="mb-2 text-base font-semibold text-hud-text">Waiting for you ({data.incoming.length})</h2>
                <ul className="flex flex-col gap-2">
                  {data.incoming.map((f) => (
                    <Row key={f.handle} entry={f} status="incoming" />
                  ))}
                </ul>
              </section>
            )}
            <section aria-label="Your friends">
              <h2 className="mb-2 text-base font-semibold text-hud-text">Your friends ({data.friends.length})</h2>
              {data.friends.length === 0 ? (
                <div className="rounded-xl border border-dashed border-hud-borderLight p-6 text-center">
                  <p className="font-semibold text-hud-text">No friends yet</p>
                  <p className="mt-1 text-sm text-hud-muted">
                    Find people going through something similar in <Link to="/community/matches" className="text-hud-cyan underline">People like me</Link>, or say hello in a{' '}
                    <Link to="/community/groups" className="text-hud-cyan underline">community</Link>, then tap “Add friend” on their profile.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.friends.map((f) => (
                    <Row key={f.handle} entry={f} status="friends" />
                  ))}
                </ul>
              )}
            </section>
            {data.outgoing.length > 0 && (
              <section aria-label="Requests you sent">
                <h2 className="mb-2 text-base font-semibold text-hud-text">Requests you sent</h2>
                <ul className="flex flex-col gap-2">
                  {data.outgoing.map((f) => (
                    <Row key={f.handle} entry={f} status="requested" />
                  ))}
                </ul>
              </section>
            )}
          </div>

          <section aria-label="Friend activity">
            <h2 className="mb-2 text-base font-semibold text-hud-text">What your friends are up to</h2>
            <div className="rounded-xl bg-hud-panel p-4 shadow-sm">
              <ActivityFeed data={activity} />
            </div>
          </section>
        </div>
      )}
    </PageContainer>
  );
}
