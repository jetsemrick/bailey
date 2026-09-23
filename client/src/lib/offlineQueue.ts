/**
 * Offline-first save queue for flow cells (DEB-75).
 * 
 * Uses IndexedDB to persist dirty cell operations locally and replays them
 * in order when the connection is restored. Conflict policy: last-write-wins
 * per cell key for a single user.
 */

import type { CellColor } from '../db/types';

export type OfflineOperation =
  | {
      type: 'upsert';
      flowId: string;
      column_index: number;
      row_index: number;
      content: string;
      color: CellColor;
      comment: string;
      timestamp: number;
    }
  | {
      type: 'delete';
      flowId: string;
      column_index: number;
      row_index: number;
      timestamp: number;
    };

type QueueableOperation =
  | Omit<Extract<OfflineOperation, { type: 'upsert' }>, 'timestamp'>
  | Omit<Extract<OfflineOperation, { type: 'delete' }>, 'timestamp'>;

export type QueueStatus = 'idle' | 'syncing' | 'error';

const DB_NAME = 'bailey-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'operations';

let dbInstance: IDBDatabase | null = null;
let onlineCallback: (() => void) | null = null;

function cellKey(flowId: string, col: number, row: number): string {
  return `${flowId}:${col}:${row}`;
}

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('cellKey', 'cellKey', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

export async function queueOperation(operation: QueueableOperation): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  const key = cellKey(operation.flowId, operation.column_index, operation.row_index);
  
  const stored = {
    ...operation,
    timestamp: Date.now(),
    cellKey: key,
  };

  await new Promise<void>((resolve, reject) => {
    const request = store.add(stored);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllOperations(): Promise<Array<OfflineOperation & { id: number; cellKey: string }>> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('timestamp');

  return new Promise((resolve, reject) => {
    const request = index.openCursor();
    const results: Array<OfflineOperation & { id: number; cellKey: string }> = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearOperation(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  await new Promise<void>((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove every queued operation for the given cells, including superseded
 * earlier writes for the same key.
 */
export async function clearOperationsForCells(
  flowId: string,
  coords: { column_index: number; row_index: number }[]
): Promise<void> {
  if (coords.length === 0) return;
  const keys = new Set(coords.map((c) => cellKey(flowId, c.column_index, c.row_index)));
  const ops = await getAllOperations();
  for (const op of ops) {
    if (keys.has(op.cellKey)) {
      await clearOperation(op.id);
    }
  }
}

export async function clearAllOperations(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  await new Promise<void>((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingOperationCount(): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Consolidate operations using last-write-wins per cell key.
 * Returns operations in timestamp order, with only the latest operation per cell.
 */
export function consolidateOperations(
  operations: Array<OfflineOperation & { id: number; cellKey: string }>
): Array<OfflineOperation & { id: number; cellKey: string }> {
  const byKey = new Map<string, OfflineOperation & { id: number; cellKey: string }>();

  for (const op of operations) {
    const existing = byKey.get(op.cellKey);
    if (!existing || op.timestamp > existing.timestamp) {
      byKey.set(op.cellKey, op);
    }
  }

  return Array.from(byKey.values()).sort((a, b) => a.timestamp - b.timestamp);
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function onOnline(callback: () => void): () => void {
  onlineCallback = callback;
  
  const handler = () => {
    if (onlineCallback) {
      onlineCallback();
    }
  };

  window.addEventListener('online', handler);
  
  return () => {
    window.removeEventListener('online', handler);
    onlineCallback = null;
  };
}

export function onOffline(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener('offline', handler);
  return () => window.removeEventListener('offline', handler);
}

/**
 * For testing: close the database connection and clear the instance.
 */
export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * For testing: delete the entire database.
 */
export async function deleteDB(): Promise<void> {
  await closeDB();
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
