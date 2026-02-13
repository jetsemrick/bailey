import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Cell from './Cell';
import { SPEECH_COLUMNS, type CellColor } from '../db/types';
import type { useFlowGrid } from '../hooks/useFlowGrid';
import { useUndoRedo } from '../hooks/useUndoRedo';

type FlowGridApi = ReturnType<typeof useFlowGrid>;

interface FlowGridProps {
  grid: FlowGridApi;
}

const COLUMN_COLORS: Record<string, string> = {
  aff: 'text-blue-600 dark:text-blue-400',
  neg: 'text-red-600 dark:text-red-400',
};

const COLUMN_SIDES: Record<string, 'aff' | 'neg'> = {
  '1AC': 'aff', '1NC': 'neg', '2AC': 'aff', '2NC': 'neg',
  '1NR': 'neg', '1AR': 'aff', '2NR': 'neg', '2AR': 'aff',
};

const MIN_ROWS = 8;

// ── Sortable cell wrapper ────────────────────────────────────

function SortableCell({
  id, col, row, content, color, onUpdate, onColorChange, focused, onFocus, onNavigate,
}: {
  id: string; col: number; row: number; content: string; color: CellColor;
  onUpdate: (c: string) => void; onColorChange: (c: CellColor) => void;
  focused: boolean; onFocus: () => void;
  onNavigate: (d: 'up' | 'down' | 'left' | 'right') => void;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id, data: { col, row } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="border-b border-card-04">
      <Cell
        content={content}
        color={color}
        onUpdate={onUpdate}
        onColorChange={onColorChange}
        focused={focused}
        onFocus={onFocus}
        onNavigate={onNavigate}
      />
    </div>
  );
}

// ── Single column ────────────────────────────────────────────

function FlowColumn({
  colIdx,
  label,
  rowCount,
  getCellContent,
  getCellColor,
  onCellUpdate,
  onColorChange,
  focusedCell,
  onFocusCell,
  onNavigate,
}: {
  colIdx: number;
  label: string;
  rowCount: number;
  getCellContent: (col: number, row: number) => string;
  getCellColor: (col: number, row: number) => CellColor;
  onCellUpdate: (col: number, row: number, content: string) => void;
  onColorChange: (col: number, row: number, color: CellColor) => void;
  focusedCell: { col: number; row: number } | null;
  onFocusCell: (col: number, row: number) => void;
  onNavigate: (from: { col: number; row: number }, dir: 'up' | 'down' | 'left' | 'right') => void;
}) {
  const side = COLUMN_SIDES[label];
  const items = useMemo(
    () => Array.from({ length: rowCount }, (_, r) => `${colIdx}:${r}`),
    [colIdx, rowCount]
  );

  return (
    <div className="flex flex-col flex-1 min-w-[100px] border-r border-card-04 last:border-r-0">
      {/* Header */}
      <div
        className={`sticky top-0 z-10 px-2 py-1.5 text-xs font-semibold text-center border-b border-card-04 bg-card ${COLUMN_COLORS[side]}`}
      >
        {label}
      </div>
      {/* Sortable cells */}
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((itemId, rowIdx) => (
          <SortableCell
            key={itemId}
            id={itemId}
            col={colIdx}
            row={rowIdx}
            content={getCellContent(colIdx, rowIdx)}
            color={getCellColor(colIdx, rowIdx)}
            onUpdate={(c) => onCellUpdate(colIdx, rowIdx, c)}
            onColorChange={(c) => onColorChange(colIdx, rowIdx, c)}
            focused={focusedCell?.col === colIdx && focusedCell?.row === rowIdx}
            onFocus={() => onFocusCell(colIdx, rowIdx)}
            onNavigate={(d) => onNavigate({ col: colIdx, row: rowIdx }, d)}
          />
        ))}
      </SortableContext>
    </div>
  );
}

// ── Main grid ────────────────────────────────────────────────

export default function FlowGrid({ grid }: FlowGridProps) {
  const {
    activeFlowId, getCellContent, getCellColor, updateCell, updateCellColor,
    getColumnRowCount, bulkUpdateCells,
  } = grid;

  const undoRedo = useUndoRedo();
  const [focusedCell, setFocusedCell] = useState<{ col: number; row: number } | null>(null);
  const [dragItem, setDragItem] = useState<{ id: string; col: number; row: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  // Compute max rows across all columns
  const maxRows = useMemo(() => {
    let max = MIN_ROWS;
    for (let i = 0; i < 8; i++) {
      max = Math.max(max, getColumnRowCount(i) + 1);
    }
    return max;
  }, [getColumnRowCount, activeFlowId, grid.cells]);

  // Cell update with undo tracking
  const handleCellUpdate = useCallback(
    (col: number, row: number, newContent: string) => {
      const prev = getCellContent(col, row);
      const prevColor = getCellColor(col, row);
      if (newContent === prev) return;
      undoRedo.pushEdit({
        col, row,
        previousContent: prev, newContent,
        previousColor: prevColor, newColor: prevColor,
      });
      updateCell(col, row, newContent);
    },
    [getCellContent, getCellColor, updateCell, undoRedo]
  );

  const handleColorChange = useCallback(
    (col: number, row: number, color: CellColor) => {
      const prev = getCellColor(col, row);
      const content = getCellContent(col, row);
      undoRedo.pushEdit({
        col, row,
        previousContent: content, newContent: content,
        previousColor: prev, newColor: color,
      });
      updateCellColor(col, row, color);
    },
    [getCellColor, getCellContent, updateCellColor, undoRedo]
  );

  // Keyboard undo/redo + save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const edit = undoRedo.undo();
        if (edit) updateCell(edit.col, edit.row, edit.previousContent, edit.previousColor as CellColor);
      }
      if (mod && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        const edit = undoRedo.redo();
        if (edit) updateCell(edit.col, edit.row, edit.newContent, edit.newColor as CellColor);
      }
      if (mod && e.key === 's') {
        e.preventDefault();
        grid.saveNow();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undoRedo, updateCell, grid]);

  // Navigation
  const navigate = useCallback(
    (from: { col: number; row: number }, direction: 'up' | 'down' | 'left' | 'right') => {
      let { col, row } = from;
      if (direction === 'up') row = Math.max(0, row - 1);
      else if (direction === 'down') row = Math.min(maxRows - 1, row + 1);
      else if (direction === 'left') col = Math.max(0, col - 1);
      else if (direction === 'right') col = Math.min(7, col + 1);
      setFocusedCell({ col, row });
    },
    [maxRows]
  );

  // DnD handlers
  const handleDragStart = useCallback((e: DragStartEvent) => {
    const data = e.active.data.current as { col: number; row: number } | undefined;
    if (data) setDragItem({ id: String(e.active.id), col: data.col, row: data.row });
  }, []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setDragItem(null);
      if (!e.over || e.active.id === e.over.id) return;
      const activeData = e.active.data.current as { col: number; row: number };
      const overData = e.over.data.current as { col: number; row: number };
      if (!activeData || !overData) return;

      const fromCol = activeData.col;
      const fromRow = activeData.row;
      const toCol = overData.col;
      const toRow = overData.row;

      // Same column: reorder
      if (fromCol === toCol) {
        const colRows: { row: number; content: string; color: CellColor }[] = [];
        for (let r = 0; r < maxRows; r++) {
          colRows.push({
            row: r,
            content: getCellContent(fromCol, r),
            color: getCellColor(fromCol, r),
          });
        }
        const [moved] = colRows.splice(fromRow, 1);
        colRows.splice(toRow, 0, moved);
        const updates = colRows.map((c, i) => ({
          col: fromCol, row: i, content: c.content, color: c.color,
        }));
        bulkUpdateCells(updates);
      } else {
        // Cross-column move
        const content = getCellContent(fromCol, fromRow);
        const color = getCellColor(fromCol, fromRow);
        updateCell(fromCol, fromRow, '');
        updateCell(toCol, toRow, content, color);
      }
    },
    [getCellContent, getCellColor, maxRows, bulkUpdateCells, updateCell]
  );

  if (!activeFlowId) {
    return (
      <div className="flex-1 flex items-center justify-center text-foreground/40 text-sm">
        Select or create a flow tab to start
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-auto">
        <div className="flex min-w-[800px]">
          {SPEECH_COLUMNS.map((label, colIdx) => (
            <FlowColumn
              key={label}
              colIdx={colIdx}
              label={label}
              rowCount={maxRows}
              getCellContent={getCellContent}
              getCellColor={getCellColor}
              onCellUpdate={handleCellUpdate}
              onColorChange={handleColorChange}
              focusedCell={focusedCell}
              onFocusCell={(col, row) => setFocusedCell({ col, row })}
              onNavigate={navigate}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {dragItem && (
          <div className="bg-accent/10 border border-accent rounded p-1 text-sm opacity-80 max-w-[150px] truncate">
            {getCellContent(dragItem.col, dragItem.row) || '(empty)'}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
