import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../db/api';

interface RoundAnalyticsProps {
  roundId: string;
  /** When true (judge mode), show Aff/Neg notes; when false (competitor), show Decision/Judge notes */
  isJudgeMode?: boolean;
}

export default function RoundAnalytics({ roundId, isJudgeMode }: RoundAnalyticsProps) {
  const [notesAff, setNotesAff] = useState('');
  const [notesNeg, setNotesNeg] = useState('');
  const [notesDecision, setNotesDecision] = useState('');
  const [loading, setLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api
      .getRoundAnalytics(roundId)
      .then((a) => {
        if (a) {
          setNotesAff(a.notes_aff ?? '');
          setNotesNeg(a.notes_neg ?? '');
          setNotesDecision(a.notes_decision ?? '');
        }
      })
      .finally(() => setLoading(false));
  }, [roundId]);

  const notesAffRef = useRef(notesAff);
  const notesNegRef = useRef(notesNeg);
  const notesDecisionRef = useRef(notesDecision);
  notesAffRef.current = notesAff;
  notesNegRef.current = notesNeg;
  notesDecisionRef.current = notesDecision;

  const saveNotes = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    api
      .upsertRoundAnalytics(roundId, {
        notes_aff: notesAffRef.current,
        notes_neg: notesNegRef.current,
        notes_decision: notesDecisionRef.current,
      })
      .catch(() => {});
  }, [roundId]);

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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-foreground/40 text-sm">
        Loading...
      </div>
    );
  }

  if (isJudgeMode) {
    return (
      <div className="flex-1 overflow-auto p-6 w-full mx-auto flex flex-col h-full">
        <div className="flex-1 flex gap-6 min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            <label className="block text-sm font-semibold text-foreground/80 mb-2 uppercase tracking-wide">
              Reason for Decision
            </label>
            <textarea
              value={notesDecision}
              onChange={(e) => {
                setNotesDecision(e.target.value);
                scheduleSave();
              }}
              onBlur={saveNotes}
              placeholder="Feedback..."
              className="flex-1 w-full p-4 rounded-lg border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm resize-none leading-relaxed"
            />
          </div>
          <div className="flex-1 flex flex-col gap-6 min-h-0">
            <div className="flex-1 flex flex-col min-h-0">
              <label className="block text-sm font-semibold text-foreground/80 mb-2 uppercase tracking-wide">
                Affirmative Feedback
              </label>
              <textarea
                value={notesAff}
                onChange={(e) => {
                  setNotesAff(e.target.value);
                  scheduleSave();
                }}
                onBlur={saveNotes}
                placeholder="Feedback..."
                className="flex-1 w-full p-4 rounded-lg border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm resize-none leading-relaxed"
              />
            </div>
            <div className="flex-1 flex flex-col min-h-0">
              <label className="block text-sm font-semibold text-foreground/80 mb-2 uppercase tracking-wide">
                Negative Feedback
              </label>
              <textarea
                value={notesNeg}
                onChange={(e) => {
                  setNotesNeg(e.target.value);
                  scheduleSave();
                }}
                onBlur={saveNotes}
                placeholder="Feedback..."
                className="flex-1 w-full p-4 rounded-lg border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm resize-none leading-relaxed"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 w-full mx-auto flex flex-col h-full">
      <div className="flex-1 flex flex-col gap-6 min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          <label className="block text-sm font-semibold text-foreground/80 mb-2 uppercase tracking-wide">
            Decision Notes
          </label>
          <textarea
            value={notesAff}
            onChange={(e) => {
              setNotesAff(e.target.value);
              scheduleSave();
            }}
            onBlur={saveNotes}
            placeholder="Decision feedback..."
            className="flex-1 w-full p-4 rounded-lg border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm resize-none leading-relaxed"
          />
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <label className="block text-sm font-semibold text-foreground/80 mb-2 uppercase tracking-wide">
            Judge Notes
          </label>
          <textarea
            value={notesNeg}
            onChange={(e) => {
              setNotesNeg(e.target.value);
              scheduleSave();
            }}
            onBlur={saveNotes}
            placeholder="Judge feedback..."
            className="flex-1 w-full p-4 rounded-lg border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm resize-none leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
