import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Flow, FlowCell } from '../db/types';
import { loadDecisionCells } from './DecisionView';

function makeFlow(id: string): Flow {
  return {
    id,
    user_id: 'user-1',
    round_id: 'round-1',
    position_name: id,
    initiated_by: 'aff',
    display_order: 0,
    tab_kind: 'standard',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

function makeCell(flowId: string, content: string): FlowCell {
  return {
    id: `cell-${flowId}`,
    user_id: 'user-1',
    flow_id: flowId,
    column_index: 5,
    row_index: 0,
    content,
    color: null,
    comment: '',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

describe('loadDecisionCells (DEB-59)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('awaits flushPending before listing cells', async () => {
    const order: string[] = [];
    let dbContent = '';

    const flushPending = vi.fn(async () => {
      order.push('flush');
      dbContent = 'saved 2NR';
    });
    const listCells = vi.fn(async (flowId: string) => {
      order.push(`list:${flowId}`);
      return dbContent ? [makeCell(flowId, dbContent)] : [];
    });

    const result = await loadDecisionCells([makeFlow('flow-a')], listCells, flushPending);

    expect(order).toEqual(['flush', 'list:flow-a']);
    expect(flushPending).toHaveBeenCalledOnce();
    expect(result.get('flow-a')?.get('5:0')?.content).toBe('saved 2NR');
  });

  test('does not list cells until flushPending resolves', async () => {
    let resolveFlush!: () => void;
    const flushPending = () =>
      new Promise<void>((resolve) => {
        resolveFlush = resolve;
      });
    const listCells = vi.fn(async () => [makeCell('flow-a', 'from db')]);

    let settled = false;
    const pending = loadDecisionCells([makeFlow('flow-a')], listCells, flushPending).then((map) => {
      settled = true;
      return map;
    });

    await Promise.resolve();
    expect(listCells).not.toHaveBeenCalled();
    expect(settled).toBe(false);

    resolveFlush();
    const result = await pending;
    expect(listCells).toHaveBeenCalledWith('flow-a');
    expect(result.get('flow-a')?.get('5:0')?.content).toBe('from db');
  });
});
