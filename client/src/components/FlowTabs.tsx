import { useState, useRef, useEffect, useCallback } from 'react';
import type { Flow } from '../db/types';

interface FlowTabsProps {
  flows: Flow[];
  activeFlowId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onReorder: (flows: Flow[]) => void;
}

export default function FlowTabs({
  flows,
  activeFlowId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  onReorder,
}: FlowTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; rect: DOMRect } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startRename = useCallback((flow: Flow) => {
    setEditingId(flow.id);
    setEditValue(flow.position_name);
  }, []);

  const commitRename = useCallback(
    (id: string) => {
      const trimmed = editValue.trim();
      if (trimmed && trimmed !== flows.find((f) => f.id === id)?.position_name) {
        onRename(id, trimmed);
      }
      setEditingId(null);
    },
    [editValue, flows, onRename]
  );

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') commitRename(id);
    if (e.key === 'Escape') setEditingId(null);
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDeleteConfirm({ id, rect });
  };

  useEffect(() => {
    if (!deleteConfirm) return;
    const close = () => setDeleteConfirm(null);
    const t = setTimeout(() => window.addEventListener('click', close), 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener('click', close);
    };
  }, [deleteConfirm]);

  // Simple drag reorder via native HTML drag
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) return;
    const fromIdx = flows.findIndex((f) => f.id === dragId);
    const toIdx = flows.findIndex((f) => f.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const reordered = [...flows];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    onReorder(reordered.map((f, i) => ({ ...f, display_order: i })));
    setDragId(null);
  };

  return (
    <div className="flex items-center border-t border-card-04 bg-card px-2 py-1 gap-1 overflow-x-auto shrink-0">
      {flows.map((flow) => (
        <div
          key={flow.id}
          draggable
          onDragStart={(e) => handleDragStart(e, flow.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, flow.id)}
          className={`px-3 py-1 cursor-pointer rounded-t border-t border-x text-sm transition-colors select-none ${
            activeFlowId === flow.id
              ? 'bg-background border-card-04 font-medium text-foreground -mb-px pb-1.5'
              : 'bg-card-01 border-transparent text-foreground/70 hover:bg-card-02 hover:text-foreground'
          } ${dragId === flow.id ? 'opacity-50' : ''}`}
          onClick={() => onSelect(flow.id)}
          onDoubleClick={() => startRename(flow)}
          onContextMenu={(e) => handleContextMenu(e, flow.id)}
          title={`${flow.position_name} (${flow.initiated_by})`}
        >
          {editingId === flow.id ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => commitRename(flow.id)}
              onKeyDown={(e) => handleKeyDown(e, flow.id)}
              className="bg-background border border-accent rounded px-1 min-w-[80px] focus:outline-none text-foreground text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  flow.initiated_by === 'aff' ? 'bg-blue-500' : 'bg-red-500'
                }`}
              />
              {flow.position_name}
            </span>
          )}
        </div>
      ))}
      <button
        onClick={onAdd}
        className="px-3 py-1 text-foreground/60 hover:bg-card-02 hover:text-foreground rounded transition-colors text-sm font-semibold shrink-0"
        title="Add new flow tab"
      >
        +
      </button>

      {deleteConfirm && (
        <div
          className="fixed z-50 bg-card border border-card-04 rounded shadow-lg py-1 min-w-[120px]"
          style={{
            left: deleteConfirm.rect.left + deleteConfirm.rect.width / 2,
            top: deleteConfirm.rect.top - 4,
            transform: 'translate(-50%, -100%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onDelete(deleteConfirm.id);
              setDeleteConfirm(null);
            }}
            className="w-full px-3 py-1.5 text-left text-sm text-red-500 hover:bg-card-02 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => setDeleteConfirm(null)}
            className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-card-02 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
