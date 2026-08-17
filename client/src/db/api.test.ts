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
  getTournamentTree,
  listAdminUserSummaries,
  listTournamentsTree,
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

describe('getTournamentTree', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  test('fetches tournament with nested rounds and flow_tabs in one query', async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'tournament-1',
        user_id: 'user-1',
        name: 'Nationals',
        date: null,
        location: null,
        tournament_type: 'competitor',
        team_name: 'Test Team',
        timer_preset: 'high_school',
        created_at: '2026-03-11T00:00:00.000Z',
        updated_at: '2026-03-11T00:00:00.000Z',
        rounds: [
          {
            id: 'round-1',
            user_id: 'user-1',
            tournament_id: 'tournament-1',
            round_number: 1,
            opponent: 'Team A',
            team_aff: 'Team A',
            team_neg: 'Team B',
            side: 'aff',
            result: 'W',
            judge: 'Judge Smith',
            created_at: '2026-03-11T00:00:00.000Z',
            updated_at: '2026-03-11T00:00:00.000Z',
            flow_tabs: [
              {
                id: 'flow-1',
                user_id: 'user-1',
                round_id: 'round-1',
                position_name: '1AC',
                initiated_by: 'aff',
                tab_kind: 'standard',
                display_order: 0,
                created_at: '2026-03-11T00:00:00.000Z',
                updated_at: '2026-03-11T00:00:00.000Z',
              },
              {
                id: 'flow-2',
                user_id: 'user-1',
                round_id: 'round-1',
                position_name: 'DA',
                initiated_by: 'neg',
                tab_kind: 'standard',
                display_order: 1,
                created_at: '2026-03-11T00:00:00.000Z',
                updated_at: '2026-03-11T00:00:00.000Z',
              },
            ],
          },
          {
            id: 'round-2',
            user_id: 'user-1',
            tournament_id: 'tournament-1',
            round_number: 2,
            opponent: 'Team C',
            team_aff: 'Team C',
            team_neg: 'Test Team',
            side: 'neg',
            result: null,
            judge: 'Judge Jones',
            created_at: '2026-03-12T00:00:00.000Z',
            updated_at: '2026-03-12T00:00:00.000Z',
            flow_tabs: [],
          },
        ],
      },
      error: null,
    });
    const eqMock = vi.fn(() => ({ single: singleMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getTournamentTree('tournament-1');

    expect(fromMock).toHaveBeenCalledWith('tournaments');
    expect(selectMock).toHaveBeenCalledWith(`
      *,
      rounds (
        *,
        flow_tabs (*)
      )
    `);
    expect(eqMock).toHaveBeenCalledWith('id', 'tournament-1');
    expect(result.tournament.name).toBe('Nationals');
    expect(result.rounds).toHaveLength(2);
    expect(result.rounds[0].round.round_number).toBe(1);
    expect(result.rounds[0].flows).toHaveLength(2);
    expect(result.rounds[0].flows[0].position_name).toBe('1AC');
    expect(result.rounds[0].flows[1].position_name).toBe('DA');
    expect(result.rounds[1].round.round_number).toBe(2);
    expect(result.rounds[1].flows).toHaveLength(0);
  });

  test('sorts rounds by round_number and flows by display_order', async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'tournament-1',
        user_id: 'user-1',
        name: 'Nationals',
        created_at: '2026-03-11T00:00:00.000Z',
        updated_at: '2026-03-11T00:00:00.000Z',
        rounds: [
          {
            id: 'round-3',
            round_number: 3,
            flow_tabs: [
              { id: 'flow-2', display_order: 2, position_name: 'Third' },
              { id: 'flow-1', display_order: 1, position_name: 'Second' },
              { id: 'flow-0', display_order: 0, position_name: 'First' },
            ],
          },
          {
            id: 'round-1',
            round_number: 1,
            flow_tabs: [],
          },
        ],
      },
      error: null,
    });
    const eqMock = vi.fn(() => ({ single: singleMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getTournamentTree('tournament-1');

    expect(result.rounds[0].round.round_number).toBe(1);
    expect(result.rounds[1].round.round_number).toBe(3);
    expect(result.rounds[1].flows[0].position_name).toBe('First');
    expect(result.rounds[1].flows[1].position_name).toBe('Second');
    expect(result.rounds[1].flows[2].position_name).toBe('Third');
  });
});

describe('listTournamentsTree', () => {
  beforeEach(() => {
    fromMock.mockReset();
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
  });

  test('fetches multiple tournaments with nested rounds and flow_tabs', async () => {
    const orderMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'tournament-1',
          user_id: 'user-1',
          name: 'Nationals',
          created_at: '2026-03-11T00:00:00.000Z',
          updated_at: '2026-03-11T00:00:00.000Z',
          rounds: [
            {
              id: 'round-1',
              round_number: 1,
              flow_tabs: [
                { id: 'flow-1', display_order: 0, position_name: '1AC' },
              ],
            },
          ],
        },
        {
          id: 'tournament-2',
          user_id: 'user-1',
          name: 'States',
          created_at: '2026-03-10T00:00:00.000Z',
          updated_at: '2026-03-10T00:00:00.000Z',
          rounds: [],
        },
      ],
      error: null,
    });
    const eqMock = vi.fn(() => ({ order: orderMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    fromMock.mockReturnValue({ select: selectMock });

    const results = await listTournamentsTree();

    expect(fromMock).toHaveBeenCalledWith('tournaments');
    expect(selectMock).toHaveBeenCalledWith(`
      *,
      rounds (
        *,
        flow_tabs (*)
      )
    `);
    expect(eqMock).toHaveBeenCalledWith('user_id', 'user-1');
    expect(orderMock).toHaveBeenCalledWith('updated_at', { ascending: false });
    expect(results).toHaveLength(2);
    expect(results[0].tournament.name).toBe('Nationals');
    expect(results[0].rounds).toHaveLength(1);
    expect(results[0].rounds[0].flows).toHaveLength(1);
    expect(results[1].tournament.name).toBe('States');
    expect(results[1].rounds).toHaveLength(0);
  });
});
