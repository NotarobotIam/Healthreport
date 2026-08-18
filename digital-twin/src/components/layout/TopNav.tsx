import { Tabs } from '../common';

export type TabId = 'overview' | 'anatomy' | 'physiology' | 'pathology' | 'simulation' | 'data' | 'reports';

const TAB_LABELS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'anatomy', label: 'Anatomy' },
  { id: 'physiology', label: 'Physiology' },
  { id: 'pathology', label: 'Pathology' },
  { id: 'simulation', label: 'Simulation' },
  { id: 'data', label: 'Data' },
  { id: 'reports', label: 'Reports' },
];

export function TopNav({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (tab: TabId) => void }) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-hud-border bg-hud-panel px-4">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-bold tracking-[0.2em] text-hud-cyan">VITAL-DT</span>
        <span className="hidden text-[10px] uppercase tracking-widest text-hud-muted sm:inline">Digital Twin Platform</span>
      </div>
      <Tabs tabs={TAB_LABELS} activeId={activeTab} onChange={(id) => onTabChange(id as TabId)} />
      <div className="flex items-center gap-2 text-hud-muted">
        <span className="hud-status-dot h-1.5 w-1.5 rounded-full bg-hud-green" />
        <span className="text-[10px] uppercase tracking-widest">Normal</span>
      </div>
    </header>
  );
}
