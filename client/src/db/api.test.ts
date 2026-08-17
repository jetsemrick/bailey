import { beforeEach, describe, expect, test, vi } from 'vitest';

const { fromMock, getSessionMock, getUserMock, rpcMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  getSessionMock: vi.fn(),
  getUserMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    from: fromMock,
    rpc: rpcMock,
    auth: {
      getSession: getSessionMock,
      getUser: getUserMock,
    },
  },
}));

import {
  createTournament,
  listAdminUserSummaries,
  normalizeImportedFlowCells,
  toError,
  updateCurrentProfile,
  upsertCells,
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
    getSessionMock.mockReset();
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
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });

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
    expect(getUserMock).not.toHaveBeenCalled();
    expect(profile).toMatchObject({
      first_name: 'Pat',
      last_name: 'Smith',
      default_team_code: 'Kansas PS',
    });
  });
});

describe('authenticated writes', () => {
  beforeEach(() => {
    fromMock.mockReset();
    getSessionMock.mockReset();
    getUserMock.mockReset();
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
  });

  test('creates a tournament using the local session user', async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: { id: 'tournament-1', user_id: 'user-1', name: 'Nationals' },
      error: null,
    });
    const selectMock = vi.fn(() => ({ single: singleMock }));
    const insertMock = vi.fn(() => ({ select: selectMock }));
    fromMock.mockReturnValue({ insert: insertMock });

    const tournament = await createTournament({ name: 'Nationals' });

    expect(getSessionMock).toHaveBeenCalledOnce();
    expect(getUserMock).not.toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledOnce();
    expect(fromMock).toHaveBeenCalledWith('tournaments');
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      name: 'Nationals',
    });
    expect(tournament).toMatchObject({ id: 'tournament-1', name: 'Nationals' });
  });

  test('upserts autosaved cells with one PostgREST write and no remote user lookup', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ upsert: upsertMock });

    await upsertCells('flow-1', [
      {
        column_index: 0,
        row_index: 1,
        content: 'Extend the solvency argument',
      },
    ]);

    expect(getSessionMock).toHaveBeenCalledOnce();
    expect(getUserMock).not.toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledOnce();
    expect(fromMock).toHaveBeenCalledWith('flow_cells');
    expect(upsertMock).toHaveBeenCalledOnce();
    expect(upsertMock).toHaveBeenCalledWith(
      [
        {
          user_id: 'user-1',
          flow_id: 'flow-1',
          column_index: 0,
          row_index: 1,
          content: 'Extend the solvency argument',
          color: null,
          comment: '',
        },
      ],
      { onConflict: 'flow_id,column_index,row_index' }
    );
  });
});

describe('DEB-66: deleteCellsByCoordinates', () => {
  beforeEach(() => {
    fromMock.mockReset();
    getSessionMock.mockReset();
    getUserMock.mockReset();
  });

  test('deletes multiple cells by flow_id and coordinates', async () => {
    const { deleteCellsByCoordinates } = await import('./api');
    
    const deleteMock = vi.fn().mockResolvedValue({ error: null });
    const eqRowMock = vi.fn(() => ({ delete: deleteMock }));
    const eqColMock = vi.fn(() => ({ eq: eqRowMock }));
    const eqFlowMock = vi.fn(() => ({ eq: eqColMock }));
    fromMock.mockReturnValue({ delete: () => ({ eq: eqFlowMock }) });

    await deleteCellsByCoordinates('flow-1', [
      { column_index: 0, row_index: 5 },
      { column_index: 2, row_index: 3 },
    ]);

    expect(fromMock).toHaveBeenCalledWith('flow_cells');
    expect(eqFlowMock).toHaveBeenCalledWith('flow_id', 'flow-1');
    expect(eqColMock).toHaveBeenCalledWith('column_index', 0);
    expect(eqRowMock).toHaveBeenCalledWith('row_index', 5);
    expect(eqColMock).toHaveBeenCalledWith('column_index', 2);
    expect(eqRowMock).toHaveBeenCalledWith('row_index', 3);
  });

  test('does nothing when coordinates array is empty', async () => {
    const { deleteCellsByCoordinates } = await import('./api');
    
    await deleteCellsByCoordinates('flow-1', []);
    
    expect(fromMock).not.toHaveBeenCalled();
  });
});
