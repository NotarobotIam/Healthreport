import type { Assessment, Tone } from '../../data/physiology/vitalRanges';

const TONE: Record<Tone, string> = {
  good: 'bg-hud-green/10 text-hud-green',
  watch: 'bg-hud-amber/15 text-[#a86c00]',
  alert: 'bg-hud-red/10 text-hud-red',
  neutral: 'bg-hud-panel2 text-hud-muted',
};

/** A tiny trend line with no axes: the shape of the last few readings, oldest to newest. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="h-8" aria-hidden="true" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / span) * 24}`).join(' ');
  return (
    <svg viewBox="0 0 100 32" className="h-8 w-full" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="#3498db" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

interface VitalTileProps {
  label: string;
  value: string | null;
  unit?: string;
  assessment?: Assessment | null;
  /** Oldest to newest. */
  series?: number[];
  footnote?: string;
}

export function VitalTile({ label, value, unit, assessment, series = [], footnote }: VitalTileProps) {
  return (
    <div className="flex flex-col rounded-2xl bg-hud-panel p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-hud-muted">{label}</p>
      {value === null ? (
        <p className="mt-2 flex-1 text-sm text-hud-muted">No reading yet</p>
      ) : (
        <>
          <p className="mt-1 text-2xl font-semibold text-hud-text">
            {value} {unit && <span className="text-sm font-normal text-hud-muted">{unit}</span>}
          </p>
          {assessment && <span className={`mt-1 self-start rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE[assessment.tone]}`}>{assessment.label}</span>}
          <div className="mt-2">
            <Sparkline values={series} />
          </div>
          {footnote && <p className="mt-1 text-[11px] text-hud-muted">{footnote}</p>}
        </>
      )}
    </div>
  );
}
