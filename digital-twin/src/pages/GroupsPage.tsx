import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchGroups, joinGroup, leaveGroup } from '../data/remote/groupsApi';
import { CommunityNav } from '../components/community/CommunityNav';
import { PageContainer } from '../components/dashboardUi';
import type { CategoryDTO, GroupDTO } from '../types';

function GroupCard({ group, onToggle, busy }: { group: GroupDTO; onToggle: (g: GroupDTO) => void; busy: boolean }) {
  return (
    <li className="flex flex-col rounded-xl border border-hud-border bg-hud-panel p-4 transition-shadow hover:shadow-md">
      <Link to={`/community/g/${group.slug}`} className="text-base font-semibold text-hud-text hover:text-hud-cyan">
        {group.name}
      </Link>
      <p className="mt-1 flex-1 text-sm leading-snug text-hud-muted">{group.blurb}</p>
      <p className="mt-3 text-xs text-hud-muted">
        {group.members !== null ? `${group.members} members` : 'Growing community'} · {group.threadCount} {group.threadCount === 1 ? 'discussion' : 'discussions'}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onToggle(group)}
          aria-pressed={group.joined}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
            group.joined ? 'bg-hud-green/10 text-hud-green hover:bg-hud-green/20' : 'bg-[#007bff] text-white hover:bg-[#0056b3]'
          }`}
        >
          {group.joined ? '✓ Joined' : 'Join'}
        </button>
        <Link to={`/community/g/${group.slug}`} className="text-xs font-medium text-hud-cyan hover:underline">
          Visit
        </Link>
      </div>
    </li>
  );
}

export function GroupsPage() {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [max, setMax] = useState(20);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups()
      .then((res) => {
        setCategories(res.categories);
        setMax(res.maxJoined);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load communities.'))
      .finally(() => setLoading(false));
  }, []);

  const joinedCount = categories.reduce((n, c) => n + c.groups.filter((g) => g.joined).length, 0);

  const toggle = async (group: GroupDTO) => {
    setBusy(group.slug);
    setError(null);
    try {
      if (group.joined) await leaveGroup(group.slug);
      else await joinGroup(group.slug);
      setCategories((prev) => prev.map((c) => ({ ...c, groups: c.groups.map((g) => (g.slug === group.slug ? { ...g, joined: !g.joined } : g)) })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your communities.');
    } finally {
      setBusy(null);
    }
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((c) => ({ ...c, groups: c.groups.filter((g) => g.name.toLowerCase().includes(q) || g.blurb.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)) }))
      .filter((c) => c.groups.length > 0);
  }, [categories, query]);

  return (
    <PageContainer>
      <div className="mb-1">
        <h1 className="text-2xl font-semibold text-hud-text">Find your community</h1>
        <p className="text-sm text-hud-muted">
          Join the communities that match your health. <strong>Nobody can see which ones you've joined</strong> — only you.
        </p>
      </div>
      <CommunityNav />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search — e.g. IBS, breast, diabetes…"
          aria-label="Search communities"
          className="min-w-0 flex-1 rounded-lg border border-hud-borderLight bg-hud-panel px-4 py-2.5 text-sm focus:border-hud-cyan focus:outline-none"
        />
        <span className="text-sm text-hud-muted">
          You've joined <strong className="text-hud-text">{joinedCount}</strong> of {max}
        </span>
      </div>

      {error && <p role="alert" className="mb-4 rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">{error}</p>}
      {loading ? (
        <p className="py-10 text-center text-sm text-hud-muted">Loading communities…</p>
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-hud-muted">No communities match “{query}”. Try another word, or start a discussion on the general board.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {shown.map((cat) => (
            <section key={cat.slug} aria-labelledby={`cat-${cat.slug}`}>
              <h2 id={`cat-${cat.slug}`} className="text-lg font-semibold text-hud-text">{cat.name}</h2>
              <p className="mb-3 text-sm text-hud-muted">{cat.blurb}</p>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cat.groups.map((g) => (
                  <GroupCard key={g.slug} group={g} onToggle={toggle} busy={busy === g.slug} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <p className="mt-10 text-center text-xs text-hud-muted">
        Don't see yours? Post on the general board and tell us what you'd like to see here.
      </p>
    </PageContainer>
  );
}
