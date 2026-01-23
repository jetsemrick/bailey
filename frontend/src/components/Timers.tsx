import { useState, useEffect, useRef } from 'react';

type TimerType = 'speech' | 'affPrep' | 'negPrep';

interface TimerState {
  duration: number;
  remaining: number;
  running: boolean;
  startTime: number | null;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.max(0, seconds) % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function parseTime(timeString: string): number {
  const parts = timeString.split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return mins * 60 + secs;
  }
  const total = parseInt(timeString, 10) || 0;
  return total;
}

export default function Timers() {
  const [timers, setTimers] = useState<Record<TimerType, TimerState>>({
    speech: { duration: 600, remaining: 600, running: false, startTime: null },
    affPrep: { duration: 300, remaining: 300, running: false, startTime: null },
    negPrep: { duration: 300, remaining: 300, running: false, startTime: null },
  });
  
  const [editingTimer, setEditingTimer] = useState<TimerType | null>(null);
  const [editTimerValue, setEditTimerValue] = useState('');
  const timerInputRefs = useRef<Record<TimerType, HTMLInputElement | null>>({
    speech: null,
    affPrep: null,
    negPrep: null,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          const timer = updated[key as TimerType];
          if (timer.running && timer.startTime !== null) {
            const now = Date.now();
            const elapsed = Math.floor((now - timer.startTime) / 1000);
            const remaining = Math.max(0, timer.duration - elapsed);
            timer.remaining = remaining;
            if (remaining === 0) {
              timer.running = false;
              timer.startTime = null;
            }
          }
        });
        return updated;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (editingTimer && timerInputRefs.current[editingTimer]) {
      timerInputRefs.current[editingTimer]?.focus();
      timerInputRefs.current[editingTimer]?.select();
    }
  }, [editingTimer]);

  const toggleTimer = (type: TimerType) => {
    if (editingTimer === type) return;
    
    setTimers((prev) => {
      const timer = prev[type];
      if (timer.running) {
        return {
          ...prev,
          [type]: {
            ...timer,
            running: false,
            startTime: null,
          },
        };
      } else {
        const now = Date.now();
        const elapsed = timer.duration - timer.remaining;
        return {
          ...prev,
          [type]: {
            ...timer,
            running: true,
            startTime: now - elapsed * 1000,
          },
        };
      }
    });
  };

  const resetTimer = (type: TimerType, e: React.MouseEvent) => {
    e.stopPropagation();
    setTimers((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        remaining: prev[type].duration,
        running: false,
        startTime: null,
      },
    }));
  };

  const setSpeechTimer = (seconds: number) => {
    setTimers((prev) => ({
      ...prev,
      speech: {
        duration: seconds,
        remaining: seconds,
        running: false,
        startTime: null,
      },
    }));
  };

  const startEditingTimer = (type: TimerType, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTimer(type);
    setEditTimerValue(formatTime(timers[type].remaining));
  };

  const handleTimerBlur = (type: TimerType) => {
    setEditingTimer(null);
    const newDuration = parseTime(editTimerValue);
    if (newDuration > 0) {
      setTimers((prev) => ({
        ...prev,
        [type]: {
          duration: newDuration,
          remaining: newDuration,
          running: false,
          startTime: null,
        },
      }));
    } else {
      setEditTimerValue(formatTime(timers[type].remaining));
    }
  };

  const handleTimerKeyDown = (type: TimerType, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTimerBlur(type);
    } else if (e.key === 'Escape') {
      setEditingTimer(null);
      setEditTimerValue(formatTime(timers[type].remaining));
    }
  };

  return (
    <div className="flex items-center gap-3">
      {(['speech', 'affPrep', 'negPrep'] as TimerType[]).map((type) => {
        const timer = timers[type];
        const label = type === 'speech' ? 'Speech' : type === 'affPrep' ? 'Aff Prep' : 'Neg Prep';
        const isEditing = editingTimer === type;
        const isExpired = timer.remaining === 0 && !timer.running;
        
        return (
          <div
            key={type}
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-card-02 transition-colors"
          >
            <span className="text-xs text-foreground/60 font-medium">{label}:</span>
            {isEditing ? (
              <input
                ref={(el) => {
                  timerInputRefs.current[type] = el;
                }}
                value={editTimerValue}
                onChange={(e) => setEditTimerValue(e.target.value)}
                onBlur={() => handleTimerBlur(type)}
                onKeyDown={(e) => handleTimerKeyDown(type, e)}
                onClick={(e) => e.stopPropagation()}
                className="bg-card border border-accent rounded px-1 py-0.5 text-sm font-mono font-semibold focus:outline-none w-16 text-center"
                placeholder="MM:SS"
              />
            ) : (
              <span
                className={`text-sm font-mono font-semibold cursor-pointer ${
                  timer.running
                    ? 'text-accent'
                    : isExpired
                    ? 'text-foreground/40'
                    : 'text-foreground'
                }`}
                onClick={(e) => startEditingTimer(type, e)}
                title="Click to edit time"
              >
                {formatTime(timer.remaining)}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleTimer(type);
              }}
              className="ml-1 px-1.5 py-0.5 text-xs bg-card-02 hover:bg-card-03 rounded transition-colors"
              title={timer.running ? 'Stop' : 'Start'}
            >
              {timer.running ? '⏸' : '▶'}
            </button>
            {type === 'speech' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSpeechTimer(480);
                  }}
                  className="px-1.5 py-0.5 text-xs bg-card-02 hover:bg-card-03 rounded transition-colors"
                  title="Set to 8:00"
                >
                  C
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSpeechTimer(300);
                  }}
                  className="px-1.5 py-0.5 text-xs bg-card-02 hover:bg-card-03 rounded transition-colors"
                  title="Set to 5:00"
                >
                  R
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
