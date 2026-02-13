import { useState, type FormEvent } from 'react';

interface NewFlowDialogProps {
  onSubmit: (positionName: string, initiatedBy: 'aff' | 'neg') => void;
  onCancel: () => void;
}

export default function NewFlowDialog({ onSubmit, onCancel }: NewFlowDialogProps) {
  const [name, setName] = useState('');
  const [side, setSide] = useState<'aff' | 'neg'>('aff');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(name.trim() || 'Untitled', side);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onCancel} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-card-04 rounded-lg shadow-lg z-50 p-6 w-full max-w-xs">
        <h2 className="text-base font-semibold mb-4">New Flow Tab</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Position Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
              placeholder="e.g., Case, T, DA, CP, K"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Initiated By</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSide('aff')}
                className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                  side === 'aff'
                    ? 'bg-blue-500/20 text-blue-600 border border-blue-500/30'
                    : 'bg-card-02 text-foreground/70 hover:bg-card-03'
                }`}
              >
                Affirmative
              </button>
              <button
                type="button"
                onClick={() => setSide('neg')}
                className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                  side === 'neg'
                    ? 'bg-red-500/20 text-red-600 border border-red-500/30'
                    : 'bg-card-02 text-foreground/70 hover:bg-card-03'
                }`}
              >
                Negative
              </button>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-1.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              Create
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
