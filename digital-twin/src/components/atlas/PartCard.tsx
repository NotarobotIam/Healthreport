import { SYSTEM_BY_ID, explanation, sideOf, type Part } from '../../atlas/anatomy';
import { formatSide } from './painFormat';
import type { RegionSummary } from '../../types';

interface PartCardProps {
  part: Part;
  /** X coordinate of the spot that was tapped, when the structure was picked on the model. */
  pointX?: number;
  /** What the community has around this structure; null until it loads or if unavailable. */
  summary?: RegionSummary | null;
  onDiscuss: () => void;
  onReportPain: () => void;
  onZoom: () => void;
  /** Hides every other layer so a structure buried under muscle or skin becomes visible. */
  onShowOnlySystem: () => void;
  onClear: () => void;
}

export function PartCard({ part, pointX, summary, onDiscuss, onReportPain, onZoom, onShowOnlySystem, onClear }: PartCardProps) {
  const system = SYSTEM_BY_ID.get(part.system);
  const centerX = (part.bounds[0][0] + part.bounds[1][0]) / 2;
  const side = formatSide(sideOf(part.name, pointX ?? centerX));

  return (
    <section className="rounded-lg border border-hud-border bg-hud-panel2 p-3" aria-label="Selected structure">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="hud-panel-title mb-0.5">Selected</p>
          <h2 className="text-sm font-semibold text-hud-text">{part.name}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-hud-muted">
            <span className="h-2 w-2 rounded-full border border-black/10" style={{ background: system?.color }} />
            {[system?.name, side].filter(Boolean).join(' · ')}
          </p>
        </div>
        <button type="button" onClick={onClear} aria-label="Clear selection" className="rounded px-1.5 text-hud-muted hover:bg-hud-panel hover:text-hud-text">
          ✕
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-hud-text">{explanation(part.name, part.system)}</p>
      {summary && (summary.members !== null || summary.threadCount > 0) && (
        <div className="mt-3 rounded-md bg-hud-panel px-3 py-2 text-xs text-hud-text ring-1 ring-hud-border">
          {summary.members !== null && (
            <p>
              <strong>{summary.members}</strong> other members report pain here
            </p>
          )}
          {summary.threadCount > 0 && (
            <button type="button" onClick={onDiscuss} className="font-medium text-hud-cyan hover:underline">
              {summary.threadCount} {summary.threadCount === 1 ? 'discussion' : 'discussions'} about this area →
            </button>
          )}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onReportPain} className="flex-1 rounded-md bg-[#007bff] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0056b3]">
          Pain here
        </button>
        <button type="button" onClick={onZoom} className="rounded-md border border-hud-borderLight px-3 py-1.5 text-xs font-medium text-hud-text hover:bg-hud-panel">
          Zoom to
        </button>
      </div>
      {system && (
        <button type="button" onClick={onShowOnlySystem} className="mt-2 text-xs font-medium text-hud-cyan hover:underline">
          Show only {system.name.toLowerCase()} to see it clearly
        </button>
      )}
    </section>
  );
}
