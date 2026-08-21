interface MetricSelectorProps {
  metrics: string[];
  selected: Set<string>;
  onToggle: (metric: string) => void;
}

export function MetricSelector({ metrics, selected, onToggle }: MetricSelectorProps) {
  if (metrics.length === 0) {
    return <p className="text-xs text-hud-muted">No metrics available.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {metrics.map((metric) => {
        const isSelected = selected.has(metric);
        return (
          <button
            key={metric}
            type="button"
            onClick={() => onToggle(metric)}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
              isSelected
                ? 'border-hud-cyan bg-hud-cyan/15 text-hud-cyan'
                : 'border-hud-border bg-hud-panel2 text-hud-muted hover:text-hud-text'
            }`}
          >
            {metric}
          </button>
        );
      })}
    </div>
  );
}
