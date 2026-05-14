import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Flow, FlowCell } from '../db/types';

type Effect = () => void | (() => void);
type StateSetter<T> = (value: T | ((previous: T) => T)) => void;

const hookHarness = vi.hoisted(() => {
  type HookSlot =
    | { type: 'state'; value: unknown }
    | { type: 'ref'; value: { current: unknown } }
    | { type: 'callback'; value: unknown; deps?: readonly unknown[] }
    | { type: 'effect'; deps?: readonly unknown[] };

  let slots: HookSlot[] = [];
  let hookIndex = 0;
  let pendingEffects: Effect[] = [];
  let needsRender = false;

  function depsChanged(previous: readonly unknown[] | undefined, next: readonly unknown[] | undefined) {
    if (!previous || !next || previous.length !== next.length) return true;
    return next.some((value, index) => !Object.is(value, previous[index]));
  }

  return {
    reset() {
      slots = [];
      hookIndex = 0;
      pendingEffects = [];
      needsRender = false;
    },
    beginRender() {
      hookIndex = 0;
      pendingEffects = [];
      needsRender = false;
    },
    runEffects() {
      const effects = pendingEffects;
      pendingEffects = [];
      effects.forEach((effect) => effect());
    },
    needsRender() {
      return needsRender;
    },
    react: {
      useState<T>(initialValue: T | (() => T)): [T, StateSetter<T>] {
        const slotIndex = hookIndex++;
        let slot = slots[slotIndex];
        if (!slot || slot.type !== 'state') {
          slot = {
            type: 'state',
            value: typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue,
          };
          slots[slotIndex] = slot;
        }
        const setState: StateSetter<T> = (nextValue) => {
          const value =
            typeof nextValue === 'function'
              ? (nextValue as (previous: T) => T)(slot.value as T)
              : nextValue;
          if (!Object.is(slot.value, value)) {
            slot.value = value;
            needsRender = true;
          }
        };
        return [slot.value as T, setState];
      },
      useRef<T>(initialValue: T): { current: T } {
        const slotIndex = hookIndex++;
        let slot = slots[slotIndex];
        if (!slot || slot.type !== 'ref') {
          slot = { type: 'ref', value: { current: initialValue } };
          slots[slotIndex] = slot;
        }
        return slot.value as { current: T };
      },
      useCallback<T extends (...args: unknown[]) => unknown>(callback: T, deps?: readonly unknown[]): T {
        const slotIndex = hookIndex++;
        const slot = slots[slotIndex];
        if (!slot || slot.type !== 'callback' || depsChanged(slot.deps, deps)) {
          slots[slotIndex] = { type: 'callback', value: callback, deps };
          return callback;
        }
        return slot.value as T;
      },
      useEffect(effect: Effect, deps?: readonly unknown[]) {
        const slotIndex = hookIndex++;
        const slot = slots[slotIndex];
        if (!slot || slot.type !== 'effect' || depsChanged(slot.deps, deps)) {
          slots[slotIndex] = { type: 'effect', deps };
          pendingEffects.push(effect);
        }
      },
    },
  };
});

const apiMock = vi.hoisted(() => ({
  listFlows: vi.fn(),
  listCells: vi.fn(),
  upsertCells: vi.fn(),
}));

vi.mock('react', () => hookHarness.react);
vi.mock('../db/api', () => ({
  ...apiMock,
  toError: (error: unknown, fallback: string) => (error instanceof Error ? error : new Error(fallback)),
}));
vi.mock('../lib/roundFlowTabStorage', () => ({
  clearStoredActiveFlowId: vi.fn(),
  readStoredActiveFlowId: vi.fn(() => null),
  writeStoredActiveFlowId: vi.fn(),
}));

import { normalizeNegativeBlockCells, useFlowGrid } from './useFlowGrid';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeFlow(id: string, tabKind: Flow['tab_kind'] = 'standard'): Flow {
  return {
    id,
    user_id: 'user-1',
    round_id: 'round-1',
    position_name: id,
    initiated_by: 'aff',
    display_order: id === 'flow-a' ? 0 : 1,
    tab_kind: tabKind,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

function makeCell(flowId: string, content: string, columnIndex = 0, rowIndex = 0): FlowCell {
  return {
    id: `cell-${flowId}-${columnIndex}-${rowIndex}`,
    user_id: 'user-1',
    flow_id: flowId,
    column_index: columnIndex,
    row_index: rowIndex,
    content,
    color: null,
    comment: '',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

function renderHook() {
  let result: ReturnType<typeof useFlowGrid>;
  do {
    hookHarness.beginRender();
    result = useFlowGrid('round-1');
    hookHarness.runEffects();
  } while (hookHarness.needsRender());
  return result!;
}

async function flushAndRender() {
  await Promise.resolve();
  await Promise.resolve();
  return renderHook();
}

describe('useFlowGrid', () => {
  beforeEach(() => {
    hookHarness.reset();
    vi.clearAllMocks();
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    apiMock.listFlows.mockResolvedValue([makeFlow('flow-a'), makeFlow('flow-b')]);
    apiMock.upsertCells.mockResolvedValue(undefined);
  });

  test('ignores stale cells when tab loads resolve out of order', async () => {
    const cellLoads = new Map<string, ReturnType<typeof deferred<FlowCell[]>>>();
    apiMock.listCells.mockImplementation((flowId: string) => {
      const load = deferred<FlowCell[]>();
      cellLoads.set(flowId, load);
      return load.promise;
    });

    let grid = renderHook();
    grid = await flushAndRender();
    expect(grid.activeFlowId).toBe('flow-a');
    expect(apiMock.listCells).toHaveBeenCalledWith('flow-a');

    grid.selectFlow('flow-b');
    grid = renderHook();
    expect(grid.activeFlowId).toBe('flow-b');
    expect(apiMock.listCells).toHaveBeenCalledWith('flow-b');

    cellLoads.get('flow-b')?.resolve([makeCell('flow-b', 'latest tab cell')]);
    grid = await flushAndRender();
    expect(grid.getCellContent(0, 0)).toBe('latest tab cell');

    cellLoads.get('flow-a')?.resolve([makeCell('flow-a', 'stale tab cell')]);
    grid = await flushAndRender();
    expect(grid.activeFlowId).toBe('flow-b');
    expect(grid.getCellContent(0, 0)).toBe('latest tab cell');
  });

  test('loads legacy 1NR cells into the 2NC/1NR block and persists the migration', async () => {
    apiMock.listCells.mockResolvedValue([
      makeCell('flow-a', '2NC overview', 3, 0),
      makeCell('flow-a', '1NR extension', 4, 0),
    ]);

    let grid = renderHook();
    grid = await flushAndRender();
    grid = await flushAndRender();

    expect(grid.getCellContent(3, 0)).toBe('2NC overview');
    expect(grid.getCellContent(3, 1)).toBe('1NR extension');
    expect(grid.getCellContent(4, 0)).toBe('');
    expect(apiMock.upsertCells).toHaveBeenCalledWith('flow-a', [
      {
        column_index: 3,
        row_index: 1,
        content: '1NR extension',
        color: null,
        comment: '',
      },
      {
        column_index: 4,
        row_index: 0,
        content: '',
        color: null,
        comment: '',
      },
    ]);
  });

  test('keeps CX tabs on the full eight-column layout without migrating 1NR', async () => {
    apiMock.listFlows.mockResolvedValue([makeFlow('flow-a', 'cx')]);
    apiMock.listCells.mockResolvedValue([
      makeCell('flow-a', 'cx 1NR note', 4, 0),
    ]);

    let grid = renderHook();
    grid = await flushAndRender();
    grid = await flushAndRender();

    expect(grid.getCellContent(4, 0)).toBe('cx 1NR note');
    expect(apiMock.upsertCells).not.toHaveBeenCalled();
  });
});

describe('normalizeNegativeBlockCells', () => {
  test('preserves 2NC rows and appends 1NR rows in order', () => {
    const { cells, migrationUpdates } = normalizeNegativeBlockCells([
      makeCell('flow-a', '2NC row 0', 3, 0),
      makeCell('flow-a', '2NC row 2', 3, 2),
      makeCell('flow-a', '1NR row 0', 4, 0),
      makeCell('flow-a', '1NR row 3', 4, 3),
    ]);

    expect(cells.get('3:0')?.content).toBe('2NC row 0');
    expect(cells.get('3:2')?.content).toBe('2NC row 2');
    expect(cells.get('3:3')?.content).toBe('1NR row 0');
    expect(cells.get('3:4')?.content).toBe('1NR row 3');
    expect(cells.has('4:0')).toBe(false);
    expect(migrationUpdates.map((update) => `${update.column_index}:${update.row_index}:${update.content}`)).toEqual([
      '3:3:1NR row 0',
      '4:0:',
      '3:4:1NR row 3',
      '4:3:',
    ]);
  });
});
