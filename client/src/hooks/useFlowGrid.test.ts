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

import { useFlowGrid } from './useFlowGrid';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeFlow(id: string): Flow {
  return {
    id,
    user_id: 'user-1',
    round_id: 'round-1',
    position_name: id,
    initiated_by: 'aff',
    display_order: id === 'flow-a' ? 0 : 1,
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
    column_index: 0,
    row_index: 0,
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

  test('DEB-59: does not bump cellsRevision on edit before flush', async () => {
    apiMock.listCells.mockResolvedValue([]);
    let grid = renderHook();
    grid = await flushAndRender();
    expect(grid.cellsRevision).toBe(0);

    grid.updateCell(0, 0, 'typed while debounce pending');
    grid = renderHook();
    expect(grid.getCellContent(0, 0)).toBe('typed while debounce pending');
    expect(grid.cellsRevision).toBe(0);
    expect(apiMock.upsertCells).not.toHaveBeenCalled();
  });

  test('DEB-59: bumps cellsRevision only after successful saveNow flush', async () => {
    apiMock.listCells.mockResolvedValue([]);
    let grid = renderHook();
    grid = await flushAndRender();

    grid.updateCell(5, 0, '2NR content');
    grid = renderHook();
    expect(grid.cellsRevision).toBe(0);

    await grid.saveNow();
    grid = await flushAndRender();

    expect(apiMock.upsertCells).toHaveBeenCalledWith('flow-a', [
      expect.objectContaining({
        column_index: 5,
        row_index: 0,
        content: '2NR content',
      }),
    ]);
    expect(grid.cellsRevision).toBe(1);
  });

  test('DEB-59: failed flush does not bump cellsRevision', async () => {
    apiMock.listCells.mockResolvedValue([]);
    apiMock.upsertCells.mockRejectedValueOnce(new Error('network down'));
    let grid = renderHook();
    grid = await flushAndRender();

    grid.updateCell(0, 0, 'will fail to save');
    grid = renderHook();
    await grid.saveNow();
    grid = await flushAndRender();

    expect(grid.cellsRevision).toBe(0);
    expect(grid.error).toBe('network down');
  });

  test('DEB-59: saveNow awaits an in-flight debounce flush', async () => {
    vi.useFakeTimers();
    apiMock.listCells.mockResolvedValue([]);
    const upsert = deferred<void>();
    apiMock.upsertCells.mockReturnValueOnce(upsert.promise);

    let grid = renderHook();
    grid = await flushAndRender();
    grid.updateCell(0, 0, 'pending write');
    grid = renderHook();

    await vi.advanceTimersByTimeAsync(500);
    expect(apiMock.upsertCells).toHaveBeenCalledTimes(1);

    let saveDone = false;
    const savePromise = grid.saveNow().then(() => {
      saveDone = true;
    });
    await Promise.resolve();
    expect(saveDone).toBe(false);

    upsert.resolve();
    await savePromise;
    grid = await flushAndRender();

    expect(saveDone).toBe(true);
    expect(grid.cellsRevision).toBe(1);
    expect(apiMock.upsertCells).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
