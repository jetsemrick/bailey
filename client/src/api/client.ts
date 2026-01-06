import { supabase } from '../lib/supabase';

export interface Flow {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sheets: Sheet[];
}

export interface Sheet {
  id: string;
  flowId: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  cells?: Cell[];
}

export interface Cell {
  id: string;
  sheetId: string;
  row: number;
  column: number;
  content: string;
}

// Transform Supabase snake_case to camelCase
function transformFlow(flow: any): Flow {
  return {
    id: flow.id,
    name: flow.name,
    createdAt: flow.created_at,
    updatedAt: flow.updated_at,
    sheets: flow.sheets ? flow.sheets.map(transformSheet) : [],
  };
}

function transformSheet(sheet: any): Sheet {
  return {
    id: sheet.id,
    flowId: sheet.flow_id,
    name: sheet.name,
    order: sheet.order,
    createdAt: sheet.created_at,
    updatedAt: sheet.updated_at,
    cells: sheet.cells ? sheet.cells.map(transformCell) : undefined,
  };
}

function transformCell(cell: any): Cell {
  return {
    id: cell.id,
    sheetId: cell.sheet_id,
    row: cell.row,
    column: cell.column,
    content: cell.content,
  };
}

export const api = {
  flows: {
    list: async (): Promise<Flow[]> => {
      const { data, error } = await supabase
        .from('flows')
        .select(`
          *,
          sheets (
            *
          )
        `)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(transformFlow);
    },
    
    get: async (id: string): Promise<Flow> => {
      const { data, error } = await supabase
        .from('flows')
        .select(`
          *,
          sheets (
            *,
            cells (*)
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return transformFlow(data);
    },
    
    create: async (name?: string): Promise<Flow> => {
      // Create flow
      const { data: flow, error: flowError } = await supabase
        .from('flows')
        .insert({ name: name || 'Untitled Flow' })
        .select()
        .single();
      
      if (flowError) throw flowError;
      
      // Create default sheet
      const { data: sheet, error: sheetError } = await supabase
        .from('sheets')
        .insert({
          flow_id: flow.id,
          name: 'Sheet 1',
          order: 0,
        })
        .select()
        .single();
      
      if (sheetError) throw sheetError;
      
      return {
        ...transformFlow(flow),
        sheets: [transformSheet(sheet)],
      };
    },
    
    update: async (id: string, name: string): Promise<Flow> => {
      const { data, error } = await supabase
        .from('flows')
        .update({ name })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return transformFlow(data);
    },
    
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('flows')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
  },
  
  sheets: {
    create: async (flowId: string, name?: string): Promise<Sheet> => {
      // Get current sheet count
      const { count } = await supabase
        .from('sheets')
        .select('*', { count: 'exact', head: true })
        .eq('flow_id', flowId);
      
      const { data, error } = await supabase
        .from('sheets')
        .insert({
          flow_id: flowId,
          name: name || `Sheet ${(count || 0) + 1}`,
          order: count || 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return transformSheet(data);
    },
    
    update: async (id: string, data: { name?: string; order?: number }): Promise<Sheet> => {
      const { data: updated, error } = await supabase
        .from('sheets')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return transformSheet(updated);
    },
    
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('sheets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    
    getCells: async (sheetId: string): Promise<Cell[]> => {
      const { data, error } = await supabase
        .from('cells')
        .select('*')
        .eq('sheet_id', sheetId);
      
      if (error) throw error;
      return (data || []).map(transformCell);
    },
    
    updateCells: async (sheetId: string, cells: { row: number; column: number; content: string }[]): Promise<Cell[]> => {
      // Upsert cells using the constraint name
      const operations = cells.map(cell => ({
        sheet_id: sheetId,
        row: cell.row,
        column: cell.column,
        content: cell.content,
      }));
      
      const { error: upsertError } = await supabase
        .from('cells')
        .upsert(operations, {
          onConflict: 'sheet_id,row,column',
        });
      
      if (upsertError) throw upsertError;
      
      // Return all cells for the sheet
      const { data: allCells, error: fetchError } = await supabase
        .from('cells')
        .select('*')
        .eq('sheet_id', sheetId);
      
      if (fetchError) throw fetchError;
      return (allCells || []).map(transformCell);
    },
  },
};
