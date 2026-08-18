import { LeftPanel } from '../components/layout/LeftPanel';
import { CenterViewport } from '../components/layout/CenterViewport';
import { RightPanel } from '../components/layout/RightPanel';
import { BottomBar } from '../components/layout/BottomBar';

export function AnatomyPage() {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex min-h-0 flex-1">
        <aside className="w-72 shrink-0 overflow-hidden border-r border-hud-border bg-hud-panel">
          <LeftPanel />
        </aside>
        <main className="relative min-w-0 flex-1">
          <CenterViewport />
        </main>
        <aside className="w-80 shrink-0 overflow-hidden border-l border-hud-border bg-hud-panel">
          <RightPanel />
        </aside>
      </div>
      <footer className="h-14 shrink-0 border-t border-hud-border bg-hud-panel">
        <BottomBar />
      </footer>
    </div>
  );
}
