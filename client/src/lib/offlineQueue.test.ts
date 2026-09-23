import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import 'fake-indexeddb/auto';
import {
  queueOperation,
  getAllOperations,
  clearOperation,
  clearOperationsForCells,
  clearAllOperations,
  getPendingOperationCount,
  consolidateOperations,
  deleteDB,
  type OfflineOperation,
} from './offlineQueue';

function expectUpsert(
  op: OfflineOperation,
  expected: Partial<Extract<OfflineOperation, { type: 'upsert' }>>,
) {
  expect(op.type).toBe('upsert');
  if (op.type !== 'upsert') return;
  expect(op).toMatchObject(expected);
}

describe('offlineQueue', () => {
  beforeEach(async () => {
    await deleteDB();
  });

  afterEach(async () => {
    await deleteDB();
  });

  test('queues an upsert operation', async () => {
    await queueOperation({
      type: 'upsert',
      flowId: 'flow-1',
      column_index: 0,
      row_index: 0,
      content: 'test content',
      color: null,
      comment: '',
    });

    const ops = await getAllOperations();
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe('upsert');
    expect(ops[0].flowId).toBe('flow-1');
    expectUpsert(ops[0], { content: 'test content' });
    expect(ops[0].timestamp).toBeGreaterThan(0);
  });

  test('queues a delete operation', async () => {
    await queueOperation({
      type: 'delete',
      flowId: 'flow-1',
      column_index: 1,
      row_index: 2,
    });

    const ops = await getAllOperations();
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe('delete');
    expect(ops[0].flowId).toBe('flow-1');
    expect(ops[0].column_index).toBe(1);
    expect(ops[0].row_index).toBe(2);
  });

  test('queues multiple operations in order', async () => {
    await queueOperation({
      type: 'upsert',
      flowId: 'flow-1',
      column_index: 0,
      row_index: 0,
      content: 'first',
      color: null,
      comment: '',
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    await queueOperation({
      type: 'upsert',
      flowId: 'flow-1',
      column_index: 0,
      row_index: 1,
      content: 'second',
      color: null,
      comment: '',
    });

    const ops = await getAllOperations();
    expect(ops).toHaveLength(2);
    expectUpsert(ops[0], { content: 'first' });
    expectUpsert(ops[1], { content: 'second' });
    expect(ops[0].timestamp).toBeLessThan(ops[1].timestamp);
  });

  test('clears a specific operation by id', async () => {
    await queueOperation({
      type: 'upsert',
      flowId: 'flow-1',
      column_index: 0,
      row_index: 0,
      content: 'keep',
      color: null,
      comment: '',
    });

    await queueOperation({
      type: 'upsert',
      flowId: 'flow-1',
      column_index: 0,
      row_index: 1,
      content: 'remove',
      color: null,
      comment: '',
    });

    let ops = await getAllOperations();
    expect(ops).toHaveLength(2);

    await clearOperation(ops[1].id);

    ops = await getAllOperations();
    expect(ops).toHaveLength(1);
    expectUpsert(ops[0], { content: 'keep' });
  });

  test('clears all operations', async () => {
    await queueOperation({
      type: 'upsert',
      flowId: 'flow-1',
      column_index: 0,
      row_index: 0,
      content: 'test1',
      color: null,
      comment: '',
    });

    await queueOperation({
      type: 'upsert',
      flowId: 'flow-1',
      column_index: 0,
      row_index: 1,
      content: 'test2',
      color: null,
      comment: '',
    });

    let count = await getPendingOperationCount();
    expect(count).toBe(2);

    await clearAllOperations();

    count = await getPendingOperationCount();
    expect(count).toBe(0);
  });

  test('counts pending operations', async () => {
    let count = await getPendingOperationCount();
    expect(count).toBe(0);

    await queueOperation({
      type: 'upsert',
      flowId: 'flow-1',
      column_index: 0,
      row_index: 0,
      content: 'test',
      color: null,
      comment: '',
    });

    count = await getPendingOperationCount();
    expect(count).toBe(1);

    await queueOperation({
      type: 'delete',
      flowId: 'flow-1',
      column_index: 1,
      row_index: 0,
    });

    count = await getPendingOperationCount();
    expect(count).toBe(2);
  });

  test('consolidates operations with last-write-wins per cell', () => {
    const ops: Array<OfflineOperation & { id: number; cellKey: string }> = [
      {
        id: 1,
        type: 'upsert',
        flowId: 'flow-1',
        column_index: 0,
        row_index: 0,
        content: 'v1',
        color: null,
        comment: '',
        timestamp: 100,
        cellKey: 'flow-1:0:0',
      },
      {
        id: 2,
        type: 'upsert',
        flowId: 'flow-1',
        column_index: 0,
        row_index: 0,
        content: 'v2',
        color: 'yellow',
        comment: '',
        timestamp: 200,
        cellKey: 'flow-1:0:0',
      },
      {
        id: 3,
        type: 'upsert',
        flowId: 'flow-1',
        column_index: 0,
        row_index: 1,
        content: 'other cell',
        color: null,
        comment: '',
        timestamp: 150,
        cellKey: 'flow-1:0:1',
      },
    ];

    const consolidated = consolidateOperations(ops);

    expect(consolidated).toHaveLength(2);
    expect(consolidated[0].row_index).toBe(1);
    expectUpsert(consolidated[0], { content: 'other cell' });
    expect(consolidated[1].row_index).toBe(0);
    expectUpsert(consolidated[1], { content: 'v2', color: 'yellow' });
  });

  test('consolidates upsert then delete to keep only delete', () => {
    const ops: Array<OfflineOperation & { id: number; cellKey: string }> = [
      {
        id: 1,
        type: 'upsert',
        flowId: 'flow-1',
        column_index: 0,
        row_index: 0,
        content: 'content',
        color: null,
        comment: '',
        timestamp: 100,
        cellKey: 'flow-1:0:0',
      },
      {
        id: 2,
        type: 'delete',
        flowId: 'flow-1',
        column_index: 0,
        row_index: 0,
        timestamp: 200,
        cellKey: 'flow-1:0:0',
      },
    ];

    const consolidated = consolidateOperations(ops);

    expect(consolidated).toHaveLength(1);
    expect(consolidated[0].type).toBe('delete');
  });

  test('consolidates delete then upsert to keep only upsert', () => {
    const ops: Array<OfflineOperation & { id: number; cellKey: string }> = [
      {
        id: 1,
        type: 'delete',
        flowId: 'flow-1',
        column_index: 0,
        row_index: 0,
        timestamp: 100,
        cellKey: 'flow-1:0:0',
      },
      {
        id: 2,
        type: 'upsert',
        flowId: 'flow-1',
        column_index: 0,
        row_index: 0,
        content: 'new content',
        color: null,
        comment: '',
        timestamp: 200,
        cellKey: 'flow-1:0:0',
      },
    ];

    const consolidated = consolidateOperations(ops);

    expect(consolidated).toHaveLength(1);
    expect(consolidated[0].type).toBe('upsert');
    expectUpsert(consolidated[0], { content: 'new content' });
  });

  test('maintains operations for different cells', () => {
    const ops: Array<OfflineOperation & { id: number; cellKey: string }> = [
      {
        id: 1,
        type: 'upsert',
        flowId: 'flow-1',
        column_index: 0,
        row_index: 0,
        content: 'cell 1',
        color: null,
        comment: '',
        timestamp: 100,
        cellKey: 'flow-1:0:0',
      },
      {
        id: 2,
        type: 'upsert',
        flowId: 'flow-1',
        column_index: 0,
        row_index: 1,
        content: 'cell 2',
        color: null,
        comment: '',
        timestamp: 200,
        cellKey: 'flow-1:0:1',
      },
      {
        id: 3,
        type: 'upsert',
        flowId: 'flow-2',
        column_index: 0,
        row_index: 0,
        content: 'different flow',
        color: null,
        comment: '',
        timestamp: 300,
        cellKey: 'flow-2:0:0',
      },
    ];

    const consolidated = consolidateOperations(ops);

    expect(consolidated).toHaveLength(3);
    expectUpsert(consolidated[0], { content: 'cell 1' });
    expectUpsert(consolidated[1], { content: 'cell 2' });
    expectUpsert(consolidated[2], { content: 'different flow' });
  });

  test('handles empty operation list', () => {
    const consolidated = consolidateOperations([]);
    expect(consolidated).toHaveLength(0);
  });

  test('clears all queued operations for a cell including superseded writes', async () => {
    await queueOperation({
      type: 'upsert',
      flowId: 'flow-1',
      column_index: 0,
      row_index: 0,
      content: 'v1',
      color: null,
      comment: '',
    });
    await queueOperation({
      type: 'upsert',
      flowId: 'flow-1',
      column_index: 0,
      row_index: 0,
      content: 'v2',
      color: null,
      comment: '',
    });
    await queueOperation({
      type: 'upsert',
      flowId: 'flow-1',
      column_index: 0,
      row_index: 1,
      content: 'keep',
      color: null,
      comment: '',
    });

    await clearOperationsForCells('flow-1', [{ column_index: 0, row_index: 0 }]);

    const ops = await getAllOperations();
    expect(ops).toHaveLength(1);
    expect(ops[0]).toEqual(expect.objectContaining({ content: 'keep' }));
  });

  test('clearOperationsForCells with empty coords is a no-op', async () => {
    await queueOperation({
      type: 'upsert',
      flowId: 'flow-1',
      column_index: 0,
      row_index: 0,
      content: 'keep',
      color: null,
      comment: '',
    });

    await clearOperationsForCells('flow-1', []);

    const ops = await getAllOperations();
    expect(ops).toHaveLength(1);
    expect(ops[0]).toEqual(expect.objectContaining({ content: 'keep' }));
  });
});
