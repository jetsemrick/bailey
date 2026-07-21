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

  test('DEB-58: restores dirty cells and retries after failed autosave', async () => {
    vi.useFakeTimers();
    apiMock.listCells.mockResolvedValue([]);
    apiMock.upsertCells
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(undefined);

    let grid = renderHook();
    grid = await flushAndRender();

    grid.updateCell(0, 0, 'unsaved content');
    grid = renderHook();
    expect(grid.getCellContent(0, 0)).toBe('unsaved content');

    await grid.saveNow();
    grid = await flushAndRender();
    expect(grid.error).toBe('network down');
    expect(apiMock.upsertCells).toHaveBeenCalledTimes(1);
    expect(apiMock.upsertCells).toHaveBeenLastCalledWith('flow-a', [
      expect.objectContaining({ column_index: 0, row_index: 0, content: 'unsaved content' }),
    ]);

    // Debounced retry should re-flush the restored dirty cell and clear the error
    await vi.advanceTimersByTimeAsync(500);
    grid = await flushAndRender();
    expect(apiMock.upsertCells).toHaveBeenCalledTimes(2);
    expect(apiMock.upsertCells).toHaveBeenLastCalledWith('flow-a', [
      expect.objectContaining({ column_index: 0, row_index: 0, content: 'unsaved content' }),
    ]);
    expect(grid.error).toBeNull();

    vi.useRealTimers();
  });

  test('DEB-58: failed flush keeps newer edits instead of restoring stale dirty', async () => {
    apiMock.listCells.mockResolvedValue([]);
    const upsert = deferred<void>();
    apiMock.upsertCells.mockReturnValueOnce(upsert.promise);

    let grid = renderHook();
    grid = await flushAndRender();

    grid.updateCell(0, 0, 'first draft');
    grid = renderHook();

    const savePromise = grid.saveNow();
    // While the first flush is in flight, a newer edit lands in dirtyRef
    grid.updateCell(0, 0, 'second draft');
    grid = renderHook();
    expect(grid.getCellContent(0, 0)).toBe('second draft');

    upsert.reject(new Error('write failed'));
    await savePromise.catch(() => undefined);
    grid = await flushAndRender();
    expect(grid.error).toBe('write failed');

    apiMock.upsertCells.mockResolvedValueOnce(undefined);
    await grid.saveNow();
    grid = await flushAndRender();

    expect(apiMock.upsertCells).toHaveBeenLastCalledWith('flow-a', [
      expect.objectContaining({ column_index: 0, row_index: 0, content: 'second draft' }),
    ]);
    expect(grid.getCellContent(0, 0)).toBe('second draft');
    expect(grid.error).toBeNull();
  });

  test('DEB-58: serializes overlapping flushes so stale restore cannot overwrite newer write', async () => {
    apiMock.listCells.mockResolvedValue([]);
    const firstUpsert = deferred<void>();
    apiMock.upsertCells
      .mockReturnValueOnce(firstUpsert.promise)
      .mockResolvedValueOnce(undefined);

    let grid = renderHook();
    grid = await flushAndRender();

    grid.updateCell(0, 0, 'v1');
    grid = renderHook();
    const firstSave = grid.saveNow();

    grid.updateCell(0, 0, 'v2');
    grid = renderHook();

    // Second save waits for the in-flight flush, then persists the newer dirty cell
    const secondSave = grid.saveNow();

    firstUpsert.reject(new Error('first failed'));
    await firstSave.catch(() => undefined);
    await secondSave;
    grid = await flushAndRender();

    expect(apiMock.upsertCells).toHaveBeenCalledTimes(2);
    expect(apiMock.upsertCells.mock.calls[0][1]).toEqual([
      expect.objectContaining({ content: 'v1' }),
    ]);
    expect(apiMock.upsertCells.mock.calls[1][1]).toEqual([
      expect.objectContaining({ content: 'v2' }),
    ]);
    expect(grid.error).toBeNull();
  });

  test('DEB-58: failed tab-switch flush keeps dirty on that flow and retries', async () => {
    vi.useFakeTimers();
    apiMock.listCells.mockResolvedValue([]);
    apiMock.upsertCells
      .mockRejectedValueOnce(new Error('tab switch save failed'))
      .mockResolvedValue(undefined);

    let grid = renderHook();
    grid = await flushAndRender();

    grid.updateCell(0, 0, 'flow-a content');
    grid = renderHook();

    grid.selectFlow('flow-b');
    grid = renderHook();
    // Allow the tab-switch flush promise to settle
    await Promise.resolve();
    await Promise.resolve();
    grid = await flushAndRender();
    expect(grid.error).toBe('tab switch save failed');
    expect(apiMock.upsertCells).toHaveBeenCalledWith('flow-a', [
      expect.objectContaining({ content: 'flow-a content' }),
    ]);

    // Retry targets flow-a even while viewing flow-b
    await vi.advanceTimersByTimeAsync(500);
    await Promise.resolve();
    await Promise.resolve();
    grid = await flushAndRender();
    expect(apiMock.upsertCells).toHaveBeenCalledTimes(2);
    expect(apiMock.upsertCells).toHaveBeenLastCalledWith('flow-a', [
      expect.objectContaining({ content: 'flow-a content' }),
    ]);
    expect(grid.error).toBeNull();

    vi.useRealTimers();
  });
});
