import { beforeEach, describe, expect, test, vi } from 'vitest';

const { fromMock, getUserMock, rpcMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  getUserMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    from: fromMock,
    rpc: rpcMock,
    auth: {
      getUser: getUserMock,
    },
  },
}));

import {
  listAdminUserSummaries,
  normalizeImportedFlowCells,
  toError,
  updateCurrentProfile,
} from './api';

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

function makeExportedCell(columnIndex: number, content: string) {
  return {
    id: `cell-${columnIndex}`,
    flow_id: 'flow-1',
    column_index: columnIndex,
    row_index: 0,
    content,
    color: null,
    comment: '',
    created_at: '2026-03-11T00:00:00.000Z',
    updated_at: '2026-03-11T00:00:00.000Z',
  };
}

describe('normalizeImportedFlowCells', () => {
  test('drops legacy 1NR cells and shifts later columns into the Block schema', () => {
    const cells = [
      makeExportedCell(3, 'old 2NC'),
      makeExportedCell(4, 'old 1NR'),
      makeExportedCell(5, 'old 1AR'),
      makeExportedCell(6, 'old 2NR'),
      makeExportedCell(7, 'old 2AR'),
    ];

    expect(normalizeImportedFlowCells(cells).map((cell) => [cell.column_index, cell.content])).toEqual([
      [3, 'old 2NC'],
      [4, 'old 1AR'],
      [5, 'old 2NR'],
      [6, 'old 2AR'],
    ]);
  });

  test('keeps current Block-schema cells unchanged', () => {
    const cells = [
      makeExportedCell(3, 'Block'),
      makeExportedCell(4, '1AR'),
      makeExportedCell(6, '2AR'),
    ];

    expect(normalizeImportedFlowCells(cells)).toEqual(cells);
  });
});

describe('updateCurrentProfile', () => {
  beforeEach(() => {
    fromMock.mockReset();
    getUserMock.mockReset();
  });

  test('updates editable profile fields for the current user', async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'user-1',
        email: 'debater@example.com',
        role: 'User',
        first_name: 'Pat',
        last_name: 'Smith',
        default_team_code: 'Kansas PS',
        created_at: '2026-03-11T00:00:00.000Z',
        updated_at: '2026-03-12T00:00:00.000Z',
      },
      error: null,
    });
    const selectMock = vi.fn(() => ({ single: singleMock }));
    const eqMock = vi.fn(() => ({ select: selectMock }));
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    fromMock.mockReturnValue({ update: updateMock });
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const profile = await updateCurrentProfile({
      first_name: 'Pat',
      last_name: 'Smith',
      default_team_code: 'Kansas PS',
    });

    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(updateMock).toHaveBeenCalledWith({
      first_name: 'Pat',
      last_name: 'Smith',
      default_team_code: 'Kansas PS',
    });
    expect(eqMock).toHaveBeenCalledWith('id', 'user-1');
    expect(profile).toMatchObject({
      first_name: 'Pat',
      last_name: 'Smith',
      default_team_code: 'Kansas PS',
    });
  });
});
