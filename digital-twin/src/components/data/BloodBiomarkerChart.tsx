import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { parseMetricValue } from '../../utils/parseMetricValue';
import type { TransposeResponse } from '../../types';

const SERIES_COLORS = ['#3498db', '#f5a623', '#dc3545', '#28a745', '#a855f7', '#3b82f6', '#eab308'];

interface BloodBiomarkerChartProps {
  data: TransposeResponse;
  selectedMetrics: string[];
}

export function BloodBiomarkerChart({ data, selectedMetrics }: BloodBiomarkerChartProps) {
  const sortedDates = [...data.testDates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const rows = sortedDates.map((date) => {
    const row: Record<string, number | string> = { date: new Date(date).toLocaleDateString() };
    for (const metric of selectedMetrics) {
      const rawValue = data.transposed[metric]?.[date];
      if (rawValue === undefined) continue;
      const { numeric } = parseMetricValue(rawValue);
      if (numeric !== null) row[metric] = numeric;
    }
    return row;
  });

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
          <XAxis dataKey="date" tick={{ fill: '#7f8c8d', fontSize: 11 }} />
          <YAxis tick={{ fill: '#7f8c8d', fontSize: 11 }} />
          <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #ecf0f1', fontSize: 12 }} labelStyle={{ color: '#2c3e50' }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {selectedMetrics.map((metric, i) => (
            <Line
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
