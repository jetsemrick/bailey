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

export function mergeDecisionCells(
  previous: DecisionCellsByFlow,
  updates: DecisionCellsByFlow
): DecisionCellsByFlow {
  const merged = new Map(previous);
  updates.forEach((cells, flowId) => merged.set(flowId, cells));
  return merged;
}

/** Flows whose cells were saved since Decision view last read them (DEB-59). */
export function staleDecisionFlowIds(
  flowIds: string[],
  savedFlowRevisions: Map<string, number>,
  seenFlowRevisions: Map<string, number>
): string[] {
  return flowIds.filter(
    (flowId) => (savedFlowRevisions.get(flowId) ?? 0) > (seenFlowRevisions.get(flowId) ?? 0)
  );
}

/**
 * Records the save revisions covered by a read. Revisions only ever climb, so
 * concurrent reads can mark flows seen in any order without losing a save.
 */
export function markDecisionFlowsSeen(
  seenFlowRevisions: Map<string, number>,
  flowIds: string[],
  savedFlowRevisions: Map<string, number>
): Map<string, number> {
  const marked = new Map(seenFlowRevisions);
  flowIds.forEach((flowId) => {
    const revision = savedFlowRevisions.get(flowId) ?? 0;
    marked.set(flowId, Math.max(marked.get(flowId) ?? 0, revision));
  });
  return marked;
}
