import { supabase } from './supabase';
import type { Tournament, Round, Flow, FlowCell, CellColor } from './types';

// ── helpers ──────────────────────────────────────────────────

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

// ── Tournaments ──────────────────────────────────────────────

export async function listTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
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
  fields: Pick<Tournament, 'name'> & Partial<Pick<Tournament, 'date' | 'location'>>
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
  fields: Partial<Pick<Tournament, 'name' | 'date' | 'location'>>
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
  fields: Partial<Pick<Round, 'round_number' | 'opponent' | 'side' | 'result'>>
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
  fields: Partial<Pick<Round, 'round_number' | 'opponent' | 'side' | 'result'>>
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
  if (error) throw error;
  return data ?? [];
}

export async function createFlow(
  roundId: string,
  fields: Partial<Pick<Flow, 'position_name' | 'initiated_by' | 'display_order'>>
): Promise<Flow> {
  const userId = await uid();
  const { data, error } = await supabase
    .from('flow_tabs')
    .insert({ user_id: userId, round_id: roundId, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFlow(
  id: string,
  fields: Partial<Pick<Flow, 'position_name' | 'initiated_by' | 'display_order'>>
): Promise<Flow> {
  const { data, error } = await supabase
    .from('flow_tabs')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
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
  cells: { column_index: number; row_index: number; content: string; color?: CellColor }[]
): Promise<void> {
  const userId = await uid();
  const rows = cells.map((c) => ({
    user_id: userId,
    flow_id: flowId,
    column_index: c.column_index,
    row_index: c.row_index,
    content: c.content,
    color: c.color ?? null,
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

// ── Export / Import helpers ──────────────────────────────────

export interface ExportedTournament {
  tournament: Omit<Tournament, 'user_id'>;
  rounds: (Omit<Round, 'user_id'> & {
    flows: (Omit<Flow, 'user_id'> & {
      cells: Omit<FlowCell, 'user_id'>[];
    })[];
  })[];
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
        side: round.side,
        result: round.result,
      })
      .select()
      .single();
    if (rErr) throw rErr;

    for (const flow of round.flows) {
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
      if (fErr) throw fErr;

      if (flow.cells.length > 0) {
        const cellRows = flow.cells.map((c) => ({
          user_id: userId,
          flow_id: newFlow.id,
          column_index: c.column_index,
          row_index: c.row_index,
          content: c.content,
          color: c.color,
        }));
        const { error: cErr } = await supabase.from('flow_cells').insert(cellRows);
        if (cErr) throw cErr;
      }
    }
  }

  return newTournament.id;
}
