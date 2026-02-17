import { useState, type FormEvent } from 'react';
import { ROUND_OPTIONS } from '../db/types';

interface RoundFormProps {
  initial?: {
    round_number: number;
    opponent: string;
    team_aff: string;
    team_neg: string;
    side: 'aff' | 'neg';
    result: 'W' | 'L' | null;
  };
  onSubmit: (data: {
    round_number: number;
    opponent: string;
    team_aff: string;
    team_neg: string;
    side: 'aff' | 'neg';
    result: 'W' | 'L' | null;
  }) => void;
  onCancel: () => void;
  title: string;
  /** When true (judge mode), show Aff/Neg teams; when false (competitor), show Your Side + Opponent */
  isJudgeMode?: boolean;
  /** User's team name for competitor mode (from tournament.team_name) */
  teamName?: string;
}

export default function RoundForm({ initial, onSubmit, onCancel, title, isJudgeMode, teamName }: RoundFormProps) {
  const validInitial = initial?.round_number != null && ROUND_OPTIONS.some((o) => o.value === initial!.round_number)
    ? initial!.round_number
    : 1;
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
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Round</label>
            <select
              required
              value={roundNumber}
              onChange={(e) => setRoundNumber(parseInt(e.target.value, 10))}
              className="w-full px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
            >
              {ROUND_OPTIONS.map((o) => (
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
      </div>
    </div>
  );
}
