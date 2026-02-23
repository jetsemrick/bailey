import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../db/api';

interface RoundAnalyticsProps {
  roundId: string;
  /**
   * When true (judge mode), show Aff/Neg notes; when false (competitor), show Decision/Judge notes.
   * Note: In competitor mode, the `notes_neg` database field is reused to store general "Judge Notes"
   * (distinct from the "Negative Feedback" meaning it has in judge mode). This dual usage is intentional
   * to avoid adding extra database columns for what is essentially similar feedback data.
   */
  isJudgeMode?: boolean;
  /**
   * When true, render only the "Reason for Decision" textarea in a single vertical column (omit Aff/Neg feedback to save space).
   */
  compact?: boolean;
}

export default function RoundAnalytics({ roundId, isJudgeMode, compact }: RoundAnalyticsProps) {
  const [notesAff, setNotesAff] = useState('');
  const [notesNeg, setNotesNeg] = useState('');
  const [notesDecision, setNotesDecision] = useState('');
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLoading(true);
    setLoaded(false);
    setError(null);
    setNotesAff('');
    setNotesNeg('');
    setNotesDecision('');
    api
      .getRoundAnalytics(roundId)
      .then((a) => {
        if (a) {
          setNotesAff(a.notes_aff ?? '');
          setNotesNeg(a.notes_neg ?? '');
          setNotesDecision(a.notes_decision ?? '');
        }
        setLoaded(true);
      })
      .catch(() => {
        setError('Failed to load analytics. Please refresh the page.');
      })
      .finally(() => setLoading(false));
  }, [roundId]);

  const notesAffRef = useRef(notesAff);
  const notesNegRef = useRef(notesNeg);
  const notesDecisionRef = useRef(notesDecision);
  const loadedRef = useRef(loaded);
  notesAffRef.current = notesAff;
  notesNegRef.current = notesNeg;
  notesDecisionRef.current = notesDecision;
  loadedRef.current = loaded;

  const saveNotes = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!loadedRef.current) return;
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

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500 text-sm">
        {error}
      </div>
    );
  }

  if (isJudgeMode) {
    if (compact) {
      return (
        <div className="flex-1 overflow-auto p-4 w-full mx-auto flex flex-col h-full">
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
              placeholder="Enter your RFD..."
              className="flex-1 w-full p-4 rounded-lg border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm resize-none leading-relaxed"
            />
          </div>
        </div>
      );
    }
    
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
            value={notesDecision}
            onChange={(e) => {
              setNotesDecision(e.target.value);
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
