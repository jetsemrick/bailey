import { beforeEach, describe, expect, test } from 'vitest';
import {
  activeSpeechStorageKey,
  clearStoredActiveSpeech,
  readStoredActiveSpeech,
  writeStoredActiveSpeech,
} from './roundActiveSpeechStorage';

describe('roundActiveSpeechStorage', () => {
  beforeEach(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  test('round-trips an active speech', () => {
    if (typeof sessionStorage === 'undefined') return;
    const roundId = 'round-1';

    expect(readStoredActiveSpeech(roundId)).toBeNull();
    writeStoredActiveSpeech(roundId, '2NR');
    expect(readStoredActiveSpeech(roundId)).toBe('2NR');
    expect(sessionStorage.getItem(activeSpeechStorageKey(roundId))).toBe('2NR');
    clearStoredActiveSpeech(roundId);
    expect(readStoredActiveSpeech(roundId)).toBeNull();
  });

  test('ignores invalid stored speech values', () => {
    if (typeof sessionStorage === 'undefined') return;
    const roundId = 'round-1';

    sessionStorage.setItem(activeSpeechStorageKey(roundId), '3AC');
    expect(readStoredActiveSpeech(roundId)).toBeNull();
  });
});
