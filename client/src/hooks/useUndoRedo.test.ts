import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { CellEdit } from './useUndoRedo';

type Effect = () => void | (() => void);

const hookHarness = vi.hoisted(() => {
  type HookSlot =
    | { type: 'state'; value: unknown }
    | { type: 'callback'; value: unknown; deps?: readonly unknown[] };

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
      pendingEffects.forEach((effect) => effect());
      pendingEffects = [];
    },
    needsRender() {
      return needsRender;
    },
    react: {
      useState<T>(initial: T | (() => T)) {
        const i = hookIndex++;
        let slot = slots[i];
        if (!slot || slot.type !== 'state') {
          slot = {
            type: 'state',
            value: typeof initial === 'function' ? (initial as () => T)() : initial,
          };
          slots[i] = slot;
        }
        const setState = (next: T | ((p: T) => T)) => {
          const value =
            typeof next === 'function' ? (next as (p: T) => T)(slot!.value as T) : next;
          if (!Object.is(slot!.value, value)) {
            slot!.value = value;
            needsRender = true;
          }
        };
        return [slot.value as T, setState] as const;
      },
      useRef<T>(initial: T) {
        const i = hookIndex++;
        let slot = slots[i];
        if (!slot || slot.type !== 'state') {
          slot = { type: 'state', value: { current: initial } };
          slots[i] = slot;
        }
        return slot.value as { current: T };
      },
      useCallback<T extends (...args: unknown[]) => unknown>(fn: T, deps?: readonly unknown[]) {
        void deps;
        const i = hookIndex++;
        const slot = slots[i];
        if (!slot || slot.type !== 'callback' || depsChanged(slot.deps, deps)) {
          slots[i] = { type: 'callback', value: fn, deps };
          return fn;
        }
        return slot.value as T;
      },
      useEffect(effect: Effect, deps?: readonly unknown[]) {
        pendingEffects.push(effect);
      },
    },
  };
});

vi.mock('react', () => hookHarness.react);

import { useUndoRedo } from './useUndoRedo';

function makeEdit(row: number, tag: string): CellEdit {
  return {
    col: 0,
    row,
    previousContent: `${tag}-prev`,
    newContent: `${tag}-new`,
    previousColor: null,
    newColor: 'yellow',
    previousComment: '',
    newComment: '',
  };
}

function renderUndo() {
  let api: ReturnType<typeof useUndoRedo>;
  do {
    hookHarness.beginRender();
    api = useUndoRedo();
    hookHarness.runEffects();
  } while (hookHarness.needsRender());
  return api!;
}

describe('useUndoRedo', () => {
  beforeEach(() => hookHarness.reset());

  test('single edit undo and redo', () => {
    let api = renderUndo();
    api.pushEdit(makeEdit(0, 'a'));
    api = renderUndo();
    const undone = api.undo();
    expect(undone).toHaveLength(1);
    expect(undone![0].previousContent).toBe('a-prev');
    api = renderUndo();
    const redone = api.redo();
    expect(redone).toHaveLength(1);
    expect(redone![0].newContent).toBe('a-new');
  });

  test('batch undo returns edits in reverse order', () => {
    let api = renderUndo();
    api.pushBatch([makeEdit(0, 'a'), makeEdit(1, 'b')]);
    api = renderUndo();
    const undone = api.undo();
    expect(undone).toHaveLength(2);
    expect(undone![0].row).toBe(1);
    expect(undone![1].row).toBe(0);
  });

  test('clear resets stacks', () => {
    let api = renderUndo();
    api.pushEdit(makeEdit(0, 'a'));
    api = renderUndo();
    api.clear();
    api = renderUndo();
    expect(api.canUndo).toBe(false);
    expect(api.undo()).toBeNull();
  });
});
