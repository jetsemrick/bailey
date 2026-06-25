import { beforeEach, describe, expect, test } from 'vitest';
import {
  DEFAULT_FLOW_SHEET_VARIANT,
  parseFlowSheetVariant,
  readFlowSheetVariant,
  writeFlowSheetVariant,
  FLOW_SHEET_VARIANT_KEY,
} from './flowSheetSettings';

describe('flowSheetSettings', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  test('parseFlowSheetVariant accepts sharp and defaults otherwise', () => {
    expect(parseFlowSheetVariant('sharp')).toBe('sharp');
    expect(parseFlowSheetVariant('default')).toBe('default');
    expect(parseFlowSheetVariant(null)).toBe(DEFAULT_FLOW_SHEET_VARIANT);
    expect(parseFlowSheetVariant('invalid')).toBe('default');
  });

  test('read and write round-trip in localStorage', () => {
    if (typeof localStorage === 'undefined') return;
    expect(readFlowSheetVariant()).toBe('default');

    writeFlowSheetVariant('sharp');
    expect(localStorage.getItem(FLOW_SHEET_VARIANT_KEY)).toBe('sharp');
    expect(readFlowSheetVariant()).toBe('sharp');

    writeFlowSheetVariant('default');
    expect(readFlowSheetVariant()).toBe('default');
  });
});
