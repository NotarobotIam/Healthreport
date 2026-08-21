import { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import type { TabId } from './components/layout/TopNav';
import { AnatomyPage } from './pages/AnatomyPage';
import { DataPage } from './pages/DataPage';
import { OverviewPage, PhysiologyPage, PathologyPage, SimulationPage, ReportsPage } from './pages/OtherPages';
import { useRemoteImagingData } from './hooks/useRemoteImagingData';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('anatomy');

  // Fires once per app load; silently stays on mock data if there's no
  // handoff token or the fetch fails — see the hook's own doc comment.
  useRemoteImagingData();

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {/* The Anatomy tab stays mounted (just hidden) rather than being
          conditionally rendered, so switching tabs never tears down the
          WebGL context or interrupts the physiology playback clock. */}
      <div className={activeTab === 'anatomy' ? 'h-full' : 'hidden'}>
        <AnatomyPage />
      </div>
      {activeTab === 'overview' && <OverviewPage />}
      {activeTab === 'physiology' && <PhysiologyPage />}
      {activeTab === 'pathology' && <PathologyPage />}
      {activeTab === 'simulation' && <SimulationPage />}
      {activeTab === 'data' && <DataPage />}
      {activeTab === 'reports' && <ReportsPage />}
    </AppShell>
  );
}
