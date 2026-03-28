/** Persist which flow tab is active per round (survives in-tab reload / tab restore). */

const KEY_PREFIX = 'bailey-round-active-flow:';

export function activeFlowStorageKey(roundId: string): string {
  return `${KEY_PREFIX}${roundId}`;
}

export function readStoredActiveFlowId(roundId: string): string | null {
  try {
    const v = sessionStorage.getItem(activeFlowStorageKey(roundId));
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function writeStoredActiveFlowId(roundId: string, flowId: string): void {
  try {
    sessionStorage.setItem(activeFlowStorageKey(roundId), flowId);
  } catch {
    /* quota / private mode */
  }
}

export function clearStoredActiveFlowId(roundId: string): void {
  try {
    sessionStorage.removeItem(activeFlowStorageKey(roundId));
  } catch {
    /* ignore */
  }
}
