import { useState, useEffect, useRef } from 'react';
import { Flow, FlowCell } from '../db/types';
import * as api from '../db/api';
import Cell from './Cell';

interface DecisionViewProps {
  flows: Flow[];
  roundId: string;
}

export default function DecisionView({ flows }: DecisionViewProps) {
  const [visibleFlowIds, setVisibleFlowIds] = useState<Set<string>>(new Set());
  const [cellsByFlow, setCellsByFlow] = useState<Map<string, Map<string, FlowCell>>>(new Map());
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);
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

  // Initialize visible flows once they load
  useEffect(() => {
    if (flows.length > 0 && !initialized.current) {
      setVisibleFlowIds(new Set(flows.map((f) => f.id)));
      initialized.current = true;
    }
  }, [flows]);

  // Fetch cells for all flows
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      if (flows.length === 0) {
        setLoading(false);
        return;
      }
      
      try {
        const newCellsMap = new Map<string, Map<string, FlowCell>>();
        await Promise.all(
          flows.map(async (f) => {
            const cells = await api.listCells(f.id);
            const cellMap = new Map<string, FlowCell>();
            cells.forEach((c) => cellMap.set(`${c.column_index}:${c.row_index}`, c));
            newCellsMap.set(f.id, cellMap);
          })
        );
        
        if (mounted) {
          setCellsByFlow(newCellsMap);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load decision view cells', err);
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, [flows]);

  const toggleFlow = (id: string) => {
    setVisibleFlowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-foreground/40 text-sm">
        Loading decision view...
      </div>
    );
  }

  const visibleFlows = flows.filter((f) => visibleFlowIds.has(f.id));

  // Compute row count across all flows so they align visually
  const HEADER_HEIGHT = 60; // Approximate height of flow header + column header
  const CELL_HEIGHT = 28;
  const minRowsFromHeight = containerHeight > 0
    ? Math.ceil((containerHeight - HEADER_HEIGHT) / CELL_HEIGHT)
    : 15;

  let globalMaxRow = -1;
  visibleFlows.forEach((flow) => {
    const cells = cellsByFlow.get(flow.id) ?? new Map();
    cells.forEach((cell) => {
      if ([6, 7].includes(cell.column_index) && cell.row_index > globalMaxRow) {
        globalMaxRow = cell.row_index;
      }
    });
  });
  const rowCount = Math.max(globalMaxRow + 5, minRowsFromHeight);

  return (
    <div ref={containerRef} className="flex-1 overflow-auto bg-card min-h-0 relative">
      <div className="flex flex-row min-w-max min-h-full">
        {visibleFlows.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-foreground/40 text-sm gap-2 mt-10">
            <p>No sheets visible.</p>
            {flows.length > 0 && (
               <button 
                 onClick={() => setVisibleFlowIds(new Set(flows.map(f => f.id)))}
                 className="text-accent hover:underline"
               >
                 Show all sheets
               </button>
            )}
          </div>
        ) : (
          visibleFlows.map((flow) => (
            <DecisionFlowPanel
              key={flow.id}
              flow={flow}
              cells={cellsByFlow.get(flow.id) ?? new Map()}
              onClose={() => toggleFlow(flow.id)}
              rowCount={rowCount}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DecisionFlowPanel({
  flow,
  cells,
  onClose,
  rowCount,
}: {
  flow: Flow;
  cells: Map<string, FlowCell>;
  onClose: () => void;
  rowCount: number;
}) {
  return (
    <div className="flex flex-col min-w-[300px] w-[350px] shrink-0 border-r border-card-04 last:border-r-0">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-card-04 bg-card shrink-0 sticky top-0 z-20">
        <span className="font-semibold text-xs tracking-wide uppercase text-foreground/80 truncate" title={flow.position_name}>
          {flow.position_name}
        </span>
        <button
          onClick={onClose}
          className="text-foreground/40 hover:text-foreground transition-colors p-1 -mr-1 rounded hover:bg-card-02"
          aria-label="Close sheet"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div className="flex-1 flex">
        <DecisionColumn label="2NR" colIndex={6} rowCount={rowCount} cells={cells} side="neg" />
        <DecisionColumn label="2AR" colIndex={7} rowCount={rowCount} cells={cells} side="aff" />
      </div>
    </div>
  );
}

function DecisionColumn({
  label,
  colIndex,
  rowCount,
  cells,
  side,
}: {
  label: string;
  colIndex: number;
  rowCount: number;
  cells: Map<string, FlowCell>;
  side: 'aff' | 'neg';
}) {
  const headerColor =
    side === 'aff' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="flex-1 flex flex-col min-w-[150px] w-[175px] border-r border-card-04 last:border-r-0">
      {/* Column Header */}
      <div
        className={`sticky top-[34px] z-10 px-2 py-1.5 text-xs font-semibold text-center border-b border-card-04 bg-card ${headerColor}`}
      >
        {label}
      </div>
      {/* Cells */}
      <div className="flex-1">
        {Array.from({ length: rowCount }).map((_, r) => {
          const cell = cells.get(`${colIndex}:${r}`);
          return (
            <div
              key={`${colIndex}:${r}`}
              className="relative"
            >
              <Cell
                content={cell?.content ?? ''}
                color={cell?.color ?? null}
                side={side}
                onUpdate={() => {}}
                editing={false}
                selected={false}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
