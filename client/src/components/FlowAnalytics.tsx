import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../db/api';
import { SPEECH_COLUMNS, COLUMN_META } from '../db/types';
import type { Flow } from '../db/types';

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

interface FlowAnalyticsProps {
  flow: Flow;
  getCellContent: (col: number, row: number) => string;
  getColumnRowCount: (col: number) => number;
}

export default function FlowAnalytics({ flow, getCellContent, getColumnRowCount }: FlowAnalyticsProps) {
  const [notesAff, setNotesAff] = useState('');
  const [notesNeg, setNotesNeg] = useState('');
  const [loading, setLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api
      .getFlowAnalytics(flow.id)
      .then((a) => {
        if (a) {
          setNotesAff(a.notes_aff ?? '');
          setNotesNeg(a.notes_neg ?? '');
        }
      })
      .finally(() => setLoading(false));
  }, [flow.id]);

  const notesAffRef = useRef(notesAff);
  const notesNegRef = useRef(notesNeg);
  notesAffRef.current = notesAff;
  notesNegRef.current = notesNeg;

  const saveNotes = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    api
      .upsertFlowAnalytics(flow.id, {
        notes_aff: notesAffRef.current,
        notes_neg: notesNegRef.current,
      })
      .catch(() => {});
  }, [flow.id]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveNotes, 500);
  }, [saveNotes]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveNotes();
    };
  }, [saveNotes]);

  // Compute analytics from cells
  const analytics = [];
  let totalWords = 0;
  let affWords = 0;
  let negWords = 0;
  for (let col = 0; col < 8; col++) {
    const label = SPEECH_COLUMNS[col];
    const meta = COLUMN_META[label];
    let colWords = 0;
    const rowCount = getColumnRowCount(col);
    for (let row = 0; row < rowCount; row++) {
      const content = getCellContent(col, row);
      const w = wordCount(content);
      colWords += w;
      totalWords += w;
      if (meta.side === 'aff') affWords += w;
      else negWords += w;
    }
    analytics.push({ label, side: meta.side, words: colWords });
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-foreground/40 text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 w-full mx-auto flex flex-col h-full">
      <div className="flex-1 flex flex-col gap-6 min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          <label className="block text-sm font-semibold text-foreground/80 mb-2 uppercase tracking-wide">
            Affirmative Notes
          </label>
          <textarea
            value={notesAff}
            onChange={(e) => {
              setNotesAff(e.target.value);
              scheduleSave();
            }}
            onBlur={saveNotes}
            placeholder="Key arguments, strategy, feedback..."
            className="flex-1 w-full p-4 rounded-lg border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm resize-none leading-relaxed"
          />
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <label className="block text-sm font-semibold text-foreground/80 mb-2 uppercase tracking-wide">
            Negative Notes
          </label>
          <textarea
            value={notesNeg}
            onChange={(e) => {
              setNotesNeg(e.target.value);
              scheduleSave();
            }}
            onBlur={saveNotes}
            placeholder="Key arguments, strategy, feedback..."
            className="flex-1 w-full p-4 rounded-lg border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm resize-none leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
