import { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import type { TabId } from './components/layout/TopNav';
import { AnatomyPage } from './pages/AnatomyPage';
import { OverviewPage, PhysiologyPage, PathologyPage, SimulationPage, DataPage, ReportsPage } from './pages/OtherPages';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('anatomy');

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
