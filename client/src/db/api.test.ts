import { beforeEach, describe, expect, test, vi } from 'vitest';

const { getUserMock, rpcMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    rpc: rpcMock,
    auth: {
      getUser: getUserMock,
    },
  },
}));

import { listAdminUserSummaries, toError } from './api';

describe('toError', () => {
  test('returns Error instances unchanged', () => {
    const e = new Error('x');
    expect(toError(e, 'fallback')).toBe(e);
  });

  test('uses message from object-like errors', () => {
    expect(toError({ message: 'm' }, 'fallback').message).toBe('m');
  });

  test('uses fallback for unknown shapes', () => {
    expect(toError(null, 'fallback').message).toBe('fallback');
  });
});

describe('listAdminUserSummaries', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    getUserMock.mockReset();
  });

  test('retries without args for legacy RPC signature', async () => {
    rpcMock
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST202', message: 'Function with matching signature not found' },
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'user-1',
            email: 'admin@example.com',
            role: 'Admin',
            tournament_count: '2',
            round_count: '3',
            flow_count: '4',
            cell_count: '5',
            analytics_count: '6',
            last_activity_at: null,
            created_at: '2026-03-11T00:00:00.000Z',
          },
        ],
        error: null,
      });

    const rows = await listAdminUserSummaries();

    expect(rpcMock).toHaveBeenNthCalledWith(1, 'get_admin_user_summaries', {
      page_limit: 100,
      page_offset: 0,
    });
    expect(rpcMock).toHaveBeenNthCalledWith(2, 'get_admin_user_summaries');
    expect(rows[0]).toMatchObject({
      id: 'user-1',
      email: 'admin@example.com',
      role: 'Admin',
      tournament_count: 2,
      round_count: 3,
      flow_count: 4,
      cell_count: 5,
      analytics_count: 6,
    });
  });

  test('surfaces RPC errors as Error instances', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Admin access required' },
    });

    await expect(listAdminUserSummaries()).rejects.toThrow('Admin access required');
  });
});
