export type FlowSheetVariant = 'default' | 'sharp';

export function flowSheetRootClass(variant: FlowSheetVariant): string {
  return variant === 'sharp' ? 'flow-sheet-sharp' : '';
}
