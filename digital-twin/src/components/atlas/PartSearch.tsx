import { useMemo, useState } from 'react';
import { SYSTEM_BY_ID, type Atlas } from '../../atlas/anatomy';

interface PartSearchProps {
  atlas: Atlas;
  onSelect: (partId: string) => void;
}

const MAX_RESULTS = 40;

export function PartSearch({ atlas, onSelect }: PartSearchProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    // Names that start with the query first, then the rest alphabetically.
    return atlas.parts
      .filter((p) => p.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        return aStarts - bStarts || a.name.localeCompare(b.name);
      })
      .slice(0, MAX_RESULTS);
  }, [atlas, query]);

  return (
    <div>
      <label htmlFor="part-search" className="hud-panel-title mb-2 block">
        Find a structure
      </label>
      <input
        id="part-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="e.g. femur, liver, biceps"
        className="w-full rounded-md border border-hud-borderLight bg-white px-3 py-2 text-sm text-hud-text placeholder:text-hud-muted focus:border-hud-cyan focus:outline-none"
      />
      {query.trim().length >= 2 && (
        <ul className="mt-2 max-h-64 overflow-y-auto rounded-md border border-hud-border">
          {results.length === 0 && <li className="px-3 py-2 text-xs text-hud-muted">No structures match.</li>}
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-hud-text hover:bg-hud-panel2"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full border border-black/10"
                  style={{ background: SYSTEM_BY_ID.get(p.system)?.color }}
                />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
