import { supabase } from './supabase';
import {
  SPEECH_COLUMNS,
  type Tournament,
  type Round,
  type Flow,
  type FlowCell,
  type FlowAnalytics,
  type RoundAnalytics,
  type CellColor,
  type Profile,
  type AdminUserSummary,
  type PlatformUsageMetrics,
} from './types';
import type { KeyboardMacro } from '../keyboardMacros';
import { DEFAULT_KEYBOARD_MACROS } from '../keyboardMacros';

// ── helpers ──────────────────────────────────────────────────

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

function toCount(value: number | string | null | undefined): number {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

/** Normalizes Supabase/PostgREST errors for UI and catch blocks. */
export function toError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) return error;
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return new Error((error as { message: string }).message);
  }
  return new Error(fallbackMessage);
}

function pgErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const c = (error as { code: unknown }).code;
    return typeof c === 'string' ? c : undefined;
  }
  return undefined;
}

const FLOW_TABS_SCHEMA_CACHE_HINT =
  "PostgREST's schema cache is out of date. In the Supabase SQL Editor run: NOTIFY pgrst, 'reload schema';  If you have not added tab_kind yet, run client/src/db/migrations/015_add_tab_kind_to_flow_tabs.sql first, then NOTIFY again. If NOTIFY does not help, restart the project (Dashboard → Settings → General).";

/** PGRST204 / schema-cache errors when tab_kind or flow_tabs is missing from PostgREST's cache. */
function mapFlowTabsSchemaCacheError(error: unknown): Error | null {
  const code = pgErrorCode(error);
  const msg = error instanceof Error ? error.message : String(error);
  const mentionsFlowTabs = /flow_tabs/i.test(msg) || /tab_kind/i.test(msg);
  if (code === 'PGRST204' && mentionsFlowTabs) {
    return new Error(FLOW_TABS_SCHEMA_CACHE_HINT);
  }
  if (/schema cache/i.test(msg) && mentionsFlowTabs) {
    return new Error(FLOW_TABS_SCHEMA_CACHE_HINT);
  }
  return null;
}

/** When PostgREST omits tab_kind from JSON, infer CX from the reserved position name. */
function normalizeFlowTabKind(row: Flow): Flow {
  const tab_kind =
    row.tab_kind ?? (row.position_name === 'CX' ? 'cx' : 'standard');
  return { ...row, tab_kind };
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const userId = await uid();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateCurrentProfile(
  fields: Partial<Pick<Profile, 'first_name' | 'last_name' | 'default_team_code'>>
): Promise<Profile> {
  const userId = await uid();
  const { data, error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listAdminUserSummaries(
  pageLimit = 100,
  pageOffset = 0
): Promise<AdminUserSummary[]> {
  let { data, error } = await supabase.rpc('get_admin_user_summaries', {
    page_limit: pageLimit,
    page_offset: pageOffset,
  });

  // Backward compatibility: some databases still expose the legacy
  // no-argument function signature for this RPC.
  if (error && (error as { code?: string }).code === 'PGRST202') {
    const fallbackResult = await supabase.rpc('get_admin_user_summaries');
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) throw toError(error, 'Failed to load admin user summaries');
  const rows = (data ?? []) as Array<Partial<AdminUserSummary>>;
  return rows.map((row) => ({
    ...row,
    tournament_count: toCount(row.tournament_count),
    round_count: toCount(row.round_count),
    flow_count: toCount(row.flow_count),
    cell_count: toCount(row.cell_count),
    analytics_count: toCount(row.analytics_count),
  })) as AdminUserSummary[];
}

export async function getPlatformUsageMetrics(): Promise<PlatformUsageMetrics> {
  const { data, error } = await supabase
    .rpc('get_platform_usage_metrics')
    .single();
  if (error) throw toError(error, 'Failed to load platform usage metrics');
  const row = data as Record<string, number | string | null>;
  return {
    total_users: toCount(row.total_users),
    admin_users: toCount(row.admin_users),
    active_users: toCount(row.active_users),
    total_tournaments: toCount(row.total_tournaments),
    total_rounds: toCount(row.total_rounds),
    total_flow_tabs: toCount(row.total_flow_tabs),
    total_flow_cells: toCount(row.total_flow_cells),
    total_analytics_entries: toCount(row.total_analytics_entries),
    most_recent_activity_at:
      typeof row.most_recent_activity_at === 'string' ? row.most_recent_activity_at : null,
  };
}

// ── Tournaments ──────────────────────────────────────────────

export async function listTournaments(): Promise<Tournament[]> {
  const userId = await uid();
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTournament(id: string): Promise<Tournament> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createTournament(
  fields: Pick<Tournament, 'name'> &
    Partial<Pick<Tournament, 'date' | 'location' | 'tournament_type' | 'team_name' | 'timer_preset'>>
): Promise<Tournament> {
  const userId = await uid();
  const { data, error } = await supabase
    .from('tournaments')
    .insert({ user_id: userId, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTournament(
  id: string,
  fields: Partial<Pick<Tournament, 'name' | 'date' | 'location' | 'tournament_type' | 'team_name' | 'timer_preset'>>
): Promise<Tournament> {
  const { data, error } = await supabase
    .from('tournaments')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTournament(id: string): Promise<void> {
  const { error } = await supabase.from('tournaments').delete().eq('id', id);
  if (error) throw error;
}

// ── Rounds ───────────────────────────────────────────────────

export async function listRounds(tournamentId: string): Promise<Round[]> {
  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getRound(id: string): Promise<Round> {
  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createRound(
  tournamentId: string,
  fields: Partial<Pick<Round, 'round_number' | 'opponent' | 'team_aff' | 'team_neg' | 'side' | 'result' | 'judge'>>
): Promise<Round> {
  const userId = await uid();
  const { data, error } = await supabase
    .from('rounds')
    .insert({ user_id: userId, tournament_id: tournamentId, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRound(
  id: string,
  fields: Partial<Pick<Round, 'round_number' | 'opponent' | 'team_aff' | 'team_neg' | 'side' | 'result' | 'judge'>>
): Promise<Round> {
  const { data, error } = await supabase
    .from('rounds')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRound(id: string): Promise<void> {
  const { error } = await supabase.from('rounds').delete().eq('id', id);
  if (error) throw error;
}

// ── Flows (tabs within a round) ──────────────────────────────

export async function listFlows(roundId: string): Promise<Flow[]> {
  const { data, error } = await supabase
    .from('flow_tabs')
    .select('*')
    .eq('round_id', roundId)
    .order('display_order', { ascending: true });
  if (error) {
    const mapped = mapFlowTabsSchemaCacheError(error);
    if (mapped) throw mapped;
    throw error;
  }
  return (data ?? []).map((row) => normalizeFlowTabKind(row as Flow));
}

export async function createFlow(
  roundId: string,
  fields: Partial<Pick<Flow, 'position_name' | 'initiated_by' | 'display_order' | 'tab_kind'>>
): Promise<Flow> {
  if (fields.tab_kind === 'cx') {
    const existing = await listFlows(roundId);
    if (existing.some((f) => f.tab_kind === 'cx' || f.position_name === 'CX')) {
      throw new Error('Only one cross-examination (CX) tab is allowed per round.');
    }
  }
  const userId = await uid();
  // Never send tab_kind in the REST body: PostgREST can reject unknown columns (PGRST204) when its
  // schema cache is stale. DB default is standard; trigger 016 sets tab_kind=cx when position_name='CX'.
  const insertPayload = {
    user_id: userId,
    round_id: roundId,
    position_name: fields.position_name ?? 'Untitled',
    initiated_by: fields.initiated_by ?? 'aff',
    display_order: fields.display_order ?? 0,
  };
  const { data, error } = await supabase
    .from('flow_tabs')
    .insert(insertPayload)
    .select()
    .single();
  if (error) {
    const cacheErr = mapFlowTabsSchemaCacheError(error);
    if (cacheErr) throw cacheErr;
    const code = pgErrorCode(error);
    const msg = error instanceof Error ? error.message : String(error);
    if (code === '42703' && /tab_kind/i.test(msg)) {
      throw new Error(
        'Database is missing tab_kind on flow_tabs. Run migration 015_add_tab_kind_to_flow_tabs.sql in the Supabase SQL Editor.'
      );
    }
    if (fields.tab_kind === 'cx' && code === '23505') {
      throw new Error('Only one cross-examination (CX) tab is allowed per round.');
    }
    throw toError(error, 'Failed to create flow');
  }
  return normalizeFlowTabKind(data as Flow);
}

export async function updateFlow(
  id: string,
  fields: Partial<Pick<Flow, 'position_name' | 'initiated_by' | 'display_order' | 'tab_kind'>>
): Promise<Flow> {
  const { data, error } = await supabase
    .from('flow_tabs')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    const mapped = mapFlowTabsSchemaCacheError(error);
    if (mapped) throw mapped;
    throw error;
  }
  return normalizeFlowTabKind(data as Flow);
}

export async function deleteFlow(id: string): Promise<void> {
  const { error } = await supabase.from('flow_tabs').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderFlows(flows: { id: string; display_order: number }[]): Promise<void> {
  // Supabase doesn't support batch update natively, so we do sequential updates
  for (const f of flows) {
    const { error } = await supabase
      .from('flow_tabs')
      .update({ display_order: f.display_order })
      .eq('id', f.id);
    if (error) throw error;
  }
}

// ── Cells ────────────────────────────────────────────────────

export async function listCells(flowId: string): Promise<FlowCell[]> {
  const { data, error } = await supabase
    .from('flow_cells')
    .select('*')
    .eq('flow_id', flowId)
    .order('column_index', { ascending: true })
    .order('row_index', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function upsertCells(
  flowId: string,
  cells: { column_index: number; row_index: number; content: string; color?: CellColor; comment?: string }[]
): Promise<void> {
  const userId = await uid();
  const rows = cells.map((c) => ({
    user_id: userId,
    flow_id: flowId,
    column_index: c.column_index,
    row_index: c.row_index,
    content: c.content,
    color: c.color ?? null,
    comment: c.comment ?? '',
  }));
  const { error } = await supabase
    .from('flow_cells')
    .upsert(rows, { onConflict: 'flow_id,column_index,row_index' });
  if (error) throw error;
}

export async function deleteCell(id: string): Promise<void> {
  const { error } = await supabase.from('flow_cells').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteCellsByFlow(flowId: string): Promise<void> {
  const { error } = await supabase.from('flow_cells').delete().eq('flow_id', flowId);
  if (error) throw error;
}

// ── Flow Analytics ───────────────────────────────────────────

export async function getFlowAnalytics(flowId: string): Promise<FlowAnalytics | null> {
  const { data, error } = await supabase
    .from('flow_analytics')
    .select('*')
    .eq('flow_id', flowId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertFlowAnalytics(
  flowId: string,
  fields: { notes_aff?: string; notes_neg?: string }
): Promise<FlowAnalytics> {
  const userId = await uid();
  const { data, error } = await supabase
    .from('flow_analytics')
    .upsert(
      { user_id: userId, flow_id: flowId, ...fields },
      { onConflict: 'flow_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Round Analytics ───────────────────────────────────────────

export async function getRoundAnalytics(roundId: string): Promise<RoundAnalytics | null> {
  const { data, error } = await supabase
    .from('round_analytics')
    .select('*')
    .eq('round_id', roundId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertRoundAnalytics(
  roundId: string,
  fields: { notes_aff?: string; notes_neg?: string; notes_decision?: string }
): Promise<RoundAnalytics> {
  const userId = await uid();
  const { data, error } = await supabase
    .from('round_analytics')
    .upsert(
      { user_id: userId, round_id: roundId, ...fields },
      { onConflict: 'round_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Keyboard Macros ───────────────────────────────────────────

export async function fetchKeyboardMacros(): Promise<KeyboardMacro[]> {
  const userId = await uid();
  const { data, error } = await supabase
    .from('keyboard_macros')
    .select('macros')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.macros || !Array.isArray(data.macros)) return [...DEFAULT_KEYBOARD_MACROS];
  const coerced = (data.macros as unknown[]).filter(
    (m): m is KeyboardMacro =>
      m != null &&
      typeof m === 'object' &&
      typeof (m as KeyboardMacro).id === 'string' &&
      typeof (m as KeyboardMacro).name === 'string' &&
      typeof (m as KeyboardMacro).shortcut === 'string' &&
      Array.isArray((m as KeyboardMacro).actions)
  );
  return coerced.length > 0 ? coerced : [...DEFAULT_KEYBOARD_MACROS];
}

export async function saveKeyboardMacrosRemote(macros: KeyboardMacro[]): Promise<void> {
  const userId = await uid();
  const { error } = await supabase.from('keyboard_macros').upsert(
    { user_id: userId, macros },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

// ── Export / Import helpers ──────────────────────────────────

export type ExportedRoundData = Omit<Round, 'user_id'> & {
  flows: (Omit<Flow, 'user_id'> & {
    cells: Omit<FlowCell, 'user_id'>[];
  })[];
};

export interface ExportedTournament {
  tournament: Omit<Tournament, 'user_id'>;
  rounds: ExportedRoundData[];
}

export interface ExportedRound {
  round: ExportedRoundData;
}

type ImportedFlowCell = Omit<FlowCell, 'user_id'>;

export function normalizeImportedFlowCells(cells: ImportedFlowCell[]): ImportedFlowCell[] {
  const maxColumnIndex = SPEECH_COLUMNS.length - 1;
  const usesLegacyBlockSplit = cells.some((cell) => cell.column_index > maxColumnIndex);

  return cells.flatMap((cell) => {
    if (!usesLegacyBlockSplit) {
      return cell.column_index >= 0 && cell.column_index <= maxColumnIndex ? [cell] : [];
    }
    if (cell.column_index === 4) return [];
    const column_index = cell.column_index > 4 ? cell.column_index - 1 : cell.column_index;
    return column_index >= 0 && column_index <= maxColumnIndex
      ? [{ ...cell, column_index }]
      : [];
  });
}

export async function exportTournament(tournamentId: string): Promise<ExportedTournament> {
  const tournament = await getTournament(tournamentId);
  const rounds = await listRounds(tournamentId);

  const roundsWithFlows = await Promise.all(
    rounds.map(async (round) => {
      const flows = await listFlows(round.id);
      const flowsWithCells = await Promise.all(
        flows.map(async (flow) => {
          const cells = await listCells(flow.id);
          const { user_id: _u, ...flowData } = flow;
          return { ...flowData, cells: cells.map(({ user_id: _u2, ...c }) => c) };
        })
      );
      const { user_id: _u3, ...roundData } = round;
      return { ...roundData, flows: flowsWithCells };
    })
  );

  const { user_id: _u4, ...tournamentData } = tournament;
  return { tournament: tournamentData, rounds: roundsWithFlows };
}

export async function exportRound(roundId: string): Promise<ExportedRound> {
  const round = await getRound(roundId);
  const flows = await listFlows(roundId);
  const flowsWithCells = await Promise.all(
    flows.map(async (flow) => {
      const cells = await listCells(flow.id);
      const { user_id: _u, ...flowData } = flow;
      return { ...flowData, cells: cells.map(({ user_id: _u2, ...c }) => c) };
    })
  );
  const { user_id: _u3, ...roundData } = round;
  return { round: { ...roundData, flows: flowsWithCells } };
}

export async function importRound(
  tournamentId: string,
  data: ExportedRound
): Promise<string> {
  const userId = await uid();
  const { data: newRound, error: rErr } = await supabase
    .from('rounds')
    .insert({
      user_id: userId,
      tournament_id: tournamentId,
      round_number: data.round.round_number,
      opponent: data.round.opponent,
      team_aff: data.round.team_aff ?? '',
      team_neg: data.round.team_neg ?? '',
      side: data.round.side,
      result: data.round.result,
      judge: data.round.judge ?? '',
    })
    .select()
    .single();
  if (rErr) throw rErr;

  for (const flow of data.round.flows) {
    // Never send tab_kind in the REST body: PostgREST can reject unknown columns (PGRST204) when its
    // schema cache is stale. DB default is standard; trigger 016 sets tab_kind=cx when position_name='CX'.
    const { data: newFlow, error: fErr } = await supabase
      .from('flow_tabs')
      .insert({
        user_id: userId,
        round_id: newRound.id,
        position_name: flow.position_name,
        initiated_by: flow.initiated_by,
        display_order: flow.display_order,
      })
      .select()
      .single();
    if (fErr) {
      const cacheErr = mapFlowTabsSchemaCacheError(fErr);
      if (cacheErr) throw cacheErr;
      throw fErr;
    }

    const normalizedCells = normalizeImportedFlowCells(flow.cells);
    if (normalizedCells.length > 0) {
      const cellRows = normalizedCells.map((c) => ({
        user_id: userId,
        flow_id: newFlow.id,
        column_index: c.column_index,
        row_index: c.row_index,
        content: c.content,
        color: c.color,
        comment: c.comment ?? '',
      }));
      const { error: cErr } = await supabase.from('flow_cells').insert(cellRows);
      if (cErr) throw cErr;
    }
  }

  return newRound.id;
}

export async function importTournament(data: ExportedTournament): Promise<string> {
  const userId = await uid();

  // Create tournament with new ID
  const { data: newTournament, error: tErr } = await supabase
    .from('tournaments')
    .insert({
      user_id: userId,
      name: data.tournament.name,
      date: data.tournament.date,
      location: data.tournament.location,
      tournament_type: (data.tournament as { tournament_type?: string }).tournament_type ?? 'competitor',
      team_name: (data.tournament as { team_name?: string | null }).team_name ?? null,
      timer_preset: (data.tournament as { timer_preset?: string }).timer_preset ?? 'high_school',
    })
    .select()
    .single();
  if (tErr) throw tErr;

  for (const round of data.rounds) {
    const { data: newRound, error: rErr } = await supabase
      .from('rounds')
      .insert({
        user_id: userId,
        tournament_id: newTournament.id,
        round_number: round.round_number,
        opponent: round.opponent,
        team_aff: round.team_aff ?? '',
        team_neg: round.team_neg ?? '',
        side: round.side,
        result: round.result,
        judge: round.judge ?? '',
      })
      .select()
      .single();
    if (rErr) throw rErr;

    for (const flow of round.flows) {
      // Never send tab_kind in the REST body: PostgREST can reject unknown columns (PGRST204) when its
      // schema cache is stale. DB default is standard; trigger 016 sets tab_kind=cx when position_name='CX'.
      const { data: newFlow, error: fErr } = await supabase
        .from('flow_tabs')
        .insert({
          user_id: userId,
          round_id: newRound.id,
          position_name: flow.position_name,
          initiated_by: flow.initiated_by,
          display_order: flow.display_order,
        })
        .select()
        .single();
      if (fErr) {
        const cacheErr = mapFlowTabsSchemaCacheError(fErr);
        if (cacheErr) throw cacheErr;
        throw fErr;
      }

      const normalizedCells = normalizeImportedFlowCells(flow.cells);
      if (normalizedCells.length > 0) {
        const cellRows = normalizedCells.map((c) => ({
          user_id: userId,
          flow_id: newFlow.id,
          column_index: c.column_index,
          row_index: c.row_index,
          content: c.content,
          color: c.color,
          comment: c.comment ?? '',
        }));
        const { error: cErr } = await supabase.from('flow_cells').insert(cellRows);
        if (cErr) throw cErr;
      }
    }
  }

  return newTournament.id;
}
