import { lazy, Suspense, useRef, useState, type FormEvent } from 'react';
import { fetchNearbyPlaces, geocodePlace } from '../../data/remote/placesApi';
import type { GeocodeCandidate, NearbyResponse, PlaceType } from '../../types/places';

const HospitalMap = lazy(() => import('./HospitalMap'));

const RADII = [5, 10, 25];
const TYPES: [PlaceType, string][] = [
  ['hospital', 'Hospitals'],
  ['clinic', 'Urgent care & clinics'],
];
const miles = (km: number) => Math.round(km * 0.621371 * 10) / 10;

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${active ? 'border-hud-cyan bg-hud-cyan text-white' : 'border-hud-border bg-hud-bg text-hud-text hover:border-hud-cyan'}`;

/**
 * Finds hospitals near the member. Their position is rounded to about 1 km in the browser, used for this
 * search only, and is never saved: not on the server, and not in this browser either.
 */
export function HospitalFinder() {
  const [type, setType] = useState<PlaceType>('hospital');
  const [radiusKm, setRadiusKm] = useState(10);
  const [query, setQuery] = useState('');
  const [origin, setOrigin] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [choices, setChoices] = useState<GeocodeCandidate[]>([]);
  const [data, setData] = useState<NearbyResponse | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // what we are doing right now, for the status line
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0); // only the latest request may update the screen
  const listRef = useRef<HTMLOListElement>(null);

  const search = async (o: { lat: number; lon: number; label: string }, t: PlaceType, r: number) => {
    const mine = ++request.current;
    setOrigin(o);
    setChoices([]);
    setError(null);
    setSelected(null);
    setBusy('Looking for places nearby…');
    try {
      const res = await fetchNearbyPlaces(o.lat, o.lon, r, t);
      if (mine !== request.current) return;
      setData(res);
    } catch (err) {
      if (mine !== request.current) return;
      setData(null);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      if (mine === request.current) setBusy(null);
    }
  };

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setError('Your browser cannot share its location. Type a city or postcode instead.');
      return;
    }
    const mine = ++request.current;
    setError(null);
    setBusy('Waiting for your location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (mine !== request.current) return;
        void search({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: 'your current area' }, type, radiusKm);
      },
      (err) => {
        if (mine !== request.current) return;
        setBusy(null);
        setError(err.code === err.PERMISSION_DENIED ? 'No problem: we have not been given your location. Type a city or postcode instead.' : 'We could not work out where you are. Type a city or postcode instead.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setError('Type a city, town or postcode.');
      return;
    }
    const mine = ++request.current;
    setError(null);
    setBusy('Finding that place…');
    try {
      const { results } = await geocodePlace(q);
      if (mine !== request.current) return;
      if (results.length === 0) {
        setBusy(null);
        setError('We could not find that place. Try a nearby city or a postcode.');
      } else if (results.length === 1) {
        void search({ lat: results[0].lat, lon: results[0].lon, label: results[0].label }, type, radiusKm);
      } else {
        setBusy(null);
        setChoices(results);
      }
    } catch (err) {
      if (mine !== request.current) return;
      setBusy(null);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  const change = (t: PlaceType, r: number) => {
    setType(t);
    setRadiusKm(r);
    if (origin) void search(origin, t, r);
  };

  const pick = (i: number) => {
    setSelected(i);
    listRef.current?.querySelectorAll('li')[i]?.scrollIntoView({ block: 'nearest' });
  };

  return (
    <div>
      <p role="note" className="mb-4 rounded-lg border border-hud-red/40 bg-hud-red/10 px-3 py-2 text-sm text-hud-text">
        <strong>In an emergency, don't search here. Call your local emergency number</strong> (911 in the US and Canada, 999 in the UK, 112 in most of Europe).
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={useMyLocation} className="rounded-full bg-hud-cyan px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hud-cyan">
          📍 Use my location
        </button>
        <span className="hidden text-sm text-hud-muted sm:inline">or</span>
        <form onSubmit={submit} className="flex min-w-0 basis-full gap-2 sm:basis-0 sm:flex-1" role="search" aria-label="Search by place">
          <label htmlFor="hospital-place" className="sr-only">City, town or postcode</label>
          <input
            id="hospital-place"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
            placeholder="City, town or postcode"
            className="min-w-0 flex-1 rounded-lg border border-hud-border bg-hud-bg px-3 py-2 text-sm text-hud-text placeholder:text-hud-muted focus:border-hud-cyan focus:outline-none"
          />
          <button type="submit" className="rounded-lg border border-hud-border bg-hud-bg px-3 py-2 text-sm font-medium text-hud-text hover:border-hud-cyan">Search</button>
        </form>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="What to look for">
          {TYPES.map(([t, label]) => (
            <button key={t} type="button" aria-pressed={type === t} onClick={() => change(t, radiusKm)} className={chip(type === t)}>{label}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="How far to look">
          {RADII.map((r) => (
            <button key={r} type="button" aria-pressed={radiusKm === r} onClick={() => change(type, r)} className={chip(radiusKm === r)}>{r} km</button>
          ))}
        </div>
      </div>

      <p className="mb-3 text-xs text-hud-muted">🔒 Your location is rounded to about 1&nbsp;km, used for this search only, and never saved.</p>

      <div aria-live="polite" className="min-h-[1.25rem]">
        {busy && <p className="text-sm text-hud-muted">{busy}</p>}
        {error && <p role="alert" className="rounded-lg bg-hud-amber/10 px-3 py-2 text-sm text-hud-text">{error}</p>}
      </div>

      {choices.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-sm text-hud-text">Which one did you mean?</p>
          <ul className="flex flex-col gap-1.5">
            {choices.map((c) => (
              <li key={`${c.lat},${c.lon},${c.label}`}>
                <button type="button" onClick={() => void search(c, type, radiusKm)} className="w-full rounded-lg border border-hud-border bg-hud-bg px-3 py-2 text-left text-sm text-hud-text hover:border-hud-cyan">{c.label}</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data && origin && (
        <div>
          {data.stale && <p role="status" className="mb-3 rounded-lg bg-hud-amber/10 px-3 py-2 text-sm text-hud-text">The map service is busy, so this may be a little out of date.</p>}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Suspense fallback={<div className="flex h-72 items-center justify-center rounded-xl bg-hud-bg text-sm text-hud-muted sm:h-80">Loading map…</div>}>
              <HospitalMap center={data.center} radiusKm={data.radiusKm} places={data.results} selected={selected} onSelect={pick} />
            </Suspense>

            <div className="min-w-0">
              <p className="mb-2 text-sm text-hud-text">
                {data.results.length === 0
                  ? `No ${type === 'hospital' ? 'hospitals' : 'clinics'} found within ${data.radiusKm} km of ${origin.label === 'your current area' ? 'you' : origin.label.split(',')[0]}. Try a wider distance.`
                  : `${data.results.length} found within ${data.radiusKm} km, nearest first`}
              </p>
              <ol ref={listRef} className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
                {data.results.map((p, i) => (
                  <li key={`${p.id ?? p.name}-${i}`}>
                    <div
                      className={`rounded-lg border p-3 text-sm ${selected === i ? 'border-hud-cyan bg-hud-cyan/10' : 'border-hud-border bg-hud-bg'}`}
                    >
                      <button type="button" onClick={() => pick(i)} aria-pressed={selected === i} className="block w-full text-left">
                        <span className="flex items-start gap-2">
                          <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-hud-cyan text-xs font-semibold text-white">{i + 1}</span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-hud-text">{p.name}</span>
                            <span className="block text-xs text-hud-muted">
                              {p.distanceKm} km ({miles(p.distanceKm)} mi){p.emergency ? ' · has an emergency department' : ''}
                            </span>
                          </span>
                        </span>
                      </button>
                      {p.address && <p className="mt-1.5 text-hud-text">{p.address}</p>}
                      {p.openingHours && <p className="text-xs text-hud-muted">Hours listed: {p.openingHours}</p>}
                      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium">
                        {p.phone && <a href={`tel:${p.phone.replace(/[^0-9+]/g, '')}`} className="text-hud-cyan hover:underline">📞 {p.phone}</a>}
                        {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-hud-cyan hover:underline">Website ↗</a>}
                        <a href={p.id ? `https://www.openstreetmap.org/${p.id}` : `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=17/${p.lat}/${p.lon}`} target="_blank" rel="noopener noreferrer" className="text-hud-cyan hover:underline">Map &amp; directions ↗</a>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <p className="mt-3 text-xs text-hud-muted">
            Map data is community-maintained and may be incomplete or out of date, and departments and opening hours change. Please call ahead. Being listed here is not a recommendation.
            {' '}Map data © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>.
          </p>
        </div>
      )}
    </div>
  );
}
