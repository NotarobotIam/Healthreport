import { useAnatomyStore, selectedNodeIdSelector } from '../../store/useAnatomyStore';
import { usePhysiologyPlayback } from '../../engine/usePhysiologyPlayback';
import { anatomyMap } from '../../data/anatomy';
import { Badge, SectionLabel } from '../common';
import { getSystemColor } from '../../utils/color';

function ChildRow({ nodeId }: { nodeId: string }) {
  const node = anatomyMap[nodeId];
  const selectNode = useAnatomyStore((s) => s.selectNode);
  const hoverNode = useAnatomyStore((s) => s.hoverNode);
  const isHovered = useAnatomyStore((s) => s.hoveredNodeId === nodeId);
  if (!node) return null;

  const isDataOnly = node.meshIds.length === 0 && node.children.length === 0 && !node.selectable;

  return (
    <button
      type="button"
      onClick={() => selectNode(nodeId)}
      onMouseEnter={() => hoverNode(nodeId)}
      onMouseLeave={() => hoverNode(null)}
      className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors ${
        isHovered ? 'bg-hud-cyan/10 text-hud-cyan' : isDataOnly ? 'text-hud-muted hover:bg-hud-panel2' : 'text-hud-text hover:bg-hud-panel2'
      }`}
    >
      <span>{node.name}</span>
      {isDataOnly && <span className="text-[9px] uppercase tracking-wide text-hud-muted/70">data only</span>}
    </button>
  );
}

function PhysiologyPlaceholder({ physiologyKey }: { physiologyKey: string }) {
  const { bodyRegions } = usePhysiologyPlayback();
  const region = bodyRegions?.[physiologyKey];

  return (
    <div className="mx-2 mb-2 rounded border border-hud-purple/30 bg-hud-purple/5 p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="hud-panel-title !text-hud-purple">Physiology</span>
        <Badge tone="mock">Mock Data</Badge>
      </div>
      {!region ? (
        <p className="text-[11px] text-hud-muted">No physiological mapping active for this structure yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {region.perfusion !== undefined && (
            <div>
              <div className="text-[10px] uppercase text-hud-muted">Perfusion</div>
              <div className="font-mono text-hud-text">{Math.round(region.perfusion * 100)}%</div>
            </div>
          )}
          {region.pressure !== undefined && (
            <div>
              <div className="text-[10px] uppercase text-hud-muted">Pressure</div>
              <div className="font-mono text-hud-text">{region.pressure.toFixed(1)} mmHg</div>
            </div>
          )}
          {region.flow !== undefined && (
            <div>
              <div className="text-[10px] uppercase text-hud-muted">Flow</div>
              <div className="font-mono text-hud-text">{region.flow.toFixed(2)}</div>
            </div>
          )}
          {region.state !== undefined && (
            <div>
              <div className="text-[10px] uppercase text-hud-muted">State</div>
              <div className="font-mono capitalize text-hud-green">{region.state}</div>
            </div>
          )}
        </div>
      )}
      <p className="mt-2 text-[10px] leading-snug text-hud-muted/80">
        Placeholder interface for future patient sensor data, EHR feeds, or CFD/ROM simulation output — see README.
      </p>
    </div>
  );
}

export function RightPanel() {
  const selectedNodeId = useAnatomyStore(selectedNodeIdSelector);
  const node = anatomyMap[selectedNodeId];

  if (!node) {
    return <div className="p-3 text-xs text-hud-muted">No selection.</div>;
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-hud-border p-3">
        <h3 className="text-sm font-semibold text-hud-text">{node.name}</h3>
        {node.description && <p className="mt-1.5 text-xs leading-relaxed text-hud-muted">{node.description}</p>}
        {node.systemTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {node.systemTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-sm border border-hud-border bg-hud-panel2 px-1.5 py-0.5 text-[10px] capitalize text-hud-muted"
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getSystemColor(tag) }} />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {node.physiologyKey && (
        <div className="pt-2">
          <PhysiologyPlaceholder physiologyKey={node.physiologyKey} />
        </div>
      )}

      {node.children.length > 0 ? (
        <div className="flex-1">
          <SectionLabel>Child Structures ({node.children.length})</SectionLabel>
          <div className="px-1 pb-3">
            {node.children.map((childId) => (
              <ChildRow key={childId} nodeId={childId} />
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3 text-xs text-hud-muted">No further sub-structures in this build.</div>
      )}

      <div className="mt-auto border-t border-hud-border p-3 text-[10px] text-hud-muted">
        <span className="uppercase tracking-wide">Node ID</span>
        <div className="mt-0.5 break-all font-mono text-hud-muted/80">{node.id}</div>
      </div>
    </div>
  );
}
