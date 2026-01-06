import { useState, useEffect, useCallback } from 'react';
import { api, Flow, Cell } from '../api/client';

export function useFlow(flowId: string | null) {
  const [flow, setFlow] = useState<Flow | null>(null);
  const [currentSheetId, setCurrentSheetId] = useState<string | null>(null);
  const [cells, setCells] = useState<Map<string, Cell>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCellsForSheet = useCallback(async (sheetId: string) => {
    try {
      const cellsData = await api.sheets.getCells(sheetId);
      const cellsMap = new Map<string, Cell>();
      cellsData.forEach((cell) => {
        const key = `${cell.row}-${cell.column}`;
        cellsMap.set(key, cell);
      });
      setCells(cellsMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cells');
    }
  }, []);

  const loadFlow = useCallback(async () => {
    if (!flowId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.flows.get(flowId);
      setFlow(data);
      if (data.sheets.length > 0) {
        const firstSheetId = data.sheets[0].id;
        setCurrentSheetId(firstSheetId);
        await loadCellsForSheet(firstSheetId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flow');
    } finally {
      setLoading(false);
    }
  }, [flowId, loadCellsForSheet]);

  useEffect(() => {
    loadFlow();
  }, [loadFlow]);

  const handleSetCurrentSheetId = useCallback((sheetId: string) => {
    setCurrentSheetId(sheetId);
    loadCellsForSheet(sheetId);
  }, [loadCellsForSheet]);

  const updateCell = useCallback(async (row: number, column: number, content: string) => {
    if (!currentSheetId) return;
    
    const key = `${row}-${column}`;
    const newCell: Cell = {
      id: cells.get(key)?.id || '',
      sheetId: currentSheetId,
      row,
      column,
      content,
    };

    setCells((prev) => {
      const next = new Map(prev);
      next.set(key, newCell);
      return next;
    });

    try {
      await api.sheets.updateCells(currentSheetId, [{ row, column, content }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save cell');
    }
  }, [currentSheetId, cells]);

  const addSheet = useCallback(async (name?: string) => {
    if (!flowId) return;
    try {
      const sheet = await api.sheets.create(flowId, name);
      setFlow((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          sheets: [...prev.sheets, sheet].sort((a, b) => a.order - b.order),
        };
      });
      setCurrentSheetId(sheet.id);
      setCells(new Map());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sheet');
    }
  }, [flowId]);

  const renameSheet = useCallback(async (sheetId: string, name: string) => {
    try {
      const updated = await api.sheets.update(sheetId, { name });
      setFlow((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          sheets: prev.sheets.map((s) => (s.id === sheetId ? updated : s)),
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename sheet');
    }
  }, []);

  const deleteSheet = useCallback(async (sheetId: string) => {
    if (!flow) return;
    try {
      await api.sheets.delete(sheetId);
      const remainingSheets = flow.sheets.filter((s) => s.id !== sheetId);
      setFlow((prev) => {
        if (!prev) return null;
        return { ...prev, sheets: remainingSheets };
      });
      if (currentSheetId === sheetId && remainingSheets.length > 0) {
        setCurrentSheetId(remainingSheets[0].id);
      } else if (remainingSheets.length === 0) {
        setCurrentSheetId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sheet');
    }
  }, [flow, currentSheetId]);

  const getCellContent = useCallback((row: number, column: number): string => {
    const key = `${row}-${column}`;
    return cells.get(key)?.content || '';
  }, [cells]);

  return {
    flow,
    currentSheetId,
    setCurrentSheetId: handleSetCurrentSheetId,
    cells,
    updateCell,
    getCellContent,
    addSheet,
    renameSheet,
    deleteSheet,
    loading,
    error,
    reload: loadFlow,
  };
}

