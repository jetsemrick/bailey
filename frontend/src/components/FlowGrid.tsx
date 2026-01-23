import { useCallback } from 'react';
import Cell from './Cell';

const COLUMNS = [
  { label: '1AC', index: 0 },
  { label: '1NC', index: 1 },
  { label: '2AC', index: 2 },
  { label: 'Block', index: 3 },
  { label: '1AR', index: 4 },
  { label: '2NR', index: 5 },
  { label: '2AR', index: 6 },
];

const ROW_COUNT = 50;

interface FlowGridProps {
  currentSheetId: string | null;
  getCellContent: (row: number, column: number) => string;
  onCellUpdate: (row: number, column: number, content: string) => void;
}

export default function FlowGrid({ currentSheetId, getCellContent, onCellUpdate }: FlowGridProps) {
  const handleCellUpdate = useCallback((row: number, column: number, content: string) => {
    onCellUpdate(row, column, content);
  }, [onCellUpdate]);

  if (!currentSheetId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No sheet selected
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto bg-background">
      <div className="sticky top-0 z-10 grid grid-cols-7 bg-card border-b border-card-04 shadow-sm">
        {COLUMNS.map((col) => (
          <Cell
            key={col.index}
            content=""
            onUpdate={() => {}}
            isHeader
            columnLabel={col.label}
          />
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7">
          {Array.from({ length: ROW_COUNT }, (_, rowIndex) =>
            COLUMNS.map((col) => (
              <Cell
                key={`${rowIndex}-${col.index}`}
                content={getCellContent(rowIndex, col.index)}
                onUpdate={(content) => handleCellUpdate(rowIndex, col.index, content)}
                columnLabel={col.label}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

