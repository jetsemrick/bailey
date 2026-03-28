import { describe, expect, test, beforeEach } from 'vitest';
import {
  activeFlowStorageKey,
  readStoredActiveFlowId,
  writeStoredActiveFlowId,
  clearStoredActiveFlowId,
} from './roundFlowTabStorage';

describe('roundFlowTabStorage', () => {
  beforeEach(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  test('round-trip flow id', () => {
    if (typeof sessionStorage === 'undefined') return;
    const rid = 'round-1';
    const fid = 'flow-abc';
    expect(readStoredActiveFlowId(rid)).toBeNull();
    writeStoredActiveFlowId(rid, fid);
    expect(readStoredActiveFlowId(rid)).toBe(fid);
    expect(sessionStorage.getItem(activeFlowStorageKey(rid))).toBe(fid);
    clearStoredActiveFlowId(rid);
    expect(readStoredActiveFlowId(rid)).toBeNull();
  });
});
