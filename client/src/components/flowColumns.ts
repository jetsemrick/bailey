import { SPEECH_COLUMNS, type FlowTabKind, type SpeechColumn } from '../db/types';

export interface FlowColumnConfig {
  label: SpeechColumn;
  dataCol: number;
  side: 'aff' | 'neg';
}

export function getColumnSide(label: SpeechColumn): 'aff' | 'neg' {
  return label === '1AC' || label === '2AC' || label === '1AR' || label === '2AR'
    ? 'aff'
    : 'neg';
}

export function getSpeechDataCol(speech: SpeechColumn): number {
  return SPEECH_COLUMNS.indexOf(speech);
}

/** Column config: label + data column index. Neg flows omit 1AC. CX uses full aff grid (DEB-28). */
export function getColumnsForFlow(
  initiatedBy: 'aff' | 'neg' | null,
  tabKind: FlowTabKind = 'standard'
): FlowColumnConfig[] {
  const effective = tabKind === 'cx' ? 'aff' : initiatedBy;
  const all = SPEECH_COLUMNS.map((label, dataCol) => ({
    label,
    dataCol,
    side: getColumnSide(label),
  }));
  if (effective === 'neg') {
    return all.filter((c) => c.label !== '1AC');
  }
  return all;
}

export function resolveSpeechDataColForFlow(
  speech: SpeechColumn,
  initiatedBy: 'aff' | 'neg' | null,
  tabKind: FlowTabKind = 'standard'
): number | null {
  const columns = getColumnsForFlow(initiatedBy, tabKind);
  if (columns.length === 0) return null;

  const speechDataCol = getSpeechDataCol(speech);
  const exact = columns.find((column) => column.dataCol === speechDataCol);
  if (exact) return exact.dataCol;

  return columns.reduce((closest, column) => {
    const closestDistance = Math.abs(closest.dataCol - speechDataCol);
    const columnDistance = Math.abs(column.dataCol - speechDataCol);
    return columnDistance < closestDistance ? column : closest;
  }).dataCol;
}
