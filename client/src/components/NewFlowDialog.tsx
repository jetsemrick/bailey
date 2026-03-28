import { useState, type FormEvent } from 'react';
import type { FlowTabKind } from '../db/types';

interface NewFlowDialogProps {
  onSubmit: (initiatedBy: 'aff' | 'neg', count: number, tabKind?: FlowTabKind) => void;
  onCancel: () => void;
  /** When true, CX option is disabled (DEB-28: one CX per round). */
  hasCxTab?: boolean;
}

export default function NewFlowDialog({ onSubmit, onCancel, hasCxTab = false }: NewFlowDialogProps) {
  const [count, setCount] = useState(1);
  const [side, setSide] = useState<'aff' | 'neg'>('aff');
  const [sheetKind, setSheetKind] = useState<'standard' | 'cx'>('standard');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (sheetKind === 'cx') {
        await onSubmit('aff', 1, 'cx');
      } else {
        await onSubmit(side, Math.max(1, count), 'standard');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onCancel} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-card-04 rounded-lg shadow-lg z-50 p-6 w-full max-w-xs">
        <h2 className="text-base font-semibold mb-4">Add Flow Tabs</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Sheet type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSheetKind('standard')}
                className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                  sheetKind === 'standard'
                    ? 'bg-accent/15 text-accent border border-accent/40'
                    : 'bg-card-02 text-foreground/70 hover:bg-card-03'
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                disabled={hasCxTab}
                onClick={() => setSheetKind('cx')}
                title={hasCxTab ? 'This round already has a CX tab' : 'Cross-examination (one per round)'}
                className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                  sheetKind === 'cx'
                    ? 'bg-accent/15 text-accent border border-accent/40'
                    : 'bg-card-02 text-foreground/70 hover:bg-card-03'
                } ${hasCxTab ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                CX
              </button>
            </div>
            {sheetKind === 'cx' && (
              <p className="text-xs text-foreground/50 mt-1">
                Full speech grid like an affirmative flow. Only one CX tab per round.
              </p>
            )}
          </div>
          {sheetKind === 'standard' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Number of Tabs</label>
                <input
                  autoFocus
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
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
            </>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting || (sheetKind === 'cx' && hasCxTab)}
              className="flex-1 py-1.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:pointer-events-none"
            >
              {sheetKind === 'cx'
                ? 'Create CX tab'
                : count > 1
                  ? `Create ${count} Tabs`
                  : 'Create Tab'}
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
