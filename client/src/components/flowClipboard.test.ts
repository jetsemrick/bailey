import { describe, expect, test } from 'vitest';
import {
  buildClipboardPayload,
  buildPastePlan,
  buildClearEdits,
  parseClipboardPayload,
  serializeClipboardPayload,
} from './flowClipboard';

describe('flowClipboard', () => {
  test('buildClipboardPayload preserves relative offsets', () => {
    const payload = buildClipboardPayload([
      { col: 2, row: 3, content: 'a', color: 'yellow', comment: 'c1' },
      { col: 3, row: 5, content: 'b', color: null, comment: '' },
    ]);
    expect(payload.minCol).toBe(2);
    expect(payload.minRow).toBe(3);
    expect(payload.cells).toHaveLength(2);
    expect(payload.cells[0]).toMatchObject({ colOffset: 0, rowOffset: 0, content: 'a' });
    expect(payload.cells[1]).toMatchObject({ colOffset: 1, rowOffset: 2, content: 'b' });
  });

  test('serialize and parse round-trip', () => {
    const payload = buildClipboardPayload([
      { col: 0, row: 0, content: '<b>x</b>', color: null, comment: '' },
    ]);
    const text = serializeClipboardPayload(payload);
    const parsed = parseClipboardPayload(text);
    expect(parsed?.cells[0].content).toBe('<b>x</b>');
  });

  test('buildPastePlan writes at anchor with offsets', () => {
    const payload = buildClipboardPayload([
      { col: 1, row: 1, content: 'one', color: 'green', comment: 'n' },
      { col: 2, row: 2, content: 'two', color: null, comment: '' },
    ]);
    const plan = buildPastePlan(
      payload,
      { col: 4, row: 10 },
      [0, 1, 2, 3, 4, 5],
      () => ({ col: 0, row: 0, content: '', color: null, comment: '' })
    );
    expect(plan.updates).toHaveLength(2);
    expect(plan.updates[0]).toMatchObject({ col: 4, row: 10, content: 'one', color: 'green' });
    expect(plan.updates[1]).toMatchObject({ col: 5, row: 11, content: 'two' });
    expect(plan.edits).toHaveLength(2);
  });

  test('buildPastePlan skips columns not in flow', () => {
    const payload = buildClipboardPayload([
      { col: 0, row: 0, content: 'x', color: null, comment: '' },
    ]);
    const plan = buildPastePlan(
      payload,
      { col: 99, row: 0 },
      [0, 1, 2],
      () => ({ col: 0, row: 0, content: '', color: null, comment: '' })
    );
    expect(plan.updates).toHaveLength(0);
  });

  test('buildClearEdits batches empty cells only when needed', () => {
    const { updates, edits } = buildClearEdits(
      [{ col: 0, row: 0 }, { col: 0, row: 1 }],
      (col, row) => ({
        col,
        row,
        content: row === 0 ? 'hi' : '',
        color: null,
        comment: '',
      })
    );
    expect(updates).toHaveLength(1);
    expect(edits).toHaveLength(1);
    expect(updates[0].content).toBe('');
  });
});
