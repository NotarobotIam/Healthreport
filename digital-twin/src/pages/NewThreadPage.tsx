import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { SYSTEMS } from '../atlas/anatomy';
import { createThread } from '../data/remote/communityApi';
import { fetchGroups, joinGroup } from '../data/remote/groupsApi';
import { usePainEntries } from '../hooks/usePainEntries';
import { CrisisBanner } from '../components/community/CrisisBanner';
import { PageContainer } from '../components/dashboardUi';
import { formatSide } from '../components/atlas/painFormat';
import { looksLikeCrisis } from '../utils/crisis';
import { PAIN_TYPES, type GroupDTO, type PainSide, type PainType, type ThreadRegion } from '../types';

const NONE = 'none';

export function NewThreadPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { entries } = usePainEntries();

  const initialRegion: ThreadRegion | null = useMemo(() => {
    const partId = params.get('partId');
    const system = params.get('system');
    if (!partId && !system) return null;
    return {
      ...(partId && { partId }),
      ...(params.get('partName') && { partName: params.get('partName')! }),
      ...(system && { system }),
      ...(params.get('side') && { side: params.get('side') as PainSide }),
    };
  }, [params]);

  const requestedGroup = params.get('group') ?? '';
  const [allGroups, setAllGroups] = useState<GroupDTO[]>([]);
  const [groupSlug, setGroupSlug] = useState(requestedGroup);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [types, setTypes] = useState<PainType[]>([]);
  const [region, setRegion] = useState<ThreadRegion | null>(initialRegion);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups().then((res) => setAllGroups(res.categories.flatMap((c) => c.groups))).catch(() => setAllGroups([]));
  }, []);
  const joinedGroups = allGroups.filter((g) => g.joined);
  const chosen = allGroups.find((g) => g.slug === groupSlug);
  const needsJoin = Boolean(chosen && !chosen.joined);

  const joinChosen = async () => {
    if (!chosen) return;
    try {
      await joinGroup(chosen.slug);
      setAllGroups((prev) => prev.map((g) => (g.slug === chosen.slug ? { ...g, joined: true } : g)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join.');
    }
  };

  const toggleType = (t: PainType) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : prev.length >= 5 ? prev : [...prev, t]));

  const regionChoice = (value: string) => {
    if (value === NONE) return setRegion(null);
    if (value.startsWith('entry:')) {
      const entry = entries.find((e) => e._id === value.slice(6));
      if (entry) {
        const { partId, partName, system, side } = entry.location;
        setRegion({ partId, partName, system, side });
      }
      return;
    }
    setRegion({ system: value.slice(7) });
  };

  const regionValue = !region
    ? NONE
    : region.partId
      ? (entries.find((e) => e.location.partId === region.partId) ? `entry:${entries.find((e) => e.location.partId === region.partId)!._id}` : 'custom')
      : `system:${region.system}`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await createThread({ title: title.trim(), body: body.trim(), painTypes: types, ...(region && { region }), ...(groupSlug && { group: groupSlug }) });
      navigate(`/community/thread/${res.thread.id}`, { state: { crisis: res.crisis }, replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post your discussion.');
      setBusy(false);
    }
  };

  const showCrisis = looksLikeCrisis(`${title} ${body}`);

  return (
    <PageContainer>
      <Link to="/community" className="text-sm text-hud-cyan hover:underline">← Back to community</Link>
      <form onSubmit={submit} className="mx-auto mt-3 max-w-2xl rounded-lg bg-hud-panel p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-hud-text">Start a discussion</h1>
        <p className="mb-5 mt-1 text-sm text-hud-muted">
          You'll appear as your username. Please don't include names, contact details or links.
        </p>

        <label htmlFor="community" className="mb-1 block text-sm font-semibold text-hud-text">Where to post</label>
        <select
          id="community"
          value={groupSlug}
          onChange={(e) => setGroupSlug(e.target.value)}
          className="mb-1 w-full rounded-md border border-hud-borderLight bg-hud-panel px-3 py-2 text-sm"
        >
          <option value="">General board (no specific community)</option>
          {joinedGroups.length > 0 && (
            <optgroup label="My communities">
              {joinedGroups.map((g) => (
                <option key={g.slug} value={g.slug}>{g.name}</option>
              ))}
            </optgroup>
          )}
          {needsJoin && chosen && <option value={chosen.slug}>{chosen.name} (not joined yet)</option>}
        </select>
        {needsJoin && chosen ? (
          <p className="mb-4 rounded-md bg-hud-amber/10 px-3 py-2 text-xs text-hud-text">
            Join <strong>{chosen.name}</strong> to post in it.{' '}
            <button type="button" onClick={joinChosen} className="font-semibold text-hud-cyan underline">Join now</button>
          </p>
        ) : (
          <p className="mb-4 text-xs text-hud-muted">
            Discussions are visible to all signed-in members.{' '}
            <Link to="/community/groups" className="underline">Browse communities</Link>
          </p>
        )}

        <label htmlFor="title" className="mb-1 block text-sm font-semibold text-hud-text">Title</label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={5}
          maxLength={140}
          placeholder="e.g. Sharp pain in my right shoulder when I lift my arm"
          className="mb-4 w-full rounded-md border border-hud-borderLight px-3 py-2 text-sm focus:border-hud-cyan focus:outline-none"
        />

        <label htmlFor="body" className="mb-1 block text-sm font-semibold text-hud-text">What's going on?</label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          minLength={10}
          maxLength={5000}
          rows={9}
          placeholder="When it started, what it feels like, what makes it better or worse, what you've tried, what you'd like to know…"
          className="mb-1 w-full resize-y rounded-md border border-hud-borderLight px-3 py-2 text-sm focus:border-hud-cyan focus:outline-none"
        />
        <p className="mb-4 text-right text-xs text-hud-muted">{body.length}/5000</p>

        {showCrisis && <div className="mb-4"><CrisisBanner /></div>}

        <label htmlFor="region" className="mb-1 block text-sm font-semibold text-hud-text">Body area <span className="font-normal text-hud-muted">(helps people find you)</span></label>
        <select
          id="region"
          value={regionValue}
          onChange={(e) => regionChoice(e.target.value)}
          className="mb-1 w-full rounded-md border border-hud-borderLight bg-hud-panel px-3 py-2 text-sm"
        >
          <option value={NONE}>No specific area</option>
          {regionValue === 'custom' && region && <option value="custom">{region.partName ?? 'Selected area'}</option>}
          {entries.length > 0 && (
            <optgroup label="Where I've logged pain">
              {entries.map((e) => (
                <option key={e._id} value={`entry:${e._id}`}>
                  {e.location.partName} {formatSide(e.location.side) && `· ${formatSide(e.location.side)}`}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="General area">
            {SYSTEMS.filter((s) => s.id !== 'integumentary').map((s) => (
              <option key={s.id} value={`system:${s.id}`}>{s.name}</option>
            ))}
          </optgroup>
        </select>

        <fieldset className="mb-5 mt-4">
          <legend className="mb-1.5 text-sm font-semibold text-hud-text">Type of pain <span className="font-normal text-hud-muted">(up to 5)</span></legend>
          <div className="flex flex-wrap gap-1.5">
            {PAIN_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={types.includes(t)}
                onClick={() => toggleType(t)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  types.includes(t) ? 'border-hud-cyan bg-hud-cyan/10 text-hud-cyan' : 'border-hud-borderLight text-hud-text hover:bg-hud-panel2'
                }`}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </fieldset>

        {error && <p role="alert" className="mb-3 rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">{error}</p>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy || needsJoin} className="rounded-md bg-[#007bff] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0056b3] disabled:opacity-60">
            {busy ? 'Posting…' : 'Post discussion'}
          </button>
          <Link to="/community" className="text-sm text-hud-muted hover:underline">Cancel</Link>
        </div>
        <p className="mt-4 text-xs text-hud-muted">
          This is a place to share experiences, not medical advice. <Link to="/guidelines" className="underline">Community guidelines</Link>
        </p>
      </form>
    </PageContainer>
  );
}
