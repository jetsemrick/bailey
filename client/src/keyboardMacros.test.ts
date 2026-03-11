import { describe, expect, test } from 'vitest';
import {
  DEFAULT_KEYBOARD_MACROS,
  normalizeShortcut,
  saveKeyboardMacros,
  shortcutFromKeyboardEvent,
  validateKeyboardMacros,
} from './keyboardMacros';

describe('keyboardMacros', () => {
  test('normalizes shortcuts into a canonical order', () => {
    expect(normalizeShortcut('shift+ctrl+n')).toBe('Ctrl+Shift+N');
    expect(normalizeShortcut('cmd + alt + r')).toBe('Ctrl+Alt+R');
    expect(normalizeShortcut('')).toBeNull();
  });

  test('builds shortcuts from keyboard events', () => {
    expect(
      shortcutFromKeyboardEvent({
        key: 'n',
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: false,
      })
    ).toBe('Ctrl+N');

    expect(
      shortcutFromKeyboardEvent({
        key: 'r',
        ctrlKey: false,
        metaKey: true,
        altKey: true,
        shiftKey: false,
      })
    ).toBe('Ctrl+Alt+R');

    expect(
      shortcutFromKeyboardEvent({
        key: 'n',
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
      })
    ).toBeNull();
  });

  test('validates reserved and duplicate shortcuts', () => {
    const [first, second] = DEFAULT_KEYBOARD_MACROS;
    const errors = validateKeyboardMacros([
      first,
      { ...second, id: 'duplicate-shortcut', shortcut: first.shortcut },
      { ...second, id: 'reserved-shortcut', shortcut: 'Ctrl+S' },
    ]);

    expect(errors).toContain('"Alt+N" is assigned to multiple macros.');
    expect(errors).toContain('"Ctrl+S" is reserved by browser or built-in shortcuts.');
  });

  test('saveKeyboardMacros rejects invalid macro payloads', () => {
    const errors = saveKeyboardMacros([
      {
        id: 'bad-macro',
        name: '',
        shortcut: '',
        actions: [],
      },
    ]);

    expect(errors.length).toBeGreaterThan(0);
  });
});
