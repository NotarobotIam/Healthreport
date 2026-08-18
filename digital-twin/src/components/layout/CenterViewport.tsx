import { useAnatomyStore, selectedNodeIdSelector } from '../../store/useAnatomyStore';
import { anatomyMap, ancestryMap } from '../../data/anatomy';
import { DigitalTwinCanvas } from '../../scene/DigitalTwinCanvas';
import { ErrorBoundary } from '../ErrorBoundary';

function Breadcrumbs() {
  const selectedNodeId = useAnatomyStore(selectedNodeIdSelector);
  const goToBreadcrumb = useAnatomyStore((s) => s.goToBreadcrumb);
  const chain = [...(ancestryMap.get(selectedNodeId) ?? []), selectedNodeId];

  return (
    <div className="pointer-events-auto absolute left-4 top-4 flex max-w-[70%] flex-wrap items-center gap-1 rounded border border-hud-border bg-hud-panel/90 px-3 py-1.5 text-xs backdrop-blur">
      {chain.map((id, index) => {
        const node = anatomyMap[id];
        if (!node) return null;
        const isLast = index === chain.length - 1;
        return (
          <span key={id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToBreadcrumb(index)}
              disabled={isLast}
              className={isLast ? 'font-semibold text-hud-cyan' : 'text-hud-muted transition-colors hover:text-hud-text'}
            >
              {node.name}
            </button>
            {!isLast && <span className="text-hud-muted">/</span>}
          </span>
        );
      })}
    </div>
  );
}

function HoverReadout() {
  const hoveredNodeId = useAnatomyStore((s) => s.hoveredNodeId);
  const node = hoveredNodeId ? anatomyMap[hoveredNodeId] : undefined;
  if (!node) return null;
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 rounded border border-hud-cyan/50 bg-hud-panel/90 px-3 py-1.5 text-xs font-medium text-hud-cyan backdrop-blur">
      {node.name}
    </div>
  );
}

function SelectHint() {
  const hoveredNodeId = useAnatomyStore((s) => s.hoveredNodeId);
  if (hoveredNodeId) return null;
  return (
    <div className="pointer-events-none absolute right-4 top-4 w-48 rounded border border-hud-border bg-hud-panel/80 px-3 py-3 text-center text-[11px] leading-relaxed text-hud-muted backdrop-blur">
      <div className="hud-panel-title mb-1 !text-hud-text">Select to zoom</div>
      Hover over a body part to highlight it. Click to explore in detail.
    </div>
  );
}

export function CenterViewport() {
  return (
    <div className="relative h-full w-full">
      <ErrorBoundary fallbackTitle="The 3D viewport hit an error">
        <DigitalTwinCanvas />
      </ErrorBoundary>
      <Breadcrumbs />
      <SelectHint />
      <HoverReadout />
    </div>
  );
}
