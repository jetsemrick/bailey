import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { FlowCell } from '../db/types';
import {
  loadDecisionCells,
  markDecisionFlowsSeen,
  mergeDecisionCells,
  staleDecisionFlowIds,
} from './decisionCells';

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

    const result = await loadDecisionCells(['flow-a'], listCells, flushPending);

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
    const pending = loadDecisionCells(['flow-a'], listCells, flushPending).then((map) => {
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

  test('reads only the flows it is given', async () => {
    const listCells = vi.fn(async (flowId: string) => [makeCell(flowId, 'content')]);

    await loadDecisionCells(['flow-b'], listCells);

    expect(listCells).toHaveBeenCalledTimes(1);
    expect(listCells).toHaveBeenCalledWith('flow-b');
  });
});

describe('decision cell freshness tracking (DEB-59)', () => {
  test('only flows saved since the last read are stale', () => {
    const saved = new Map([
      ['flow-a', 2],
      ['flow-b', 1],
    ]);
    const seen = new Map([
      ['flow-a', 1],
      ['flow-b', 1],
    ]);

    expect(staleDecisionFlowIds(['flow-a', 'flow-b', 'flow-c'], saved, seen)).toEqual(['flow-a']);
  });

  test('marking a read keeps the highest revision seen per flow', () => {
    const seen = new Map([['flow-a', 3]]);
    const saved = new Map([
      ['flow-a', 2],
      ['flow-b', 1],
    ]);

    const marked = markDecisionFlowsSeen(seen, ['flow-a', 'flow-b'], saved);

    expect(marked.get('flow-a')).toBe(3);
    expect(marked.get('flow-b')).toBe(1);
    expect(staleDecisionFlowIds(['flow-a', 'flow-b'], saved, marked)).toEqual([]);
  });

  test('merging a refetch replaces only the refetched flows', () => {
    const previous = new Map([
      ['flow-a', new Map([['5:0', makeCell('flow-a', 'old 2NR')]])],
      ['flow-b', new Map([['5:0', makeCell('flow-b', 'untouched')]])],
    ]);
    const updates = new Map([['flow-a', new Map([['5:0', makeCell('flow-a', 'new 2NR')]])]]);

    const merged = mergeDecisionCells(previous, updates);

    expect(merged.get('flow-a')?.get('5:0')?.content).toBe('new 2NR');
    expect(merged.get('flow-b')?.get('5:0')?.content).toBe('untouched');
    expect(previous.get('flow-a')?.get('5:0')?.content).toBe('old 2NR');
  });
});
