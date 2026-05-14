import { SPEECH_COLUMNS, type FlowTabKind } from '../db/types';

export interface FlowGridColumn {
  label: string;
  dataCol: number;
}

export const NEGATIVE_BLOCK_LABEL = '2NC/1NR';
export const NEGATIVE_BLOCK_DATA_COL = 3;
export const LEGACY_1NR_DATA_COL = 4;

/**
 * Standard flow sheets render 2NC and 1NR as one Negative block column while
 * keeping the official persisted speech indices for import/export compatibility.
 */
export function getColumnsForFlow(
  initiatedBy: 'aff' | 'neg' | null,
  tabKind: FlowTabKind = 'standard'
): FlowGridColumn[] {
  const effective = tabKind === 'cx' ? 'aff' : initiatedBy;
  const all: FlowGridColumn[] = SPEECH_COLUMNS.map((label, i) => ({
    label: i === NEGATIVE_BLOCK_DATA_COL && tabKind === 'standard' ? NEGATIVE_BLOCK_LABEL : label,
    dataCol: i,
  }));
  const visible = tabKind === 'standard'
    ? all.filter((c) => c.dataCol !== LEGACY_1NR_DATA_COL)
    : all;
  if (effective === 'neg') {
    return visible.filter((c) => c.label !== '1AC');
  }
  return visible;
}
