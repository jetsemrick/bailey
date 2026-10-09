import { describe, expect, test } from 'vitest';
import {
  clampWindowStart,
  getFocusWindowSize,
  initialWindowStart,
  windowStartForIndex,
  windowStartFromScroll,
} from './flowFocusWindow';

describe('getFocusWindowSize', () => {
  test('returns null at desktop widths', () => {
    expect(getFocusWindowSize(640, 7)).toBeNull();
    expect(getFocusWindowSize(1400, 7)).toBeNull();
  });

  test('returns null before the container has been measured', () => {
    expect(getFocusWindowSize(0, 7)).toBeNull();
  });

  test('fits 3 columns in a ~500px half-width window', () => {
    expect(getFocusWindowSize(486, 7)).toBe(3);
  });

  test('clamps to 2–4 columns', () => {
    expect(getFocusWindowSize(220, 7)).toBe(2);
    expect(getFocusWindowSize(639, 7)).toBe(4);
  });

  test('never exceeds the number of columns', () => {
    expect(getFocusWindowSize(620, 3)).toBe(3);
  });
});

describe('clampWindowStart', () => {
  test('keeps the window inside the column range', () => {
    expect(clampWindowStart(-1, 3, 7)).toBe(0);
    expect(clampWindowStart(6, 3, 7)).toBe(4);
    expect(clampWindowStart(2, 3, 7)).toBe(2);
  });
});

describe('windowStartForIndex', () => {
  test('does not move when the column is already visible', () => {
    expect(windowStartForIndex(3, 2, 3, 7)).toBe(2);
  });

  test('shifts right just enough to reveal a column', () => {
    expect(windowStartForIndex(5, 2, 3, 7)).toBe(3);
  });

  test('shifts left to reveal a column', () => {
    expect(windowStartForIndex(0, 2, 3, 7)).toBe(0);
  });
});

describe('windowStartFromScroll', () => {
  test('rounds to the nearest column', () => {
    expect(windowStartFromScroll(330, 162, 3, 7)).toBe(2);
    expect(windowStartFromScroll(70, 162, 3, 7)).toBe(0);
  });

  test('clamps past the end and guards zero width', () => {
    expect(windowStartFromScroll(5000, 162, 3, 7)).toBe(4);
    expect(windowStartFromScroll(100, 0, 3, 7)).toBe(0);
  });
});

describe('initialWindowStart', () => {
  test('starts at the first column for an empty sheet', () => {
    expect(initialWindowStart(-1, 3, 7)).toBe(0);
  });

  test('shows the latest speech plus the next one', () => {
    expect(initialWindowStart(3, 3, 7)).toBe(2);
  });

  test('stays at the end once the last speech has content', () => {
    expect(initialWindowStart(6, 3, 7)).toBe(4);
  });
});
