import { useMemo, useState } from 'react';
import { useAnatomyStore, selectedNodeIdSelector } from '../../store/useAnatomyStore';
import { useViewStore, ALL_SYSTEMS } from '../../store/useViewStore';
import { usePhysiologyPlayback } from '../../engine/usePhysiologyPlayback';
import { nudgeRotate, nudgePan, nudgeZoom } from '../../hooks/useCameraTransition';
import { anatomyMap, ancestryMap } from '../../data/anatomy';
import { getSystemColor } from '../../utils/color';
import { Toggle, Slider, SectionLabel, IconButton } from '../common';
import type { ViewMode } from '../../types';
import { ROOT_NODE_ID } from '../../types';

function useSearchMatches(query: string): Set<string> | null {
  return useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return null;
    const matches = new Set<string>();
    for (const node of Object.values(anatomyMap)) {
      if (node.name.toLowerCase().includes(trimmed)) {
        matches.add(node.id);
        for (const ancestorId of ancestryMap.get(node.id) ?? []) matches.add(ancestorId);
      }
    }
    return matches;
  }, [query]);
}

function TreeNode({ nodeId, depth, searchMatches }: { nodeId: string; depth: number; searchMatches: Set<string> | null }) {
  const node = anatomyMap[nodeId];
  const selectedNodeId = useAnatomyStore(selectedNodeIdSelector);
  const isExpandedInStore = useAnatomyStore((s) => s.expandedNodeIds.has(nodeId));
  const isHovered = useAnatomyStore((s) => s.hoveredNodeId === nodeId);
  const toggleExpanded = useAnatomyStore((s) => s.toggleExpanded);
  const selectNode = useAnatomyStore((s) => s.selectNode);
  const hoverNode = useAnatomyStore((s) => s.hoverNode);

  if (!node) return null;
  if (searchMatches && !searchMatches.has(nodeId)) return null;

  const isSelected = selectedNodeId === nodeId;
  const hasChildren = node.children.length > 0;
  const isExpanded = searchMatches ? true : isExpandedInStore;
  const isDataOnly = !node.selectable && node.children.length === 0;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => selectNode(nodeId)}
        onKeyDown={(e) => e.key === 'Enter' && selectNode(nodeId)}
        onMouseEnter={() => hoverNode(nodeId)}
        onMouseLeave={() => hoverNode(null)}
        className={`flex cursor-pointer items-center gap-1.5 rounded py-1 pr-2 text-xs transition-colors ${
          isSelected ? 'bg-hud-cyan/15 text-hud-cyan' : isHovered ? 'bg-hud-panel2 text-hud-text' : isDataOnly ? 'text-hud-muted/70' : 'text-hud-text hover:bg-hud-panel2'
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(nodeId);
            }}
            className="w-3 shrink-0 text-hud-muted"
          >
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((childId) => (
            <TreeNode key={childId} nodeId={childId} depth={depth + 1} searchMatches={searchMatches} />
          ))}
        </div>
      )}
    </div>
  );
}

function AnatomyTree({ searchMatches }: { searchMatches: Set<string> | null }) {
  return (
    <div className="px-1 pb-2">
      <TreeNode nodeId={ROOT_NODE_ID} depth={0} searchMatches={searchMatches} />
    </div>
  );
}

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'xray', label: 'X-Ray' },
  { id: 'ct', label: 'CT' },
  { id: 'mri', label: 'MRI' },
  { id: 'muscle', label: 'Muscle' },
  { id: 'vessels', label: 'Vessels' },
  { id: 'nerves', label: 'Nerves' },
];

function ViewControls() {
  const viewMode = useViewStore((s) => s.viewMode);
  const setViewMode = useViewStore((s) => s.setViewMode);
  const transparency = useViewStore((s) => s.transparency);
  const setTransparency = useViewStore((s) => s.setTransparency);
  const resetToRoot = useAnatomyStore((s) => s.resetToRoot);

  return (
    <div>
      <SectionLabel>View Controls</SectionLabel>
      <div className="grid grid-cols-4 gap-1.5 px-2">
        <IconButton label="◂ Rotate" onClick={() => nudgeRotate('left')} />
        <IconButton label="Rotate ▸" onClick={() => nudgeRotate('right')} />
        <IconButton label="▴ Rotate" onClick={() => nudgeRotate('up')} />
        <IconButton label="Rotate ▾" onClick={() => nudgeRotate('down')} />
        <IconButton label="◂ Pan" onClick={() => nudgePan('left')} />
        <IconButton label="Pan ▸" onClick={() => nudgePan('right')} />
        <IconButton label="Zoom +" onClick={() => nudgeZoom('in')} />
        <IconButton label="Zoom −" onClick={() => nudgeZoom('out')} />
      </div>
      <div className="px-2 pt-1.5">
        <IconButton label="⟲ Reset View" onClick={() => resetToRoot()} />
      </div>

      <SectionLabel>Imaging Mode</SectionLabel>
      <div className="grid grid-cols-3 gap-1.5 px-2">
        {VIEW_MODES.map((mode) => (
          <IconButton key={mode.id} label={mode.label} active={viewMode === mode.id} onClick={() => setViewMode(mode.id)} />
        ))}
      </div>

      <Slider label="Transparency" value={transparency} onChange={setTransparency} />
    </div>
  );
}

function SystemFilters() {
  const visibleSystems = useViewStore((s) => s.visibleSystems);
  const toggleSystem = useViewStore((s) => s.toggleSystem);
  const cardio = useViewStore((s) => s.cardiovascularSubfilters);
  const toggleCardio = useViewStore((s) => s.toggleCardiovascularSubfilter);
  const nervous = useViewStore((s) => s.nervousSubfilters);
  const toggleNervous = useViewStore((s) => s.toggleNervousSubfilter);

  return (
    <div>
      <SectionLabel>Anatomical Systems</SectionLabel>
      <div className="px-1">
        {ALL_SYSTEMS.map((system) => (
          <div key={system}>
            <Toggle
              label={system}
              checked={visibleSystems[system]}
              onChange={() => toggleSystem(system)}
              swatchColor={getSystemColor(system)}
            />
            {system === 'cardiovascular' && visibleSystems.cardiovascular && (
              <div className="ml-4 border-l border-hud-border pl-2">
                <Toggle label="Arteries" checked={cardio.arteries} onChange={() => toggleCardio('arteries')} />
                <Toggle label="Veins" checked={cardio.veins} onChange={() => toggleCardio('veins')} />
                <Toggle
                  label="Microvasculature"
                  checked={cardio.microvasculature}
                  onChange={() => toggleCardio('microvasculature')}
                />
              </div>
            )}
            {system === 'nervous' && visibleSystems.nervous && (
              <div className="ml-4 border-l border-hud-border pl-2">
                <Toggle label="Central" checked={nervous.central} onChange={() => toggleNervous('central')} />
                <Toggle label="Peripheral" checked={nervous.peripheral} onChange={() => toggleNervous('peripheral')} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimeMiniControls() {
  const { isPlaying, currentTime, play, pause } = usePhysiologyPlayback();
  return (
    <div>
      <SectionLabel>Time (4D)</SectionLabel>
      <div className="flex items-center gap-2 px-2 pb-2">
        <button
          type="button"
          onClick={() => (isPlaying ? pause() : play())}
          className="flex h-6 w-6 items-center justify-center rounded border border-hud-border bg-hud-panel2 text-hud-cyan"
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-hud-panel2">
          <div
            className="h-full bg-hud-cyan transition-[width]"
            style={{ width: `${((currentTime % 60) / 60) * 100}%` }}
          />
        </div>
        <span className="font-mono text-[11px] text-hud-muted">{currentTime.toFixed(1)}s</span>
      </div>
    </div>
  );
}

export function LeftPanel() {
  const [search, setSearch] = useState('');
  const searchMatches = useSearchMatches(search);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="p-2">
        <SectionLabel>Anatomy Navigator</SectionLabel>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="mx-2 w-[calc(100%-1rem)] rounded border border-hud-border bg-hud-panel2 px-2 py-1.5 text-xs text-hud-text placeholder:text-hud-muted focus:border-hud-cyan focus:outline-none"
        />
        <div className="mt-2 max-h-72 overflow-y-auto rounded border border-hud-border bg-hud-bg/40">
          <AnatomyTree searchMatches={searchMatches} />
        </div>
      </div>

      <ViewControls />
      <SystemFilters />
      <TimeMiniControls />
    </div>
  );
}
