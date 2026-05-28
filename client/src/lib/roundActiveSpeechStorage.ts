import { SPEECH_COLUMNS, type SpeechColumn } from '../db/types';

/** Persist which speech column should be selected per round (survives in-tab reload / tab restore). */

const KEY_PREFIX = 'bailey-round-active-speech:';

export function activeSpeechStorageKey(roundId: string): string {
  return `${KEY_PREFIX}${roundId}`;
}

export function isSpeechColumn(value: string | null): value is SpeechColumn {
  return SPEECH_COLUMNS.includes(value as SpeechColumn);
}

export function readStoredActiveSpeech(roundId: string): SpeechColumn | null {
  try {
    const value = sessionStorage.getItem(activeSpeechStorageKey(roundId));
    return isSpeechColumn(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredActiveSpeech(roundId: string, speech: SpeechColumn): void {
  try {
    sessionStorage.setItem(activeSpeechStorageKey(roundId), speech);
  } catch {
    /* quota / private mode */
  }
}

export function clearStoredActiveSpeech(roundId: string): void {
  try {
    sessionStorage.removeItem(activeSpeechStorageKey(roundId));
  } catch {
    /* ignore */
  }
}
