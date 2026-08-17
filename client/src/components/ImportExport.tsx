import { useState, useRef } from 'react';
import { exportTournament, exportRound, importTournament, importRound } from '../db/api';
import type { ExportedTournament, ExportedRound } from '../db/api';

interface ImportExportProps {
  mode: 'tournament' | 'round';
  tournamentId?: string;
  tournamentName?: string;
  onImportComplete?: (id: string) => void;
}

export default function ImportExport({ mode, tournamentId, tournamentName, onImportComplete }: ImportExportProps) {
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    if (!tournamentId) return;
    try {
      setError(null);
      const data = mode === 'tournament' 
        ? await exportTournament(tournamentId)
        : await exportRound(tournamentId);
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (tournamentName ?? mode).replace(/[^a-zA-Z0-9]/g, '-');
      a.download = `bailey-${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (mode === 'tournament') {
        if (!data.tournament || !Array.isArray(data.rounds)) {
          throw new Error('Invalid tournament export format');
        }
        const newId = await importTournament(data as ExportedTournament);
        onImportComplete?.(newId);
      } else {
        if (!tournamentId) {
          throw new Error('Tournament ID required for round import');
        }
        if (!data.round) {
          throw new Error('Invalid round export format');
        }
        const newId = await importRound(tournamentId, data as ExportedRound);
        onImportComplete?.(newId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      {mode === 'tournament' && (
        <button
          onClick={handleImportClick}
          disabled={importing}
          className="px-3 py-1.5 text-xs bg-card-02 text-foreground rounded hover:bg-card-03 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {importing ? 'Importing...' : 'Import Tournament'}
        </button>
      )}
      {tournamentId && (
        <>
          {mode === 'round' && (
            <button
              onClick={handleImportClick}
              disabled={importing}
              className="px-3 py-1.5 text-xs bg-card-02 text-foreground rounded hover:bg-card-03 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : 'Import Round'}
            </button>
          )}
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-xs bg-card-02 text-foreground rounded hover:bg-card-03 transition-colors"
          >
            Export {mode === 'tournament' ? 'Tournament' : 'Round'}
          </button>
        </>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
