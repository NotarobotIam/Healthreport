import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SYSTEMS } from '../atlas/anatomy';
import { fetchThreads } from '../data/remote/communityApi';
import { fetchGroups } from '../data/remote/groupsApi';
import { CommunityNav } from '../components/community/CommunityNav';
import { ThreadCard } from '../components/community/ThreadCard';
import { PageContainer } from '../components/dashboardUi';
import { PAIN_TYPES, type CategoryDTO, type PainType, type ThreadDTO } from '../types';

export function CommunityPage() {
  const [params, setParams] = useSearchParams();
  const system = params.get('system') ?? '';
  const partId = params.get('partId') ?? '';
  const partName = params.get('partName') ?? '';
  const type = (params.get('type') ?? '') as PainType | '';
  const sort = params.get('sort') === 'active' ? 'active' : 'recent';
  const q = params.get('q') ?? '';
  const group = params.get('group') ?? '';
  const mine = params.get('mine') === '1';

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [search, setSearch] = useState(q);
  const [threads, setThreads] = useState<ThreadDTO[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key === 'partId' && !value) next.delete('partName');
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  useEffect(() => {
    fetchGroups().then((res) => setCategories(res.categories)).catch(() => setCategories([]));
  }, []);

  // Reload from page 1 whenever a filter changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchThreads({ system: system || undefined, partId: partId || undefined, type: type || undefined, group: group || undefined, mine: mine ? '1' : undefined, q: q || undefined, sort })
      .then((res) => {
        if (cancelled) return;
        setThreads(res.threads);
        setPage(1);
        setHasMore(res.hasMore);
        setTotal(res.total);
      })
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : 'Could not load discussions.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [system, partId, type, sort, q, group, mine]);

  const loadMore = async () => {
    try {
      const res = await fetchThreads({ system: system || undefined, partId: partId || undefined, type: type || undefined, group: group || undefined, mine: mine ? '1' : undefined, q: q || undefined, sort, page: page + 1 });
      setThreads((prev) => [...prev, ...res.threads]);
      setPage(page + 1);
      setHasMore(res.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load more.');
    }
  };

  const newThreadParams = new URLSearchParams({ ...(partId && { partId }), ...(partName && { partName }), ...(system && { system }), ...(group && { group }) });
  const newThreadLink = `/community/new${newThreadParams.size ? `?${newThreadParams}` : ''}`;

  return (
    <PageContainer>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-hud-text">Community</h1>
          <p className="text-sm text-hud-muted">Talk with people who know what you're dealing with. You appear only by your username.</p>
        </div>
        <div className="flex gap-2">
          <Link to={newThreadLink} className="rounded-md bg-[#007bff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0056b3]">
            ＋ New discussion
          </Link>
        </div>
      </div>

      <CommunityNav />

      <div className="mb-4 flex flex-col gap-3 rounded-lg bg-hud-panel p-4 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParam('q', search.trim());
          }}
          className="flex gap-2"
        >
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search discussions…"
            aria-label="Search discussions"
            maxLength={100}
            className="min-w-0 flex-1 rounded-md border border-hud-borderLight px-3 py-2 text-sm focus:border-hud-cyan focus:outline-none"
          />
          <button type="submit" className="rounded-md border border-hud-borderLight px-4 text-sm font-medium hover:bg-hud-panel2">
            Search
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Body area"
            value={system}
            onChange={(e) => setParam('system', e.target.value)}
            className="rounded-md border border-hud-borderLight bg-hud-panel px-2 py-1.5 text-sm"
          >
            <option value="">Any body area</option>
            {SYSTEMS.filter((s) => s.id !== 'integumentary').map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Community"
            value={group}
            onChange={(e) => setParam('group', e.target.value)}
            className="rounded-md border border-hud-borderLight bg-hud-panel px-2 py-1.5 text-sm"
          >
            <option value="">Any community</option>
            {categories.map((c) => (
              <optgroup key={c.slug} label={c.name}>
                {c.groups.map((g) => (
                  <option key={g.slug} value={g.slug}>
                    {g.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            type="button"
            aria-pressed={mine}
            onClick={() => setParam('mine', mine ? '' : '1')}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${mine ? 'border-hud-cyan bg-hud-cyan/10 text-hud-cyan' : 'border-hud-borderLight text-hud-text hover:bg-hud-panel2'}`}
          >
            My communities
          </button>
          <select
            aria-label="Type of pain"
            value={type}
            onChange={(e) => setParam('type', e.target.value)}
            className="rounded-md border border-hud-borderLight bg-hud-panel px-2 py-1.5 text-sm"
          >
            <option value="">Any type of pain</option>
            {PAIN_TYPES.map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort"
            value={sort}
            onChange={(e) => setParam('sort', e.target.value === 'active' ? 'active' : '')}
            className="rounded-md border border-hud-borderLight bg-hud-panel px-2 py-1.5 text-sm"
          >
            <option value="recent">Newest first</option>
            <option value="active">Recently active</option>
          </select>
          {partId && (
            <button type="button" onClick={() => setParam('partId', '')} className="rounded-full bg-hud-cyan/10 px-3 py-1 text-xs font-medium text-hud-cyan">
              {partName || 'This body part'} ✕
            </button>
          )}
          {(system || partId || type || q || group || mine) && (
            <button type="button" onClick={() => { setSearch(''); setParams({}, { replace: true }); }} className="text-xs font-medium text-hud-muted underline">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">
          {error}
        </p>
      )}
      {loading ? (
        <p className="py-10 text-center text-sm text-hud-muted">Loading discussions…</p>
      ) : threads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-hud-borderLight p-8 text-center">
          <p className="font-semibold text-hud-text">No discussions here yet</p>
          <p className="mt-1 text-sm text-hud-muted">Be the first to start one — someone else is probably wondering the same thing.</p>
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-hud-muted">
            {total} {total === 1 ? 'discussion' : 'discussions'}
          </p>
          <ul className="flex flex-col gap-2.5">
            {threads.map((t) => (
              <ThreadCard key={t.id} thread={t} />
            ))}
          </ul>
          {hasMore && (
            <button type="button" onClick={loadMore} className="mx-auto mt-4 block rounded-md border border-hud-borderLight bg-hud-panel px-5 py-2 text-sm font-medium hover:bg-hud-panel2">
              Load more
            </button>
          )}
        </>
      )}
      <p className="mt-8 text-center text-xs text-hud-muted">
        Members share experiences, not medical advice.{' '}
        <Link to="/guidelines" className="underline">
          Community guidelines
        </Link>
      </p>
    </PageContainer>
  );
}
