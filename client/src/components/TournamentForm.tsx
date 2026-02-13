import { useState, type FormEvent } from 'react';

interface TournamentFormProps {
  initial?: { name: string; date: string; location: string };
  onSubmit: (data: { name: string; date: string | null; location: string | null }) => void;
  onCancel: () => void;
  title: string;
}

export default function TournamentForm({ initial, onSubmit, onCancel, title }: TournamentFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [date, setDate] = useState(initial?.date ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), date: date || null, location: location || null });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onCancel} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-card-04 rounded-lg shadow-lg z-50 p-6 w-full max-w-sm">
        <h2 className="text-base font-semibold mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
              placeholder="e.g., Harvard 2025"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
              placeholder="e.g., Cambridge, MA"
            />
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
