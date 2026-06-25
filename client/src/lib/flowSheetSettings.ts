import type { FlowSheetVariant } from '../components/flowSheetVariant';

export const FLOW_SHEET_VARIANT_KEY = 'bailey-flow-sheet-variant';
export const FLOW_SHEET_VARIANT_CHANGE_EVENT = 'bailey-flow-sheet-variant-change';

export const DEFAULT_FLOW_SHEET_VARIANT: FlowSheetVariant = 'default';

export function parseFlowSheetVariant(value: string | null): FlowSheetVariant {
  return value === 'sharp' ? 'sharp' : 'default';
}

export function readFlowSheetVariant(): FlowSheetVariant {
  try {
    return parseFlowSheetVariant(localStorage.getItem(FLOW_SHEET_VARIANT_KEY));
  } catch {
    return DEFAULT_FLOW_SHEET_VARIANT;
  }
}

export function writeFlowSheetVariant(variant: FlowSheetVariant): void {
  try {
    localStorage.setItem(FLOW_SHEET_VARIANT_KEY, variant);
    window.dispatchEvent(new CustomEvent(FLOW_SHEET_VARIANT_CHANGE_EVENT));
  } catch {
    /* quota / private mode */
  }
}
