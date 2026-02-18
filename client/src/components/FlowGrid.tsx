import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
import Cell, { COLOR_BG, sanitizeHtml } from './Cell';
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

/** Column config: label + data column index (0-7). Neg flows omit 1AC. */
function getColumnsForFlow(initiatedBy: 'aff' | 'neg' | null): { label: string; dataCol: number }[] {
  const all: { label: string; dataCol: number }[] = SPEECH_COLUMNS.map((label, i) => ({ label, dataCol: i }));
  if (initiatedBy === 'neg') {
    return all.filter((c) => c.label !== '1AC');
  }
  return all;
}

const CELL_HEIGHT = 28; // matches min-h-[28px] on each cell
const HEADER_HEIGHT = 36; // approximate column header height

// ── Sortable cell wrapper ────────────────────────────────────

function SortableCell({
  id, col, row, content, color, side, onUpdate, onColorChange, focused, onFocus, onNavigate,
}: {
  id: string; col: number; row: number; content: string; color: CellColor;
  side: 'aff' | 'neg';
  onUpdate: (c: string) => void; onColorChange: (c: CellColor) => void;
  focused: boolean; onFocus: () => void;
  onNavigate: (d: 'up' | 'down' | 'left' | 'right') => void;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id, data: { col, row } });

  // Strip role and tabIndex from dnd-kit attributes so the Cell handles its
  // own focus and keyboard events without the wrapper intercepting them.
  const { role: _role, tabIndex: _tab, ...restAttributes } = attributes;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...restAttributes} className="relative">
      <Cell
        content={isDragging ? '' : content}
        color={isDragging ? null : color}
        side={side}
        onUpdate={onUpdate}
        onColorChange={onColorChange}
        focused={focused}
        onFocus={onFocus}
        onNavigate={onNavigate}
      />
      <div
        {...listeners}
        className="absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing rounded-bl opacity-40 hover:opacity-70 transition-opacity"
        title="Drag to reorder"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-foreground">
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </div>
    </div>
  );
}

// ── Single column ────────────────────────────────────────────

function FlowColumn({
  dataCol,
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
  dataCol: number;
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
  const isFocusedColumn = focusedCell?.col === dataCol;
  const items = useMemo(
    () => Array.from({ length: rowCount }, (_, r) => `${dataCol}:${r}`),
    [dataCol, rowCount]
  );

  return (
    <div className="flex flex-col flex-1 min-w-[100px] border-r border-card-04 last:border-r-0">
      {/* Header */}
      <div
        className={`sticky top-0 z-10 px-2 py-1.5 text-xs font-semibold text-center border-b border-card-04 bg-card ${COLUMN_COLORS[side]} ${
          isFocusedColumn ? 'border-b-2 border-b-accent' : ''
        }`}
      >
        {label}
      </div>
      {/* Sortable cells */}
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((itemId, rowIdx) => (
          <SortableCell
            key={itemId}
            id={itemId}
            col={dataCol}
            row={rowIdx}
            content={getCellContent(dataCol, rowIdx)}
            color={getCellColor(dataCol, rowIdx)}
            side={side}
            onUpdate={(c) => onCellUpdate(dataCol, rowIdx, c)}
            onColorChange={(c) => onColorChange(dataCol, rowIdx, c)}
            focused={focusedCell?.col === dataCol && focusedCell?.row === rowIdx}
            onFocus={() => onFocusCell(dataCol, rowIdx)}
            onNavigate={(d) => onNavigate({ col: dataCol, row: rowIdx }, d)}
          />
        ))}
      </SortableContext>
    </div>
  );
}

// ── Main grid ────────────────────────────────────────────────

export default function FlowGrid({ grid }: FlowGridProps) {
  const {
    activeFlowId, activeFlow, getCellContent, getCellColor, updateCell, updateCellColor,
    getColumnRowCount, bulkUpdateCells,
  } = grid;

  const undoRedo = useUndoRedo();
  const [focusedCell, setFocusedCell] = useState<{ col: number; row: number } | null>(null);
  const [dragItem, setDragItem] = useState<{ id: string; col: number; row: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  // Track container height to fill viewport with rows
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Clear undo/redo stack and focus when switching flow tabs
  useEffect(() => {
    undoRedo.clear();
    setFocusedCell(null);
  }, [activeFlowId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  // Compute rows: fill available height, and always have at least 1 empty row beyond content
  const minRowsFromHeight = containerHeight > 0
    ? Math.ceil((containerHeight - HEADER_HEIGHT) / CELL_HEIGHT)
    : Math.ceil((typeof window !== 'undefined' ? window.innerHeight - 180 : 600) / CELL_HEIGHT);

  const maxRows = useMemo(() => {
    let contentMax = 0;
    for (let i = 0; i < 8; i++) {
      contentMax = Math.max(contentMax, getColumnRowCount(i) + 1);
    }
    const minRows = Math.max(minRowsFromHeight, 35);
    return Math.max(contentMax, minRows);
  }, [getColumnRowCount, activeFlowId, grid.cells, minRowsFromHeight]);

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

  // Columns for current flow (aff: 8 cols, neg: 7 cols, no 1AC)
  const flowColumns = useMemo(
    () => getColumnsForFlow(activeFlow?.initiated_by ?? null),
    [activeFlow?.initiated_by]
  );
  const dataCols = useMemo(() => flowColumns.map((c) => c.dataCol), [flowColumns]);

  // Navigation
  const navigate = useCallback(
    (from: { col: number; row: number }, direction: 'up' | 'down' | 'left' | 'right') => {
      let { col, row } = from;
      if (direction === 'up') row = Math.max(0, row - 1);
      else if (direction === 'down') row = Math.min(maxRows - 1, row + 1);
      else if (direction === 'left' || direction === 'right') {
        const idx = dataCols.indexOf(col);
        if (idx >= 0) {
          const nextIdx = direction === 'left' ? idx - 1 : idx + 1;
          if (nextIdx >= 0 && nextIdx < dataCols.length) {
            col = dataCols[nextIdx];
          }
        }
      }
      setFocusedCell({ col, row });
    },
    [maxRows, dataCols]
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
        updateCell(fromCol, fromRow, '', null);
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
      <div ref={containerRef} className="flex-1 overflow-auto min-h-0">
        <div className="flex min-w-[800px] min-h-full">
          {flowColumns.map(({ label, dataCol }) => (
            <FlowColumn
              key={`${label}-${dataCol}`}
              dataCol={dataCol}
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

      <DragOverlay dropAnimation={null}>
        {dragItem && (() => {
          const content = getCellContent(dragItem.col, dragItem.row) || '';
          const color = getCellColor(dragItem.col, dragItem.row);
          const label = flowColumns.find((c) => c.dataCol === dragItem.col)?.label;
          const side = label ? COLUMN_SIDES[label] : 'aff';
          const colorClass = color ? COLOR_BG[color] ?? '' : '';
          const sideTextColor = side === 'aff' ? 'text-blue-600 dark:text-blue-400' : side === 'neg' ? 'text-red-600 dark:text-red-400' : 'text-foreground';
          return (
            <div
              className={`min-w-[100px] min-h-[28px] p-1 whitespace-pre-wrap break-words rounded shadow border border-card-04 bg-card ${sideTextColor} ${colorClass}`}
              style={{ fontSize: 'var(--cell-font-size, 14px)' }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) || '&nbsp;' }}
            />
          );
        })()}
      </DragOverlay>
    </DndContext>
  );
}
