import type { FlowCell } from '../db/types';

export type DecisionCellMap = Map<string, FlowCell>;
export type DecisionCellsByFlow = Map<string, DecisionCellMap>;

export function decisionCellKey(cell: Pick<FlowCell, 'column_index' | 'row_index'>): string {
  return `${cell.column_index}:${cell.row_index}`;
}

/** Flush pending autosaves before reading, so Decision view never renders pre-save state (DEB-59). */
export async function loadDecisionCells(
  flowIds: string[],
  listCells: (flowId: string) => Promise<FlowCell[]>,
  flushPending?: () => Promise<void>
): Promise<DecisionCellsByFlow> {
  await flushPending?.();
  const cellsByFlow: DecisionCellsByFlow = new Map();
  await Promise.all(
    flowIds.map(async (flowId) => {
      const cells = await listCells(flowId);
      const cellMap: DecisionCellMap = new Map();
      cells.forEach((cell) => cellMap.set(decisionCellKey(cell), cell));
      cellsByFlow.set(flowId, cellMap);
    })
  );
  return cellsByFlow;
}
