import type { ReactNode } from 'react';
import { TopNav } from './TopNav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-hud-bg text-hud-text">
      <TopNav />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
