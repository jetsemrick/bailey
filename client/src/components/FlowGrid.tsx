import { useState, useCallback, useEffect, useMemo, useRef, memo } from 'react';
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
import { Trash2, X } from 'lucide-react';
import { SPEECH_COLUMNS, type CellColor, type SpeechColumn } from '../db/types';
import type { useFlowGrid } from '../hooks/useFlowGrid';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { shortcutFromKeyboardEvent, type MacroAction } from '../keyboardMacros';
import { useKeyboardMacrosContext } from '../contexts/KeyboardMacrosContext';
import { getColumnsForFlow } from './flowColumns';
import { flowSheetRootClass, type FlowSheetVariant } from './flowSheetVariant';

type FlowGridApi = ReturnType<typeof useFlowGrid>;

interface FlowGridProps {
  grid: FlowGridApi;
  /**
   * If true, scrolls the grid to the far right on mount.
   */
  defaultScrollToEnd?: boolean;
  /** Visual treatment; sharp = full grid borders with square corners */
  variant?: FlowSheetVariant;
}

const COLUMN_COLORS: Record<string, string> = {
  aff: 'text-blue-600 dark:text-blue-400',
  neg: 'text-red-600 dark:text-red-400',
};

const CELL_HEIGHT = 28; // matches min-h-[28px] on each cell
const HEADER_HEIGHT = 36; // approximate column header height

// ── Sortable cell wrapper ────────────────────────────────────

const SortableCell = memo(function SortableCell({
  id, col, row, content, color, side, onUpdate, onColorChange,
  selected, editing, pendingInput, onClearPendingInput,
  onFocus, onStartEditing, onStopEditing, onNavigate,
  comment, onContextMenu, variant,
}: {
  id: string; col: number; row: number; content: string; color: CellColor;
  side: 'aff' | 'neg';
  onUpdate: (c: string) => void; onColorChange: (c: CellColor) => void;
  selected: boolean; editing: boolean;
  pendingInput: string | null; onClearPendingInput: () => void;
  onFocus: () => void; onStartEditing: () => void; onStopEditing: () => void;
  onNavigate: (d: 'up' | 'down' | 'left' | 'right') => void;
  comment: string;
  onContextMenu?: (e: React.MouseEvent) => void;
  variant: FlowSheetVariant;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({
    id,
    data: { col, row },
    // Disable dnd-kit drop/reorder transition to avoid "slingshot" motion.
    transition: null,
  });

  // Strip role and tabIndex from dnd-kit attributes so the Cell handles its
  // own focus and keyboard events without the wrapper intercepting them.
  const { role: _role, tabIndex: _tab, ...restAttributes } = attributes;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    ...(selected && { scrollMarginTop: HEADER_HEIGHT }),
  };
  const dragListeners = editing ? undefined : listeners;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...restAttributes}
      {...dragListeners}
      className={`relative ${variant === 'sharp' ? 'border-r border-b border-card-04' : ''} ${editing ? '' : 'cursor-grab active:cursor-grabbing'} hover:z-50 ${isDragging ? 'opacity-0 pointer-events-none' : ''} ${selected ? 'z-40' : ''}`}
      data-cell-id={`${col}:${row}`}
      onContextMenu={onContextMenu}
    >
      <Cell
        content={content}
        color={color}
        side={side}
        onUpdate={onUpdate}
        onColorChange={onColorChange}
        selected={selected}
        editing={editing}
        pendingInput={pendingInput}
        onClearPendingInput={onClearPendingInput}
        onFocus={onFocus}
        onStartEditing={onStartEditing}
        onStopEditing={onStopEditing}
        onNavigate={onNavigate}
        variant={variant}
      />
      {comment && (
        <div className="absolute top-0 right-0 z-20 group">
          <div className="absolute top-0 right-0 w-6 h-6 cursor-help" />
          <div 
            className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent/60 shadow-sm pointer-events-none ring-1 ring-background" 
          />
          <div className={`absolute top-5 w-48 p-2 bg-card border border-card-04 ${variant === 'sharp' ? '' : 'rounded'} shadow-lg text-xs text-foreground whitespace-pre-wrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 ${col <= 1 ? 'right-auto -left-4' : col >= SPEECH_COLUMNS.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
            {comment}
          </div>
        </div>
      )}
    </div>
  );
});

// ── Single column ────────────────────────────────────────────

const FlowColumn = memo(function FlowColumn({
  dataCol,
  label,
  side,
  rowCount,
  getCellContent,
  getCellColor,
  getCellComment,
  onCellUpdate,
  onColorChange,
  selectedCell,
  isEditing,
  pendingInput,
  onClearPendingInput,
  onFocusCell,
  onStartEditing,
  onStopEditing,
  onNavigate,
  onContextMenu,
  variant,
}: {
  dataCol: number;
  label: SpeechColumn;
  side: 'aff' | 'neg';
  rowCount: number;
  variant: FlowSheetVariant;
  getCellContent: (col: number, row: number) => string;
  getCellColor: (col: number, row: number) => CellColor;
  getCellComment: (col: number, row: number) => string;
  onCellUpdate: (col: number, row: number, content: string) => void;
  onColorChange: (col: number, row: number, color: CellColor) => void;
  selectedCell: { col: number; row: number } | null;
  isEditing: boolean;
  pendingInput: string | null;
  onClearPendingInput: () => void;
  onFocusCell: (col: number, row: number) => void;
  onStartEditing: () => void;
  onStopEditing: () => void;
  onNavigate: (from: { col: number; row: number }, dir: 'up' | 'down' | 'left' | 'right') => void;
  onContextMenu: (e: React.MouseEvent, col: number, row: number) => void;
}) {
  const isFocusedColumn = selectedCell?.col === dataCol;
  const items = useMemo(
    () => Array.from({ length: rowCount }, (_, r) => `${dataCol}:${r}`),
    [dataCol, rowCount]
  );

  const columnBorderClass =
    variant === 'sharp' ? '' : 'border-r border-card-04 last:border-r-0';
  const headerBorderClass =
    variant === 'sharp'
      ? `border-r border-b border-card-04 ${isFocusedColumn ? 'border-b-2 border-b-accent' : ''}`
      : `border-b border-card-04 ${isFocusedColumn ? 'border-b-2 border-b-accent' : ''}`;

  return (
    <div className={`flex flex-col flex-1 min-w-[100px] ${columnBorderClass}`} data-flow-col={dataCol}>
      {/* Header */}
      <div
        data-column-header={dataCol}
        className={`sticky top-0 z-10 px-2 py-1.5 text-xs font-semibold text-center bg-card ${COLUMN_COLORS[side]} ${headerBorderClass}`}
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
            selected={selectedCell?.col === dataCol && selectedCell?.row === rowIdx}
            editing={selectedCell?.col === dataCol && selectedCell?.row === rowIdx && isEditing}
            pendingInput={selectedCell?.col === dataCol && selectedCell?.row === rowIdx ? pendingInput : null}
            onClearPendingInput={onClearPendingInput}
            onFocus={() => onFocusCell(dataCol, rowIdx)}
            onStartEditing={onStartEditing}
            onStopEditing={onStopEditing}
            onNavigate={(d) => onNavigate({ col: dataCol, row: rowIdx }, d)}
            comment={getCellComment(dataCol, rowIdx)}
            onContextMenu={(e) => onContextMenu(e, dataCol, rowIdx)}
            variant={variant}
          />
        ))}
      </SortableContext>
    </div>
  );
});

// ── Main grid ────────────────────────────────────────────────

function CommentPopover({
  rect, currentComment, onCommentSave, onDelete
}: {
  rect: DOMRect;
  currentComment: string;
  onCommentSave: (comment: string) => void;
  onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [commentText, setCommentText] = useState(currentComment);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onCommentSave(commentText);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCommentSave(commentText);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [commentText, onCommentSave]);

  // Handle positioning
  let top = rect.bottom;
  let left = rect.left;
  if (left + 260 > window.innerWidth) left = window.innerWidth - 280;
  if (top + 120 > window.innerHeight) top = rect.top - 120;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-card border border-card-04 rounded-lg shadow-lg overflow-hidden w-64 flex flex-col p-3 gap-2 bg-card-01"
      style={{ top, left }}
    >
      <div className="flex justify-between items-center">
        <label className="text-xs font-semibold text-foreground/80">
          Cell Comment
        </label>
        <div className="flex items-center gap-1">
          <button 
            onClick={onDelete}
            className="text-foreground/50 hover:text-red-500 transition-colors p-1"
            title="Delete comment"
          >
            <Trash2 size={14} />
          </button>
          <button 
            onClick={() => onCommentSave(commentText)}
            className="text-foreground/50 hover:text-foreground transition-colors p-1"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <textarea
        autoFocus
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onCommentSave(commentText);
          }
        }}
        className="w-full p-2 bg-background border border-card-04 rounded text-sm resize-none focus:outline-none focus:border-accent"
        rows={3}
        placeholder="Add a comment..."
      />
    </div>
  );
}

export default function FlowGrid({ grid, defaultScrollToEnd, variant = 'default' }: FlowGridProps) {
  const {
    activeFlowId, activeFlow, getCellContent, getCellColor, getCellComment, updateCell, updateCellColor, setCellComment,
    getColumnRowCount, bulkUpdateCells,
  } = grid;

  const undoRedo = useUndoRedo();
  const [selectedCell, setSelectedCell] = useState<{ col: number; row: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ col: number; row: number; rect: DOMRect } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingInput, setPendingInput] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<{ id: string; col: number; row: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const hasScrolledToEndRef = useRef(false);
  const { macros } = useKeyboardMacrosContext();
  const selectedCellRef = useRef<{ col: number; row: number } | null>(null);

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

  // Handle default scroll to end (reset ref first, then scroll)
  useEffect(() => {
    // Reset the ref first so we can scroll again on flow/mode changes
    hasScrolledToEndRef.current = false;

    if (defaultScrollToEnd && containerRef.current) {
      // Small timeout to ensure layout is ready
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollLeft = containerRef.current.scrollWidth;
          hasScrolledToEndRef.current = true;
        }
      }, 0);
    }
  }, [defaultScrollToEnd, activeFlowId]);

  // Clear undo/redo stack and selection when switching flow tabs
  useEffect(() => {
    undoRedo.clear();
    setSelectedCell(null);
    setIsEditing(false);
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
    for (let i = 0; i < SPEECH_COLUMNS.length; i++) {
      contentMax = Math.max(contentMax, getColumnRowCount(i) + 1);
    }
    const minRows = Math.max(minRowsFromHeight, 35);
    return Math.max(contentMax, minRows);
  }, [getColumnRowCount, activeFlowId, grid.cells, minRowsFromHeight]);

  useEffect(() => {
    selectedCellRef.current = selectedCell;
  }, [selectedCell]);

  // Keep selected cell fully visible and never under sticky column header
  useEffect(() => {
    if (!selectedCell || !containerRef.current) return;
    const containerEl = containerRef.current;
    const el = containerEl.querySelector<HTMLElement>(
      `[data-cell-id="${selectedCell.col}:${selectedCell.row}"]`
    );
    if (!el) return;

    const headerEl = containerEl.querySelector<HTMLElement>(
      `[data-column-header="${selectedCell.col}"]`
    );

    if (!headerEl) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }

    const cellRect = el.getBoundingClientRect();
    const headerRect = headerEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    const topBoundary = headerRect.bottom + 2;
    const bottomBoundary = containerRect.bottom - 2;

    if (cellRect.top < topBoundary) {
      containerEl.scrollBy({ top: cellRect.top - topBoundary, behavior: 'smooth' });
      return;
    }

    if (cellRect.bottom > bottomBoundary) {
      containerEl.scrollBy({ top: cellRect.bottom - bottomBoundary, behavior: 'smooth' });
    }
  }, [selectedCell]);

  // Cell update with undo tracking
  const handleCellUpdate = useCallback(
    (col: number, row: number, newContent: string) => {
      const prev = getCellContent(col, row);
      const prevColor = getCellColor(col, row);
      const prevComment = getCellComment(col, row);
      if (newContent === prev) return;
      undoRedo.pushEdit({
        col, row,
        previousContent: prev, newContent,
        previousColor: prevColor, newColor: prevColor,
        previousComment: prevComment, newComment: prevComment,
      });
      updateCell(col, row, newContent);
    },
    [getCellContent, getCellColor, getCellComment, updateCell, undoRedo]
  );

  const handleColorChange = useCallback(
    (col: number, row: number, color: CellColor) => {
      const prev = getCellColor(col, row);
      const content = getCellContent(col, row);
      const prevComment = getCellComment(col, row);
      undoRedo.pushEdit({
        col, row,
        previousContent: content, newContent: content,
        previousColor: prev, newColor: color,
        previousComment: prevComment, newComment: prevComment,
      });
      updateCellColor(col, row, color);
    },
    [getCellColor, getCellContent, getCellComment, updateCellColor, undoRedo]
  );

  const commitComment = useCallback(
    (col: number, row: number, comment: string) => {
      const prevComment = getCellComment(col, row);
      if (comment === prevComment) return;
      const content = getCellContent(col, row);
      const color = getCellColor(col, row);
      undoRedo.pushEdit({
        col, row,
        previousContent: content, newContent: content,
        previousColor: color, newColor: color,
        previousComment: prevComment, newComment: comment,
      });
      setCellComment(col, row, comment);
    },
    [getCellComment, getCellContent, getCellColor, setCellComment, undoRedo]
  );

  // Columns for current flow (aff/CX: all cols, neg: no 1AC)
  const flowColumns = useMemo(
    () =>
      getColumnsForFlow(activeFlow?.initiated_by ?? null, activeFlow?.tab_kind ?? 'standard'),
    [activeFlow?.initiated_by, activeFlow?.tab_kind]
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
      setSelectedCell({ col, row });
    },
    [maxRows, dataCols]
  );

  const runMacro = useCallback(
    (actions: MacroAction[]) => {
      let cursor = selectedCellRef.current;
      const setCursor = (next: { col: number; row: number } | null) => {
        cursor = next;
        selectedCellRef.current = next;
        setSelectedCell(next);
      };

      const getMeaningfulRows = (col: number, startRow: number): number[] => {
        const rows: number[] = [];
        for (const [key, cell] of grid.cells) {
          const [currentCol, currentRow] = key.split(':').map(Number);
          if (currentCol !== col || currentRow < startRow) continue;
          const hasData = cell.content.trim() !== '' || cell.color !== null || cell.comment.trim() !== '';
          if (hasData) rows.push(currentRow);
        }
        rows.sort((a, b) => b - a);
        return rows;
      };

      const insertCells = (count: number) => {
        if (!cursor) return;
        const updates: { col: number; row: number; content: string; color: CellColor; comment: string }[] = [];
        const rowsToShift = getMeaningfulRows(cursor.col, cursor.row);

        for (const row of rowsToShift) {
          updates.push({
            col: cursor.col,
            row: row + count,
            content: getCellContent(cursor.col, row),
            color: getCellColor(cursor.col, row),
            comment: getCellComment(cursor.col, row),
          });
        }

        for (let row = cursor.row; row < cursor.row + count; row++) {
          updates.push({ col: cursor.col, row, content: '', color: null, comment: '' });
        }

        bulkUpdateCells(updates);
      };

      const insertRows = (count: number) => {
        if (!cursor) return;
        const updates: { col: number; row: number; content: string; color: CellColor; comment: string }[] = [];

        for (const col of dataCols) {
          const rowsToShift = getMeaningfulRows(col, cursor.row);
          for (const row of rowsToShift) {
            updates.push({
              col,
              row: row + count,
              content: getCellContent(col, row),
              color: getCellColor(col, row),
              comment: getCellComment(col, row),
            });
          }
          for (let row = cursor.row; row < cursor.row + count; row++) {
            updates.push({ col, row, content: '', color: null, comment: '' });
          }
        }

        bulkUpdateCells(updates);
      };

      const highlightCell = () => {
        if (!cursor) return;
        const cycle: CellColor[] = [null, 'yellow', 'green', 'blue'];
        const current = getCellColor(cursor.col, cursor.row);
        const index = cycle.indexOf(current);
        const next = cycle[(index + 1) % cycle.length];
        updateCellColor(cursor.col, cursor.row, next);
      };

      const moveDownRows = (count: number) => {
        if (!cursor) return;
        setCursor({ col: cursor.col, row: Math.min(maxRows - 1, cursor.row + count) });
      };

      const nextFlowSheet = () => {
        if (grid.flows.length === 0) return;
        if (!activeFlowId) {
          grid.selectFlow(grid.flows[0].id);
          return;
        }
        const index = grid.flows.findIndex((flow) => flow.id === activeFlowId);
        const nextFlow = grid.flows[(index + 1) % grid.flows.length];
        if (nextFlow) grid.selectFlow(nextFlow.id);
      };

      for (const action of actions) {
        switch (action) {
          case 'next_flow_sheet':
            nextFlowSheet();
            break;
          case 'insert_5_cells':
            insertCells(5);
            break;
          case 'insert_5_rows':
            insertRows(5);
            break;
          case 'highlight_cell':
            highlightCell();
            break;
          case 'move_down_4_rows':
            moveDownRows(4);
            break;
          default:
            break;
        }
      }
    },
    [
      grid.cells,
      grid.flows,
      grid.selectFlow,
      activeFlowId,
      getCellContent,
      getCellColor,
      getCellComment,
      bulkUpdateCells,
      updateCellColor,
      dataCols,
      maxRows,
    ]
  );

  const macroActionsByShortcut = useMemo(() => {
    const map = new Map<string, MacroAction[]>();
    for (const macro of macros) {
      map.set(macro.shortcut, macro.actions);
    }
    return map;
  }, [macros]);

  // Keyboard undo/redo + save + arrow key navigation when selected (not editing)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const edit = undoRedo.undo();
        if (edit) {
          updateCell(edit.col, edit.row, edit.previousContent, edit.previousColor as CellColor);
          setCellComment(edit.col, edit.row, edit.previousComment);
        }
      }
      if (mod && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        const edit = undoRedo.redo();
        if (edit) {
          updateCell(edit.col, edit.row, edit.newContent, edit.newColor as CellColor);
          setCellComment(edit.col, edit.row, edit.newComment);
        }
      }
      if (mod && e.key === 's') {
        e.preventDefault();
        grid.saveNow();
      }
      const shortcut = shortcutFromKeyboardEvent(e);
      if (shortcut) {
        const actions = macroActionsByShortcut.get(shortcut);
        const target = e.target as HTMLElement;
        const isTypingTarget =
          target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (actions && actions.length > 0 && !isTypingTarget && !isEditing) {
          e.preventDefault();
          runMacro(actions);
          return;
        }
      }
      // Arrow key navigation when cell is selected but not editing
      // Skip if user is focused on an input/textarea element elsewhere on the page
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target.isContentEditable && !containerRef.current?.contains(target))) {
        return;
      }
      if (selectedCell && !isEditing) {
        if ((e.key === 'Delete' || e.key === 'Backspace') && !mod) {
          const { col, row } = selectedCell;
          const prevContent = getCellContent(col, row);
          const prevColor = getCellColor(col, row);
          const prevComment = getCellComment(col, row);
          const hasAny =
            prevContent.trim() !== '' || prevColor !== null || prevComment.trim() !== '';
          if (hasAny) {
            e.preventDefault();
            undoRedo.pushEdit({
              col, row,
              previousContent: prevContent, newContent: '',
              previousColor: prevColor, newColor: null,
              previousComment: prevComment, newComment: '',
            });
            updateCell(col, row, '', null);
            setCellComment(col, row, '');
          }
        } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          const dir = e.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right';
          navigate(selectedCell, dir);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          setIsEditing(true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setSelectedCell(null);
        } else if (
          e.key.length === 1 &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey &&
          !['Tab', 'Enter'].includes(e.key)
        ) {
          e.preventDefault();
          setPendingInput(e.key);
          setIsEditing(true);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    undoRedo, updateCell, setCellComment, getCellContent, getCellColor, getCellComment,
    grid, selectedCell, isEditing, navigate, macroActionsByShortcut, runMacro,
  ]);

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
        const colRows: { row: number; content: string; color: CellColor; comment: string }[] = [];
        for (let r = 0; r < maxRows; r++) {
          colRows.push({
            row: r,
            content: getCellContent(fromCol, r),
            color: getCellColor(fromCol, r),
            comment: getCellComment(fromCol, r),
          });
        }
        const [moved] = colRows.splice(fromRow, 1);
        colRows.splice(toRow, 0, moved);
        const updates = colRows.map((c, i) => ({
          col: fromCol, row: i, content: c.content, color: c.color, comment: c.comment,
        }));
        bulkUpdateCells(updates);
      } else {
        // Cross-column move
        const content = getCellContent(fromCol, fromRow);
        const color = getCellColor(fromCol, fromRow);
        const comment = getCellComment(fromCol, fromRow);
        updateCell(fromCol, fromRow, '', null);
        setCellComment(fromCol, fromRow, '');
        updateCell(toCol, toRow, content, color);
        setCellComment(toCol, toRow, comment);
      }

      // Keep focus on the moved cell so keyboard editing continues at new position.
      setSelectedCell({ col: toCol, row: toRow });
    },
    [getCellContent, getCellColor, getCellComment, maxRows, bulkUpdateCells, updateCell, setCellComment]
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
      <div ref={containerRef} className={`flex-1 overflow-auto min-h-0 ${flowSheetRootClass(variant)}`}>
        <div className={`flex min-w-[800px] min-h-full ${variant === 'sharp' ? 'border-t border-l border-card-04' : ''}`}>
          {flowColumns.map(({ label, dataCol, side }) => (
            <FlowColumn
              key={`${label}-${dataCol}`}
              dataCol={dataCol}
              label={label}
              side={side}
              rowCount={maxRows}
              variant={variant}
              getCellContent={getCellContent}
              getCellColor={getCellColor}
              getCellComment={getCellComment}
              onCellUpdate={handleCellUpdate}
              onColorChange={handleColorChange}
              selectedCell={selectedCell}
              isEditing={isEditing}
              pendingInput={pendingInput}
              onClearPendingInput={() => setPendingInput(null)}
              onFocusCell={(col, row) => {
                setSelectedCell({ col, row });
                setIsEditing(false);
              }}
              onStartEditing={() => setIsEditing(true)}
              onStopEditing={() => setIsEditing(false)}
              onNavigate={navigate}
              onContextMenu={(e, col, row) => {
                e.preventDefault();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setContextMenu({ col, row, rect });
              }}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragItem && (() => {
          const content = getCellContent(dragItem.col, dragItem.row) || '';
          const color = getCellColor(dragItem.col, dragItem.row);
          const comment = getCellComment(dragItem.col, dragItem.row);
          if (!content.trim()) return null;
          const side = flowColumns.find((c) => c.dataCol === dragItem.col)?.side ?? 'aff';
          const colorClass = color ? COLOR_BG[color] ?? '' : '';
          const sideTextColor = side === 'aff' ? 'text-blue-600 dark:text-blue-400' : side === 'neg' ? 'text-red-600 dark:text-red-400' : 'text-foreground';
          return (
            <div
              className={`pointer-events-none relative min-w-[100px] min-h-[28px] p-1 whitespace-pre-wrap break-words shadow border border-card-04 bg-card ${variant === 'sharp' ? '' : 'rounded'} ${sideTextColor} ${colorClass}`}
              style={{ fontSize: 'var(--cell-font-size, 14px)' }}
            >
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
              {comment && (
                <div
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent/60 shadow-sm ring-1 ring-background"
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })()}
      </DragOverlay>

      {contextMenu && (
        <CommentPopover
          rect={contextMenu.rect}
          currentComment={getCellComment(contextMenu.col, contextMenu.row)}
          onCommentSave={(comment) => {
            commitComment(contextMenu.col, contextMenu.row, comment);
            setContextMenu(null);
          }}
          onDelete={() => {
            commitComment(contextMenu.col, contextMenu.row, '');
            setContextMenu(null);
          }}
        />
      )}
    </DndContext>
  );
}
