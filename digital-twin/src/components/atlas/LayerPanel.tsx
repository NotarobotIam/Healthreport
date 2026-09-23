import { LAYER_PRESETS, SYSTEMS, type SystemId } from '../../atlas/anatomy';

interface LayerPanelProps {
  visible: SystemId[];
  onChange: (systems: SystemId[]) => void;
  peel: number;
  onPeelChange: (peel: number) => void;
}

const sameSet = (a: SystemId[], b: SystemId[]) => a.length === b.length && a.every((s) => b.includes(s));

export function LayerPanel({ visible, onChange, peel, onPeelChange }: LayerPanelProps) {
  const toggle = (id: SystemId) =>
    onChange(visible.includes(id) ? visible.filter((s) => s !== id) : [...visible, id]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="hud-panel-title">Peel layers</h2>
          <span className="text-[11px] text-hud-muted">
            {peel < 0.05 ? 'Skin' : peel < 0.4 ? 'Under the skin' : peel < 0.95 ? 'Under the muscle' : 'Skeleton'}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(peel * 100)}
          onChange={(e) => onPeelChange(Number(e.target.value) / 100)}
          aria-label="Peel away layers, from skin to skeleton"
          className="w-full accent-hud-cyan"
        />
        <div className="mt-0.5 flex justify-between text-[10px] text-hud-muted">
          <span>Skin</span>
          <span>Muscle</span>
          <span>Skeleton</span>
        </div>
      </div>

      <div>
        <h2 className="hud-panel-title mb-2">Show</h2>
        <div className="flex flex-wrap gap-1.5">
          {LAYER_PRESETS.map((preset) => {
            const active = sameSet(preset.systems, visible);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange(preset.systems)}
                aria-pressed={active}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-hud-cyan bg-hud-cyan/10 text-hud-cyan'
                    : 'border-hud-borderLight text-hud-text hover:bg-hud-panel2'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="hud-panel-title mb-2">Layers</h2>
        <ul className="flex flex-col">
          {SYSTEMS.map((system) => (
            <li key={system.id}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded px-1.5 py-1.5 text-sm hover:bg-hud-panel2">
                <input
                  type="checkbox"
                  checked={visible.includes(system.id)}
                  onChange={() => toggle(system.id)}
                  className="h-3.5 w-3.5 accent-hud-cyan"
                />
                <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10" style={{ background: system.color }} />
                <span className="text-hud-text">{system.name}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
