import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { VitalDTO } from '../../types';

export interface Series {
  key: keyof VitalDTO;
  label: string;
  color: string;
  /** Convert the stored (metric) value for display. */
  map?: (v: number) => number;
}

/** Readings over time. Missing values are skipped, so a reading with only some measurements still plots. */
export function TrendChart({ vitals, series, height = 260 }: { vitals: VitalDTO[]; series: Series[]; height?: number }) {
  const rows = [...vitals]
    .sort((a, b) => +new Date(a.measuredAt) - +new Date(b.measuredAt))
    .map((v) => {
      const row: Record<string, number | string> = { date: new Date(v.measuredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) };
      for (const s of series) {
        const val = v[s.key];
        if (typeof val === 'number') row[s.key] = Math.round((s.map ? s.map(val) : val) * 10) / 10;
      }
      return row;
    })
    .filter((r) => series.some((s) => r[s.key] !== undefined));

  if (rows.length < 2) return <p className="py-6 text-center text-sm text-hud-muted">Add at least two readings to see a trend.</p>;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
          <XAxis dataKey="date" tick={{ fill: '#7f8c8d', fontSize: 11 }} />
          <YAxis tick={{ fill: '#7f8c8d', fontSize: 11 }} domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ background: '#fff', border: '1px solid #ecf0f1', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
