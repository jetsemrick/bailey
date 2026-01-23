import { useState, useRef, useEffect } from 'react';
import { Sheet } from '../api/client';

interface SheetTabsProps {
  sheets: Sheet[];
  currentSheetId: string | null;
  onSelectSheet: (sheetId: string) => void;
  onAddSheet: () => void;
  onRenameSheet: (sheetId: string, name: string) => void;
  onDeleteSheet: (sheetId: string) => void;
}

export default function SheetTabs({
  sheets,
  currentSheetId,
  onSelectSheet,
  onAddSheet,
  onRenameSheet,
  onDeleteSheet,
}: SheetTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleDoubleClick = (sheet: Sheet) => {
    setEditingId(sheet.id);
    setEditValue(sheet.name);
  };

  const handleRename = (sheetId: string) => {
    if (editValue.trim() && editValue !== sheets.find((s) => s.id === sheetId)?.name) {
      onRenameSheet(sheetId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, sheetId: string) => {
    if (e.key === 'Enter') {
      handleRename(sheetId);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditValue('');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, sheetId: string) => {
    e.preventDefault();
    if (window.confirm('Delete this sheet?')) {
      onDeleteSheet(sheetId);
    }
  };

  return (
    <div className="flex items-center border-t border-card-04 bg-card px-2 py-1 gap-1 overflow-x-auto">
      {sheets.map((sheet) => (
        <div
          key={sheet.id}
          className={`px-3 py-1 cursor-pointer rounded-t border-t border-x text-sm transition-colors ${
            currentSheetId === sheet.id
              ? 'bg-background border-card-04 border-b-background font-medium text-foreground -mb-px pb-1.5'
              : 'bg-card-01 border-transparent text-foreground/70 hover:bg-card-02 hover:text-foreground'
          }`}
          onClick={() => onSelectSheet(sheet.id)}
          onDoubleClick={() => handleDoubleClick(sheet)}
          onContextMenu={(e) => handleContextMenu(e, sheet.id)}
        >
          {editingId === sheet.id ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleRename(sheet.id)}
              onKeyDown={(e) => handleKeyDown(e, sheet.id)}
              className="bg-background border border-accent rounded px-1 min-w-[80px] focus:outline-none text-foreground"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span>{sheet.name}</span>
          )}
        </div>
      ))}
      <button
        onClick={onAddSheet}
        className="px-3 py-1 text-foreground/60 hover:bg-card-02 hover:text-foreground rounded transition-colors text-sm font-semibold"
        title="Add new sheet"
      >
        +
      </button>
    </div>
  );
}


