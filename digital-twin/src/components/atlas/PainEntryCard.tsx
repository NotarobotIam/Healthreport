import { useState } from 'react';
import { PAIN_PATTERNS, type PainEntryDTO } from '../../types';
import { formatOnset, formatSide, formatSince, formatTypes, severityBand } from './painFormat';

interface PainEntryCardProps {
  entry: PainEntryDTO;
  onBack: () => void;
  onEdit: () => void;
  onToggleResolved: () => Promise<void>;
  onToggleShare: () => Promise<void>;
  onFindMatches: () => void;
  onDelete: () => Promise<void>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="hud-panel-title mb-0.5">{label}</dt>
      <dd className="text-sm text-hud-text">{children}</dd>
    </div>
  );
}

export function PainEntryCard({ entry, onBack, onEdit, onToggleResolved, onToggleShare, onFindMatches, onDelete }: PainEntryCardProps) {
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolved = entry.status === 'resolved';
  const band = severityBand(entry.severity, resolved);
  const side = formatSide(entry.location.side);
  const pattern = PAIN_PATTERNS.find((p) => p.value === entry.pattern);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={onBack} className="self-start text-xs font-medium text-hud-cyan hover:underline">
        ← Back to pain log
      </button>

      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white" style={{ background: band.color }}>
          {entry.severity}
        </span>
        <div className="min-w-0">
          <h2 className="break-words text-base font-semibold leading-snug text-hud-text">{entry.location.partName}</h2>
          <p className="text-xs text-hud-muted">
            {[side, band.label, resolved ? null : 'Active'].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      <dl className="flex flex-col gap-3">
        <Row label="Feels like">{formatTypes(entry.painTypes)}</Row>
        <Row label="Started">
          {formatOnset(entry.onset)} <span className="text-hud-muted">({formatSince(entry.onset)})</span>
        </Row>
        {pattern && (
          <Row label="Pattern">
            {pattern.label} <span className="text-hud-muted">— {pattern.hint.toLowerCase()}</span>
          </Row>
        )}
        {entry.triggers.length > 0 && <Row label="Triggers and relief">{entry.triggers.join(', ')}</Row>}
        {entry.radiatesTo && <Row label="Spreads to">{entry.radiatesTo}</Row>}
        {entry.notes && <Row label="Notes"><span className="whitespace-pre-wrap">{entry.notes}</span></Row>}
      </dl>

      <div className="rounded-lg border border-hud-border bg-hud-panel2 p-3">
        <p className="text-xs text-hud-text">
          {entry.visibility === 'community' ? (
            <>
              <strong>Shared anonymously</strong> — other members with similar pain can find you by username.
            </>
          ) : (
            <>
              <strong>Private</strong> — only you can see this entry.
            </>
          )}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={onFindMatches} className="rounded-md bg-[#007bff] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0056b3]">
            Find people like me
          </button>
          <button type="button" disabled={busy} onClick={() => run(onToggleShare)} className="rounded-md border border-hud-borderLight bg-hud-panel px-3 py-1.5 text-xs font-medium text-hud-text hover:bg-hud-panel2">
            {entry.visibility === 'community' ? 'Stop sharing' : 'Share anonymously'}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-hud-border pt-3">
        <button type="button" onClick={onEdit} disabled={busy} className="rounded-md border border-hud-borderLight px-3 py-1.5 text-xs font-medium text-hud-text hover:bg-hud-panel2">
          Edit
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(onToggleResolved)}
          className="rounded-md border border-hud-borderLight px-3 py-1.5 text-xs font-medium text-hud-text hover:bg-hud-panel2"
        >
          {resolved ? 'Mark as active again' : 'Mark as resolved'}
        </button>
        {confirmDelete ? (
          <>
            <button type="button" disabled={busy} onClick={() => run(onDelete)} className="rounded-md bg-hud-red px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#c82333]">
              Yes, delete
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirmDelete(false)} className="rounded-md px-3 py-1.5 text-xs font-medium text-hud-muted hover:bg-hud-panel2">
              Keep it
            </button>
          </>
        ) : (
          <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)} className="rounded-md px-3 py-1.5 text-xs font-medium text-hud-red hover:bg-hud-red/10">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
