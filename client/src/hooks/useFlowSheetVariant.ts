import { useCallback, useEffect, useState } from 'react';
import type { FlowSheetVariant } from '../components/flowSheetVariant';
import {
  FLOW_SHEET_VARIANT_CHANGE_EVENT,
  readFlowSheetVariant,
  writeFlowSheetVariant,
} from '../lib/flowSheetSettings';

export function useFlowSheetVariant() {
  const [variant, setVariantState] = useState<FlowSheetVariant>(readFlowSheetVariant);

  useEffect(() => {
    const sync = () => setVariantState(readFlowSheetVariant());
    window.addEventListener(FLOW_SHEET_VARIANT_CHANGE_EVENT, sync);
    return () => window.removeEventListener(FLOW_SHEET_VARIANT_CHANGE_EVENT, sync);
  }, []);

  const setVariant = useCallback((next: FlowSheetVariant) => {
    writeFlowSheetVariant(next);
    setVariantState(next);
  }, []);

  return { variant, setVariant };
}
