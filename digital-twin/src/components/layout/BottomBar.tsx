import { usePhysiologyPlayback } from '../../engine/usePhysiologyPlayback';
import { Badge } from '../common';

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const centis = Math.floor((totalSeconds * 100) % 100);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

const SPEEDS = [0.5, 1, 2, 4];
const SCRUB_WINDOW_SECONDS = 60;

export function BottomBar() {
  const { isPlaying, speed, currentTime, play, pause, reset, setSpeed, scrubTo } = usePhysiologyPlayback();

  return (
    <div className="flex h-full items-center gap-4 px-4 text-xs">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => (isPlaying ? pause() : play())}
          className="flex h-7 w-7 items-center justify-center rounded border border-hud-border bg-hud-panel2 text-hud-cyan transition-colors hover:border-hud-cyan"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex h-7 w-7 items-center justify-center rounded border border-hud-border bg-hud-panel2 text-hud-muted transition-colors hover:text-hud-text"
          aria-label="Reset"
          title="Reset"
        >
          ⟲
        </button>
      </div>

      <div className="flex flex-1 items-center gap-3">
        <span className="hud-panel-title whitespace-nowrap !pb-0 !pt-0">4D Time</span>
        <input
          type="range"
          min={0}
          max={SCRUB_WINDOW_SECONDS}
          step={0.05}
          value={currentTime % SCRUB_WINDOW_SECONDS}
          onChange={(e) => scrubTo(Number(e.target.value))}
          className="h-1 flex-1 cursor-pointer accent-[#3498db]"
        />
        <span className="w-20 font-mono text-hud-text">{formatTime(currentTime)}</span>
      </div>

      <div className="flex items-center gap-1">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpeed(s)}
            className={`rounded px-1.5 py-0.5 font-mono text-[11px] transition-colors ${
              speed === s ? 'bg-hud-cyan/15 text-hud-cyan' : 'text-hud-muted hover:text-hud-text'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      <div className="hidden items-center gap-4 border-l border-hud-border pl-4 lg:flex">
        <div>
          <div className="text-[10px] uppercase text-hud-muted">Data Source</div>
          <div className="flex items-center gap-1.5 font-mono text-hud-text">
            3D Body Scan
            <span className="hud-status-dot h-1.5 w-1.5 rounded-full bg-hud-green" />
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-hud-muted">Physiological Time</div>
          <div className="font-mono text-hud-text">{currentTime.toFixed(1)} s</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-hud-muted">Status</div>
          <div className="font-mono text-hud-green">Normal</div>
        </div>
        <Badge tone="mock">Mock Physiology</Badge>
      </div>
    </div>
  );
}
