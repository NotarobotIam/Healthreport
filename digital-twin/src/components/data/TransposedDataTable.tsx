import type { TransposeResponse } from '../../types';

interface TransposedDataTableProps {
  data: TransposeResponse;
  selectedMetrics: string[];
}

/** Full metric x date grid — every raw value, not just summary stats. Ported from the original TransposeView.js's "Complete Transposed Data" table. */
export function TransposedDataTable({ data, selectedMetrics }: TransposedDataTableProps) {
  const sortedDates = [...data.testDates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-left text-xs">
        <thead>
          <tr className="border-b border-hud-border text-hud-muted">
            <th className="py-1.5 pr-3 font-medium">Metric</th>
            {sortedDates.map((date) => (
              <th key={date} className="py-1.5 pr-3 font-medium">
                {new Date(date).toLocaleDateString()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {selectedMetrics.map((metric) => {
            const series = data.transposed[metric] ?? {};
            return (
              <tr key={metric} className="border-b border-hud-border/50">
                <td className="py-1.5 pr-3 font-semibold text-hud-text">{metric}</td>
                {sortedDates.map((date) => (
                  <td key={date} className="py-1.5 pr-3 font-mono text-hud-muted">
                    {series[date] !== undefined ? String(series[date]) : '—'}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
