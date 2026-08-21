import { useEffect, useMemo, useState } from 'react';
import { useBloodBiomarkers } from '../hooks/useBloodBiomarkers';
import { MetricSelector } from '../components/data/MetricSelector';
import { BloodBiomarkerChart } from '../components/data/BloodBiomarkerChart';
import { MetricSummaryTable } from '../components/data/MetricSummaryTable';
import { TransposedDataTable } from '../components/data/TransposedDataTable';
import { PlaceholderScreen } from '../components/PlaceholderScreen';
import { SectionLabel } from '../components/common';

const DEFAULT_METRIC_COUNT = 4;

export function DataPage() {
  const { status, data, errorMessage } = useBloodBiomarkers();
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'chart' | 'table'>('chart');

  const allMetrics = useMemo(() => (data ? Object.keys(data.transposed).sort() : []), [data]);

  // Pick a reasonable default selection once data loads, without ever
  // overwriting a selection the user has already made themselves.
  useEffect(() => {
    if (allMetrics.length === 0) return;
    setSelectedMetrics((prev) => (prev.size > 0 ? prev : new Set(allMetrics.slice(0, DEFAULT_METRIC_COUNT))));
  }, [allMetrics]);

  const toggleMetric = (metric: string) => {
    setSelectedMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(metric)) {
        next.delete(metric);
      } else {
        next.add(metric);
      }
      return next;
    });
  };

  if (status === 'idle' || status === 'loading') {
    return <PlaceholderScreen title="Data" description="Loading blood biomarker history..." />;
  }

  if (status === 'unauthenticated') {
    return <PlaceholderScreen title="Data" description="Please log in to see this patient's blood biomarker history." />;
  }

  if (status === 'error' || !data) {
    return <PlaceholderScreen title="Data" description={errorMessage ?? 'Failed to load biomarker data.'} />;
  }

  const selected = [...selectedMetrics];

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-hud-text">Blood Biomarkers Over Time</h2>
        <div className="flex gap-1 rounded border border-hud-border p-0.5">
          <button
            type="button"
            onClick={() => setView('chart')}
            className={`rounded px-2.5 py-1 text-xs transition-colors ${
              view === 'chart' ? 'bg-hud-cyan/15 text-hud-cyan' : 'text-hud-muted hover:text-hud-text'
            }`}
          >
            Chart
          </button>
          <button
            type="button"
            onClick={() => setView('table')}
            className={`rounded px-2.5 py-1 text-xs transition-colors ${
              view === 'table' ? 'bg-hud-cyan/15 text-hud-cyan' : 'text-hud-muted hover:text-hud-text'
            }`}
          >
            Table
          </button>
        </div>
      </div>

      <SectionLabel>Metrics</SectionLabel>
      <MetricSelector metrics={allMetrics} selected={selectedMetrics} onToggle={toggleMetric} />

      <div className="mt-4 flex-1">
        {selected.length === 0 ? (
          <p className="text-xs text-hud-muted">Select at least one metric above.</p>
        ) : view === 'chart' ? (
          <BloodBiomarkerChart data={data} selectedMetrics={selected} />
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-hud-muted">Summary</h3>
              <MetricSummaryTable data={data} selectedMetrics={selected} />
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-hud-muted">Complete Data</h3>
              <TransposedDataTable data={data} selectedMetrics={selected} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
