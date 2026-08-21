import { parseMetricValue } from '../../utils/parseMetricValue';
import type { TransposeResponse } from '../../types';

interface MetricSummaryTableProps {
  data: TransposeResponse;
  selectedMetrics: string[];
}

export function MetricSummaryTable({ data, selectedMetrics }: MetricSummaryTableProps) {
  const sortedDates = [...data.testDates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="border-b border-hud-border text-hud-muted">
          <th className="py-1.5 pr-3 font-medium">Metric</th>
          <th className="py-1.5 pr-3 font-medium">Latest</th>
          <th className="py-1.5 pr-3 font-medium">Avg</th>
          <th className="py-1.5 pr-3 font-medium">Min</th>
          <th className="py-1.5 pr-3 font-medium">Max</th>
        </tr>
      </thead>
      <tbody>
        {selectedMetrics.map((metric) => {
          const series = data.transposed[metric] ?? {};
          const numericValues = sortedDates
            .map((date) => (series[date] !== undefined ? parseMetricValue(series[date]).numeric : null))
            .filter((v): v is number => v !== null);

          const latestDate = [...sortedDates].reverse().find((d) => series[d] !== undefined);
          const latestParsed = latestDate !== undefined ? parseMetricValue(series[latestDate]) : null;

          if (numericValues.length === 0) {
            return (
              <tr key={metric} className="border-b border-hud-border/50">
                <td className="py-1.5 pr-3 text-hud-text">{metric}</td>
                <td colSpan={4} className="py-1.5 text-hud-muted">
                  non-numeric
                </td>
              </tr>
            );
          }

          const avg = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;
          const min = Math.min(...numericValues);
          const max = Math.max(...numericValues);

          return (
            <tr key={metric} className="border-b border-hud-border/50">
              <td className="py-1.5 pr-3 text-hud-text">{metric}</td>
              <td className="py-1.5 pr-3 font-mono text-hud-cyan">
                {latestParsed?.numeric?.toFixed(1)} {latestParsed?.unit ?? ''}
              </td>
              <td className="py-1.5 pr-3 font-mono text-hud-muted">{avg.toFixed(1)}</td>
              <td className="py-1.5 pr-3 font-mono text-hud-muted">{min.toFixed(1)}</td>
              <td className="py-1.5 pr-3 font-mono text-hud-muted">{max.toFixed(1)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
