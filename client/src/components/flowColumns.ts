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
