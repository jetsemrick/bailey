import { useState, useRef, useEffect } from 'react';
import { useSingleTimer, formatTime, parseTimeInput } from '../hooks/useTimer';

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

export default function Timer() {
  const affPrep = useSingleTimer(10 * 60);
  const negPrep = useSingleTimer(10 * 60);
  const speech = useSingleTimer(8 * 60);

  return (
    <div className="flex items-center gap-4">
      <TimerUnit label="Aff" timer={affPrep} accentColor="hover:text-blue-600" />
      <TimerUnit label="Neg" timer={negPrep} accentColor="hover:text-red-600" />
      <TimerUnit label="Speech" timer={speech} accentColor="" />
    </div>
  );
}
