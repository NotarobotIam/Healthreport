import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { GUT_MARKERS, GUT_BY_ID } from '../../data/pathology/gutCatalog';
import type { ReportDTO } from '../../types';

const numeric = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit', timeZone: 'UTC' });
const round = (n: number) => Math.round(n * 100) / 100;

/** One marker over time, chosen from the markers that have at least one value. */
export function GutTrend({ reports }: { reports: ReportDTO[] }) {
  const available = useMemo(
    () => GUT_MARKERS.filter((m) => reports.some((r) => numeric((r.results as Record<string, unknown>)[m.key]) !== null)),
    [reports],
  );
  const [chosen, setChosen] = useState<string | null>(null);
  const marker = available.find((m) => m.key === chosen) ?? available[0];
  if (!marker) return <p className="py-4 text-sm text-hud-muted">Add a result with numbers to see how it changes over time.</p>;

  const rows = reports
    .map((r) => ({ at: r.testDate, v: numeric((r.results as Record<string, unknown>)[marker.key]) }))
    .filter((p): p is { at: string; v: number } => p.v !== null)
    .sort((a, b) => +new Date(a.at) - +new Date(b.at))
    .map((p) => ({ date: fmtDate(p.at), value: p.v }));

  return (
    <div>
      <label className="mb-3 flex flex-wrap items-center gap-2 text-sm text-hud-text">
        <span className="font-medium">Marker</span>
        <select value={marker.key} onChange={(e) => setChosen(e.target.value)} className="rounded-md border border-hud-borderLight bg-hud-panel px-2 py-1.5 text-sm focus:border-hud-cyan focus:outline-none">
          {available.map((m) => <option key={m.key} value={m.key}>{m.label}{m.unit ? ` (${m.unit})` : ''}, {GUT_BY_ID.get(m.kind)?.title}</option>)}
        </select>
      </label>
      {rows.length < 2 ? (
        <p className="py-4 text-sm text-hud-muted">One result so far ({rows[0].value}{marker.unit ? ` ${marker.unit}` : ''}). Add another test later to see a trend.</p>
      ) : (
        <div style={{ height: 240 }} className="w-full" role="img" aria-label={`${marker.label} over time: ${rows.map((r) => `${r.date} ${r.value}`).join(', ')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
              <XAxis dataKey="date" tick={{ fill: '#7f8c8d', fontSize: 11 }} />
              <YAxis tick={{ fill: '#7f8c8d', fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #ecf0f1', fontSize: 12 }} />
              <Line type="monotone" dataKey="value" name={marker.label} stroke="#3498db" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** The two most recent sequencing tests side by side. Changes are shown without judgement. */
export function SequencingCompare({ reports }: { reports: ReportDTO[] }) {
  const seq = reports
    .filter((r) => (r.results as Record<string, unknown>).examKind === 'sequencing')
    .sort((a, b) => +new Date(b.testDate) - +new Date(a.testDate));
  if (seq.length < 2) return <p className="text-sm text-hud-muted">Add two sequencing results to compare them side by side.</p>;
  const [latest, previous] = seq;
  const l = latest.results as Record<string, unknown>;
  const p = previous.results as Record<string, unknown>;
  const rows = GUT_BY_ID.get('sequencing')!.fields
    .filter((f) => f.kind === 'number')
    .map((f) => ({ f, a: numeric(p[f.key]), b: numeric(l[f.key]) }))
    .filter((r) => r.a !== null || r.b !== null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead>
          <tr className="border-b border-hud-border text-xs text-hud-muted">
            <th scope="col" className="py-2 pr-3 font-medium">Marker</th>
            <th scope="col" className="py-2 pr-3 font-medium">{fmtDate(previous.testDate)}</th>
            <th scope="col" className="py-2 pr-3 font-medium">{fmtDate(latest.testDate)}</th>
            <th scope="col" className="py-2 font-medium">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ f, a, b }) => {
            const diff = a !== null && b !== null ? round(b - a) : null;
            return (
              <tr key={f.key} className="border-b border-hud-border/60 last:border-0">
                <th scope="row" className="py-2 pr-3 font-normal text-hud-text">{f.label}</th>
                <td className="py-2 pr-3 text-hud-text">{a ?? '–'}{a !== null && f.unit ? ` ${f.unit}` : ''}</td>
                <td className="py-2 pr-3 text-hud-text">{b ?? '–'}{b !== null && f.unit ? ` ${f.unit}` : ''}</td>
                <td className="py-2 text-hud-muted">{diff === null ? '–' : diff === 0 ? 'no change' : `${diff > 0 ? '↑ ' : '↓ '}${Math.abs(diff)}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
