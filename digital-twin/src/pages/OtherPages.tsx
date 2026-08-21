import { PlaceholderScreen } from '../components/PlaceholderScreen';

export function OverviewPage() {
  return (
    <PlaceholderScreen
      title="Overview"
      description="Patient summary dashboard — vitals, active alerts, and a quick-access digital twin preview. Not built in this pass; see the Anatomy tab for the full 3D explorer."
    />
  );
}

export function PhysiologyPage() {
  return (
    <PlaceholderScreen
      title="Physiology"
      description="Full physiological trend dashboards (heart rate, blood pressure, respiratory rate over time), built on the same PhysiologyFrame data the Anatomy tab's time controls already drive."
    />
  );
}

export function PathologyPage() {
  return (
    <PlaceholderScreen
      title="Pathology"
      description="Flagging and visualization of abnormal findings, mapped onto the anatomy hierarchy via AnatomyNode.physiologyKey."
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

export function ReportsPage() {
  return (
    <PlaceholderScreen
      title="Reports"
      description="Exportable clinical reports generated from anatomy selections and physiology sessions."
    />
  );
}
