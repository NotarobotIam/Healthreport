import { PlaceholderScreen } from '../components/PlaceholderScreen';

export function OverviewPage() {
  return (
    <PlaceholderScreen
      title="Overview"
      description="Patient summary dashboard — vitals, active alerts, and a quick-access digital twin preview. Not built in this pass; see the Anatomy tab for the full 3D explorer."
    />
  );
}

export function SimulationPage() {
  return (
    <PlaceholderScreen
      title="Simulation"
      description="Interface for future CFD / reduced-order-model runs (e.g. blood flow, respiratory mechanics) streamed into the same setPhysiologyFrame(time) API the mocked playback already uses."
    />
  );
}
