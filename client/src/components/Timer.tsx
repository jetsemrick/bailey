import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSingleTimer, formatTime, parseTimeInput } from '../hooks/useTimer';
import { useRoundTimerOptional } from '../contexts/RoundTimerContext';
import {
  PREP_SECONDS,
  speechConstructiveSeconds,
  speechRebuttalSeconds,
} from '../lib/timerPreset';

function TimerUnit({
  label,
  timer,
  accentColor,
}: {
  label: string;
  timer: ReturnType<typeof useSingleTimer>;
  accentColor: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitEdit = () => {
    const seconds = parseTimeInput(editValue);
    if (seconds > 0) timer.setTime(seconds);
    setEditing(false);
  };

  const startEdit = () => {
    setEditValue(formatTime(timer.secondsLeft));
    setEditing(true);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitEdit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-14 px-1.5 py-1 text-sm font-mono bg-card-01 border border-accent rounded focus:outline-none text-foreground"
        placeholder="m:ss"
      />
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-foreground/50">{label}</span>
      <button
        onClick={() => {
          if (timer.running) timer.pause();
          else if (timer.secondsLeft > 0) timer.start();
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          startEdit();
        }}
        className={`px-2 py-1 rounded text-sm font-mono tabular-nums transition-colors ${
          timer.expired ? 'text-red-500 animate-pulse' : 'text-foreground/70 hover:bg-card-02 hover:text-foreground'
        } ${accentColor}`}
        title="Click: start/stop. Double-click: edit time"
      >
        {formatTime(timer.secondsLeft)}
      </button>
    </div>
  );
}

function speechPhaseStorageKey(base: string | null): string | null {
  return base ? `${base}:speechPhase` : null;
}

export default function Timer() {
  const location = useLocation();
  const roundId = location.pathname.match(/^\/round\/([^/]+)/)?.[1] ?? null;
  const optional = useRoundTimerOptional();
  const timerPreset = optional?.timerPreset ?? 'high_school';

  const storageBase = roundId ? `bailey-debate-timer:${roundId}:${timerPreset}` : null;

  const [speechPhase, setSpeechPhase] = useState<'constructive' | 'rebuttal'>('constructive');

  useEffect(() => {
    const sk = speechPhaseStorageKey(storageBase);
    if (!sk) return;
    try {
      const v = sessionStorage.getItem(sk);
      setSpeechPhase(v === 'rebuttal' ? 'rebuttal' : 'constructive');
    } catch {
      /* ignore */
    }
  }, [storageBase]);

  useEffect(() => {
    const sk = speechPhaseStorageKey(storageBase);
    if (!sk) return;
    try {
      sessionStorage.setItem(sk, speechPhase);
    } catch {
      /* ignore */
    }
  }, [storageBase, speechPhase]);

  const affPrep = useSingleTimer(PREP_SECONDS, {
    persistenceKey: storageBase ? `${storageBase}:affPrep` : null,
  });
  const negPrep = useSingleTimer(PREP_SECONDS, {
    persistenceKey: storageBase ? `${storageBase}:negPrep` : null,
  });

  const speechInitial =
    speechPhase === 'constructive'
      ? speechConstructiveSeconds(timerPreset)
      : speechRebuttalSeconds(timerPreset);
  const speech = useSingleTimer(speechInitial, {
    persistenceKey: storageBase ? `${storageBase}:speech:${speechPhase}` : null,
  });

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <TimerUnit label="Aff" timer={affPrep} accentColor="hover:text-blue-600" />
      <TimerUnit label="Neg" timer={negPrep} accentColor="hover:text-red-600" />
      <div className="flex items-center gap-1.5">
        <div className="flex rounded border border-card-04 overflow-hidden text-[10px] shrink-0">
          <button
            type="button"
            onClick={() => setSpeechPhase('constructive')}
            className={`px-1.5 py-0.5 font-medium ${
              speechPhase === 'constructive'
                ? 'bg-accent/15 text-accent'
                : 'bg-card-02 text-foreground/60 hover:bg-card-03'
            }`}
          >
            Constr
          </button>
          <button
            type="button"
            onClick={() => setSpeechPhase('rebuttal')}
            className={`px-1.5 py-0.5 font-medium border-l border-card-04 ${
              speechPhase === 'rebuttal'
                ? 'bg-accent/15 text-accent'
                : 'bg-card-02 text-foreground/60 hover:bg-card-03'
            }`}
          >
            Reb
          </button>
        </div>
        <TimerUnit label="Speech" timer={speech} accentColor="" />
      </div>
    </div>
  );
}
