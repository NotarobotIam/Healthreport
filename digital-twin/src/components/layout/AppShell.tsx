import type { ReactNode } from 'react';
import { TopNav, type TabId } from './TopNav';

interface AppShellProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: ReactNode;
}

export function AppShell({ activeTab, onTabChange, children }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-hud-bg text-hud-text">
      <TopNav activeTab={activeTab} onTabChange={onTabChange} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
