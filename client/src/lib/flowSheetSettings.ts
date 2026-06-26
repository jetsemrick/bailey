import type { FlowSheetVariant } from '../components/flowSheetVariant';

export const FLOW_SHEET_VARIANT_KEY = 'bailey-flow-sheet-variant';
export const FLOW_SHEET_VARIANT_CHANGE_EVENT = 'bailey-flow-sheet-variant-change';
export const FLOW_SHEET_HIDE_SIDEBAR_KEY = 'bailey-flow-sheet-hide-sidebar';
export const FLOW_SHEET_HIDE_SIDEBAR_CHANGE_EVENT = 'bailey-flow-sheet-hide-sidebar-change';

export const DEFAULT_FLOW_SHEET_VARIANT: FlowSheetVariant = 'default';
export const DEFAULT_FLOW_SHEET_HIDE_SIDEBAR = false;

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

export function parseFlowSheetHideSidebar(value: string | null): boolean {
  return value === 'true';
}

export function readFlowSheetHideSidebar(): boolean {
  try {
    return parseFlowSheetHideSidebar(localStorage.getItem(FLOW_SHEET_HIDE_SIDEBAR_KEY));
  } catch {
    return DEFAULT_FLOW_SHEET_HIDE_SIDEBAR;
  }
}

export function writeFlowSheetHideSidebar(hideSidebar: boolean): void {
  try {
    localStorage.setItem(FLOW_SHEET_HIDE_SIDEBAR_KEY, hideSidebar.toString());
    window.dispatchEvent(new CustomEvent(FLOW_SHEET_HIDE_SIDEBAR_CHANGE_EVENT));
  } catch {
    /* quota / private mode */
  }
}
