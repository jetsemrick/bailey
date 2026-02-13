import { useState, type FormEvent } from 'react';

interface RoundFormProps {
  initial?: { round_number: number; opponent: string; side: 'aff' | 'neg'; result: 'W' | 'L' | null };
  onSubmit: (data: { round_number: number; opponent: string; side: 'aff' | 'neg'; result: 'W' | 'L' | null }) => void;
  onCancel: () => void;
  title: string;
}

export default function RoundForm({ initial, onSubmit, onCancel, title }: RoundFormProps) {
  const [roundNumber, setRoundNumber] = useState(initial?.round_number ?? 1);
  const [opponent, setOpponent] = useState(initial?.opponent ?? '');
  const [side, setSide] = useState<'aff' | 'neg'>(initial?.side ?? 'aff');
  const [result, setResult] = useState<'W' | 'L' | ''>(initial?.result ?? '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      round_number: roundNumber,
      opponent: opponent.trim(),
      side,
      result: result === '' ? null : result,
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onCancel} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-card-04 rounded-lg shadow-lg z-50 p-6 w-full max-w-sm">
        <h2 className="text-base font-semibold mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <div className="w-24">
              <label className="block text-sm font-medium mb-1">Round #</label>
              <input
                type="number"
                min="1"
                required
                value={roundNumber}
                onChange={(e) => setRoundNumber(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Opponent</label>
              <input
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
                placeholder="Opponent name"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Side</label>
              <select
                value={side}
                onChange={(e) => setSide(e.target.value as 'aff' | 'neg')}
                className="w-full px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
              >
                <option value="aff">Affirmative</option>
                <option value="neg">Negative</option>
              </select>
            </div>
            <div className="flex-1">
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
          </div>
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
    </>
  );
}
