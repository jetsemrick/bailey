import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Pause, Play, RotateCcw, Timer as TimerIcon } from 'lucide-react';
import { useSingleTimer, formatTime, parseTimeInput } from '../hooks/useTimer';
import { useRoundTimerOptional } from '../contexts/RoundTimerContext';
import {
  PREP_SECONDS,
  speechConstructiveSeconds,
  speechRebuttalSeconds,
} from '../lib/timerPreset';
import { COMPACT_TIMER_LABEL, pickCompactTimer, type CompactTimerId } from '../lib/compactTimer';

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
      {label && <span className="text-xs text-foreground/50">{label}</span>}
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

  const phaseToggle = (
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
  );

  return (
    <>
      <div className="hidden lg:flex items-center gap-3 flex-nowrap">
        <TimerUnit label="Aff" timer={affPrep} accentColor="hover:text-blue-600" />
        <TimerUnit label="Neg" timer={negPrep} accentColor="hover:text-red-600" />
        <div className="flex items-center gap-1.5">
          {phaseToggle}
          <TimerUnit label="Speech" timer={speech} accentColor="" />
        </div>
      </div>
      <CompactTimer
        timers={{ speech, affPrep, negPrep }}
        phaseToggle={phaseToggle}
      />
    </>
  );
}

type TimerApi = ReturnType<typeof useSingleTimer>;

function CompactTimer({
  timers,
  phaseToggle,
}: {
  timers: Record<CompactTimerId, TimerApi>;
  phaseToggle: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const shown = pickCompactTimer(timers);
  const timer = timers[shown];
  const anyRunning = Object.values(timers).some((t) => t.running);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="relative lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded border text-sm font-mono tabular-nums transition-colors ${
          open ? 'border-accent/50 bg-accent/10' : 'border-card-04 hover:bg-card-02'
        } ${timer.expired ? 'text-red-500 animate-pulse' : 'text-foreground/80'}`}
        aria-label={`Timers: ${COMPACT_TIMER_LABEL[shown]} ${formatTime(timer.secondsLeft)}`}
        aria-expanded={open}
        title="Timers"
      >
        <span className="relative flex">
          <TimerIcon size={14} className="text-foreground/50" />
          {anyRunning && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </span>
        {shown !== 'speech' && (
          <span className="font-sans text-[10px] text-foreground/50">
            {shown === 'affPrep' ? 'Aff' : 'Neg'}
          </span>
        )}
        {formatTime(timer.secondsLeft)}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Timers"
            className="absolute right-0 top-full mt-1 z-50 w-72 max-w-[calc(100vw-1rem)] bg-card border border-card-04 rounded-lg shadow-lg p-2 space-y-1"
          >
            <CompactTimerRow label="Speech" timer={timers.speech} extra={phaseToggle} />
            <CompactTimerRow label="Aff prep" timer={timers.affPrep} labelClass="text-blue-600 dark:text-blue-400" />
            <CompactTimerRow label="Neg prep" timer={timers.negPrep} labelClass="text-red-600 dark:text-red-400" />
            <p className="px-1 pt-1 text-[10px] text-foreground/40">Double-click a time to edit it.</p>
          </div>
        </>
      )}
    </div>
  );
}

function CompactTimerRow({
  label,
  timer,
  extra,
  labelClass = 'text-foreground/70',
}: {
  label: string;
  timer: TimerApi;
  extra?: ReactNode;
  labelClass?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-1 py-1 rounded hover:bg-card-01">
      <span className={`text-xs font-medium w-14 shrink-0 ${labelClass}`}>{label}</span>
      <div className="flex-1 flex items-center gap-1.5 min-w-0">
        {extra}
        <TimerUnit label="" timer={timer} accentColor="" />
      </div>
      <button
        type="button"
        onClick={() => (timer.running ? timer.pause() : timer.secondsLeft > 0 && timer.start())}
        className="p-1.5 rounded text-foreground/60 hover:bg-card-02 hover:text-accent"
        aria-label={`${timer.running ? 'Pause' : 'Start'} ${label}`}
      >
        {timer.running ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button
        type="button"
        onClick={() => timer.reset()}
        className="p-1.5 rounded text-foreground/60 hover:bg-card-02 hover:text-foreground"
        aria-label={`Reset ${label}`}
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
}
