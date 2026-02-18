import { useState, type FormEvent } from 'react';
import { ROUND_OPTIONS } from '../db/types';
import { useAuth } from '../auth/AuthContext';

interface RoundFormProps {
  initial?: {
    round_number: number;
    opponent: string;
    team_aff: string;
    team_neg: string;
    side: 'aff' | 'neg';
    result: 'W' | 'L' | null;
    judge: string;
  };
  /** Round numbers already used by other rounds (exclude when editing) */
  takenRoundNumbers?: number[];
  onSubmit: (data: {
    round_number: number;
    opponent: string;
    team_aff: string;
    team_neg: string;
    side: 'aff' | 'neg';
    result: 'W' | 'L' | null;
    judge: string;
  }) => void;
  onCancel: () => void;
  title: string;
  /** When true (judge mode), show Aff/Neg teams; when false (competitor), show Your Side + Opponent */
  isJudgeMode?: boolean;
  /** User's team name for competitor mode (from tournament.team_name) */
  teamName?: string;
}

export default function RoundForm({ initial, takenRoundNumbers = [], onSubmit, onCancel, title, isJudgeMode, teamName }: RoundFormProps) {
  const { user } = useAuth();
  const meta = user?.user_metadata as { first_name?: string; last_name?: string } | undefined;
  const userDisplayName = [meta?.first_name, meta?.last_name].filter(Boolean).join(' ');

  const baseAvailableOptions = ROUND_OPTIONS.filter((o) => !takenRoundNumbers.includes(o.value));
  // When editing, always include the current round_number even if outside ROUND_OPTIONS (1-14)
  const initialRoundNum = initial?.round_number;
  const initialInOptions = initialRoundNum != null && ROUND_OPTIONS.some((o) => o.value === initialRoundNum);
  const availableOptions =
    initialRoundNum != null && !initialInOptions
      ? [{ value: initialRoundNum, label: `Round ${initialRoundNum}` }, ...baseAvailableOptions]
      : baseAvailableOptions;
  const noRoundsAvailable = availableOptions.length === 0;
  const validInitial =
    initialRoundNum != null && availableOptions.some((o) => o.value === initialRoundNum)
      ? initialRoundNum
      : availableOptions[0]?.value ?? 1;
  const [roundNumber, setRoundNumber] = useState(validInitial);
  const [teamAff, setTeamAff] = useState(
    initial?.team_aff ?? (initial?.side === 'neg' ? initial?.opponent ?? '' : '')
  );
  const [teamNeg, setTeamNeg] = useState(
    initial?.team_neg ?? (initial?.side === 'aff' ? initial?.opponent ?? '' : '')
  );
  const [opponent, setOpponent] = useState(
    initial?.side === 'aff' ? (initial?.team_neg ?? '') : initial?.side === 'neg' ? (initial?.team_aff ?? '') : ''
  );
  const [side, setSide] = useState<'aff' | 'neg'>(initial?.side ?? 'aff');
  const [result, setResult] = useState<'W' | 'L' | ''>(initial?.result ?? '');
  const parseJudges = (s: string | undefined): string[] => {
    if (!s?.trim()) return isJudgeMode ? [] : [''];
    const delimiter = s.includes('|') ? '|' : ',';
    const arr = s.split(delimiter).map((j) => j.trim()).filter(Boolean);
    return arr.length ? arr : isJudgeMode ? [] : [''];
  };
  const [judges, setJudges] = useState<string[]>(() => parseJudges(initial?.judge));

  const addJudge = () => setJudges((prev) => [...prev, '']);
  const addMeAsJudge = () => setJudges((prev) => [...prev, userDisplayName]);
  const removeJudge = (i: number) =>
    setJudges((prev) =>
      isJudgeMode ? prev.filter((_, idx) => idx !== i) : prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev
    );
  const setJudgeAt = (i: number, value: string) =>
    setJudges((prev) => prev.map((j, idx) => (idx === i ? value : j)));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isJudgeMode) {
      onSubmit({
        round_number: roundNumber,
        opponent: '',
        team_aff: teamAff.trim(),
        team_neg: teamNeg.trim(),
        side: 'aff',
        result: null,
        judge: judges.filter((j) => j.trim()).join(' | '),
      });
    } else {
      const myTeam = (teamName ?? '').trim();
      const opp = opponent.trim();
      onSubmit({
        round_number: roundNumber,
        opponent: opp,
        team_aff: side === 'aff' ? myTeam : opp,
        team_neg: side === 'neg' ? myTeam : opp,
        side,
        result: result === '' ? null : result,
        judge: judges.filter((j) => j.trim()).join(' | '),
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 z-40" onClick={onCancel}>
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-card-04 rounded-lg shadow-lg z-50 p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-4">{title}</h2>
        {noRoundsAvailable ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground/60">All round slots are filled. You cannot add more rounds to this tournament.</p>
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-1.5 bg-card-02 text-foreground rounded text-sm font-medium hover:bg-card-03 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Round</label>
            <select
              required
              value={availableOptions.some((o) => o.value === roundNumber) ? roundNumber : availableOptions[0]?.value ?? 1}
              onChange={(e) => setRoundNumber(parseInt(e.target.value, 10))}
              className="w-full px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
            >
              {availableOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {isJudgeMode ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Affirmative Team</label>
                <input
                  required
                  value={teamAff}
                  onChange={(e) => setTeamAff(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
                  placeholder="Team name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Negative Team</label>
                <input
                  required
                  value={teamNeg}
                  onChange={(e) => setTeamNeg(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
                  placeholder="Team name"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Your Side</label>
                <select
                  value={side}
                  onChange={(e) => setSide(e.target.value as 'aff' | 'neg')}
                  className="w-full px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
                >
                  <option value="aff">Affirmative</option>
                  <option value="neg">Negative</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Opponent</label>
                <input
                  required
                  value={opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
                  placeholder="e.g., Harvard KS"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">Judge</label>
                  <button
                    type="button"
                    onClick={addJudge}
                    className="text-accent text-sm font-medium hover:underline"
                    aria-label="Add judge"
                  >
                    + Add
                  </button>
                </div>
                <div className="space-y-2">
                  {judges.map((j, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={j}
                        onChange={(e) => setJudgeAt(i, e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
                        placeholder="Judge name"
                      />
                      {judges.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeJudge(i)}
                          className="px-2 py-1.5 text-foreground/60 hover:text-foreground text-sm"
                          aria-label="Remove judge"
                        >
                          x
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Result</label>
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value as 'W' | 'L' | '')}
                  className="w-full px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
                >
                  <option value="">Pending</option>
                  <option value="W">Win</option>
                  <option value="L">Loss</option>
                </select>
              </div>
            </>
          )}
          {isJudgeMode && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Panel</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addJudge}
                    className="text-accent text-sm font-medium hover:underline"
                    aria-label="Add judge"
                  >
                    + Add
                  </button>
                  {userDisplayName && (
                    <button
                      type="button"
                      onClick={addMeAsJudge}
                      className="text-accent text-sm font-medium hover:underline"
                      aria-label="Add me"
                    >
                      + Add me
                    </button>
                  )}
                </div>
              </div>
              {judges.length > 0 && (
                <div className="space-y-2">
                  {judges.map((j, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={j}
                        onChange={(e) => setJudgeAt(i, e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
                        placeholder="Judge name"
                      />
                      <button
                        type="button"
                        onClick={() => removeJudge(i)}
                        className="px-2 py-1.5 text-foreground/60 hover:text-foreground text-sm"
                        aria-label="Remove judge"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-1.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-1.5 bg-card-02 text-foreground rounded text-sm font-medium hover:bg-card-03 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
