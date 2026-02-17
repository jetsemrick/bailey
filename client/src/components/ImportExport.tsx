import { useState } from 'react';
import { exportTournament } from '../db/api';

interface ImportExportProps {
  tournamentId?: string;
  tournamentName?: string;
}

export default function ImportExport({ tournamentId, tournamentName }: ImportExportProps) {
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!tournamentId) return;
    try {
      const data = await exportTournament(tournamentId);
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (tournamentName ?? 'tournament').replace(/[^a-zA-Z0-9]/g, '-');
      a.download = `bailey-${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  return (
    <div className="flex items-center gap-2">
      {tournamentId && (
        <button
          onClick={handleExport}
          className="px-3 py-1.5 text-xs bg-card-02 text-foreground rounded hover:bg-card-03 transition-colors"
        >
          Export
        </button>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
