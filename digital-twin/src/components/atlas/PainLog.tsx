import type { PainEntryDTO } from '../../types';
import { formatSide, formatSince, formatTypes, severityBand } from './painFormat';

interface PainLogProps {
  entries: PainEntryDTO[];
  loading: boolean;
  loadError: string | null;
  activeId: string | null;
  onSelect: (id: string) => void;
}

function EntryRow({ entry, active, onSelect }: { entry: PainEntryDTO; active: boolean; onSelect: (id: string) => void }) {
  const resolved = entry.status === 'resolved';
  const band = severityBand(entry.severity, resolved);
  const side = formatSide(entry.location.side);
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(entry._id)}
        aria-current={active}
        className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
          active ? 'border-hud-cyan bg-hud-cyan/5' : 'border-hud-border hover:bg-hud-panel2'
        }`}
      >
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: band.color }}
          aria-label={`Severity ${entry.severity} out of 10`}
        >
          {entry.severity}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-hud-text">
            {entry.location.partName}
            {side && <span className="font-normal text-hud-muted"> · {side}</span>}
          </span>
          <span className="block truncate text-xs text-hud-text">{formatTypes(entry.painTypes)}</span>
          <span className="block text-[11px] text-hud-muted">
            {resolved ? 'Resolved · ' : ''}Started {formatSince(entry.onset)}
          </span>
        </span>
      </button>
    </li>
  );
}

export function PainLog({ entries, loading, loadError, activeId, onSelect }: PainLogProps) {
  const active = entries.filter((e) => e.status === 'active');
  const resolved = entries.filter((e) => e.status === 'resolved');

  if (loading) return <p className="text-sm text-hud-muted">Loading your pain log…</p>;
  if (loadError) {
    return (
      <p role="alert" className="rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">
        {loadError}
      </p>
    );
  }
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-hud-borderLight p-4 text-center">
        <p className="text-sm font-semibold text-hud-text">No pain logged yet</p>
        <p className="mt-1 text-xs text-hud-muted">
          Tap “Report pain”, then tap the spot on the body where it hurts. Each entry appears here and as a marker on
          the model.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {active.length > 0 && (
        <section>
          <h3 className="hud-panel-title mb-2">Current ({active.length})</h3>
          <ul className="flex flex-col gap-1.5">
            {active.map((e) => (
              <EntryRow key={e._id} entry={e} active={e._id === activeId} onSelect={onSelect} />
            ))}
          </ul>
        </section>
      )}
      {resolved.length > 0 && (
        <section>
          <h3 className="hud-panel-title mb-2">Resolved ({resolved.length})</h3>
          <ul className="flex flex-col gap-1.5">
            {resolved.map((e) => (
              <EntryRow key={e._id} entry={e} active={e._id === activeId} onSelect={onSelect} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
