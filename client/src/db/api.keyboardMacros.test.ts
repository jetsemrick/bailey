import { beforeEach, describe, expect, test, vi } from 'vitest';

const getUserMock = vi.fn();
const fromMock = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    auth: { getUser: getUserMock },
    from: (table: string) => fromMock(table),
  },
}));

import { fetchKeyboardMacros, saveKeyboardMacrosRemote } from './api';
import { DEFAULT_KEYBOARD_MACROS } from '../keyboardMacros';

describe('fetchKeyboardMacros', () => {
  beforeEach(() => {
    getUserMock.mockReset();
    fromMock.mockReset();
  });

  test('returns defaults when no row exists', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await fetchKeyboardMacros();

    expect(result).toEqual(DEFAULT_KEYBOARD_MACROS);
    expect(fromMock).toHaveBeenCalledWith('keyboard_macros');
  });

  test('returns stored macros when row exists', async () => {
    const stored = [
      { id: 'm1', name: 'Custom', shortcut: 'Ctrl+K', actions: ['next_flow_sheet'] },
    ];
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: { macros: stored }, error: null }),
      }),
    });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await fetchKeyboardMacros();

    expect(result).toEqual(stored);
  });

  test('returns defaults when not authenticated', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    await expect(fetchKeyboardMacros()).rejects.toThrow('Not authenticated');
  });
});

describe('saveKeyboardMacrosRemote', () => {
  beforeEach(() => {
    getUserMock.mockReset();
    fromMock.mockReset();
  });

  test('upserts macros for authenticated user', async () => {
    const macros = [...DEFAULT_KEYBOARD_MACROS];
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ upsert: upsertMock });

    await saveKeyboardMacrosRemote(macros);

    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: 'user-1', macros },
      { onConflict: 'user_id' }
    );
  });

  test('throws when not authenticated', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    await expect(saveKeyboardMacrosRemote(DEFAULT_KEYBOARD_MACROS)).rejects.toThrow(
      'Not authenticated'
    );
  });
});
