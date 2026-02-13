import { useState } from 'react';
import { useTimer, formatTime, type TimerPreset } from '../hooks/useTimer';

const PRESETS: { label: string; value: TimerPreset }[] = [
  { label: 'Constructive (8:00)', value: 'constructive' },
  { label: 'Rebuttal (5:00)', value: 'rebuttal' },
  { label: 'Cross-Ex (3:00)', value: 'crossex' },
  { label: 'Prep', value: 'prep' },
];

export default function Timer() {
  const timer = useTimer();
  const [collapsed, setCollapsed] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [customSeconds, setCustomSeconds] = useState('');

  const handleCustomSet = () => {
    const m = parseInt(customMinutes, 10) || 0;
    const s = parseInt(customSeconds, 10) || 0;
    if (m > 0 || s > 0) {
      timer.setCustomTime(m * 60 + s);
    }
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 right-4 z-30 bg-card border border-card-04 rounded-lg shadow-lg px-3 py-2 text-sm font-mono hover:bg-card-01 transition-colors"
      >
        {formatTime(timer.secondsLeft)}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-30 bg-card border border-card-04 rounded-lg shadow-lg w-72">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-card-04">
        <span className="text-xs font-medium text-foreground/60">Speech Timer</span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-foreground/40 hover:text-foreground transition-colors text-xs"
        >
          minimize
        </button>
      </div>

      {/* Timer display */}
      <div className="px-3 py-4 text-center">
        <div
          className={`text-4xl font-mono font-bold tabular-nums ${
            timer.expired ? 'text-red-500 animate-pulse' : 'text-foreground'
          }`}
        >
          {formatTime(timer.secondsLeft)}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2 px-3 pb-3">
        {!timer.running ? (
          <button
            onClick={timer.start}
            disabled={timer.secondsLeft === 0}
            className="px-4 py-1.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors"
          >
            Start
          </button>
        ) : (
          <button
            onClick={timer.pause}
            className="px-4 py-1.5 bg-card-03 text-foreground rounded text-sm font-medium hover:bg-card-04 transition-colors"
          >
            Pause
          </button>
        )}
        <button
          onClick={timer.reset}
          className="px-4 py-1.5 bg-card-02 text-foreground rounded text-sm font-medium hover:bg-card-03 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Presets */}
      <div className="px-3 pb-2 grid grid-cols-2 gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => timer.setPreset(p.value)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              timer.activePreset === p.value
                ? 'bg-accent/10 text-accent border border-accent/30'
                : 'bg-card-01 text-foreground/70 hover:bg-card-02'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom time */}
      <div className="px-3 pb-2 flex items-center gap-1">
        <input
          type="number"
          min="0"
          max="99"
          placeholder="min"
          value={customMinutes}
          onChange={(e) => setCustomMinutes(e.target.value)}
          className="w-14 px-1.5 py-1 text-xs bg-card-01 border border-card-04 rounded focus:outline-none focus:border-accent text-foreground"
        />
        <span className="text-foreground/40 text-xs">:</span>
        <input
          type="number"
          min="0"
          max="59"
          placeholder="sec"
          value={customSeconds}
          onChange={(e) => setCustomSeconds(e.target.value)}
          className="w-14 px-1.5 py-1 text-xs bg-card-01 border border-card-04 rounded focus:outline-none focus:border-accent text-foreground"
        />
        <button
          onClick={handleCustomSet}
          className="px-2 py-1 text-xs bg-card-02 rounded hover:bg-card-03 transition-colors text-foreground"
        >
          Set
        </button>
      </div>

      {/* Prep time section */}
      <div className="px-3 pb-3 border-t border-card-04 pt-2">
        <div className="text-xs font-medium text-foreground/60 mb-1">Prep Time</div>
        <div className="flex gap-1">
          <button
            onClick={() => {
              timer.switchPrepSide('aff');
              timer.setPreset('prep');
            }}
            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
              timer.prepSide === 'aff' && timer.activePreset === 'prep'
                ? 'bg-blue-500/20 text-blue-600 border border-blue-500/30'
                : 'bg-card-01 text-foreground/70 hover:bg-card-02'
            }`}
          >
            Aff: {formatTime(timer.prepTime.aff)}
          </button>
          <button
            onClick={() => {
              timer.switchPrepSide('neg');
              timer.setPreset('prep');
            }}
            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
              timer.prepSide === 'neg' && timer.activePreset === 'prep'
                ? 'bg-red-500/20 text-red-600 border border-red-500/30'
                : 'bg-card-01 text-foreground/70 hover:bg-card-02'
            }`}
          >
            Neg: {formatTime(timer.prepTime.neg)}
          </button>
        </div>
      </div>
    </div>
  );
}
