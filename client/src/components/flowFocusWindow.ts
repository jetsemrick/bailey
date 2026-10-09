/**
 * Narrow-width "focus mode" for the flow grid: instead of squeezing all speech
 * columns into a half-width window, show a sliding window of 2–4 adjacent
 * columns sized to fill the container.
 */

/** Grid containers at or above this width show every column side by side. */
export const FOCUS_MODE_MAX_WIDTH = 640;
/** Target minimum width per column so cell text stays readable. */
export const FOCUS_MIN_COLUMN_WIDTH = 150;
export const FOCUS_MIN_COLUMNS = 2;
export const FOCUS_MAX_COLUMNS = 4;

/**
 * Number of columns to show at once, or null when the container is wide enough
 * for the regular full-grid layout.
 */
export function getFocusWindowSize(containerWidth: number, totalColumns: number): number | null {
  if (containerWidth <= 0 || containerWidth >= FOCUS_MODE_MAX_WIDTH) return null;
  if (totalColumns <= 0) return null;
  const fit = Math.floor(containerWidth / FOCUS_MIN_COLUMN_WIDTH);
  const size = Math.max(FOCUS_MIN_COLUMNS, Math.min(FOCUS_MAX_COLUMNS, fit));
  return Math.min(totalColumns, size);
}

export function clampWindowStart(start: number, size: number, total: number): number {
  return Math.max(0, Math.min(start, total - size));
}

/** Smallest shift of the window that brings `index` into view. */
export function windowStartForIndex(index: number, start: number, size: number, total: number): number {
  if (index < start) return clampWindowStart(index, size, total);
  if (index >= start + size) return clampWindowStart(index - size + 1, size, total);
  return clampWindowStart(start, size, total);
}

export function windowStartFromScroll(
  scrollLeft: number,
  columnWidth: number,
  size: number,
  total: number
): number {
  if (columnWidth <= 0) return 0;
  return clampWindowStart(Math.round(scrollLeft / columnWidth), size, total);
}

/**
 * Where to open a sheet: end the window on the speech after the last one with
 * content, so the most recent speech and the one being flowed next are visible.
 */
export function initialWindowStart(lastFilledIndex: number, size: number, total: number): number {
  if (lastFilledIndex < 0) return 0;
  const target = Math.min(lastFilledIndex + 1, total - 1);
  return windowStartForIndex(target, 0, size, total);
}
