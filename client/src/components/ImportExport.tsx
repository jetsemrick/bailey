import { useRef, useState } from 'react';
import { exportTournament, importTournament, type ExportedTournament } from '../db/api';

interface ImportExportProps {
  tournamentId?: string;
  tournamentName?: string;
  onImportComplete?: (newTournamentId: string) => void;
}

export default function ImportExport({ tournamentId, tournamentName, onImportComplete }: ImportExportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
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

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportedTournament;
      // Basic validation
      if (!data.tournament || !Array.isArray(data.rounds)) {
        throw new Error('Invalid file format');
      }
      const newId = await importTournament(data);
      onImportComplete?.(newId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
      // Reset file input
      if (fileRef.current) fileRef.current.value = '';
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
      <label className="px-3 py-1.5 text-xs bg-card-02 text-foreground rounded hover:bg-card-03 transition-colors cursor-pointer">
        {importing ? 'Importing...' : 'Import'}
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
          disabled={importing}
        />
      </label>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
