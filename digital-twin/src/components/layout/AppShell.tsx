import type { ReactNode } from 'react';
import { BrandHeader } from './BrandHeader';
import { TopNav } from './TopNav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-hud-bg text-hud-text">
      <BrandHeader />
      <TopNav />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
