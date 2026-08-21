import type { ReactNode } from 'react';

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'mock' | 'cyan' | 'amber' | 'real' | 'success' | 'danger';
}) {
  const toneClasses: Record<string, string> = {
    default: 'bg-hud-panel2 text-hud-muted border-hud-border',
    mock: 'bg-hud-purple/10 text-hud-purple border-hud-purple/40',
    cyan: 'bg-hud-cyan/10 text-hud-cyan border-hud-cyan/40',
    amber: 'bg-hud-amber/10 text-hud-amber border-hud-amber/40',
    // Reuses the same green already used for "normal" state text / the top-nav status dot.
    real: 'bg-hud-green/10 text-hud-green border-hud-green/40',
    success: 'bg-hud-green/10 text-hud-green border-hud-green/40',
    danger: 'bg-hud-red/10 text-hud-red border-hud-red/40',
  };
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  swatchColor,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  swatchColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs transition-colors hover:bg-hud-panel2"
    >
      <span className="flex items-center gap-2">
        {swatchColor && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: swatchColor, opacity: checked ? 1 : 0.3 }}
          />
        )}
        <span className={`capitalize ${checked ? 'text-hud-text' : 'text-hud-muted'}`}>{label}</span>
      </span>
      <span
        className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full border transition-colors ${
          checked ? 'border-hud-cyan bg-hud-cyan/30' : 'border-hud-border bg-hud-panel2'
        }`}
      >
        <span
          className={`inline-block h-2.5 w-2.5 transform rounded-full transition-transform ${
            checked ? 'translate-x-3.5 bg-hud-cyan' : 'translate-x-0.5 bg-hud-muted'
          }`}
        />
      </span>
    </button>
  );
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  displayValue,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  displayValue?: string;
}) {
  return (
    <div className="px-2 py-1.5">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-hud-muted">{label}</span>
        <span className="font-mono text-hud-text">{displayValue ?? `${Math.round(value * 100)}%`}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer accent-[#3498db]"
      />
    </div>
  );
}

export function Stat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-hud-muted">{label}</span>
      <span className="font-mono text-sm text-hud-text">
        {value}
        {unit && <span className="ml-0.5 text-[10px] text-hud-muted">{unit}</span>}
      </span>
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="hud-panel-title px-2 pb-1.5 pt-3">{children}</div>;
}

export function IconButton({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 items-center justify-center rounded border text-[11px] font-medium transition-colors ${
        active
          ? 'border-hud-cyan bg-hud-cyan/15 text-hud-cyan'
          : 'border-hud-border bg-hud-panel2 text-hud-muted hover:border-hud-borderLight hover:text-hud-text'
      }`}
    >
      {label}
    </button>
  );
}
